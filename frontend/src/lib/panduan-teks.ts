// Utilitas teks panduan, dipakai server (halaman baca) dan klien (pratinjau editor).

/** Slug dari teks: huruf kecil, angka, dan strip. Dipakai untuk slug artikel dan jangkar judul bagian. */
export function slugTeks(teks: string) {
    return teks.normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase()
        .replace(/&/g, " dan ").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 120)
}

/** Judul bagian (## ...) di isi Markdown, untuk daftar isi "Di halaman ini". */
export function daftarIsi(isi: string) {
    const hasil: { id: string; judul: string }[] = []
    let dalamKode = false
    for (const baris of isi.split("\n")) {
        if (baris.startsWith("```")) dalamKode = !dalamKode
        const m = !dalamKode && baris.match(/^##\s+(.+?)\s*#*$/)
        if (m) {
            const judul = m[1].replace(/[*_`]/g, "").trim()
            hasil.push({ id: slugTeks(judul), judul })
        }
    }
    return hasil
}

export const SLUG_VALID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
