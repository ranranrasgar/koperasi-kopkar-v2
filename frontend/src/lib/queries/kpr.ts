import { bacaInfoPinjaman } from "@kopkar/backend/src/anggota/info-pinjaman.ts"
import { pool, query } from "@/lib/db"
import { sqlDaftarKpr, SQL_JENIS_KPR, SQL_RINCIAN_KPR, SQL_RINGKAS_KPR, SQL_TAHUN_KPR, type FilterKpr } from "./kpr-sql"

export interface BarisKpr {
    no_pinjaman: string; tgl_pinjaman: string; nama: string; nik: string | null; kode_agt: string; aktif: boolean; kode_kredit: string | null; nama_kredit: string | null
    rp_pinjaman_pokok: number; rp_angsuran_per_bulan: number; lama_angsuran: number; jml_cicilan: number; bayar: number; sisa: number
}

export const daftarKpr = (f: FilterKpr) => {
    const q = sqlDaftarKpr(f)
    return query<BarisKpr>(q.sql, q.values)
}
export const jenisKpr = () => query<{ kode_kredit: string; nama_kredit: string }>(SQL_JENIS_KPR)
export const tahunKpr = () => query<{ tahun: number }>(SQL_TAHUN_KPR)

export const adaKpr = async (no: string) => (await query("SELECT 1 FROM kpr WHERE no_pinjaman = $1", [no])).length > 0

/** Ringkasan satu KPR, jadwal (dihitung dari angsuran per bulan, sama dengan PDF untuk anggota), dan seluruh baris buku KPR. */
export async function detailKpr(no: string) {
    const [ringkas] = await query<Omit<BarisKpr, "aktif"> & { id: number }>(SQL_RINGKAS_KPR, [no])
    if (!ringkas) return null
    const [rincian, info] = await Promise.all([
        query<{ no_bukti: string; angsuran_ke: number; tanggal_angsuran: string; deskripsi: string | null; debit_pokok: number; kredit_pokok: number }>(SQL_RINCIAN_KPR, [ringkas.id]),
        bacaInfoPinjaman(pool, no),
    ])
    return { ringkas, rincian, jadwal: info?.jadwal ?? [] }
}
