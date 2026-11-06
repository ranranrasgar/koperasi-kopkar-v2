import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { catatAktivitas, catatLoginGagal, hapusAktif, hapusRiwayat, namaPerangkat, tandaiAktif } from '../src/aktivitas.ts';
import { createPool, withTx, type Db } from '../src/db.ts';

const pool = createPool();
after(() => pool.end());

class Batal extends Error {}
const inTx = (fn: (db: Db) => Promise<void>) => withTx(pool, async (db) => { await fn(db); throw new Batal(); }).catch((e) => { if (!(e instanceof Batal)) throw e; });
const ID = 999_999_001;

test('tandaiAktif: satu baris per kanal, sinyal berikutnya memperbarui halaman, keluar menghapus', () => inTx(async (db) => {
    await tandaiAktif(db, { kanal: 'pwa', penggunaId: ID, nama: 'Uji', kode: 'K1', halaman: '/beranda', perangkat: 'Chrome, Android' });
    await tandaiAktif(db, { kanal: 'pwa', penggunaId: ID, nama: 'Uji', kode: 'K1', halaman: '/ajukan', perangkat: 'Chrome, Android' });
    await tandaiAktif(db, { kanal: 'android', penggunaId: ID, nama: 'Uji' });
    const r = (await db.query('SELECT kanal, halaman FROM pengguna_aktif WHERE pengguna_id = $1 ORDER BY kanal', [ID])).rows;
    assert.deepEqual(r, [{ kanal: 'android', halaman: null }, { kanal: 'pwa', halaman: '/ajukan' }]);
    await hapusAktif(db, 'pwa', ID);
    assert.equal((await db.query('SELECT 1 FROM pengguna_aktif WHERE pengguna_id = $1', [ID])).rowCount, 1);
}));

test('catatAktivitas: nilai rupiah dibuang, modul dirapikan, data lewat 90 hari dipangkas', () => inTx(async (db) => {
    await db.query("INSERT INTO log_aktivitas (waktu, kanal, pengguna_id, nama, aksi) VALUES (now() - interval '91 days', 'admin', $1, 'lama', 'login')", [ID]);
    await catatAktivitas(db, { kanal: 'admin', penggunaId: ID, nama: 'Uji', aksi: 'simpan', modul: 'Audit Data (web)', ket: 'Bayar Rp 1.722.839 tercatat' }, 1);
    const r = (await db.query('SELECT nama, modul, ket FROM log_aktivitas WHERE pengguna_id = $1', [ID])).rows;
    assert.deepEqual(r, [{ nama: 'Uji', modul: 'Audit Data', ket: 'Bayar Rp ... tercatat' }]);
}));

test('login gagal: tanpa akun, teks ketikan tidak disimpan', () => inTx(async (db) => {
    await catatLoginGagal(db, 'pwa', null, null);
    const r = (await db.query("SELECT nama FROM log_aktivitas WHERE aksi = 'login_gagal' ORDER BY id DESC LIMIT 1")).rows[0];
    assert.equal(r.nama, '(tidak dikenal)');
}));

test('hapusRiwayat: menurut umur, atau semua', () => inTx(async (db) => {
    await db.query("INSERT INTO log_aktivitas (waktu, kanal, nama, aksi) VALUES (now() - interval '40 days', 'admin', 'lama', 'login'), (now(), 'admin', 'baru', 'login')");
    assert.equal(await hapusRiwayat(db, 30), 1);
    assert.deepEqual((await db.query("SELECT nama FROM log_aktivitas WHERE nama IN ('lama', 'baru')")).rows, [{ nama: 'baru' }]);
    assert.ok(await hapusRiwayat(db, null) >= 1);
    assert.equal((await db.query('SELECT 1 FROM log_aktivitas')).rowCount, 0);
}));

test('namaPerangkat: ringkas dari User-Agent', () => {
    assert.equal(namaPerangkat('Mozilla/5.0 (Windows NT 10.0) Chrome/120.0 Safari/537'), 'Chrome, Windows');
    assert.equal(namaPerangkat('Mozilla/5.0 (Linux; Android 13) Chrome/120.0 Mobile Safari/537'), 'Chrome, Android');
    assert.equal(namaPerangkat(null), 'Tidak dikenal');
});
