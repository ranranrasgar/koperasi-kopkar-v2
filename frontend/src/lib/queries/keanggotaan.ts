import "server-only"
import { query } from "@/lib/db"
import { isTanggal, paged, params, sp, type SearchParams } from "@/lib/list"

export async function daftarKaryawanMattel(s: SearchParams) {
    const { values, p } = params()
    const where: string[] = []
    if (sp(s, "search")) {
        const kw = p(`%${sp(s, "search")}%`)
        where.push(`(k.nik ILIKE ${kw} OR k.nama ILIKE ${kw} OR k.deptname ILIKE ${kw} OR k.sectname ILIKE ${kw})`)
    }
    if (sp(s, "anggota") === "ya") where.push("COALESCE(a.kode_agt, n.kode) IS NOT NULL")
    if (sp(s, "anggota") === "tidak") where.push("COALESCE(a.kode_agt, n.kode) IS NULL")
    // Tertaut langsung lewat karyawan_mattel_id; bila tidak, cocok nama (hanya bila nama itu unik di data karyawan dan di anggota yang belum tertaut),
    // karena NIK anggota lama berbeda dengan NIK HR Mattel dan banyak anggota belum ditautkan.
    const base = `
        SELECT k.id, k.plant, k.nik, k.nama, k.deptname, k.sectname, k.grade, k.joindate, k.tgl_lahir, k.no_rek, k.emphone, k.sts,
               COALESCE(a.kode_agt, n.kode) AS kode_agt,
               CASE WHEN a.id IS NOT NULL THEN 'ya' WHEN n.kode IS NOT NULL THEN 'nama' ELSE 'tidak' END AS status_agt
          FROM karyawan_mattel k LEFT JOIN anggota a ON a.karyawan_mattel_id = k.id
          LEFT JOIN (SELECT upper(btrim(nama)) AS nm, min(kode_agt) AS kode FROM anggota WHERE karyawan_mattel_id IS NULL GROUP BY 1 HAVING count(*) = 1) n
                 ON a.id IS NULL AND n.nm = upper(btrim(k.nama))
                AND (SELECT count(*) FROM karyawan_mattel k2 WHERE upper(btrim(k2.nama)) = n.nm) = 1
         ${where.length ? `WHERE ${where.join(" AND ")}` : ""}`
    const sortable = Object.fromEntries(["nik", "nama", "deptname", "sectname", "grade", "joindate", "status_agt"].map((k) => [k, k]))
    return paged({ base, values, searchParams: s, sortable, defaultSort: "nama ASC" })
}

export async function daftarUserMobile(s: SearchParams) {
    const { values, p } = params()
    const where: string[] = []
    if (sp(s, "search")) {
        const kw = p(`%${sp(s, "search")}%`)
        where.push(`(u.username ILIKE ${kw} OR u.kode_agt ILIKE ${kw} OR a.nama ILIKE ${kw} OR u.email ILIKE ${kw})`)
    }
    // menunggu_admin dibaca lewat to_jsonb supaya daftar tetap jalan di database yang kolomnya belum dipasang (npm run anggota:pasang).
    const menunggu = `COALESCE((to_jsonb(u)->>'menunggu_admin')::boolean, false)`
    const keputusan = `(to_jsonb(u)->>'keputusan_daftar')`
    const st = sp(s, "status")
    if (st === "menunggu") where.push(`${menunggu} AND NOT u.status`)
    else if (st === "disetujui") where.push(`${keputusan} = 'disetujui'`)
    else if (st === "ditolak") where.push(`${keputusan} = 'ditolak'`)
    else if (st === "true" || st === "false") where.push(`u.status = ${p(st === "true")}`)
    const base = `
        SELECT u.id, u.username, u.kode_agt, a.nama, a.nik, u.email, u.status, u.created_at::date AS dibuat, u.updated_at::date AS diubah,
               u.fcm_token IS NOT NULL AS punya_token, (${menunggu} AND NOT u.status) AS menunggu_admin, (u.anggota_id IS NOT NULL) AS punya_anggota,
               CASE WHEN ${menunggu} AND NOT u.status THEN 'menunggu' WHEN ${keputusan} = 'ditolak' AND NOT u.status THEN 'ditolak' WHEN u.status THEN 'true' ELSE 'false' END AS status_tampil
          FROM app_user u LEFT JOIN anggota a ON a.id = u.anggota_id
         ${where.length ? `WHERE ${where.join(" AND ")}` : ""}`
    const sortable = Object.fromEntries(["username", "kode_agt", "nama", "status_tampil", "dibuat"].map((k) => [k, k]))
    return paged({ base, values, searchParams: s, sortable, defaultSort: "dibuat DESC NULLS LAST" })
}

export interface Pengajuan {
    id: number; tgl_realisasi: string; kd_anggota: string; nama: string; nik: string | null; kd_kredit: string; nama_kredit: string | null
    persen_bunga: number; lama_angsuran: number; rp_pinjaman_pokok: number; keterangan: string | null; status: string
}

const STATUS_PENGAJUAN = ["P", "Y", "N"]

/**
 * Daftar pengajuan kredit dari aplikasi anggota, dengan pencarian (KPK = anggota.nik, nama, kode anggota, NIK/KTP di
 * detail anggota), filter status, jenis kredit, rentang tanggal realisasi, dan lama angsuran, serta paginasi.
 * Status kosong = semua; tanpa parameter status = Menunggu.
 */
export async function daftarPengajuan(s: SearchParams) {
    const { values, p } = params()
    const where: string[] = []
    const status = s.status === undefined ? "P" : sp(s, "status")
    if (STATUS_PENGAJUAN.includes(status)) where.push(`pp.status = ${p(status)}`)
    const cari = sp(s, "search")
    if (cari) {
        const kw = p(`%${cari}%`)
        where.push(`(a.nik ILIKE ${kw} OR a.nama ILIKE ${kw} OR a.kode_agt ILIKE ${kw} OR pp.kd_anggota ILIKE ${kw}
            OR EXISTS (SELECT 1 FROM anggota_detail ad WHERE ad.anggota_id = a.id AND ad.no_ktp_sim ILIKE ${kw}))`)
    }
    const jenis = Number(sp(s, "jenis"))
    if (Number.isInteger(jenis) && jenis > 0) where.push(`pp.jenis_kredit_id = ${p(jenis)}`)
    const dari = sp(s, "dari"), sampai = sp(s, "sampai")
    if (isTanggal(dari)) where.push(`pp.tgl_realisasi >= ${p(dari)}`)
    if (isTanggal(sampai)) where.push(`pp.tgl_realisasi <= ${p(sampai)}`)
    const lama = Number(sp(s, "lama"))
    if (Number.isInteger(lama) && lama > 0) where.push(`pp.lama_angsuran = ${p(lama)}`)

    const base = `
        SELECT pp.id, pp.tgl_realisasi, pp.kd_anggota, a.nama, a.nik, a.kode_agt, pp.kd_kredit, jk.nama_kredit, pp.persen_bunga, pp.lama_angsuran,
               pp.rp_pinjaman_pokok, pp.keterangan, pp.status
          FROM pengajuan_pinjaman pp JOIN anggota a ON a.id = pp.anggota_id LEFT JOIN jenis_kredit jk ON jk.id = pp.jenis_kredit_id
         ${where.length ? `WHERE ${where.join(" AND ")}` : ""}`
    const sortable = Object.fromEntries(["tgl_realisasi", "nama", "kd_anggota", "nik", "nama_kredit", "rp_pinjaman_pokok", "lama_angsuran", "persen_bunga", "status"].map((k) => [k, k]))
    return paged<Pengajuan>({ base, values, searchParams: s, sortable, defaultSort: "tgl_realisasi DESC, id DESC", urutanLanjut: "id DESC" })
}

/** Pilihan filter jenis kredit (yang pernah diajukan atau masih aktif). */
export const jenisKreditPengajuan = () =>
    query<{ id: number; kode: string; nama: string }>(`
        SELECT jk.id, jk.kode_kredit kode, jk.nama_kredit nama FROM jenis_kredit jk
         WHERE NOT jk.hide OR EXISTS (SELECT 1 FROM pengajuan_pinjaman pp WHERE pp.jenis_kredit_id = jk.id)
         ORDER BY jk.nama_kredit`)
