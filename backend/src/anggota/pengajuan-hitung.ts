import { jadwal, ONE, persenToMicro, type Terms } from '../posting/pinjaman-calc.ts';

// Estimasi angsuran pengajuan kredit, tanpa database supaya bisa dipakai juga di browser (PWA, saat anggota mengetik).
// Memakai jadwal mesin posting (keputusan K4), jadi angkanya sama dengan jadwal yang terbentuk saat pinjaman dicairkan.

export interface ProdukKredit {
    persenBunga: string;    // dari jenis_kredit, mis. '2.000000'
    perAngsuran: boolean;   // bunga_per = 'PER ANGSURAN'
    persenAdm: string;
    persenProvisi: string;
}

export interface Estimasi {
    pokok: number;          // pokok per bulan
    jasa: number;           // jasa per bulan
    biaya: number;          // adm + provisi, ditagih di angsuran pertama
    pertama: number;        // angsuran pertama (pokok + jasa + biaya)
    berikutnya: number;     // angsuran ke-2 dst.
    totalJasa: number;
}

const rp = (n: bigint) => Number(n / ONE);

/** Estimasi angsuran untuk besar pinjaman (rupiah bulat) dan lama (bulan); null bila isian belum lengkap. */
export function estimasiAngsuran(p: ProdukKredit, besar: number, lama: number): Estimasi | null {
    if (!Number.isSafeInteger(besar) || besar <= 0 || !Number.isInteger(lama) || lama < 1) return null;
    const t: Terms = {
        pokok: BigInt(besar) * ONE, persenBunga: persenToMicro(p.persenBunga), perAngsuran: p.perAngsuran, lama,
        persenAdm: persenToMicro(p.persenAdm), persenProvisi: persenToMicro(p.persenProvisi),
    };
    const [a1] = jadwal(t);
    const biaya = a1.adm + a1.provisi;
    return {
        pokok: rp(a1.pokok), jasa: rp(a1.jasa), biaya: rp(biaya),
        pertama: rp(a1.pokok + a1.jasa + biaya), berikutnya: rp(a1.pokok + a1.jasa), totalJasa: rp(a1.jasa) * lama,
    };
}
