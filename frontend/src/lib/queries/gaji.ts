import { query } from "@/lib/db"

/** Baris Data Karyawan; tanggal sebagai teks YYYY-MM-DD supaya langsung terisi di form. */
export type BarisKaryawan = {
    id: number; kode: string; nama: string; nik_ktp: string | null; jenis_kelamin: string | null; status_kerja: string
    tgl_masuk: string | null; akhir_kontrak: string | null; bidang: string | null; jabatan: string | null; atasan: string | null
    bank: string | null; no_rek: string | null; atas_nama_rek: string | null; npwp: string | null; status_ptkp: string
    umk: number; tunj_jabatan: number; jml_upah: number; aktif: boolean; kode_agt: string | null; catatan: string | null
}

export const daftarKaryawan = () => query<BarisKaryawan>(
    `SELECT k.id, k.kode, k.nama, k.nik_ktp, k.jenis_kelamin, k.status_kerja, k.tgl_masuk::text tgl_masuk, k.akhir_kontrak::text akhir_kontrak,
            k.bidang, k.jabatan, k.atasan, k.bank, k.no_rek, k.atas_nama_rek, k.npwp, k.status_ptkp, k.umk, k.tunj_jabatan, k.umk + k.tunj_jabatan jml_upah,
            k.aktif, a.kode_agt, k.catatan
       FROM karyawan k LEFT JOIN anggota a ON a.id = k.anggota_id
      ORDER BY k.aktif DESC, k.kode`)

export const ringkasTer = () => query<{ kategori: string; baris: number; batas_kena: number }>(
    `SELECT kategori, count(*)::int baris, min(batas_bawah) FILTER (WHERE tarif > 0) batas_kena FROM gaji_ter GROUP BY kategori ORDER BY kategori`)
