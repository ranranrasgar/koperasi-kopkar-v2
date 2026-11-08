// Teks notifikasi dan email yang bisa disesuaikan pengurus (Pengaturan Perusahaan), disimpan di pengaturan_web dengan kunci
// `templat.<kunci>`. Kosong atau tidak ada = teks bawaan di bawah. Isian memakai {peubah} yang diganti nilainya saat dikirim.

interface Db { query: (sql: string, params?: unknown[]) => Promise<{ rows: any[] }> }

export interface BidangTemplat {
    /** Kunci pendek, mis. 'pengajuan_disetujui.judul'; kunci pengaturan_web = `templat.${kunci}`. */
    kunci: string;
    kelompok: string;
    label: string;
    bawaan: string;
    /** Peubah {nama} yang boleh dipakai; peubah lain ditolak saat disimpan. */
    peubah: string[];
    /** Panjang maksimal teks yang disimpan. Judul dan isi notifikasi mengikuti batas push (50 dan 500 karakter). */
    maks: number;
    panjang?: boolean;
}

const PENGAJUAN = ['nama', 'jenis', 'pokok', 'lama'];
const PENCAIRAN = ['nama', 'jenis', 'pokok', 'lama', 'tanggal', 'no_pinjaman', 'angsuran1', 'jatuh_tempo1', 'keterangan'];

export const BIDANG_TEMPLAT: BidangTemplat[] = [
    { kunci: 'pengajuan_disetujui.judul', kelompok: 'Pengajuan kredit disetujui', label: 'Judul notifikasi dan email', bawaan: 'Pengajuan kredit disetujui', peubah: PENGAJUAN, maks: 50 },
    { kunci: 'pengajuan_disetujui.isi', kelompok: 'Pengajuan kredit disetujui', label: 'Isi notifikasi dan email', bawaan: 'Pengajuan {jenis} {pokok} ({lama} bulan) disetujui. Pencairan diproses oleh koperasi.', peubah: PENGAJUAN, maks: 500, panjang: true },
    { kunci: 'pengajuan_ditolak.judul', kelompok: 'Pengajuan kredit ditolak', label: 'Judul notifikasi dan email', bawaan: 'Pengajuan kredit ditolak', peubah: PENGAJUAN, maks: 50 },
    { kunci: 'pengajuan_ditolak.isi', kelompok: 'Pengajuan kredit ditolak', label: 'Isi notifikasi dan email', bawaan: 'Pengajuan {jenis} {pokok} ({lama} bulan) tidak disetujui. Hubungi pengurus koperasi untuk keterangan.', peubah: PENGAJUAN, maks: 500, panjang: true },
    { kunci: 'pencairan.judul', kelompok: 'Pinjaman dicairkan', label: 'Judul notifikasi dan email', bawaan: 'Pinjaman Anda sudah dicairkan', peubah: PENCAIRAN, maks: 50 },
    { kunci: 'pencairan.isi', kelompok: 'Pinjaman dicairkan', label: 'Isi notifikasi', bawaan: '{jenis} {pokok} ({lama} bulan) dicairkan {tanggal}. Angsuran ke-1 {angsuran1} jatuh tempo {jatuh_tempo1}. Jadwal lengkap dikirim ke email Anda.', peubah: PENCAIRAN, maks: 500, panjang: true },
    { kunci: 'pencairan.email_pembuka', kelompok: 'Pinjaman dicairkan', label: 'Email: kalimat pembuka (sebelum rincian kredit)', bawaan: 'Pinjaman Anda telah dicairkan. Berikut informasinya:', peubah: PENCAIRAN, maks: 500, panjang: true },
    { kunci: 'pencairan.email_penutup', kelompok: 'Pinjaman dicairkan', label: 'Email: kalimat penutup (setelah jadwal angsuran)', bawaan: 'Jadwal angsuran lengkap tersedia di lampiran PDF email ini. Status pinjaman dan angsuran juga bisa dilihat kapan saja di aplikasi anggota.', peubah: PENCAIRAN, maks: 1000, panjang: true },
];

export const kunciTemplat = (kunci: string) => `templat.${kunci}`;

/** Ganti {peubah} dengan nilainya; peubah yang tidak dikenal dibiarkan apa adanya. */
export function isiTemplat(teks: string, nilai: Record<string, string>) {
    return teks.replace(/\{(\w+)\}/g, (m, k: string) => (k in nilai ? nilai[k] : m));
}

/** Peubah {…} di teks yang tidak ada di daftar `boleh`. */
export const peubahTakDikenal = (teks: string, boleh: string[]) => [...new Set([...teks.matchAll(/\{(\w+)\}/g)].map((m) => m[1]))].filter((k) => !boleh.includes(k));

/** Semua teks (tersimpan atau bawaan), per kunci pendek. Gagal membaca = semua bawaan, supaya pengiriman notifikasi tidak ikut gagal. */
export async function bacaTemplat(db: Db): Promise<Record<string, string>> {
    let simpan: Record<string, string> = {};
    try {
        const r = await db.query('SELECT kunci, nilai FROM pengaturan_web WHERE kunci = ANY($1::text[])', [BIDANG_TEMPLAT.map((b) => kunciTemplat(b.kunci))]);
        simpan = Object.fromEntries(r.rows.map((x) => [x.kunci as string, x.nilai as string]));
    } catch { /* tabel belum ada: pakai bawaan */ }
    return Object.fromEntries(BIDANG_TEMPLAT.map((b) => [b.kunci, simpan[kunciTemplat(b.kunci)]?.trim() || b.bawaan]));
}

/** Periksa dan bersihkan isian form: batas panjang dan peubah yang dikenal. Mengembalikan teks yang akan disimpan ('' = hapus, pakai bawaan). */
export function bersihkanTemplat(b: BidangTemplat, mentah: string): string {
    const t = mentah.replace(/\r\n/g, '\n').trim();
    if (!t) return '';
    if (t.length > b.maks) throw new Error(`${b.kelompok}, ${b.label}: maksimal ${b.maks} karakter (sekarang ${t.length})`);
    const salah = peubahTakDikenal(t, b.peubah);
    if (salah.length) throw new Error(`${b.kelompok}, ${b.label}: peubah ${salah.map((k) => `{${k}}`).join(', ')} tidak dikenal. Yang boleh: ${b.peubah.map((k) => `{${k}}`).join(', ')}`);
    return t;
}
