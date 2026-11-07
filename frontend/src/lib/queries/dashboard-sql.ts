// SQL Dashboard (tanpa import server, supaya bisa diuji dari skrip). Dipakai dashboard.ts.
// Sisa pokok tidak dihitung ulang di sini: memakai sqlLaporanPinjaman dan sqlDaftarKpr supaya angkanya sama dengan Daftar Pinjaman dan Daftar KPR.
import { sqlDaftarKpr } from "./kpr-sql"
import { sqlLaporanPinjaman } from "./pinjaman-sql"

const HARI = "(now() AT TIME ZONE 'Asia/Jakarta')::date"
const AWAL_BULAN = `date_trunc('month', ${HARI})::date`

export const SQL_ANGGOTA = `
    SELECT COUNT(*) FILTER (WHERE aktif)::int AS aktif,
           COUNT(*) FILTER (WHERE tglpencatatan >= ${AWAL_BULAN} AND tglpencatatan <= ${HARI})::int AS masuk,
           COUNT(*) FILTER (WHERE tgl_keluar >= ${AWAL_BULAN} AND tgl_keluar <= ${HARI})::int AS keluar
      FROM anggota`

export const SQL_SALDO_SIMPANAN = "SELECT COALESCE(SUM(rp_setoran - rp_pengambilan), 0) AS saldo FROM simpanan"

/** Arus 12 bulan terakhir; bulan tanpa transaksi tetap muncul. Angsuran = pokok + jasa yang dibayar, pinjaman tunai dan KPR. */
export const SQL_ARUS = `
    WITH b AS (SELECT generate_series(${AWAL_BULAN} - interval '11 months', ${AWAL_BULAN}, interval '1 month')::date AS bln),
    s AS (SELECT date_trunc('month', tgl_transaksi)::date AS bln, SUM(rp_setoran) AS setor, SUM(rp_pengambilan) AS ambil
            FROM simpanan WHERE tgl_transaksi >= ${AWAL_BULAN} - interval '11 months' AND tgl_transaksi <= ${HARI} GROUP BY 1),
    a AS (SELECT date_trunc('month', tanggal_angsuran)::date AS bln, SUM(debit_pokok + debit_bunga) AS angsuran
            FROM (SELECT tanggal_angsuran, debit_pokok, debit_bunga FROM pinjaman_tunai_rincian
                  UNION ALL SELECT tanggal_angsuran, debit_pokok, debit_bunga FROM kpr_rincian) r
           WHERE tanggal_angsuran >= ${AWAL_BULAN} - interval '11 months' AND tanggal_angsuran <= ${HARI} GROUP BY 1)
    SELECT to_char(b.bln, 'YYYY-MM') AS bln, COALESCE(s.setor, 0) AS setor, COALESCE(s.ambil, 0) AS ambil, COALESCE(a.angsuran, 0) AS angsuran
      FROM b LEFT JOIN s ON s.bln = b.bln LEFT JOIN a ON a.bln = b.bln ORDER BY b.bln`

export const SQL_PENGAJUAN_MENUNGGU = "SELECT COUNT(*)::int AS n FROM pengajuan_pinjaman WHERE status = 'P'"
export const SQL_DAFTAR_MENUNGGU = "SELECT COUNT(*)::int AS n FROM app_user WHERE menunggu_admin AND NOT status"
export const SQL_STAFF_BELUM_ABSEN = `
    SELECT COUNT(*)::int AS n FROM anggota a
     WHERE a.aktif AND lower(trim(a.status_staff)) = 'staff'
       AND NOT EXISTS (SELECT 1 FROM absensi_staff s WHERE s.anggota_id = a.id AND s.tanggal = ${HARI})`

/** $1 = grup pinjaman yang boleh dilihat operator. */
export const SQL_JATUH_TEMPO = `
    SELECT t.tanggal_angsuran::text AS tanggal, COUNT(*)::int AS kontrak,
           ROUND(SUM((p.rp_pinjaman_pokok - p.rp_uang_muka) / NULLIF(p.lama_angsuran, 0)
                 + (p.rp_pinjaman_pokok - p.rp_uang_muka) * p.persen_bunga / 100 / NULLIF(p.bunga_per, 0))) AS jumlah
      FROM pinjaman_tunai_rincian_tagih t
      JOIN pinjaman_tunai p ON p.id = t.pinjaman_tunai_id
      JOIN anggota a ON a.id = p.anggota_id
      JOIN jenis_kredit jk ON jk.id = p.jenis_kredit_id
     WHERE a.aktif AND jk.group_pinjaman = ANY($1) AND t.tanggal_angsuran >= ${HARI}
       AND t.angsuran_ke > p.jml_cicilan AND p.jml_cicilan < p.lama_angsuran
     GROUP BY 1 ORDER BY 1 LIMIT 5`

/** Transaksi terbaru gabungan. Tanggal setelah hari ini diabaikan (salah ketik di data lama). $1 = grup pinjaman, $2 = boleh melihat KPR. */
export const SQL_AKTIVITAS = `
    SELECT * FROM (
      (SELECT s.tgl_transaksi::text AS tanggal, s.no_bukti, a.nama, COALESCE(j.nama_simpanan, 'Simpanan') AS jenis,
              CASE WHEN s.rp_setoran > 0 THEN 'Setoran' ELSE 'Pengambilan' END AS aksi, s.rp_setoran - s.rp_pengambilan AS jumlah
         FROM simpanan s JOIN anggota a ON a.id = s.anggota_id LEFT JOIN jenis_simpanan j ON j.id = s.jenis_simpanan_id
        WHERE s.tgl_transaksi <= ${HARI} ORDER BY s.tgl_transaksi DESC, s.urut DESC LIMIT 8)
      UNION ALL
      (SELECT r.tanggal_angsuran::text, r.no_bukti, a.nama, jk.nama_kredit,
              CASE WHEN r.kredit_pokok > 0 THEN 'Pencairan' ELSE 'Angsuran' END,
              CASE WHEN r.kredit_pokok > 0 THEN -r.kredit_pokok ELSE r.debit_pokok + r.debit_bunga END
         FROM pinjaman_tunai_rincian r JOIN pinjaman_tunai p ON p.id = r.pinjaman_tunai_id JOIN anggota a ON a.id = p.anggota_id
         JOIN jenis_kredit jk ON jk.id = p.jenis_kredit_id
        WHERE r.tanggal_angsuran <= ${HARI} AND jk.group_pinjaman = ANY($1) AND r.debit_pokok + r.debit_bunga + r.kredit_pokok > 0
        ORDER BY r.tanggal_angsuran DESC, r.id DESC LIMIT 8)
      UNION ALL
      (SELECT r.tanggal_angsuran::text, r.no_bukti, a.nama, jk.nama_kredit,
              CASE WHEN r.kredit_pokok > 0 THEN 'Pencairan KPR' ELSE 'Angsuran KPR' END,
              CASE WHEN r.kredit_pokok > 0 THEN -r.kredit_pokok ELSE r.debit_pokok + r.debit_bunga END
         FROM kpr_rincian r JOIN kpr k ON k.id = r.kpr_id JOIN anggota a ON a.id = k.anggota_id LEFT JOIN jenis_kredit jk ON jk.id = k.jenis_kredit_id
        WHERE $2 AND r.tanggal_angsuran <= ${HARI} AND r.debit_pokok + r.debit_bunga + r.kredit_pokok > 0
        ORDER BY r.tanggal_angsuran DESC, r.id DESC LIMIT 8)
    ) x ORDER BY tanggal DESC, no_bukti DESC LIMIT 8`

/** Tiga query satu grup pinjaman tunai: nilai sama dengan Daftar Pinjaman tampilan bawaan (anggota aktif, punya rincian). */
export function sqlRingkasPinjaman(grup: string) {
    const dasar = { grup, hanyaBerbuku: true, keyword: "", kolomCari: null, aktif: true, kredit: "All", urutKolom: null, urutArah: "DESC" as const, limit: 1, offset: 0 }
    const belum = sqlLaporanPinjaman({ ...dasar, status: 3 }), macet = sqlLaporanPinjaman({ ...dasar, status: 1 })
    return { sisa: { sql: belum.sqlJumlah, values: belum.valuesCount }, kontrak: { sql: belum.sqlCount, values: belum.valuesCount }, tunggak: { sql: macet.sqlCount, values: macet.valuesCount } }
}

export function sqlRingkasKpr() {
    const q = sqlDaftarKpr({ keyword: "", kredit: "", bulan: 0, tahun: 0, status: "berjalan", aktif: "Y" })
    return { sql: `SELECT COUNT(*)::int AS kontrak, COALESCE(SUM(sisa), 0) AS sisa FROM (${q.sql}) x`, values: q.values }
}
