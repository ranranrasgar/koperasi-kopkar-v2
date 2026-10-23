import "server-only"
import { query } from "@/lib/db"

export interface Tunggakan {
    jenis: "tunai" | "kpr"; no_pinjaman: string; kode_agt: string; nik: string | null; nama: string; aktif: boolean
    grup: string; nama_kredit: string | null; tgl_pinjaman: string; lama_angsuran: number; jml_cicilan: number
    jatuh_tempo: number; tunggak: number; rp_tunggak: number; jatuh_tempo_pertama: string
}

/**
 * Tunggakan per pinjaman: angsuran di jadwal tagih yang sudah terlambat dikurangi angsuran yang sudah dibayar (jml_cicilan).
 * Terlambat = bulan jatuh temponya sudah berakhir pada tanggal `per` (potongan gaji dibukukan sekitar akhir bulan, jadi angsuran bulan
 * berjalan belum dianggap terlambat). Aturan sama dengan Daftar Pinjaman. Pinjaman yang saldo bukunya sudah habis tidak dihitung.
 * Kolom jml_tunggakan dari desktop tidak dipakai karena usang.
 */
export const daftarTunggakan = (per: string) =>
    query<Tunggakan>(`
        WITH tunai AS (
            SELECT 'tunai' AS jenis, p.no_pinjaman, a.kode_agt, a.nik, a.nama, a.aktif, jk.group_pinjaman AS grup, jk.nama_kredit,
                   p.tgl_pinjaman, p.lama_angsuran, p.jml_cicilan,
                   COUNT(t.*) AS jatuh_tempo,
                   COALESCE(SUM(t.debit_pokok + t.debit_bunga + t.rp_adm + t.rp_provisi) FILTER (WHERE t.angsuran_ke > p.jml_cicilan), 0) AS rp_tunggak,
                   MIN(t.tanggal_angsuran) FILTER (WHERE t.angsuran_ke > p.jml_cicilan) AS jatuh_tempo_pertama
              FROM pinjaman_tunai p
              JOIN anggota a ON a.id = p.anggota_id
              LEFT JOIN jenis_kredit jk ON jk.id = p.jenis_kredit_id
              JOIN pinjaman_tunai_rincian_tagih t ON t.pinjaman_tunai_id = p.id AND t.tanggal_angsuran < date_trunc('month', $1::date)::date
             WHERE p.jml_cicilan < p.lama_angsuran
               -- Pinjaman yang saldo bukunya sudah habis (dilunasi sekaligus) bukan tunggakan; aturan sama dengan Daftar Pinjaman.
               AND COALESCE((SELECT SUM(r.kredit_pokok - r.debit_pokok) FROM pinjaman_tunai_rincian r WHERE r.pinjaman_tunai_id = p.id), 1000000) > 100
             GROUP BY p.id, a.id, jk.id),
        kpr AS (
            SELECT 'kpr' AS jenis, k.no_pinjaman, a.kode_agt, a.nik, a.nama, a.aktif, 'KPR' AS grup, jk.nama_kredit,
                   k.tgl_pinjaman, k.lama_angsuran, k.jml_cicilan,
                   COUNT(t.*) AS jatuh_tempo,
                   COALESCE(SUM(t.debit_pokok) FILTER (WHERE t.angsuran_ke > k.jml_cicilan), 0) AS rp_tunggak,
                   MIN(t.tanggal_angsuran) FILTER (WHERE t.angsuran_ke > k.jml_cicilan) AS jatuh_tempo_pertama
              FROM kpr k
              JOIN anggota a ON a.id = k.anggota_id
              LEFT JOIN jenis_kredit jk ON jk.id = k.jenis_kredit_id
              JOIN kpr_rincian_tagih t ON t.kpr_id = k.id AND t.tanggal_angsuran < date_trunc('month', $1::date)::date
             WHERE k.jml_cicilan < k.lama_angsuran
             GROUP BY k.id, a.id, jk.id)
        SELECT *, jatuh_tempo - jml_cicilan AS tunggak FROM (SELECT * FROM tunai UNION ALL SELECT * FROM kpr) x
         WHERE jatuh_tempo > jml_cicilan
         ORDER BY jatuh_tempo - jml_cicilan DESC, nama`, [per])

/** Pinjaman tunai yang belum lunas tetapi tidak punya jadwal tagih sama sekali (pencairan belum dibukukan lengkap): tidak bisa dinilai menunggak. */
export const jumlahTanpaJadwal = async () => (await query<{ n: number }>(
    `SELECT COUNT(*)::int AS n FROM pinjaman_tunai p
      WHERE p.jml_cicilan < p.lama_angsuran AND NOT EXISTS (SELECT 1 FROM pinjaman_tunai_rincian_tagih t WHERE t.pinjaman_tunai_id = p.id)`))[0]?.n ?? 0

export const jenisMacet = () =>
    query<{ id: number; nama_macet: string; lama: number; denda: number }>("SELECT id, nama_macet, lama, denda FROM jenis_macet ORDER BY lama")

export interface Potongan {
    kode_agt: string; nik: string | null; nama: string; status_staff: string | null; bank_nama: string | null; bank_no_rek: string | null
    s_pokok: number; s_wajib: number; s_sukarela: number; koperasi: number; bank: number; kpr: number; adm: number; total: number
    snap_total: number | null
}

/**
 * Proyeksi potongan gaji bulan berjalan untuk anggota aktif, dengan rumus yang cocok dengan hasil desktop
 * (temp_potongan_all): simpanan wajib dan sukarela dari data anggota, angsuran berikutnya dari jadwal tagih
 * pinjaman tunai (per grup), angsuran KPR per bulan (maks. sisa pokok), dan biaya adm bank perusahaan.
 */
export const proyeksiPotongan = () =>
    query<Potongan>(`
        WITH pt AS (
            SELECT p.anggota_id, jk.group_pinjaman AS g, SUM(t.debit_pokok + t.debit_bunga + t.rp_adm + t.rp_provisi) AS rp
              FROM pinjaman_tunai p JOIN jenis_kredit jk ON jk.id = p.jenis_kredit_id
              JOIN pinjaman_tunai_rincian_tagih t ON t.pinjaman_tunai_id = p.id AND t.angsuran_ke = p.jml_cicilan + 1
             WHERE p.jml_cicilan < p.lama_angsuran GROUP BY 1, 2),
        k AS (
            SELECT k.anggota_id, SUM(LEAST(k.rp_angsuran_per_bulan, r.sisa)) AS rp
              FROM kpr k JOIN LATERAL (SELECT SUM(kredit_pokok - debit_pokok) AS sisa FROM kpr_rincian WHERE kpr_id = k.id) r ON r.sisa > 0
             GROUP BY 1),
        x AS (
            SELECT a.kode_agt, a.nik, a.nama, a.status_staff, a.bank_nama, a.bank_no_rek,
                   0::numeric AS s_pokok, a.simpanan_wajib AS s_wajib, a.simpanan_sukarela AS s_sukarela,
                   COALESCE((SELECT rp FROM pt WHERE pt.anggota_id = a.id AND g = 'KOPERASI'), 0) AS koperasi,
                   COALESCE((SELECT rp FROM pt WHERE pt.anggota_id = a.id AND g = 'BANK / PIHAK LAIN'), 0) AS bank,
                   COALESCE(k.rp, 0) AS kpr,
                   (SELECT rp_adm_bank FROM perusahaan ORDER BY id LIMIT 1) AS adm,
                   t.s_pokok + t.s_wajib + t.s_sukarela + t.rp_koperasi + t.rp_bank + t.rp_kpr + t.rp_adm_bank AS snap_total
              FROM anggota a LEFT JOIN k ON k.anggota_id = a.id LEFT JOIN temp_potongan_all t ON t.anggota_id = a.id
             WHERE a.aktif)
        SELECT *, s_pokok + s_wajib + s_sukarela + koperasi + bank + kpr + adm AS total FROM x ORDER BY nama`)

export interface ShuAnggota {
    kode_agt: string; nik: string | null; nama: string; status_staff: string | null; rp_sukarela: number; rp_jasa_uang: number
    rp_jasa_barang: number; rp_labaditahan: number; rp_pencairan: number; lama_agt: number | null; no_reff: string | null
}

export const tanggalShu = () =>
    query<{ tgl: string; n: number }>("SELECT tgl_tutup_buku AS tgl, COUNT(*) AS n FROM temp_shu_backup GROUP BY 1 ORDER BY 1 DESC")

export const shuAnggota = (tgl: string) =>
    query<ShuAnggota>(`SELECT kode_agt, nik, nama, status_staff, rp_sukarela, rp_jasa_uang, rp_jasa_barang, rp_labaditahan, rp_pencairan,
        lama_agt, no_reff FROM temp_shu_backup WHERE tgl_tutup_buku = $1 ORDER BY nama`, [tgl])

export const posShu = () =>
    query<{ urut: number; nama_pos_shu: string; kode_coa: string; prosentase: number; nama_perkiraan: string | null }>(
        `SELECT s.urut, s.nama_pos_shu, s.kode_coa, s.prosentase, p.nama_perkiraan FROM jenis_pos_shu s
           LEFT JOIN perkiraan p ON p.id = s.perkiraan_id ORDER BY s.urut`)
