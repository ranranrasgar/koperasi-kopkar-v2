/** Jenis gambar yang boleh dipakai sebagai logo (SVG tidak, karena bisa memuat skrip). */
export const JENIS_LOGO = ["image/png", "image/jpeg", "image/webp", "image/gif"] as const

/**
 * Jenis gambar dari tanda tangan byte awal file, bukan dari nama atau tipe yang dikirim browser.
 * BMP (logo lama aplikasi desktop di perusahaan.logo) sengaja tidak dikenali: tanpa latar transparan
 * dan besar, sehingga web memakai logo bawaan sampai logo baru diunggah.
 */
export function jenisGambar(b: Uint8Array): (typeof JENIS_LOGO)[number] | null {
    const awal = (...x: number[]) => x.every((v, i) => b[i] === v)
    if (awal(0x89, 0x50, 0x4e, 0x47)) return "image/png"
    if (awal(0xff, 0xd8, 0xff)) return "image/jpeg"
    if (awal(0x47, 0x49, 0x46, 0x38)) return "image/gif"
    if (awal(0x52, 0x49, 0x46, 0x46) && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50) return "image/webp"
    return null
}
