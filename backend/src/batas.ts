// Pembatasan percobaan sederhana di memori proses. Cukup untuk menahan tebakan beruntun pada login, daftar, dan lupa
// password; bila nanti satu aplikasi dijalankan beberapa proses, pindahkan ke database atau Redis. Setiap proses
// (PWA anggota, mobile-api) punya catatannya sendiri.
const catatan = new Map<string, { n: number; sampai: number }>();

/** Catat satu percobaan untuk kunci; mengembalikan menit tunggu bila sudah melewati batas, atau 0 bila boleh. */
export function cobaLagi(kunci: string, maks: number, jendelaMs: number) {
    const now = Date.now(), c = catatan.get(kunci);
    if (c && c.sampai > now && c.n >= maks) return Math.ceil((c.sampai - now) / 60000);
    catatan.set(kunci, { n: c && c.sampai > now ? c.n + 1 : 1, sampai: c && c.sampai > now ? c.sampai : now + jendelaMs });
    if (catatan.size > 10000) for (const [k, v] of catatan) if (v.sampai <= now) catatan.delete(k);
    return 0;
}

export const pesanTunggu = (menit: number) => `Terlalu banyak percobaan. Coba lagi dalam ${menit} menit.`;
