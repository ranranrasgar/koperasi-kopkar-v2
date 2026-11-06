import "server-only"
import { query } from "@/lib/db"
import { paged, params, sp, type SearchParams } from "@/lib/list"
import { ukuranHalaman } from "@/lib/halaman"

/** Punya pinjaman tunai atau KPR yang belum lunas, dengan aturan Daftar Pinjaman: cicilan belum selesai dan sisa buku di atas Rp 100 (tanpa rincian = pokok). */
const MEMINJAM = `(EXISTS (SELECT 1 FROM pinjaman_tunai x WHERE x.anggota_id = a.id AND x.jml_cicilan < x.lama_angsuran
        AND COALESCE((SELECT SUM(r.kredit_pokok - r.debit_pokok) FROM pinjaman_tunai_rincian r WHERE r.pinjaman_tunai_id = x.id), x.rp_pinjaman_pokok) > 100)
    OR EXISTS (SELECT 1 FROM kpr x WHERE x.anggota_id = a.id
        AND COALESCE((SELECT SUM(r.kredit_pokok - r.debit_pokok) FROM kpr_rincian r WHERE r.kpr_id = x.id), x.rp_pinjaman_pokok) > 100))`

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
    if (sp(s, "pinjaman") === "ya") where.push(MEMINJAM)
    if (sp(s, "pinjaman") === "tidak") where.push(`NOT ${MEMINJAM}`)

    // Saldo simpanan (301 ribu baris) adalah bagian termahal. Saat urut per saldo atau halaman besar (>200 baris, mis.
    // "Semua"), dijumlah sekali untuk semua anggota (±0,2 dtk; per baris untuk 2.026 anggota ±1,7 dtk). Selain itu
    // dihitung per baris lewat indeks simpanan(anggota_id), sehingga hanya baris halaman yang dihitung (halaman 1: ±5 ms).
    const saldo = sp(s, "sortBy") === "saldo_simpanan" || ukuranHalaman(sp(s, "pageSize"), 25) > 200
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
    const kolomHalaman = `NOT (
        EXISTS (SELECT 1 FROM simpanan x WHERE x.anggota_id = t.id)
        OR EXISTS (SELECT 1 FROM pinjaman_tunai x WHERE x.anggota_id = t.id)
        OR EXISTS (SELECT 1 FROM kpr x WHERE x.anggota_id = t.id)
        OR EXISTS (SELECT 1 FROM pengajuan_pinjaman x WHERE x.anggota_id = t.id)
        OR EXISTS (SELECT 1 FROM shu_anggota x WHERE x.anggota_id = t.id)
        OR EXISTS (SELECT 1 FROM potongan_gaji_anggota x WHERE x.anggota_id = t.id)
        OR EXISTS (SELECT 1 FROM potongan_gaji_pinjaman x WHERE x.anggota_id = t.id)
        OR EXISTS (SELECT 1 FROM temp_potongan_all x WHERE x.anggota_id = t.id)
        OR EXISTS (SELECT 1 FROM temp_potongan_bank x WHERE x.anggota_id = t.id)
        OR EXISTS (SELECT 1 FROM temp_potongan_koperasi x WHERE x.anggota_id = t.id)
        OR EXISTS (SELECT 1 FROM temp_potongan_kpr x WHERE x.anggota_id = t.id)
        OR EXISTS (SELECT 1 FROM temp_shu x WHERE x.anggota_id = t.id)
        OR EXISTS (SELECT 1 FROM temp_shu_backup x WHERE x.anggota_id = t.id)
        OR EXISTS (SELECT 1 FROM temp_simpanan x WHERE x.anggota_id = t.id)
        OR EXISTS (SELECT 1 FROM log_notifikasi x WHERE x.anggota_id = t.id)
        OR EXISTS (SELECT 1 FROM app_user x WHERE x.anggota_id = t.id OR (x.anggota_id IS NULL AND x.kode_agt = t.kode_agt))
    ) AS _bisa_hapus`
    return paged({ base, values, searchParams: s, sortable, defaultSort: "kode_agt ASC", kolomHalaman })
}

export interface AnggotaRingkas {
    kode_agt: string
    nik: string | null
    nama: string
    /** Terisi bila ditemukan lewat pinjaman (cariPinjamanBerjalan). */
    no_pinjaman?: string
    jenis_pinjaman?: "tunai" | "kpr"
    /** Terisi bila dipilih lewat QR simpanan anggota. */
    jenis_simpanan?: string
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

/**
 * Pinjaman berjalan yang cocok dengan nomor pinjaman atau nomor rekening, untuk Setoran Angsuran (maks. 20 baris).
 * Syarat berjalan sama dengan pinjamanBerjalan dan kprBerjalan. KPR tidak punya kolom nomor rekening.
 */
export async function cariPinjamanBerjalan(kata: string) {
    return query<AnggotaRingkas>(
        `SELECT a.kode_agt, a.nik, a.nama, a.aktif, p.no_pinjaman, 'tunai' AS jenis_pinjaman
           FROM pinjaman_tunai p JOIN anggota a ON a.id = p.anggota_id
          WHERE (p.no_pinjaman ILIKE $1 OR p.no_rek ILIKE $1) AND p.jml_cicilan < p.lama_angsuran
         UNION ALL
         SELECT a.kode_agt, a.nik, a.nama, a.aktif, k.no_pinjaman, 'kpr'
           FROM kpr k JOIN anggota a ON a.id = k.anggota_id
           JOIN LATERAL (SELECT COALESCE(SUM(r.kredit_pokok - r.debit_pokok), 0) AS sisa FROM kpr_rincian r WHERE r.kpr_id = k.id) r ON r.sisa > 0
          WHERE k.no_pinjaman ILIKE $1
          ORDER BY no_pinjaman LIMIT 20`, [`%${kata.trim()}%`])
}
