import "server-only"
import type { PageData } from "@/config/modules"
import { SQL_ANGSURAN_POTONGAN } from "@kopkar/backend/src/posting/potongan.ts"
import { query } from "@/lib/db"
import { ukuranHalaman } from "@/lib/halaman"
import { sp, type SearchParams } from "@/lib/list"

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
                   t.jatuh_tempo, t.rp_tunggak, t.jatuh_tempo_pertama
              FROM pinjaman_tunai p
              JOIN anggota a ON a.id = p.anggota_id
              LEFT JOIN jenis_kredit jk ON jk.id = p.jenis_kredit_id
              CROSS JOIN LATERAL (
                  SELECT COUNT(*) AS jatuh_tempo,
                         COALESCE(SUM(t.debit_pokok + t.debit_bunga + t.rp_adm + t.rp_provisi) FILTER (WHERE t.angsuran_ke > p.jml_cicilan), 0) AS rp_tunggak,
                         MIN(t.tanggal_angsuran) FILTER (WHERE t.angsuran_ke > p.jml_cicilan) AS jatuh_tempo_pertama
                    FROM pinjaman_tunai_rincian_tagih t
                   WHERE t.pinjaman_tunai_id = p.id AND t.tanggal_angsuran < date_trunc('month', $1::date)::date) t
             WHERE p.jml_cicilan < p.lama_angsuran
               -- Pinjaman yang saldo bukunya sudah habis (dilunasi sekaligus) bukan tunggakan; aturan sama dengan Daftar Pinjaman.
               AND COALESCE((SELECT SUM(r.kredit_pokok - r.debit_pokok) FROM pinjaman_tunai_rincian r WHERE r.pinjaman_tunai_id = p.id), 1000000) > 100),
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
         ORDER BY jatuh_tempo - jml_cicilan DESC, nama, no_pinjaman`, [per])

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
 * (temp_potongan_all): simpanan wajib dan sukarela dari data anggota, angsuran dari SQL_ANGSURAN_POTONGAN (sama dengan
 * Generate periode potongan gaji), dan biaya adm bank perusahaan.
 */
export const proyeksiPotongan = () =>
    query<Potongan>(`
        WITH j AS (
            SELECT anggota_id,
                   SUM(pokok + jasa + adm + provisi) FILTER (WHERE grup = 'KOPERASI') AS koperasi,
                   SUM(pokok + jasa + adm + provisi) FILTER (WHERE grup = 'BANK / PIHAK LAIN') AS bank,
                   SUM(pokok) FILTER (WHERE grup = 'KPR') AS kpr
              FROM (${SQL_ANGSURAN_POTONGAN}) x GROUP BY 1),
        x AS (
            SELECT a.kode_agt, a.nik, a.nama, a.status_staff, a.bank_nama, a.bank_no_rek,
                   0::numeric AS s_pokok, a.simpanan_wajib AS s_wajib, a.simpanan_sukarela AS s_sukarela,
                   COALESCE(j.koperasi, 0) AS koperasi, COALESCE(j.bank, 0) AS bank, COALESCE(j.kpr, 0) AS kpr,
                   (SELECT rp_adm_bank FROM perusahaan ORDER BY id LIMIT 1) AS adm,
                   t.s_pokok + t.s_wajib + t.s_sukarela + t.rp_koperasi + t.rp_bank + t.rp_kpr + t.rp_adm_bank AS snap_total
              FROM anggota a LEFT JOIN j ON j.anggota_id = a.id LEFT JOIN temp_potongan_all t ON t.anggota_id = a.id
             WHERE a.aktif)
        SELECT *, s_pokok + s_wajib + s_sukarela + koperasi + bank + kpr + adm AS total FROM x ORDER BY nama`)

/** Kolom uang Transaksi Potongan Gaji yang dijumlahkan di baris total. */
export const KOLOM_JUMLAH_POTONGAN = ["s_wajib", "s_sukarela", "koperasi", "bank", "kpr", "adm", "total"] as const

/**
 * Transaksi Potongan Gaji dalam bentuk tabel seragam (cari, filter staff, urut, halaman): proyeksi anggota aktif dihitung
 * sekali (±100 ms untuk ±1.100 anggota), lalu disaring dan diurutkan di sini. Jumlah = total semua baris hasil saring.
 */
export async function daftarPotongan(s: SearchParams): Promise<PageData<Potongan & { beda: boolean }> & { jumlah: Record<string, number>; beda: number }> {
    const cari = sp(s, "search").toLowerCase(), staff = sp(s, "status_staff")
    const semua = (await proyeksiPotongan()).map((p) => ({ ...p, beda: p.snap_total !== null && Math.round(p.snap_total) !== Math.round(p.total) }))
    const data = semua.filter((p) => (!staff || p.status_staff === staff)
        && (!cari || p.nama.toLowerCase().includes(cari) || p.kode_agt.toLowerCase().includes(cari) || (p.nik ?? "").toLowerCase().includes(cari)))
    const kunci = sp(s, "sortBy") as keyof Potongan
    if (kunci && semua.length && kunci in semua[0]) {
        const arah = sp(s, "sortOrder") === "desc" ? -1 : 1
        data.sort((a, b) => {
            const x = a[kunci], y = b[kunci]
            if (x === y) return a.nama.localeCompare(b.nama)
            if (x === null) return 1
            if (y === null) return -1
            return (typeof x === "number" && typeof y === "number" ? x - y : String(x).localeCompare(String(y))) * arah
        })
    }
    const pageSize = ukuranHalaman(sp(s, "pageSize"), 25)
    const totalPages = Math.max(1, Math.ceil(data.length / pageSize))
    const page = Math.min(totalPages, Math.max(1, parseInt(sp(s, "page") || "1", 10) || 1))
    return {
        items: data.slice((page - 1) * pageSize, page * pageSize), total: data.length, page, pageSize, totalPages,
        jumlah: Object.fromEntries(KOLOM_JUMLAH_POTONGAN.map((k) => [k, data.reduce((t, p) => t + p[k], 0)])),
        beda: data.filter((p) => p.beda).length,
    }
}

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
