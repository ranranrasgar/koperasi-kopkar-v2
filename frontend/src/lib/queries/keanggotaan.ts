import "server-only"
import { query } from "@/lib/db"
import { paged, params, sp, type SearchParams } from "@/lib/list"

export async function daftarKaryawanMattel(s: SearchParams) {
    const { values, p } = params()
    const where: string[] = []
    if (sp(s, "search")) {
        const kw = p(`%${sp(s, "search")}%`)
        where.push(`(k.nik ILIKE ${kw} OR k.nama ILIKE ${kw} OR k.deptname ILIKE ${kw} OR k.sectname ILIKE ${kw})`)
    }
    if (sp(s, "anggota") === "ya") where.push("a.id IS NOT NULL")
    if (sp(s, "anggota") === "tidak") where.push("a.id IS NULL")
    const base = `
        SELECT k.id, k.plant, k.nik, k.nama, k.deptname, k.sectname, k.grade, k.joindate, k.tgl_lahir, k.no_rek, k.emphone, k.sts,
               a.kode_agt
          FROM karyawan_mattel k LEFT JOIN anggota a ON a.karyawan_mattel_id = k.id
         ${where.length ? `WHERE ${where.join(" AND ")}` : ""}`
    const sortable = Object.fromEntries(["nik", "nama", "deptname", "sectname", "grade", "joindate"].map((k) => [k, k]))
    return paged({ base, values, searchParams: s, sortable, defaultSort: "nama ASC" })
}

export async function daftarUserMobile(s: SearchParams) {
    const { values, p } = params()
    const where: string[] = []
    if (sp(s, "search")) {
        const kw = p(`%${sp(s, "search")}%`)
        where.push(`(u.username ILIKE ${kw} OR u.kode_agt ILIKE ${kw} OR a.nama ILIKE ${kw} OR u.email ILIKE ${kw})`)
    }
    const st = sp(s, "status")
    if (st === "true" || st === "false") where.push(`u.status = ${p(st === "true")}`)
    const base = `
        SELECT u.id, u.username, u.kode_agt, a.nama, a.nik, u.email, u.status, u.created_at::date AS dibuat, u.updated_at::date AS diubah,
               u.fcm_token IS NOT NULL AS punya_token
          FROM app_user u LEFT JOIN anggota a ON a.id = u.anggota_id
         ${where.length ? `WHERE ${where.join(" AND ")}` : ""}`
    const sortable = Object.fromEntries(["username", "kode_agt", "nama", "status", "dibuat"].map((k) => [k, k]))
    return paged({ base, values, searchParams: s, sortable, defaultSort: "dibuat DESC NULLS LAST" })
}

export interface Pengajuan {
    id: number; tgl_realisasi: string; kd_anggota: string; nama: string; nik: string | null; kd_kredit: string; nama_kredit: string | null
    persen_bunga: number; lama_angsuran: number; rp_pinjaman_pokok: number; keterangan: string | null; status: string
}

export const daftarPengajuan = (status: string) =>
    query<Pengajuan>(`
        SELECT pp.id, pp.tgl_realisasi, pp.kd_anggota, a.nama, a.nik, pp.kd_kredit, jk.nama_kredit, pp.persen_bunga, pp.lama_angsuran,
               pp.rp_pinjaman_pokok, pp.keterangan, pp.status
          FROM pengajuan_pinjaman pp JOIN anggota a ON a.id = pp.anggota_id LEFT JOIN jenis_kredit jk ON jk.id = pp.jenis_kredit_id
         WHERE ($1 = '' OR pp.status = $1)
         ORDER BY pp.tgl_realisasi DESC, pp.id DESC LIMIT 300`, [status])
