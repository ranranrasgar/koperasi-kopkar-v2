import test from 'node:test';
import assert from 'node:assert/strict';
import { createPool, withTx, type Db } from '../src/db.ts';
import {
    adaLangganan, hapusLangganan, kirimKeSemuaAnggota, kirimNotifikasi, langgananValid, ringkasanPush, simpanLangganan,
} from '../src/anggota/push.ts';

const pool = createPool();
const ROLLBACK = new Error('rollback-uji');
const inTx = async (fn: (db: Db) => Promise<void>) => {
    await assert.rejects(withTx(pool, async (db) => { await fn(db); throw ROLLBACK; }), (e) => e === ROLLBACK);
};
test.after(() => pool.end());

// Tanpa kunci VAPID di env uji: pengiriman push dilewati, riwayat tetap tercatat.
delete process.env.VAPID_PUBLIC_KEY;
delete process.env.VAPID_PRIVATE_KEY;
delete process.env.VAPID_SUBJECT;

const sub = (n: string) => ({ endpoint: `https://push.contoh.id/${n}`, keys: { p256dh: 'BPk', auth: 'aut' } });

async function akunAnggota(db: Db) {
    const r = await db.query('SELECT u.id, u.anggota_id FROM app_user u JOIN anggota a ON a.id = u.anggota_id WHERE a.aktif LIMIT 1');
    assert.ok(r.rows.length, 'butuh satu akun anggota aktif');
    return { userId: Number(r.rows[0].id), anggotaId: Number(r.rows[0].anggota_id) };
}

test('langgananValid menolak endpoint bukan https dan kunci hilang', () => {
    assert.equal(langgananValid(sub('a')), true);
    assert.equal(langgananValid({ ...sub('a'), endpoint: 'http://x.id/a' }), false);
    assert.equal(langgananValid({ endpoint: 'https://x.id/a' }), false);
    assert.equal(langgananValid(null), false);
});

test('langganan: simpan, endpoint sama tidak ganda, hapus hanya milik akun itu', async () => {
    await inTx(async (db) => {
        const { userId } = await akunAnggota(db);
        await simpanLangganan(db, userId, sub('p1'));
        await simpanLangganan(db, userId, sub('p1'));
        assert.equal((await db.query('SELECT count(*)::int n FROM app_user_push WHERE endpoint = $1', [sub('p1').endpoint])).rows[0].n, 1);
        assert.equal(await adaLangganan(db, userId, sub('p1').endpoint), true);
        await hapusLangganan(db, userId + 999999, sub('p1').endpoint);
        assert.equal(await adaLangganan(db, userId, sub('p1').endpoint), true);
        await hapusLangganan(db, userId, sub('p1').endpoint);
        assert.equal(await adaLangganan(db, userId, sub('p1').endpoint), false);
    });
});

test('kirimNotifikasi: tercatat di riwayat anggota, judul dipotong 50, catat=false tidak mencatat', async () => {
    await inTx(async (db) => {
        const { userId, anggotaId } = await akunAnggota(db);
        await simpanLangganan(db, userId, sub('p2'));
        const h = await kirimNotifikasi(db, anggotaId, { judul: 'J'.repeat(80), isi: 'Isi pesan' });
        assert.deepEqual(h, { penerima: 1, perangkat: 0, dikirim: 0, gagal: 0, email: 0 }); // VAPID tidak diset; tanpa email terverifikasi
        const r = await db.query('SELECT title, pesan, anggota_id FROM log_notifikasi WHERE pesan = $1', ['Isi pesan']);
        assert.equal(r.rows.length, 1);
        assert.equal(r.rows[0].title.length, 50);
        assert.equal(Number(r.rows[0].anggota_id), anggotaId);
        await kirimNotifikasi(db, anggotaId, { judul: 'Uji', isi: 'Tanpa catat', catat: false });
        assert.equal((await db.query('SELECT 1 FROM log_notifikasi WHERE pesan = $1', ['Tanpa catat'])).rows.length, 0);
        assert.equal((await kirimNotifikasi(db, 999999999, { judul: 'x', isi: 'y' })).penerima, 0);
    });
});

test('kirimKeSemuaAnggota: satu baris per anggota aktif, nomor urut unik', async () => {
    await inTx(async (db) => {
        const aktif = (await ringkasanPush(db)).anggotaAktif;
        const maks = Number((await db.query('SELECT COALESCE(MAX(urut), 0) m FROM log_notifikasi')).rows[0].m);
        const h = await kirimKeSemuaAnggota(db, { judul: 'Pengumuman', isi: 'Siaran uji' });
        assert.equal(h.penerima, aktif);
        const r = await db.query('SELECT count(*)::int n, count(DISTINCT urut)::int u, min(urut) mn, max(urut) mx FROM log_notifikasi WHERE pesan = $1', ['Siaran uji']);
        assert.equal(r.rows[0].n, aktif);
        assert.equal(r.rows[0].u, aktif);
        assert.equal(Number(r.rows[0].mn), maks + 1);
        assert.equal(Number(r.rows[0].mx), maks + aktif);
    });
});
