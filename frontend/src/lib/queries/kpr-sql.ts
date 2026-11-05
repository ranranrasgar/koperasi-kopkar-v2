// SQL Daftar KPR (tanpa import server, supaya bisa diuji dari skrip). KPR ada di tabel kpr, terpisah dari pinjaman_tunai.
// Kolom rp_saldo_pokok di tabel kpr tidak dipakai; sisa dihitung dari kpr_rincian, sama dengan form angsuran dan mesin posting.

export interface FilterKpr { keyword: string; kredit: string; bulan: number; tahun: number; status: string; aktif: string }

export function sqlDaftarKpr(f: FilterKpr) {
    const values: unknown[] = []
    const p = (v: unknown) => { values.push(v); return `$${values.length}` }
    let where = "WHERE 1=1"
    if (f.aktif !== "S") where += ` AND a.aktif = ${p(f.aktif !== "T")}`
    if (f.kredit) where += ` AND jk.kode_kredit = ${p(f.kredit)}`
    if (f.tahun) where += ` AND EXTRACT(YEAR FROM k.tgl_pinjaman) = ${p(f.tahun)}`
    if (f.bulan) where += ` AND EXTRACT(MONTH FROM k.tgl_pinjaman) = ${p(f.bulan)}`
    if (f.status === "berjalan") where += " AND r.sisa > 0"
    if (f.status === "lunas") where += " AND r.sisa <= 0"
    if (f.keyword) {
        const kw = p(`%${f.keyword}%`)
        where += ` AND (k.no_pinjaman ILIKE ${kw} OR a.kode_agt ILIKE ${kw} OR a.nik ILIKE ${kw} OR a.nama ILIKE ${kw})`
    }
    return {
        values,
        sql: `SELECT k.no_pinjaman, k.tgl_pinjaman::text AS tgl_pinjaman, a.nama, a.nik, a.kode_agt, a.aktif, jk.kode_kredit, jk.nama_kredit,
                     k.rp_pinjaman_pokok, k.rp_angsuran_per_bulan, k.lama_angsuran, k.jml_cicilan, r.bayar, r.sisa
                FROM kpr k JOIN anggota a ON a.id = k.anggota_id LEFT JOIN jenis_kredit jk ON jk.id = k.jenis_kredit_id
                JOIN LATERAL (SELECT COALESCE(SUM(x.debit_pokok), 0) AS bayar, COALESCE(SUM(x.kredit_pokok - x.debit_pokok), 0) AS sisa
                                FROM kpr_rincian x WHERE x.kpr_id = k.id) r ON true
               ${where}
               ORDER BY k.tgl_pinjaman DESC, k.id DESC`,
    }
}

export const SQL_JENIS_KPR = `SELECT DISTINCT jk.kode_kredit, jk.nama_kredit FROM kpr k JOIN jenis_kredit jk ON jk.id = k.jenis_kredit_id ORDER BY jk.kode_kredit`
export const SQL_TAHUN_KPR = `SELECT DISTINCT EXTRACT(YEAR FROM tgl_pinjaman)::int AS tahun FROM kpr WHERE tgl_pinjaman IS NOT NULL ORDER BY tahun DESC`

export const SQL_RINGKAS_KPR = `
    SELECT k.id, k.no_pinjaman, k.tgl_pinjaman::text AS tgl_pinjaman, a.nama, a.nik, a.kode_agt, jk.kode_kredit, jk.nama_kredit,
           k.rp_pinjaman_pokok, k.rp_angsuran_per_bulan, k.lama_angsuran, k.jml_cicilan, r.bayar, r.sisa
      FROM kpr k JOIN anggota a ON a.id = k.anggota_id LEFT JOIN jenis_kredit jk ON jk.id = k.jenis_kredit_id
      JOIN LATERAL (SELECT COALESCE(SUM(x.debit_pokok), 0) AS bayar, COALESCE(SUM(x.kredit_pokok - x.debit_pokok), 0) AS sisa
                      FROM kpr_rincian x WHERE x.kpr_id = k.id) r ON true
     WHERE k.no_pinjaman = $1`

export const SQL_RINCIAN_KPR = `
    SELECT no_bukti, angsuran_ke, tanggal_angsuran::text AS tanggal_angsuran, deskripsi, debit_pokok, kredit_pokok
      FROM kpr_rincian WHERE kpr_id = $1 ORDER BY tanggal_angsuran, urut, id`
