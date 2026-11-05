export type JenisBukti = "simpanan" | "angsuran" | "kpr" | "titipan" | "pencairan" | "buku"

/** Tombol cetak yang muncul di hasil transaksi. */
export interface TombolCetakBukti { label: string; jenis: JenisBukti; no: string }

export interface DataKwitansi {
    judul: string; no: string; tanggal: string
    /** terima: uang masuk ke koperasi, bayar: uang keluar ke anggota. */
    arah: "terima" | "bayar"
    nama: string; kpk: string; kode: string; untuk: string
    baris: [string, number][]; jumlah: number
    info: [string, number | string][]
    /** Grup pinjaman, untuk pemeriksaan izin per grup seperti halaman detail pinjaman. */
    grup?: string
}

export interface DataBuku {
    no: string; tanggal: string; nama: string; kpk: string; kode: string; jenis: string; grup: string
    pokok: number; jasa: number; lama: number; angsuran: number
    baris: { ke: number; jatuhTempo: string; pokok: number; jasa: number; angsuran: number; sisa: number; tglBayar: string; dibayar: number }[]
}
