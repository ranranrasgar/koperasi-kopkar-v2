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

    // Saldo simpanan (301 ribu baris) adalah bagian termahal. Saat urut per saldo, dijumlah sekali untuk semua anggota;
    // selain itu dihitung per baris lewat indeks simpanan(anggota_id), sehingga hanya baris halaman yang dihitung
    // (halaman 1: ±225 ms -> ±5 ms).
    const saldo = sp(s, "sortBy") === "saldo_simpanan"
        ? { kolom: "COALESCE(s.saldo, 0)", join: "LEFT JOIN (SELECT anggota_id, SUM(rp_setoran - rp_pengambilan) AS saldo FROM simpanan GROUP BY anggota_id) s ON s.anggota_id = a.id" }
        : { kolom: "(SELECT COALESCE(SUM(x.rp_setoran - x.rp_pengambilan), 0) FROM simpanan x WHERE x.anggota_id = a.id)", join: "" }
    const base = `
        SELECT a.id, a.kode_agt, a.nik, a.nama, a.aktif, a.agt_non_agt, a.status_staff, a.grade, a.rp_grade,
               a.jns_kelamin, a.status AS status_kawin, a.alamat, a.kota, NULLIF(a.kodepos, 0) AS kodepos, a.hp,
               a.bank_nama, a.bank_no_rek, a.bank_atas_nama, a.simpanan_pokok, a.simpanan_wajib, a.simpanan_sukarela,
               a.tglpencatatan, a.tgl_keluar, a.alasan_keluar, a.opr,
               ${saldo.kolom} AS saldo_simpanan,
               u.username AS _username, u.foto AS _foto, o.status AS _role
          FROM anggota a
          ${saldo.join}
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
