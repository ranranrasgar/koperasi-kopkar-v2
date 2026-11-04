// Ukuran halaman tabel, dipakai server (paged, laporanPinjaman) dan klien (PilihBaris). Tanpa import server.

export const PILIHAN_BARIS = [25, 50, 100, 200] as const

/**
 * "Semua" dibatasi supaya satu klik di tabel besar (jurnal 1,1 juta baris, simpanan 301 ribu baris) tidak
 * membuat server dan browser macet. Tabel yang lebih kecil dari batas ini benar-benar tampil semua.
 */
export const MAKS_SEMUA = 5000

/** Batas Cetak dan Ekspor: seluruh hasil saringan sampai batas ini; yang lebih besar diberi keterangan supaya saringan dipersempit. */
export const MAKS_CETAK = 20000

/** Parameter URL pageSize -> jumlah baris: angka 1..200, "semua" (= MAKS_SEMUA), atau "cetak" (= MAKS_CETAK); selain itu bawaan tabel. */
export function ukuranHalaman(nilai: string | null | undefined, bawaan: number) {
    if (nilai === "semua") return MAKS_SEMUA
    if (nilai === "cetak") return MAKS_CETAK
    const n = Number(nilai)
    return Number.isInteger(n) && n >= 1 && n <= 200 ? n : bawaan
}
