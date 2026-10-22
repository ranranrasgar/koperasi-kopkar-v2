import "server-only"
import { query } from "@/lib/db"

export interface MutasiKartu {
    jenis_simpanan: string; nama_simpanan: string | null; tgl_transaksi: string; no_bukti: string; deskripsi: string | null
    rp_setoran: number; rp_pengambilan: number; saldo: number; opr: string | null
}

/** Kartu simpanan satu anggota: mutasi per jenis dengan saldo berjalan (saldo awal = mutasi sebelum `dari`). */
export async function kartuSimpanan(kodeAgt: string, dari: string, sampai: string) {
    const [anggota] = await query<{ kode_agt: string; nik: string | null; nama: string; status_staff: string | null; tglpencatatan: string | null; aktif: boolean }>(
        "SELECT kode_agt, nik, nama, status_staff, tglpencatatan, aktif FROM anggota WHERE kode_agt = $1", [kodeAgt])
    if (!anggota) return null
    const [awal, mutasi] = await Promise.all([
        query<{ jenis_simpanan: string; saldo: number }>(
            `SELECT j.kode_simpanan AS jenis_simpanan, COALESCE(SUM(s.rp_setoran - s.rp_pengambilan), 0) AS saldo
               FROM jenis_simpanan j LEFT JOIN simpanan s ON s.jenis_simpanan_id = j.id AND s.kode_agt = $1 AND s.tgl_transaksi < $2
              GROUP BY j.kode_simpanan`, [kodeAgt, dari]),
        query<MutasiKartu>(
            `SELECT s.jenis_simpanan, j.nama_simpanan, s.tgl_transaksi, s.no_bukti, s.deskripsi, s.rp_setoran, s.rp_pengambilan, s.opr,
                    SUM(s.rp_setoran - s.rp_pengambilan) OVER (PARTITION BY s.jenis_simpanan ORDER BY s.tgl_transaksi, s.urut, s.id) AS saldo
               FROM simpanan s LEFT JOIN jenis_simpanan j ON j.id = s.jenis_simpanan_id
              WHERE s.kode_agt = $1 AND s.tgl_transaksi BETWEEN $2 AND $3
              ORDER BY s.jenis_simpanan, s.tgl_transaksi, s.urut, s.id`, [kodeAgt, dari, sampai]),
    ])
    const saldoAwal = Object.fromEntries(awal.map((a) => [a.jenis_simpanan, a.saldo]))
    // Saldo berjalan dari window di atas dihitung dalam periode; tambahkan saldo awal jenisnya.
    for (const m of mutasi) m.saldo += saldoAwal[m.jenis_simpanan] ?? 0
    return { anggota, saldoAwal, mutasi }
}

export const cariAnggotaSemua = (kata: string) =>
    query<{ kode_agt: string; nik: string | null; nama: string; aktif: boolean }>(
        `SELECT kode_agt, nik, nama, aktif FROM anggota WHERE kode_agt ILIKE $1 OR nik ILIKE $1 OR nama ILIKE $1 ORDER BY aktif DESC, nama LIMIT 30`,
        [`%${kata}%`])

export interface BulanSimpanan { bulan: number; jenis: string; setor: number; ambil: number }

/** Grafik analisa: setoran dan pengambilan per bulan per jenis untuk satu tahun, dan saldo akhir tiap bulan. */
export async function grafikSimpanan(tahun: number) {
    const [bulanan, [awal]] = await Promise.all([
        query<BulanSimpanan>(
            `SELECT EXTRACT(MONTH FROM tgl_transaksi)::int AS bulan, jenis_simpanan AS jenis, SUM(rp_setoran) AS setor, SUM(rp_pengambilan) AS ambil
               FROM simpanan WHERE tgl_transaksi >= make_date($1, 1, 1) AND tgl_transaksi < make_date($1 + 1, 1, 1)
              GROUP BY 1, 2 ORDER BY 1, 2`, [tahun]),
        query<{ saldo: number }>("SELECT COALESCE(SUM(rp_setoran - rp_pengambilan), 0) AS saldo FROM simpanan WHERE tgl_transaksi < make_date($1, 1, 1)", [tahun]),
    ])
    return { bulanan, saldoAwal: awal.saldo }
}

export interface RekapBerjangka { kode_agt: string; nik: string | null; nama: string; setor: number; ambil: number; saldo: number; terakhir: string }

export const rekapBerjangka = () =>
    query<RekapBerjangka>(
        `SELECT a.kode_agt, a.nik, a.nama, SUM(s.rp_setoran) AS setor, SUM(s.rp_pengambilan) AS ambil,
                SUM(s.rp_setoran - s.rp_pengambilan) AS saldo, MAX(s.tgl_transaksi) AS terakhir
           FROM simpanan s JOIN anggota a ON a.id = s.anggota_id JOIN jenis_simpanan j ON j.id = s.jenis_simpanan_id
          WHERE j.kode_simpanan = '05' GROUP BY a.id ORDER BY a.nama`)
