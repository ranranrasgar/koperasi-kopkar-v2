import "server-only"
import { query } from "@/lib/db"
import { paged, params, sp, type SearchParams } from "@/lib/list"

export async function daftarAnggota(s: SearchParams) {
    const { values, p } = params()
    const where: string[] = []
    const cari = sp(s, "search")
    if (cari) {
        const kw = p(`%${cari}%`)
        where.push(`(a.kode_agt ILIKE ${kw} OR a.nik ILIKE ${kw} OR a.nama ILIKE ${kw})`)
    }
    for (const k of ["aktif", "agt_non_agt"] as const) {
        const v = sp(s, k)
        if (v === "true" || v === "false") where.push(`a.${k} = ${p(v === "true")}`)
    }
    if (sp(s, "status_staff")) where.push(`a.status_staff = ${p(sp(s, "status_staff"))}`)
    if (sp(s, "grade")) where.push(`a.grade ILIKE ${p(`%${sp(s, "grade")}%`)}`)

    // Saldo simpanan dijumlah sekali untuk semua anggota supaya bisa diurutkan.
    const base = `
        SELECT a.id, a.kode_agt, a.nik, a.nama, a.aktif, a.agt_non_agt, a.status_staff, a.grade, a.rp_grade,
               a.alamat, a.kota, a.hp, a.bank_nama, a.bank_no_rek, a.bank_atas_nama, a.tglpencatatan, a.tgl_keluar,
               COALESCE(s.saldo, 0) AS saldo_simpanan,
               u.username AS _username, u.foto AS _foto, o.status AS _role
          FROM anggota a
          LEFT JOIN (SELECT anggota_id, SUM(rp_setoran - rp_pengambilan) AS saldo FROM simpanan GROUP BY anggota_id) s ON s.anggota_id = a.id
          LEFT JOIN app_user u ON u.anggota_id = a.id
          LEFT JOIN opr o ON lower(o.nama) = lower(u.username)
         ${where.length ? `WHERE ${where.join(" AND ")}` : ""}`
    const sortable = Object.fromEntries(["kode_agt", "nik", "nama", "aktif", "agt_non_agt", "status_staff", "grade", "rp_grade",
        "tglpencatatan", "saldo_simpanan"].map((k) => [k, k]))
    return paged({ base, values, searchParams: s, sortable, defaultSort: "kode_agt ASC" })
}

export interface AnggotaRingkas {
    kode_agt: string
    nik: string | null
    nama: string
    aktif: boolean
}

/** Pencarian anggota untuk form transaksi (maks. 20 baris). */
export async function cariAnggota(kata: string, hanyaAktif = true) {
    const kw = `%${kata.trim()}%`
    return query<AnggotaRingkas>(
        `SELECT kode_agt, nik, nama, aktif FROM anggota
          WHERE (kode_agt ILIKE $1 OR nik ILIKE $1 OR nama ILIKE $1) ${hanyaAktif ? "AND aktif" : ""}
          ORDER BY nama LIMIT 20`, [kw])
}
