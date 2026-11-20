import type { Db } from '../db.ts';
import { PENGATURAN_BAWAAN, type BarisTer, type PengaturanGaji } from './hitung.ts';

// Pengaturan penggajian disimpan sebagai JSON di pengaturan_web (kunci 'gaji'); kunci yang belum diisi memakai bawaan.
type Q = Pick<Db, 'query'>;
export const KUNCI_PENGATURAN_GAJI = 'gaji';

export async function bacaPengaturanGaji(db: Q): Promise<PengaturanGaji> {
    const r = (await db.query<{ nilai: string }>('SELECT nilai FROM pengaturan_web WHERE kunci = $1', [KUNCI_PENGATURAN_GAJI])).rows[0];
    let isi: Partial<PengaturanGaji> = {};
    try { isi = r ? JSON.parse(r.nilai) : {}; } catch { isi = {}; }
    const hasil = { ...PENGATURAN_BAWAAN };
    for (const k of Object.keys(PENGATURAN_BAWAAN) as (keyof PengaturanGaji)[]) {
        const v = Number(isi[k]);
        if (isi[k] !== undefined && Number.isFinite(v)) (hasil as Record<string, number>)[k] = v;
    }
    return hasil;
}

/** Label isian pengaturan (form dan pesan galat). */
export const LABEL_PENGATURAN: Record<keyof PengaturanGaji, string> = {
    tanggalAwal: 'Tanggal awal periode', transportPerHari: 'Tunjangan transport per hari', makanPerHari: 'Tunjangan makan per hari',
    pembagiHarian: 'Pembagi potongan harian', pembagiLembur: 'Pembagi upah lembur per jam', hariKerjaSeminggu: 'Hari kerja seminggu',
    jhtPersen: 'JHT karyawan (%)', jpPersen: 'Jaminan Pensiun karyawan (%)', kesPersen: 'BPJS Kesehatan karyawan (%)',
    premiPerusahaanPersen: 'JKK + JKM dibayar koperasi (%)', kesPerusahaanPersen: 'BPJS Kesehatan dibayar koperasi (%)', hakCutiTahunan: 'Hak cuti tahunan (hari)',
};

/** Batas isian pengaturan: [min, maks, bulat]. */
export const BATAS_PENGATURAN: Record<keyof PengaturanGaji, [number, number, boolean]> = {
    tanggalAwal: [1, 28, true], transportPerHari: [0, 10_000_000, true], makanPerHari: [0, 10_000_000, true], pembagiHarian: [1, 31, true],
    pembagiLembur: [1, 400, true], hariKerjaSeminggu: [5, 6, true], jhtPersen: [0, 100, false], jpPersen: [0, 100, false], kesPersen: [0, 100, false],
    premiPerusahaanPersen: [0, 100, false], kesPerusahaanPersen: [0, 100, false], hakCutiTahunan: [0, 60, true],
};

export async function simpanPengaturanGaji(db: Q, isi: Record<string, string>, opr: string): Promise<PengaturanGaji> {
    const hasil = { ...PENGATURAN_BAWAAN };
    for (const [k, [min, maks, bulat]] of Object.entries(BATAS_PENGATURAN) as [keyof PengaturanGaji, [number, number, boolean]][]) {
        const s = String(isi[k] ?? '').trim().replace(',', '.');
        const v = Number(s);
        if (!s || !Number.isFinite(v) || (bulat && !Number.isInteger(v)) || v < min || v > maks) throw new Error(`${LABEL_PENGATURAN[k]} harus ${bulat ? 'bilangan bulat ' : ''}${min} sampai ${maks}`);
        (hasil as Record<string, number>)[k] = v;
    }
    await db.query(`INSERT INTO pengaturan_web (kunci, nilai, diubah_pada, diubah_oleh) VALUES ($1, $2, now(), $3)
        ON CONFLICT (kunci) DO UPDATE SET nilai = EXCLUDED.nilai, diubah_pada = now(), diubah_oleh = EXCLUDED.diubah_oleh`,
    [KUNCI_PENGATURAN_GAJI, JSON.stringify(hasil), opr.slice(0, 50)]);
    return hasil;
}

export async function bacaTer(db: Q): Promise<BarisTer[]> {
    return (await db.query<{ kategori: 'A' | 'B' | 'C'; batas_bawah: string; tarif: string }>('SELECT kategori, batas_bawah, tarif FROM gaji_ter ORDER BY kategori, batas_bawah')).rows
        .map((r) => ({ kategori: r.kategori, batasBawah: Number(r.batas_bawah), tarif: Number(r.tarif) }));
}
