import "server-only"
import { query } from "@/lib/db"
import { isTanggal, paged, params, sp, type SearchParams } from "@/lib/list"

export async function daftarCoa(s: SearchParams) {
    const { values, p } = params()
    const where: string[] = []
    if (sp(s, "search")) {
        const kw = p(`%${sp(s, "search")}%`)
        where.push(`(c.kode_perkiraan ILIKE ${kw} OR c.nama_perkiraan ILIKE ${kw})`)
    }
    const dk = sp(s, "d_k")
    if (dk === "D" || dk === "K") where.push(`c.d_k = ${p(dk)}`)
    const base = `
        SELECT c.id, c.kode_perkiraan, c.nama_perkiraan, c.d_k, c.rp_saldo_awal, c.tgl_saldo_awal, c.keterangan,
               i.kode_perkiraan || ' ' || i.nama_perkiraan AS nama_induk
          FROM perkiraan c LEFT JOIN perkiraan i ON i.id = c.parent_id
         ${where.length ? `WHERE ${where.join(" AND ")}` : ""}`
    const sortable = Object.fromEntries(["kode_perkiraan", "nama_perkiraan", "d_k", "rp_saldo_awal"].map((k) => [k, k]))
    return paged({ base, values, searchParams: s, sortable, defaultSort: "kode_perkiraan ASC", pageSize: 50 })
}

export async function daftarJurnal(s: SearchParams) {
    const { values, p } = params()
    const where: string[] = []
    if (sp(s, "search")) {
        const kw = p(`%${sp(s, "search")}%`)
        where.push(`(j.nomor_bukti ILIKE ${kw} OR j.kode_perkiraan ILIKE ${kw} OR j.deskripsi ILIKE ${kw})`)
    }
    if (isTanggal(sp(s, "dari"))) where.push(`j.tanggal_jurnalumum >= ${p(sp(s, "dari"))}`)
    if (isTanggal(sp(s, "sampai"))) where.push(`j.tanggal_jurnalumum <= ${p(sp(s, "sampai"))}`)
    const sumber = sp(s, "sumber")
    if (sumber === "lain") where.push("j.sumber_tipe IS NULL")
    else if (sumber) where.push(`j.sumber_tipe = ${p(sumber)}`)
    const base = `
        SELECT j.id, j.urutan, j.tanggal_jurnalumum, j.nomor_bukti, j.kode_perkiraan, c.nama_perkiraan, j.deskripsi,
               j.debit_jurnalumum, j.kredit_jurnalumum, j.sumber_tipe, j.opr
          FROM jurnal_umum j LEFT JOIN perkiraan c ON c.id = j.perkiraan_id
         ${where.length ? `WHERE ${where.join(" AND ")}` : ""}`
    const sortable = Object.fromEntries(["tanggal_jurnalumum", "nomor_bukti", "kode_perkiraan", "debit_jurnalumum", "kredit_jurnalumum"].map((k) => [k, k]))
    return paged({ base, values, searchParams: s, sortable, defaultSort: "tanggal_jurnalumum DESC, urutan DESC", pageSize: 50 })
}

export interface Akun { id: number; kode_perkiraan: string; nama_perkiraan: string }

/** Semua akun untuk pilihan di form jurnal. */
export const semuaAkun = () =>
    query<Akun>("SELECT id, kode_perkiraan, nama_perkiraan FROM perkiraan ORDER BY kode_perkiraan")

/**
 * Akun kas/bank untuk transaksi kasir: akun Kas dan Bank di bawah Aktiva Lancar (1.1.01.10 s.d. 1.1.01.60),
 * urut dari yang paling sering dipakai sebagai kas_perkiraan_id.
 */
export const akunKas = () =>
    query<Akun>(`
        SELECT c.id, c.kode_perkiraan, c.nama_perkiraan
          FROM perkiraan c
          LEFT JOIN (SELECT kas_perkiraan_id id, COUNT(*) n FROM (
                    SELECT kas_perkiraan_id FROM simpanan UNION ALL
                    SELECT kas_perkiraan_id FROM pinjaman_tunai_rincian UNION ALL
                    SELECT kas_perkiraan_id FROM kpr_rincian) u
                 WHERE kas_perkiraan_id IS NOT NULL GROUP BY 1) k ON k.id = c.id
         WHERE c.kode_perkiraan BETWEEN '1.1.01.10' AND '1.1.01.60'
         ORDER BY COALESCE(k.n, 0) DESC, c.kode_perkiraan`)
