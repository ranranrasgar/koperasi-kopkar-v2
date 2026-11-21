import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { createPool, withTx, type Db } from '../src/db.ts';
import { bukaKembaliPeriode, finalkanPeriode, rekapGaji, simpanIsianSlip } from '../src/gaji/penggajian.ts';
import { aturHadir, bukaPeriode, isiHadirKosong, simpanLembur } from '../src/gaji/periode.ts';

const pool = createPool();
after(() => pool.end());

class Batal extends Error {}
const inTx = (fn: (db: Db) => Promise<void>) => withTx(pool, async (db) => { await fn(db); throw new Batal(); }).catch((e) => { if (!(e instanceof Batal)) throw e; });
const gagal = async (db: Db, fn: () => Promise<unknown>, pola: RegExp) => {
    await db.query('SAVEPOINT g'); await assert.rejects(fn(), pola); await db.query('ROLLBACK TO SAVEPOINT g');
};

test('penggajian: rekap dari kehadiran, lembur, dan isian; final menyalin hasil; buka kembali', () => inTx(async (db) => {
    // Pengaturan Excel 2015 supaya angka bisa dicocokkan dengan sheet Master Karyawan (K007).
    await db.query(`INSERT INTO pengaturan_web (kunci, nilai) VALUES ('gaji', $1) ON CONFLICT (kunci) DO UPDATE SET nilai = EXCLUDED.nilai`,
        [JSON.stringify({ jpPersen: 0, kesPersen: 0.5, premiPerusahaanPersen: 0, kesPerusahaanPersen: 0 })]);
    await db.query('UPDATE karyawan SET aktif = false');
    const k = (await db.query<{ id: string }>(`INSERT INTO karyawan (kode, nama, umk, tunj_jabatan, tgl_masuk) VALUES ('UJI07', 'Uji K007', 2925000, 100000, '2020-01-01') RETURNING id`)).rows[0].id;
    const p = await bukaPeriode(db, '2031-03', 'uji'); // 23 Feb - 22 Mar 2031, 28 hari, 4 Minggu

    await aturHadir(db, { periodeId: p.id, karyawanId: k, tanggal: '2031-02-24', kode: 'ABS' });
    await isiHadirKosong(db, { periodeId: p.id, karyawanId: k, pola: false });
    let r = await rekapGaji(db, p.id);
    assert.equal(r.baris[0].hariKosong, 27);
    await gagal(db, () => finalkanPeriode(db, p.id, 'uji'), /belum lengkap: UJI07 \(27 hari kosong\)/);

    await isiHadirKosong(db, { periodeId: p.id, karyawanId: k, pola: true }); // 23 ATN, 4 RD, 1 ABS
    await simpanLembur(db, { periodeId: p.id, karyawanId: k, tanggal: '2031-03-03', mulai: '17:00', selesai: '21:00', opr: 'uji' }); // bobot 5,5
    await simpanIsianSlip(db, { periodeId: p.id, karyawanId: k, cadResiko: 50000, thr: 0, tunjLain: 0, potKoperasi: 100000, potLain: 345000, ketPotLain: 'cicilan laptop' });
    r = await rekapGaji(db, p.id);
    const g = r.baris[0].gaji;
    assert.deepEqual(r.baris[0].hadir, { ABS: 1, ATN: 23, RD: 4 });
    assert.deepEqual([g.potUmk, g.potTunjJabatan, g.gaji, g.transport, g.makan, g.uangLembur], [97500, 3333, 2924167, 161000, 230000, 96171]);
    assert.equal(g.gajiKotor, 2924167 + 161000 + 230000 + 96171 + 50000);
    assert.deepEqual([g.jht, g.kes, g.pph21], [60500, 15125, 0]);
    assert.equal(g.gajiBersih, g.gajiKotor - 60500 - 15125 - 100000 - 345000);

    const pesan = await finalkanPeriode(db, p.id, 'uji');
    assert.match(pesan, /final: 1 karyawan/);
    // Setelah final, perubahan data karyawan tidak mengubah rekap.
    await db.query("UPDATE karyawan SET umk = 9999999, nama = 'Berubah' WHERE id = $1", [k]);
    r = await rekapGaji(db, p.id);
    assert.equal(r.final, true);
    assert.deepEqual([r.baris[0].nama, r.baris[0].gaji.gajiBersih, r.baris[0].ketPotLain], ['Uji K007', g.gajiBersih, 'cicilan laptop']);
    await gagal(db, () => simpanIsianSlip(db, { periodeId: p.id, karyawanId: k, cadResiko: 0, thr: 0, tunjLain: 0, potKoperasi: 0, potLain: 0 }), /sudah final/);
    await gagal(db, () => aturHadir(db, { periodeId: p.id, karyawanId: k, tanggal: '2031-02-24', kode: 'ATN' }), /sudah final/);

    await bukaKembaliPeriode(db, p.id);
    r = await rekapGaji(db, p.id);
    assert.equal(r.final, false);
    assert.equal(r.baris[0].nama, 'Berubah', 'draf dihitung dari data terkini');
}));
