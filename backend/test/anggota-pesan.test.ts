import test from 'node:test';
import assert from 'node:assert/strict';
import { createPool, withTx, type Db } from '../src/db.ts';
import {
    aturSelesai, balasPesanAdmin, detailPercakapan, hitungBelumDibaca, JEDA_DETIK, kabariAnggotaBalasan, kabariOperatorPesanBaru, kirimPesanAnggota,
    MAKS_PER_HARI, MAKS_PESAN, percakapanAdmin, percakapanAnggota, PesanSalah, tandaiDibaca,
} from '../src/anggota/pesan.ts';
import { adaLanggananOpr, hapusLanggananOpr, simpanLanggananOpr } from '../src/anggota/push.ts';

const pool = createPool();
const ROLLBACK = new Error('rollback-uji');
const inTx = async (fn: (db: Db) => Promise<void>) => {
    await assert.rejects(withTx(pool, async (db) => { await fn(db); throw ROLLBACK; }), (e) => e === ROLLBACK);
};
test.after(() => pool.end());

delete process.env.VAPID_PUBLIC_KEY;
delete process.env.VAPID_PRIVATE_KEY;
delete process.env.VAPID_SUBJECT;

async function dua(db: Db) {
    const r = await db.query('SELECT u.id user_id, u.anggota_id FROM app_user u JOIN anggota a ON a.id = u.anggota_id WHERE a.aktif ORDER BY u.id LIMIT 2');
    assert.equal(r.rows.length, 2, 'butuh dua akun anggota aktif');
    return r.rows.map((x) => ({ userId: Number(x.user_id), anggotaId: Number(x.anggota_id) }));
}
// Mundurkan waktu pesan agar jeda antar kiriman tidak mengganggu uji berikutnya.
const mundur = (db: Db) => db.query(`UPDATE pesan_isi SET dibuat_pada = dibuat_pada - interval '1 minute'`);

test('pesan baru: validasi, tersimpan, belum dibaca admin', async () => {
    await inTx(async (db) => {
        const [a] = await dua(db);
        await assert.rejects(kirimPesanAnggota(db, { ...a, subjek: 'Tanya', isi: '   ' }), /Isi pesan wajib/);
        await assert.rejects(kirimPesanAnggota(db, { ...a, subjek: '', isi: 'halo' }), /Subjek wajib/);
        await assert.rejects(kirimPesanAnggota(db, { ...a, subjek: 'x'.repeat(101), isi: 'halo' }), /Subjek maksimal/);
        await assert.rejects(kirimPesanAnggota(db, { ...a, subjek: 'Tanya', isi: 'x'.repeat(MAKS_PESAN + 1) }), PesanSalah);
        const p = await kirimPesanAnggota(db, { ...a, subjek: ' Tanya saldo ', isi: ' Berapa saldo saya? ' });
        assert.equal(p.subjek, 'Tanya saldo');
        const d = await detailPercakapan(db, p.percakapanId, a.anggotaId);
        assert.equal(d?.isi.length, 1);
        assert.equal(d?.isi[0].isi, 'Berapa saldo saya?');
        assert.equal(d?.isi[0].pengirim, 'anggota');
        assert.ok((await hitungBelumDibaca(db, 'admin')) >= 1);
    });
});

test('jeda antar kiriman dan batas per hari', async () => {
    await inTx(async (db) => {
        const [a] = await dua(db);
        const p = await kirimPesanAnggota(db, { ...a, subjek: 'Batas', isi: 'satu' });
        await assert.rejects(kirimPesanAnggota(db, { ...a, percakapanId: p.percakapanId, isi: 'dua' }), new RegExp(`Tunggu|${JEDA_DETIK}`));
        for (let i = 1; i < MAKS_PER_HARI; i++) {
            await mundur(db);
            await kirimPesanAnggota(db, { ...a, percakapanId: p.percakapanId, isi: `pesan ${i}` });
        }
        await mundur(db);
        await assert.rejects(kirimPesanAnggota(db, { ...a, percakapanId: p.percakapanId, isi: 'kelebihan' }), /Batas \d+ pesan per hari/);
    });
});

test('percakapan milik anggota lain tidak bisa dibuka atau dilanjutkan', async () => {
    await inTx(async (db) => {
        const [a, b] = await dua(db);
        const p = await kirimPesanAnggota(db, { ...a, subjek: 'Pribadi', isi: 'rahasia' });
        assert.equal(await detailPercakapan(db, p.percakapanId, b.anggotaId), null);
        await assert.rejects(kirimPesanAnggota(db, { ...b, percakapanId: p.percakapanId, isi: 'nyelonong' }), /tidak ditemukan/);
        assert.deepEqual((await percakapanAnggota(db, b.anggotaId)).filter((x) => x.id === p.percakapanId), []);
        assert.equal((await percakapanAnggota(db, a.anggotaId)).filter((x) => x.id === p.percakapanId).length, 1);
    });
});

test('balasan admin: tanda baca, notifikasi anggota, selesai, dan dibuka lagi oleh anggota', async () => {
    await inTx(async (db) => {
        const [a] = await dua(db);
        const p = await kirimPesanAnggota(db, { ...a, subjek: 'Pinjaman', isi: 'Kapan cair?' });
        const aman = await kabariOperatorPesanBaru(db, { percakapanId: p.percakapanId, nama: 'Uji', subjek: p.subjek, isi: p.isi });
        assert.deepEqual(aman, { perangkat: 0, dikirim: 0, gagal: 0 }); // tanpa VAPID

        const br = await balasPesanAdmin(db, { percakapanId: p.percakapanId, oprNama: 'kasir1', isi: 'Besok ya.' });
        assert.equal(br.anggotaId, a.anggotaId);
        let d = await detailPercakapan(db, p.percakapanId, null);
        assert.deepEqual(d?.isi.map((x) => x.pengirim), ['anggota', 'admin']);
        assert.equal(d?.isi[1].opr_nama, 'kasir1');
        assert.equal((await percakapanAnggota(db, a.anggotaId))[0].belum_dibaca, true);

        await kabariAnggotaBalasan(db, br);
        const log = await db.query(`SELECT title FROM log_notifikasi WHERE anggota_id = $1 AND pesan LIKE 'Pinjaman: Besok ya.%'`, [a.anggotaId]);
        assert.equal(log.rows.length, 1);

        await tandaiDibaca(db, p.percakapanId, 'anggota');
        assert.equal((await percakapanAnggota(db, a.anggotaId)).find((x) => x.id === p.percakapanId)?.belum_dibaca, false);

        await aturSelesai(db, p.percakapanId, true);
        assert.equal((await percakapanAdmin(db, 'selesai')).some((x) => x.id === p.percakapanId), true);
        assert.equal((await percakapanAdmin(db, 'buka')).some((x) => x.id === p.percakapanId), false);

        await mundur(db);
        await kirimPesanAnggota(db, { ...a, percakapanId: p.percakapanId, isi: 'Terima kasih' });
        d = await detailPercakapan(db, p.percakapanId, null);
        assert.equal(d?.status, 'buka');
        assert.equal((await percakapanAdmin(db, 'buka'))[0].id, p.percakapanId); // belum dibaca admin diurutkan paling atas
        await assert.rejects(balasPesanAdmin(db, { percakapanId: 999999999, oprNama: 'x', isi: 'y' }), /tidak ditemukan/);
    });
});

test('langganan push operator: simpan, tidak ganda, hapus hanya milik operator itu', async () => {
    await inTx(async (db) => {
        const o = await db.query('SELECT id FROM opr ORDER BY id LIMIT 1');
        const id = Number(o.rows[0].id);
        const s = { endpoint: 'https://push.contoh.id/opr1', keys: { p256dh: 'BPk', auth: 'aut' } };
        await simpanLanggananOpr(db, id, s);
        await simpanLanggananOpr(db, id, s);
        assert.equal((await db.query('SELECT count(*)::int n FROM opr_push WHERE endpoint = $1', [s.endpoint])).rows[0].n, 1);
        await hapusLanggananOpr(db, id + 99999, s.endpoint);
        assert.equal(await adaLanggananOpr(db, id, s.endpoint), true);
        await hapusLanggananOpr(db, id, s.endpoint);
        assert.equal(await adaLanggananOpr(db, id, s.endpoint), false);
    });
});
