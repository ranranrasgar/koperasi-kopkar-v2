import test from 'node:test';
import assert from 'node:assert/strict';
import { hitungGaji, jamBobot, jamLembur, kategoriTer, PENGATURAN_BAWAAN, rentangPeriode, tarifTer, type BarisTer, type InputGaji } from '../src/gaji/hitung.ts';

// Pengaturan seperti Excel Oktober 2015: JHT 2%, BPJS 0,5%, tanpa JP dan premi perusahaan.
const EXCEL = { ...PENGATURAN_BAWAAN, jhtPersen: 2, jpPersen: 0, kesPersen: 0.5, premiPerusahaanPersen: 0, kesPerusahaanPersen: 0 };
const TER_A: BarisTer[] = [{ kategori: 'A', batasBawah: 0, tarif: 0 }, { kategori: 'A', batasBawah: 5400001, tarif: 0.25 }, { kategori: 'A', batasBawah: 5650001, tarif: 0.5 }];
const dasar = (x: Partial<InputGaji>): InputGaji => ({
    umk: 2925000n, tunjJabatan: 0n, statusPtkp: 'TK/0', hadir: {}, jamBobot: 0, cadResiko: 0n, thr: 0n, tunjLain: 0n, potKoperasi: 0n, potLain: 0n, ...x,
});

test('gaji sama dengan sheet Master Karyawan Excel (komponen di luar PPh)', () => {
    // K007: UMK 2.925.000 + T.jabatan 100.000, 27 hari hadir.
    const a = hitungGaji(dasar({ tunjJabatan: 100000n, hadir: { ATN: 27, RD: 4 }, potLain: 883333n }), EXCEL, TER_A);
    assert.deepEqual([a.jmlUpah, a.gaji, a.transport, a.makan, a.gajiKotor, a.jht, a.kes], [3025000n, 3025000n, 189000n, 270000n, 3484000n, 60500n, 15125n]);
    assert.equal(a.pph21, 0n, 'bruto 3,48 juta di bawah batas TER A');
    assert.equal(a.gajiBersih, 3484000n - 60500n - 15125n - 883333n);
    // K014: 1 hari tidak hadir memotong 1/30 UMK.
    const b = hitungGaji(dasar({ hadir: { ATN: 20, ABS: 1 } }), EXCEL, TER_A);
    assert.deepEqual([b.potUmk, b.gaji, b.transport, b.makan, b.gajiKotor, b.jht, b.kes], [97500n, 2827500n, 140000n, 200000n, 3167500n, 58500n, 14625n]);
    // K012: cadangan risiko 50.000.
    assert.equal(hitungGaji(dasar({ hadir: { ATN: 26 }, cadResiko: 50000n }), EXCEL, TER_A).gajiKotor, 3417000n);
    // K009: T.jabatan 1.284.354; JHT 84.187,08 dan BPJS 21.046,77 dibulatkan ke rupiah.
    const c = hitungGaji(dasar({ tunjJabatan: 1284354n, hadir: { ATN: 22 } }), EXCEL, TER_A);
    assert.deepEqual([c.jmlUpah, c.gajiKotor, c.jht, c.kes], [4209354n, 4583354n, 84187n, 21047n]);
    // Izin tanpa upah memotong seperti tidak hadir; tunjangan jabatan ikut terpotong.
    const d = hitungGaji(dasar({ tunjJabatan: 300000n, hadir: { ATN: 20, ABS: 1, UNP: 2 } }), EXCEL, TER_A);
    assert.deepEqual([d.hariPotong, d.potUmk, d.potTunjJabatan, d.gaji], [3, 292500n, 30000n, 2902500n]);
});

test('uang lembur = jam berbobot x jml. upah / 173', () => {
    const r = hitungGaji(dasar({ tunjJabatan: 100000n, hadir: { ATN: 27 }, jamBobot: 5.5 }), EXCEL, TER_A);
    assert.equal(r.upahLemburPerJam, 17486n); // 3.025.000 / 173 = 17.485,55
    assert.equal(r.uangLembur, 96171n); // 5,5 x 17.485,549...
});

test('jam lembur dan bobot sama dengan tabel Rate Lembur', () => {
    assert.equal(jamLembur('17:00', '21:00', 'kerja'), 3, 'lebih dari 3 jam di hari kerja dikurangi 1 jam istirahat');
    assert.equal(jamLembur('17:00', '20:00', 'kerja'), 3);
    assert.equal(jamLembur('08:00', '16:30', 'istirahat'), 8);
    assert.equal(jamLembur('22:00', '02:00', 'istirahat'), 4, 'lewat tengah malam');
    assert.deepEqual([1, 2, 3, 10].map((j) => jamBobot(j, 'kerja', 6)), [1.5, 3.5, 5.5, 19.5]);
    assert.deepEqual([1, 7, 8, 9, 10].map((j) => jamBobot(j, 'istirahat', 6)), [2, 14, 17, 21, 25]);
    assert.deepEqual([8, 9, 10].map((j) => jamBobot(j, 'istirahat', 5)), [16, 19, 23]);
});

test('PPh 21 TER: kategori dari status PTKP, tarif dari bruto, dibulatkan ke bawah', () => {
    assert.deepEqual(['TK/0', 'TK/1', 'K/0', 'TK/2', 'K/1', 'K/2', 'K/3'].map((s) => kategoriTer(s as never)), ['A', 'A', 'A', 'B', 'B', 'B', 'C']);
    assert.equal(tarifTer(TER_A, 'A', 5400000n), 0);
    assert.equal(tarifTer(TER_A, 'A', 5400001n), 0.25);
    const r = hitungGaji(dasar({ umk: 5000000n, hadir: { ATN: 26 } }), { ...EXCEL, kesPersen: 0 }, TER_A);
    assert.equal(r.bruto, 5442000n);
    assert.equal(r.pph21, 13605n); // 5.442.000 x 0,25%
    assert.equal(r.gajiBersih, r.gajiKotor - r.jht - r.pph21);
});

test('periode: tanggal 23 bulan lalu s/d 22 bulan ini', () => {
    assert.deepEqual(rentangPeriode('2015-10', 23), { dari: '2015-09-23', sampai: '2015-10-22' });
    assert.deepEqual(rentangPeriode('2026-01', 23), { dari: '2025-12-23', sampai: '2026-01-22' });
    assert.deepEqual(rentangPeriode('2026-02', 1), { dari: '2026-02-01', sampai: '2026-02-28' });
    assert.throws(() => rentangPeriode('2026-13', 23), /YYYY-MM/);
});
