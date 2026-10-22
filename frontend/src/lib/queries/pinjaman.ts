import "server-only"
import { query } from "@/lib/db"
import { params, sp, type SearchParams } from "@/lib/list"
import type { PageData } from "@/config/modules"

export const GRUP_PINJAMAN = ["KOPERASI", "BANK / PIHAK LAIN", "KPR"]

export const jenisKredit = (grup?: string) =>
    query<{ kode_kredit: string; nama_kredit: string; group_pinjaman: string; bunga_kredit: number; bunga_per: string;
        mak_cicilan: number; persen_adm: number; persen_provisi: number; jatuh_tempo: number }>(
        `SELECT kode_kredit, nama_kredit, group_pinjaman, bunga_kredit, bunga_per, mak_cicilan, persen_adm, persen_provisi, jatuh_tempo
           FROM jenis_kredit WHERE ($1::text IS NULL OR group_pinjaman = $1) AND NOT COALESCE(hide, false)
          ORDER BY kode_kredit`, [grup && grup !== "All" ? grup : null])

export interface LaporanPinjamanRow {
    tgl_pinjaman: string; no_pinjaman: string; kode_agt: string; nik: string | null; nama: string
    rp_pinjaman_pokok: number; rp_provisi: number; temp_total_plafond: number; temp_total_jasa: number
    temp_angs_per_bulan: number; lama_angsuran: number; jml_cicilan: number; sisa_cicilan: number
    jml_tunggakan: number | null; bayar_pokok: number; bayar_bunga: number; kode_kredit: string | null
}

// Kolom pencarian sesuai ComboBox1 aplikasi desktop.
export const KOLOM_CARI = ["No Pinjaman", "NIK", "Kode Anggota", "Nama", "Kota", "ID Supervisor", "ID Kolektor", "ID Surveyor", "ID Sales"]
const KOLOM_CARI_SQL = ["p.no_pinjaman", "a.nik", "a.kode_agt", "a.nama", "a.kota", "p.id_supervisor", "p.id_kolektor", "p.id_surveyor", "p.id_sales"]

/**
 * Laporan pinjaman. Query sama dengan web lama (src/app/api/loans/route.ts) yang sudah dicocokkan
 * baris per baris dengan MySQL produksi (selisih Rp 1 di 2 baris karena pembulatan DOUBLE MySQL).
 */
export async function laporanPinjaman(s: SearchParams): Promise<PageData<LaporanPinjamanRow>> {
    const page = Math.max(1, parseInt(sp(s, "page") || "1", 10) || 1)
    const pageSize = 20
    const { values, p } = params()
    let where = "WHERE 1=1"

    const grup = sp(s, "grup") || "KOPERASI"
    if (grup !== "All") where += ` AND jk.group_pinjaman = ${p(grup)}`
    const kw = sp(s, "keyword")
    const kolom = KOLOM_CARI_SQL[parseInt(sp(s, "searchBy") || "0", 10)]
    if (kw && kolom) where += ` AND ${kolom} ILIKE ${p(`%${kw}%`)}`
    where += ` AND a.aktif = ${p(sp(s, "aktif") !== "T")}`
    const kredit = sp(s, "kredit")
    if (kredit && kredit !== "All") where += ` AND jk.kode_kredit = ${p(kredit)}`
    const tahun = parseInt(sp(s, "tahun"), 10) || new Date().getFullYear()
    where += ` AND EXTRACT(YEAR FROM p.tgl_pinjaman) = ${p(tahun)}`
    const bulan = sp(s, "bulan") === "" ? new Date().getMonth() + 1 : parseInt(sp(s, "bulan"), 10) || 0
    if (bulan !== 0) where += ` AND EXTRACT(MONTH FROM p.tgl_pinjaman) = ${p(bulan)}`

    // Status lunas memakai kolom hitungan, jadi diterapkan di luar subquery.
    const status = parseInt(sp(s, "lunas") || "0", 10)
    const outerWhere = status === 1 ? "WHERE jml_tunggakan > 0"
        : status === 2 ? "WHERE (temp_total_plafond - bayar_pokok) <= 100"
        : status === 3 ? "WHERE (temp_total_plafond - bayar_pokok) > 100" : ""

    // lama_angsuran dan bunga_per integer; di-cast supaya pembagian tidak terpotong.
    const inner = `
        SELECT
            p.tgl_pinjaman, p.no_pinjaman, a.bank_no_rek,
            a.kode_agt, a.nik, a.nama, a.bank_nama,
            p.rp_pinjaman_pokok, p.persen_adm, p.rp_uang_muka, p.rp_provisi,
            ROUND((p.rp_pinjaman_pokok - p.rp_uang_muka)) as temp_total_plafond,
            (((p.rp_pinjaman_pokok - p.rp_uang_muka)*p.persen_bunga /100))*(p.lama_angsuran::numeric/NULLIF(p.bunga_per,0)) as temp_total_jasa,
            (p.rp_pinjaman_pokok - p.rp_uang_muka) / NULLIF(p.lama_angsuran,0) as temp_angs_pokok,
            ((((p.rp_pinjaman_pokok - p.rp_uang_muka)*p.persen_bunga /100))*(p.lama_angsuran::numeric/NULLIF(p.bunga_per,0)))/NULLIF(p.lama_angsuran,0) as temp_angs_bunga,
            ROUND(((p.rp_pinjaman_pokok - p.rp_uang_muka)*p.persen_adm /100)) as rp_adm,
            ((p.rp_pinjaman_pokok - p.rp_uang_muka) / NULLIF(p.lama_angsuran,0)) +
            (((((p.rp_pinjaman_pokok - p.rp_uang_muka)*p.persen_bunga /100))*
            (p.lama_angsuran::numeric/NULLIF(p.bunga_per,0)))/NULLIF(p.lama_angsuran,0)) as temp_angs_per_bulan,
            p.lama_angsuran, p.jml_cicilan, (p.lama_angsuran - p.jml_cicilan) as sisa_cicilan,
            p.jml_tunggakan, p.jatuh_tempo_tgl, p.opr, jk.kode_kredit,
            ROUND((p.rp_pinjaman_pokok / NULLIF(p.lama_angsuran,0)) * p.jml_cicilan) as bayar_pokok,
            ROUND(((((p.rp_pinjaman_pokok * p.persen_bunga)/100))/NULLIF(p.bunga_per,0)) * p.jml_cicilan) as bayar_bunga,
            p.no_pinjaman_urut
        FROM pinjaman_tunai p
        INNER JOIN pinjaman_tunai_rincian ptr ON ptr.pinjaman_tunai_id = p.id
        INNER JOIN anggota a ON a.id = p.anggota_id
        LEFT JOIN jenis_kredit jk ON jk.id = p.jenis_kredit_id
        ${where}
        GROUP BY p.id, a.id, jk.id`

    const n = values.length
    const [count, items] = await Promise.all([
        query<{ total: number }>(`SELECT COUNT(*) AS total FROM (${inner}) t ${outerWhere}`, values),
        query<LaporanPinjamanRow>(`SELECT * FROM (${inner}) t ${outerWhere}
            ORDER BY tgl_pinjaman DESC, no_pinjaman_urut DESC LIMIT $${n + 1} OFFSET $${n + 2}`, [...values, pageSize, (page - 1) * pageSize]),
    ])
    const total = count[0]?.total ?? 0
    return { items, total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) }
}

export interface PinjamanBerjalan {
    no_pinjaman: string; tgl_pinjaman: string; nama_kredit: string | null; rp_pinjaman_pokok: number
    lama_angsuran: number; jml_cicilan: number
}

/** Pinjaman tunai anggota yang belum lunas, untuk form angsuran. */
export const pinjamanBerjalan = (kodeAgt: string) =>
    query<PinjamanBerjalan>(
        `SELECT p.no_pinjaman, p.tgl_pinjaman, jk.nama_kredit, p.rp_pinjaman_pokok, p.lama_angsuran, p.jml_cicilan
           FROM pinjaman_tunai p JOIN anggota a ON a.id = p.anggota_id LEFT JOIN jenis_kredit jk ON jk.id = p.jenis_kredit_id
          WHERE a.kode_agt = $1 AND p.jml_cicilan < p.lama_angsuran
          ORDER BY p.tgl_pinjaman`, [kodeAgt])

export interface KprBerjalan {
    no_pinjaman: string; tgl_pinjaman: string; nama_kredit: string | null; rp_pinjaman_pokok: number
    rp_angsuran_per_bulan: number; lama_angsuran: number; jml_cicilan: number; sisa_pokok: number
}

/** KPR anggota dengan sisa pokok titipan > 0, untuk form angsuran KPR. */
export const kprBerjalan = (kodeAgt: string) =>
    query<KprBerjalan>(
        `SELECT k.no_pinjaman, k.tgl_pinjaman, jk.nama_kredit, k.rp_pinjaman_pokok, k.rp_angsuran_per_bulan, k.lama_angsuran, k.jml_cicilan,
                r.sisa AS sisa_pokok
           FROM kpr k JOIN anggota a ON a.id = k.anggota_id LEFT JOIN jenis_kredit jk ON jk.id = k.jenis_kredit_id
           JOIN LATERAL (SELECT COALESCE(SUM(kredit_pokok - debit_pokok), 0) AS sisa FROM kpr_rincian WHERE kpr_id = k.id) r ON true
          WHERE a.kode_agt = $1 AND r.sisa > 0
          ORDER BY k.tgl_pinjaman`, [kodeAgt])
