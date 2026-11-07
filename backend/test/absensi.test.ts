import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { absenQr, GalatAbsen, hapusAbsen, ubahAbsen } from '../src/absensi.ts';
import { buatQr } from '../src/anggota/qr.ts';
import { createPool, withTx, type Db } from '../src/db.ts';

const pool = createPool();
after(() => pool.end());

class Batal extends Error {}
const inTx = (fn: (db: Db) => Promise<void>) => withTx(pool, async (db) => { await fn(db); throw new Batal(); }).catch((e) => { if (!(e instanceof Batal)) throw e; });
const ambil = async (db: Db, syarat: string) => Number((await db.query(`SELECT id FROM anggota WHERE ${syarat} LIMIT 1`)).rows[0].id);
const pindai = async (db: Db, id: number) => absenQr(db, (await buatQr(db, id, 'anggota'))!.teks);

test('staff: pindai pertama masuk, pindai ulang cepat diabaikan, lewat jeda pulang', () => inTx(async (db) => {
    const id = await ambil(db, "aktif AND status_staff = 'Staff'");
    await db.query('DELETE FROM absensi_staff WHERE anggota_id = $1', [id]);

    const r1 = await pindai(db, id);
    assert.ok(r1.ok);
    assert.match(r1.pesan, /masuk pukul/);
    const r2 = await pindai(db, id);
    assert.ok(r2.ok);
    assert.match(r2.pesan, /sudah absen hari ini: masuk \d\d:\d\d, pulang belum/);
    assert.equal(r2.sudah, true);

    await db.query("UPDATE absensi_staff SET masuk = masuk - interval '6 minutes' WHERE anggota_id = $1", [id]);
    const r3 = await pindai(db, id);
    assert.ok(r3.ok);
    assert.match(r3.pesan, /pulang pukul/);
    const baris = await db.query('SELECT pulang FROM absensi_staff WHERE anggota_id = $1', [id]);
    assert.equal(baris.rowCount, 1);
    assert.ok(baris.rows[0].pulang);

    const r4 = await pindai(db, id);
    assert.ok(r4.ok);
    assert.equal(r4.sudah, true);
    assert.match(r4.pesan, /sudah absen hari ini: masuk \d\d:\d\d, pulang \d\d:\d\d/);
}));

test('ubah jam mengikuti WIB, urutan jam diperiksa, hapus menghilangkan baris', () => inTx(async (db) => {
    const anggota = await ambil(db, "aktif AND status_staff = 'Staff'");
    await db.query('DELETE FROM absensi_staff WHERE anggota_id = $1', [anggota]);
    await pindai(db, anggota);
    const id = Number((await db.query('SELECT id FROM absensi_staff WHERE anggota_id = $1', [anggota])).rows[0].id);

    assert.match(await ubahAbsen(db, id, '08:15', '17:30'), /masuk 08:15, pulang 17:30/);
    const jam = (await db.query(`SELECT to_char(masuk AT TIME ZONE 'Asia/Jakarta', 'HH24:MI') m, to_char(pulang AT TIME ZONE 'Asia/Jakarta', 'HH24:MI') p FROM absensi_staff WHERE id = $1`, [id])).rows[0];
    assert.deepEqual([jam.m, jam.p], ['08:15', '17:30']);

    await ubahAbsen(db, id, '08:15', '');
    assert.equal((await db.query('SELECT pulang FROM absensi_staff WHERE id = $1', [id])).rows[0].pulang, null);

    await assert.rejects(ubahAbsen(db, id, '17:00', '08:00'), GalatAbsen);
    await assert.rejects(ubahAbsen(db, id, '25:00', ''), GalatAbsen);
    assert.match(await hapusAbsen(db, id), /dihapus/);
    await assert.rejects(hapusAbsen(db, id), GalatAbsen);
}));

test('bukan staff, staff nonaktif, dan QR asing ditolak tanpa mencatat', () => inTx(async (db) => {
    const bukan = await ambil(db, "aktif AND status_staff = 'No Staff'");
    const r = await pindai(db, bukan);
    assert.equal(r.ok, false);
    assert.match(!r.ok ? r.error : '', /bukan staff/);
    assert.equal((await db.query('SELECT 1 FROM absensi_staff WHERE anggota_id = $1', [bukan])).rowCount, 0);

    const nonaktif = await ambil(db, "NOT aktif AND status_staff = 'Staff'");
    assert.equal((await pindai(db, nonaktif)).ok, false);
    assert.equal((await absenQr(db, 'KOPKAR1:tidak-ada')).ok, false);
}));
