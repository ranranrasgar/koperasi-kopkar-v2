// Mesin hitung gaji karyawan koperasi (docs/prd-penggajian.md). Murni: tanpa database, jadi bisa diuji dengan angka Excel lama.
// Semua uang dalam rupiah bulat (bigint); tiap komponen dibulatkan ke rupiah terdekat (setengah ke atas) seperti slip yang dibayar.

export type KodeHadir = 'ATN' | 'RD' | 'ABS' | 'ANN' | 'MED' | 'MAT' | 'UNP';
export const KODE_HADIR: Record<KodeHadir, string> = {
    ATN: 'Hadir', RD: 'Libur', ABS: 'Tidak hadir (X)', ANN: 'Cuti tahunan (L)', MED: 'Sakit (S)', MAT: 'Melahirkan (M)', UNP: 'Izin tanpa upah',
};
export type StatusPtkp = 'TK/0' | 'TK/1' | 'TK/2' | 'TK/3' | 'K/0' | 'K/1' | 'K/2' | 'K/3';
export const STATUS_PTKP: StatusPtkp[] = ['TK/0', 'TK/1', 'TK/2', 'TK/3', 'K/0', 'K/1', 'K/2', 'K/3'];

export interface PengaturanGaji {
    tanggalAwal: number; transportPerHari: number; makanPerHari: number; pembagiHarian: number; pembagiLembur: number; hariKerjaSeminggu: 5 | 6;
    jhtPersen: number; jpPersen: number; kesPersen: number; premiPerusahaanPersen: number; kesPerusahaanPersen: number; hakCutiTahunan: number;
}
export const PENGATURAN_BAWAAN: PengaturanGaji = {
    tanggalAwal: 23, transportPerHari: 7000, makanPerHari: 10000, pembagiHarian: 30, pembagiLembur: 173, hariKerjaSeminggu: 6,
    jhtPersen: 2, jpPersen: 1, kesPersen: 1, premiPerusahaanPersen: 0.54, kesPerusahaanPersen: 4, hakCutiTahunan: 12,
};

/** Baris tabel TER: tarif (persen) berlaku untuk bruto >= batasBawah sampai batas berikutnya. */
export interface BarisTer { kategori: 'A' | 'B' | 'C'; batasBawah: number; tarif: number }

/** Kategori TER menurut status PTKP (PP 58/2023). */
export function kategoriTer(s: StatusPtkp): 'A' | 'B' | 'C' {
    if (s === 'TK/0' || s === 'TK/1' || s === 'K/0') return 'A';
    if (s === 'K/3') return 'C';
    return 'B';
}

const bagi = (a: bigint, b: bigint) => (a >= 0n ? (2n * a + b) / (2n * b) : -((-2n * a + b) / (2n * b))); // pembulatan setengah ke atas
/** persen (mis. 0.54) dari dasar rupiah, dibulatkan. Persen disimpan sampai 4 desimal. */
export const persenDari = (dasar: bigint, persen: number) => bagi(dasar * BigInt(Math.round(persen * 10000)), 1_000_000n);

export function tarifTer(ter: BarisTer[], kategori: 'A' | 'B' | 'C', bruto: bigint): number {
    let tarif = 0;
    for (const t of ter) if (t.kategori === kategori && bruto >= BigInt(Math.round(t.batasBawah)) && t.tarif >= tarif) tarif = t.tarif;
    return tarif;
}

/**
 * Jam lembur dari jam mulai/selesai ('HH:MM'; selesai lebih kecil = lewat tengah malam), dibulatkan ke bawah per jam penuh seperti Excel (fungsi HOUR).
 * Di hari kerja, lembur lebih dari 3 jam dikurangi 1 jam istirahat.
 */
export function jamLembur(mulai: string, selesai: string, jenisHari: 'kerja' | 'istirahat'): number {
    const menit = (j: string) => { const [h, m] = j.split(':').map(Number); return h * 60 + m; };
    let durasi = menit(selesai) - menit(mulai);
    if (durasi < 0) durasi += 24 * 60;
    const jam = Math.floor(durasi / 60);
    return jenisHari === 'kerja' && jam > 3 ? jam - 1 : jam;
}

/**
 * Jam lembur berbobot (Kepmenakertrans 102/2004, sheet Rate Lembur). Hari kerja: jam ke-1 x1,5, berikutnya x2.
 * Hari istirahat, 6 hari kerja seminggu: jam 1-7 x2, jam 8 x3, jam 9 dst x4. 5 hari kerja: jam 1-8 x2, jam 9 x3, jam 10 dst x4.
 */
export function jamBobot(jam: number, jenisHari: 'kerja' | 'istirahat', hariKerjaSeminggu: 5 | 6): number {
    let total = 0;
    for (let i = 1; i <= Math.floor(jam); i++) {
        if (jenisHari === 'kerja') total += i === 1 ? 1.5 : 2;
        else {
            const batas = hariKerjaSeminggu === 6 ? 7 : 8;
            total += i <= batas ? 2 : i === batas + 1 ? 3 : 4;
        }
    }
    return total;
}

export interface InputGaji {
    umk: bigint; tunjJabatan: bigint; statusPtkp: StatusPtkp;
    /** Jumlah hari per kode kehadiran dalam periode. */
    hadir: Partial<Record<KodeHadir, number>>;
    /** Jumlah jam lembur berbobot dalam periode. */
    jamBobot: number;
    cadResiko: bigint; thr: bigint; tunjLain: bigint; potKoperasi: bigint; potLain: bigint;
}

export interface HasilGaji {
    jmlUpah: bigint; hariPotong: number; potUmk: bigint; potTunjJabatan: bigint; gaji: bigint;
    hk: number; transport: bigint; makan: bigint; upahLemburPerJam: bigint; uangLembur: bigint;
    cadResiko: bigint; thr: bigint; tunjLain: bigint; gajiKotor: bigint;
    jht: bigint; jp: bigint; kes: bigint; premiPerusahaan: bigint; kesPerusahaan: bigint;
    bruto: bigint; kategoriTer: 'A' | 'B' | 'C'; tarifTer: number; pph21: bigint;
    potKoperasi: bigint; potLain: bigint; totalPotongan: bigint; gajiBersih: bigint;
}

/** Hitung gaji satu karyawan satu periode (pola Master Karyawan di Excel, PPh 21 cara TER). */
export function hitungGaji(i: InputGaji, p: PengaturanGaji, ter: BarisTer[]): HasilGaji {
    const jmlUpah = i.umk + i.tunjJabatan;
    // Alpa dan izin tanpa upah memotong upah per hari (pembagi 30).
    const hariPotong = (i.hadir.ABS ?? 0) + (i.hadir.UNP ?? 0);
    const pembagi = BigInt(p.pembagiHarian);
    const potUmk = bagi(i.umk * BigInt(hariPotong), pembagi);
    const potTunjJabatan = bagi(i.tunjJabatan * BigInt(hariPotong), pembagi);
    const gaji = jmlUpah - potUmk - potTunjJabatan;
    const hk = i.hadir.ATN ?? 0;
    const transport = BigInt(hk) * BigInt(Math.round(p.transportPerHari));
    const makan = BigInt(hk) * BigInt(Math.round(p.makanPerHari));
    const upahLemburPerJam = bagi(jmlUpah, BigInt(p.pembagiLembur));
    // Jam berbobot kelipatan 0,5: hitung dalam setengah jam supaya tetap bulat.
    const uangLembur = bagi(jmlUpah * BigInt(Math.round(i.jamBobot * 2)), 2n * BigInt(p.pembagiLembur));
    const gajiKotor = gaji + transport + makan + uangLembur + i.cadResiko + i.thr + i.tunjLain;
    const jht = persenDari(jmlUpah, p.jhtPersen);
    const jp = persenDari(jmlUpah, p.jpPersen);
    const kes = persenDari(jmlUpah, p.kesPersen);
    const premiPerusahaan = persenDari(gaji, p.premiPerusahaanPersen);
    const kesPerusahaan = persenDari(jmlUpah, p.kesPerusahaanPersen);
    const bruto = gajiKotor + premiPerusahaan + kesPerusahaan;
    const kategori = kategoriTer(i.statusPtkp);
    const tarif = tarifTer(ter, kategori, bruto);
    // PPh dibulatkan ke bawah ke rupiah.
    const pph21 = bruto > 0n ? (bruto * BigInt(Math.round(tarif * 1000))) / 100_000n : 0n;
    const totalPotongan = jht + jp + kes + pph21 + i.potKoperasi + i.potLain;
    return {
        jmlUpah, hariPotong, potUmk, potTunjJabatan, gaji, hk, transport, makan, upahLemburPerJam, uangLembur,
        cadResiko: i.cadResiko, thr: i.thr, tunjLain: i.tunjLain, gajiKotor, jht, jp, kes, premiPerusahaan, kesPerusahaan,
        bruto, kategoriTer: kategori, tarifTer: tarif, pph21, potKoperasi: i.potKoperasi, potLain: i.potLain, totalPotongan,
        gajiBersih: gajiKotor - totalPotongan,
    };
}

/** Tanggal awal dan akhir periode 'YYYY-MM' (bulan akhir): tanggalAwal bulan lalu s/d sehari sebelumnya bulan ini. */
export function rentangPeriode(periode: string, tanggalAwal: number): { dari: string; sampai: string } {
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(periode)) throw new Error('Periode harus YYYY-MM');
    if (!Number.isInteger(tanggalAwal) || tanggalAwal < 1 || tanggalAwal > 28) throw new Error('Tanggal awal periode harus 1 sampai 28');
    const [y, m] = periode.split('-').map(Number);
    const tgl = (d: Date) => d.toISOString().slice(0, 10);
    if (tanggalAwal === 1) return { dari: tgl(new Date(Date.UTC(y, m - 1, 1))), sampai: tgl(new Date(Date.UTC(y, m, 0))) };
    return { dari: tgl(new Date(Date.UTC(y, m - 2, tanggalAwal))), sampai: tgl(new Date(Date.UTC(y, m - 1, tanggalAwal - 1))) };
}
