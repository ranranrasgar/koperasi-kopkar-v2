import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { absenQr } from '../src/absensi.ts';
import { buatQr } from '../src/anggota/qr.ts';
import { createPool, withTx, type Db } from '../src/db.ts';
import { aturHadir, bukaPeriode, daftarLembur, gridHadir, hapusLembur, isiHadirKosong, simpanLembur } from '../src/gaji/periode.ts';

const pool = createPool();
after(() => pool.end());

class Batal extends Error {}
const inTx = (fn: (db: Db) => Promise<void>) => withTx(pool, async (db) => { await fn(db); throw new Batal(); }).catch((e) => { if (!(e instanceof Batal)) throw e; });
const gagal = async (db: Db, fn: () => Promise<unknown>, pola: RegExp) => {
    await db.query('SAVEPOINT g'); await assert.rejects(fn(), pola); await db.query('ROLLBACK TO SAVEPOINT g');
};
const karyawan = async (db: Db, kode: string, anggotaId: number | null = null) => (await db.query<{ id: string }>(
    `INSERT INTO karyawan (kode, nama, umk, tgl_masuk, anggota_id) VALUES ($1, $2, 2925000, '2020-01-01', $3) RETURNING id`, [kode, `Uji ${kode}`, anggotaId])).rows[0].id;

test('periode: rentang dari pengaturan, buka ulang mengembalikan yang sama', () => inTx(async (db) => {
    await db.query("DELETE FROM pengaturan_web WHERE kunci = 'gaji'"); // bawaan: tanggal awal 23
    const a = await bukaPeriode(db, '2031-03', 'uji');
    assert.deepEqual([a.dari, a.sampai, a.status], ['2031-02-23', '2031-03-22', 'draf']);
    assert.equal((await bukaPeriode(db, '2031-03', 'uji')).id, a.id);
    await gagal(db, () => bukaPeriode(db, '2031-3', 'uji'), /YYYY-MM/);
}));

test('kehadiran: atur, kosongkan, isi pola tanpa menimpa, tolak di luar periode dan periode final', () => inTx(async (db) => {
    await db.query("DELETE FROM pengaturan_web WHERE kunci = 'gaji'");
    await db.query('UPDATE karyawan SET aktif = false'); // grid hanya berisi karyawan uji
    const k = await karyawan(db, 'UJI01');
    const p = await bukaPeriode(db, '2031-03', 'uji');
    await aturHadir(db, { periodeId: p.id, karyawanId: k, tanggal: '2031-02-24', kode: 'ABS' });
    await aturHadir(db, { periodeId: p.id, karyawanId: k, tanggal: '2031-02-25', kode: 'MED' });
    await aturHadir(db, { periodeId: p.id, karyawanId: k, tanggal: '2031-02-25', kode: null });
    await gagal(db, () => aturHadir(db, { periodeId: p.id, karyawanId: k, tanggal: '2031-03-23', kode: 'ATN' }), /di luar periode/);
    await gagal(db, () => aturHadir(db, { periodeId: p.id, karyawanId: k, tanggal: '2031-02-24', kode: 'XYZ' }), /tidak dikenal/);

    // 23 Feb - 22 Mar 2031 = 28 hari; Minggu: 23 Feb, 2, 9, 16 Mar = 4 hari RD. 24 Feb sudah ABS, jadi 27 hari diisi pola.
    const isi = await isiHadirKosong(db, { periodeId: p.id, karyawanId: k, pola: true });
    assert.equal(isi.pola, 27);
    const [g] = await gridHadir(db, p.id);
    assert.equal(g.kode, 'UJI01');
    assert.deepEqual(g.jumlah, { ABS: 1, RD: 4, ATN: 23 });
    assert.equal(g.hari['2031-02-24'], 'ABS', 'isian lama tidak ditimpa');
    assert.equal(g.hari['2031-02-23'], 'RD');

    await db.query("UPDATE gaji_periode SET status = 'final' WHERE id = $1", [p.id]);
    await gagal(db, () => aturHadir(db, { periodeId: p.id, karyawanId: k, tanggal: '2031-02-24', kode: 'ATN' }), /sudah final/);
}));

test('pindai QR: karyawan tertaut anggota boleh absen, harinya terisi ATN', () => inTx(async (db) => {
    const anggota = Number((await db.query("SELECT id FROM anggota WHERE aktif AND status_staff <> 'Staff' ORDER BY id LIMIT 1")).rows[0].id);
    const pindai = async () => absenQr(db, (await buatQr(db, anggota, 'anggota'))!.teks);
    const ditolak = await pindai();
    assert.ok(!ditolak.ok && /bukan staff/.test(ditolak.error), 'anggota biasa tetap ditolak');

    const k = await karyawan(db, 'UJI02', anggota);
    const r = await pindai();
    assert.ok(r.ok && /masuk pukul/.test(r.pesan));
    const hari = (await db.query<{ t: string }>("SELECT (now() AT TIME ZONE 'Asia/Jakarta')::date::text t")).rows[0].t;
    const periode = (await db.query<{ id: string }>(`INSERT INTO gaji_periode (periode, dari, sampai, dibuat_oleh) VALUES ('2099-01', $1, $1, 'uji') RETURNING id`, [hari])).rows[0].id;
    const isi = await isiHadirKosong(db, { periodeId: periode, karyawanId: k, pola: false });
    assert.equal(isi.qr, 1);
    const g = (await gridHadir(db, periode)).find((x) => x.karyawan_id === k)!;
    assert.equal(g.hari[hari], 'ATN');
}));

test('lembur: jenis hari dari kehadiran, jam dan bobot seperti Rate Lembur, simpan ulang memperbarui, tolak hari tidak hadir', () => inTx(async (db) => {
    await db.query("DELETE FROM pengaturan_web WHERE kunci = 'gaji'"); // 6 hari kerja
    const k = await karyawan(db, 'UJI03');
    const p = await bukaPeriode(db, '2031-03', 'uji');
    await aturHadir(db, { periodeId: p.id, karyawanId: k, tanggal: '2031-03-02', kode: 'RD' });
    await aturHadir(db, { periodeId: p.id, karyawanId: k, tanggal: '2031-03-04', kode: 'MED' });
    const dasar = { periodeId: p.id, karyawanId: k, opr: 'uji' };

    // Hari kerja 17:00-21:00 = 4 jam, dikurangi 1 jam istirahat = 3 jam, bobot 1,5 + 2 + 2.
    const a = await simpanLembur(db, { ...dasar, tanggal: '2031-03-03', mulai: '17:00', selesai: '21:00' });
    assert.deepEqual([a.jam, a.jamBobot], [3, 5.5]);
    // Hari istirahat (RD) 08:00-17:00 = 9 jam: 7 x 2 + 3 + 4.
    const b = await simpanLembur(db, { ...dasar, tanggal: '2031-03-02', mulai: '08:00', selesai: '17:00', keterangan: 'stok opname' });
    assert.deepEqual([b.jam, b.jamBobot], [9, 21]);
    // Simpan ulang hari yang sama memperbarui, bukan menambah.
    const c = await simpanLembur(db, { ...dasar, tanggal: '2031-03-03', mulai: '17:00', selesai: '19:00' });
    assert.deepEqual([c.jam, c.jamBobot], [2, 3.5]);
    const l = await daftarLembur(db, p.id);
    assert.deepEqual(l.map((x) => [x.tanggal, x.jenis_hari, x.jam, x.jam_bobot]), [['2031-03-02', 'istirahat', 9, 21], ['2031-03-03', 'kerja', 2, 3.5]]);

    await gagal(db, () => simpanLembur(db, { ...dasar, tanggal: '2031-03-04', mulai: '17:00', selesai: '20:00' }), /MED/);
    await gagal(db, () => simpanLembur(db, { ...dasar, tanggal: '2031-03-05', mulai: '17:00', selesai: '17:30' }), /kurang dari 1 jam/);
    await gagal(db, () => simpanLembur(db, { ...dasar, tanggal: '2031-03-23', mulai: '17:00', selesai: '20:00' }), /di luar periode/);
    await gagal(db, () => simpanLembur(db, { ...dasar, tanggal: '2031-03-05', mulai: '25:00', selesai: '20:00' }), /HH:MM/);

    await hapusLembur(db, l[0].id);
    assert.equal((await daftarLembur(db, p.id)).length, 1);
    await db.query("UPDATE gaji_periode SET status = 'final' WHERE id = $1", [p.id]);
    await gagal(db, () => hapusLembur(db, l[1].id), /sudah final/);
}));
