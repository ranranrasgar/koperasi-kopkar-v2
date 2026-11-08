import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createPool, withTx, type Db } from '../src/db.ts';
import { cairkanPinjaman } from '../src/posting/pinjaman.ts';
import { cairkanKpr } from '../src/posting/kpr.ts';
import { bacaInfoPinjaman, jadwalAngsuranPdf, kirimInfoPencairan, teksInfoPinjaman } from '../src/anggota/info-pinjaman.ts';
import { bacaTemplat, bersihkanTemplat, BIDANG_TEMPLAT, isiTemplat, kunciTemplat } from '../src/anggota/templat-notif.ts';

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

test('info KPR: jadwal dari angsuran tetap, PDF, dan notifikasi', async () => {
    await inTx(async (db) => {
        const a = (await db.query("SELECT id, kode_agt FROM anggota WHERE aktif = 'Y' ORDER BY id LIMIT 1")).rows[0];
        const kas = (await db.query("SELECT id FROM perkiraan WHERE kode_perkiraan = '1.1.01.41'")).rows[0].id;
        const k = await cairkanKpr(db, { kodeAgt: a.kode_agt, kodeKredit: 'C10', tglPinjaman: '2026-10-22', pokok: 12_000_100, lama: 12, kasPerkiraanId: kas, opr: 'uji' });
        const i = (await bacaInfoPinjaman(db, k.noPinjaman))!;
        assert.equal(i.jenis, 'kpr');
        assert.equal(i.jadwal.length, 12);
        assert.equal(i.jadwal.reduce((t, b) => t + Number(b.total), 0), 12_000_100);   // angsuran terakhir melunasi sisa pokok
        assert.equal(Number(i.jadwal[11].sisaPokok), 0);
        assert.equal(i.jadwal[0].tanggal, '2026-11-10');
        assert.match(teksInfoPinjaman(i), /KPR Anda telah dicatat/);
        const pdf = await jadwalAngsuranPdf(i);
        assert.equal(pdf.subarray(0, 5).toString(), '%PDF-');
        if (process.env.PDF_CONTOH_KPR) fs.writeFileSync(process.env.PDF_CONTOH_KPR, pdf);
        const h = await kirimInfoPencairan(db, k.noPinjaman);
        assert.equal(h?.penerima, 1);
        const n = (await db.query('SELECT title FROM log_notifikasi WHERE anggota_id = $1 ORDER BY id DESC LIMIT 1', [a.id])).rows[0];
        assert.equal(n.title, 'KPR Anda sudah dicatat');
    });
});

test('teks notifikasi dan email pencairan bisa diatur pengurus; keterangan pencairan ikut tersimpan dan terkirim', async () => {
    await inTx(async (db) => {
        // Tanpa pengaturan: teks bawaan.
        const bawaan = await bacaTemplat(db);
        assert.equal(bawaan['pencairan.judul'], 'Pinjaman Anda sudah dicairkan');
        // Pengurus mengubah judul, isi, pembuka, dan penutup.
        const simpan = (k: string, v: string) => db.query(`INSERT INTO pengaturan_web (kunci, nilai) VALUES ($1, $2) ON CONFLICT (kunci) DO UPDATE SET nilai = EXCLUDED.nilai`, [kunciTemplat(k), v]);
        await simpan('pencairan.judul', 'Dana cair, {nama}');
        await simpan('pencairan.isi', '{jenis} {pokok} cair {tanggal}, cicilan pertama {angsuran1} ({jatuh_tempo1}). Ket: {keterangan}');
        await simpan('pencairan.email_pembuka', 'Halo, pinjaman {no_pinjaman} sudah cair.');
        await simpan('pencairan.email_penutup', 'Terima kasih, salam koperasi.');

        const a = (await db.query(`SELECT kode_agt FROM anggota a WHERE aktif = 'Y' AND rp_grade >= 3000000 AND trim(status_staff) <> 'Staff'
            AND NOT EXISTS (SELECT 1 FROM app_user u WHERE u.anggota_id = a.id OR u.kode_agt = a.kode_agt) ORDER BY id LIMIT 1`)).rows[0];
        const kas = (await db.query("SELECT id FROM perkiraan WHERE kode_perkiraan = '1.1.01.41'")).rows[0].id;
        const c = await cairkanPinjaman(db, { kodeAgt: a.kode_agt, kodeKredit: 'C01', tglPinjaman: '2026-10-22', pokok: 2_400_000, lama: 6, kasPerkiraanId: kas, opr: 'uji', keterangan: '  Renovasi rumah  ' });
        assert.equal((await db.query('SELECT keterangan FROM pinjaman_tunai WHERE no_pinjaman = $1', [c.noPinjaman])).rows[0].keterangan, 'Renovasi rumah');
        const i = (await bacaInfoPinjaman(db, c.noPinjaman))!;
        assert.equal(i.keterangan, 'Renovasi rumah');
        const teks = teksInfoPinjaman(i, { pembuka: 'PEMBUKA', penutup: 'PENUTUP' });
        assert.match(teks, /^PEMBUKA\n/);
        assert.match(teks, /Keterangan: Renovasi rumah/);
        assert.match(teks, /PENUTUP$/);
        assert.doesNotMatch(teksInfoPinjaman({ ...i, keterangan: '' }), /Keterangan:/, 'tanpa keterangan, baris keterangan tidak ada');

        // Notifikasi memakai teks pengurus (anggota tanpa akun: tidak ada penerima, jadi dicek lewat pembentukan teks yang sama).
        const t = await bacaTemplat(db);
        const nilai = { nama: i.anggota.nama, jenis: i.namaKredit, pokok: 'Rp 2.400.000', lama: '6', tanggal: '22 Oktober 2026', no_pinjaman: i.noPinjaman, angsuran1: 'Rp 1', jatuh_tempo1: 'x', keterangan: i.keterangan };
        assert.equal(isiTemplat(t['pencairan.judul'], nilai), `Dana cair, ${i.anggota.nama}`);
        assert.match(isiTemplat(t['pencairan.isi'], nilai), /Ket: Renovasi rumah$/);
        assert.equal(isiTemplat(t['pencairan.email_pembuka'], nilai), `Halo, pinjaman ${c.noPinjaman} sudah cair.`);
    });
});

test('templat notif: peubah dikenal, batas panjang, kosong = bawaan', () => {
    const judul = BIDANG_TEMPLAT.find((b) => b.kunci === 'pengajuan_disetujui.judul')!;
    assert.equal(isiTemplat('Halo {nama} {tidak_ada}', { nama: 'Ani' }), 'Halo Ani {tidak_ada}');
    assert.equal(bersihkanTemplat(judul, '  Disetujui, {nama}  '), 'Disetujui, {nama}');
    assert.equal(bersihkanTemplat(judul, '   '), '');
    assert.throws(() => bersihkanTemplat(judul, 'Halo {tanggal}'), /peubah \{tanggal\} tidak dikenal/);
    assert.throws(() => bersihkanTemplat(judul, 'x'.repeat(51)), /maksimal 50 karakter/);
});
