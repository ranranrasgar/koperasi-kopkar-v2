import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createPool, withTx, type Db } from '../src/db.ts';
import { cairkanPinjaman } from '../src/posting/pinjaman.ts';
import { bacaInfoPinjaman, jadwalAngsuranPdf, kirimInfoPencairan, teksInfoPinjaman } from '../src/anggota/info-pinjaman.ts';

const pool = createPool();
const ROLLBACK = new Error('rollback-uji');
const inTx = async (fn: (db: Db) => Promise<void>) => {
    await assert.rejects(withTx(pool, async (db) => { await fn(db); throw ROLLBACK; }), (e) => e === ROLLBACK);
};
test.after(() => pool.end());
delete process.env.VAPID_PUBLIC_KEY; delete process.env.VAPID_PRIVATE_KEY; delete process.env.VAPID_SUBJECT;

async function cairkan(db: Db, lama = 6, pokok = 2_400_000, kode = 'C01', tanpaAkun = false) {
    const a = (await db.query(`SELECT kode_agt FROM anggota a WHERE aktif = 'Y' AND rp_grade >= 3000000 AND trim(status_staff) <> 'Staff'
        ${tanpaAkun ? 'AND NOT EXISTS (SELECT 1 FROM app_user u WHERE u.anggota_id = a.id OR u.kode_agt = a.kode_agt)' : ''} ORDER BY id LIMIT 1`)).rows[0];
    const kas = (await db.query("SELECT id FROM perkiraan WHERE kode_perkiraan = '1.1.01.41'")).rows[0].id;
    return cairkanPinjaman(db, { kodeAgt: a.kode_agt, kodeKredit: kode, tglPinjaman: '2026-10-22', pokok, lama, kasPerkiraanId: kas, opr: 'uji' });
}

test('info pinjaman: jadwal dan PDF dibuat dari data pencairan', async () => {
    await inTx(async (db) => {
        const c = await cairkan(db);
        const i = await bacaInfoPinjaman(db, c.noPinjaman);
        assert.ok(i);
        assert.equal(i.jadwal.length, 6);
        assert.equal(Number(i.jadwal[5].sisaPokok), 0);
        assert.equal(i.jadwal.reduce((t, b) => t + Number(b.pokok), 0), 2_400_000);
        assert.equal(Number(i.jasaTotal), Number(c.jasaTotal));
        assert.equal(Number(i.admTotal), 24_000); // adm 1% pada angsuran ke-1
        const teks = teksInfoPinjaman(i);
        assert.match(teks, new RegExp(i.noPinjaman));
        assert.match(teks, / 1\. 10 November 2026/);
        const pdf = await jadwalAngsuranPdf(i);
        assert.equal(pdf.subarray(0, 5).toString(), '%PDF-');
        assert.ok(pdf.length > 1500);
        if (process.env.PDF_CONTOH) fs.writeFileSync(process.env.PDF_CONTOH, pdf);
        // Jadwal panjang tidak merusak PDF (beberapa halaman).
        const panjang = await bacaInfoPinjaman(db, (await cairkan(db, 60, 6_000_000, 'C16')).noPinjaman);
        const pdf2 = await jadwalAngsuranPdf(panjang!);
        assert.ok(pdf2.length > pdf.length);
        assert.ok((pdf2.toString('latin1').match(/\/Type \/Page\b/g) ?? []).length >= 2);
    });
});

test('kirim info pencairan: notifikasi tercatat dan email berlampiran PDF masuk antrean', async () => {
    await inTx(async (db) => {
        const c = await cairkan(db, 6, 2_400_000, 'C01', true);
        const i = (await bacaInfoPinjaman(db, c.noPinjaman))!;
        // Akun anggota dengan email terverifikasi (dibuat di dalam transaksi uji).
        const u = (await db.query(
            `INSERT INTO app_user (username, password_hash, kode_agt, nikk, status, created_at, updated_at, anggota_id, email)
             SELECT 'uji_info_pinjaman', 'x', a.kode_agt, a.nik, true, now(), now(), a.id, 'uji.info@contoh.id' FROM anggota a WHERE a.id = $1 RETURNING id`, [i.anggota.id])).rows[0];
        await db.query(`INSERT INTO app_user_email_verif (app_user_id, email, terverifikasi_pada) VALUES ($1, 'uji.info@contoh.id', now())`, [u.id]);
        const h = await kirimInfoPencairan(db, c.noPinjaman);
        assert.equal(h?.penerima, 1);
        assert.equal(h?.email, 1);
        const n = (await db.query('SELECT title, pesan FROM log_notifikasi WHERE anggota_id = $1 ORDER BY id DESC LIMIT 1', [i.anggota.id])).rows[0];
        assert.equal(n.title, 'Pinjaman Anda sudah dicairkan');
        assert.match(n.pesan, /Angsuran ke-1/);
        const e = (await db.query(`SELECT jenis, ke, judul, teks, lampiran_nama, length(lampiran) AS ukuran FROM email_antrean WHERE ke = 'uji.info@contoh.id' ORDER BY id DESC LIMIT 1`)).rows[0];
        assert.equal(e.jenis, 'pencairan_pinjaman');
        assert.equal(e.lampiran_nama, `Jadwal-Angsuran-${c.noPinjaman}.pdf`);
        assert.ok(e.ukuran > 1500);
        assert.match(e.teks, /Jadwal angsuran:/);
    });
});
