import { MENIT_ONLINE } from "@kopkar/backend/src/aktivitas.ts"
import { query } from "@/lib/db"

const JKT = "AT TIME ZONE 'Asia/Jakarta'"
export const BATAS_RIWAYAT = 5000

export interface BarisOnline { kanal: string; pengguna_id: number; nama: string; kode: string | null; halaman: string | null; perangkat: string | null; detik: number }
export interface BarisLog { id: number; waktu: string; kanal: string; nama: string; aksi: string; modul: string | null; ket: string | null }
export interface FilterLog { dari: string; sampai: string; kanal: string; aksi: string; cari: string }

export const penggunaOnline = () => query<BarisOnline>(
    `SELECT kanal, pengguna_id, nama, kode, halaman, perangkat, EXTRACT(EPOCH FROM now() - terakhir)::int AS detik
       FROM pengguna_aktif WHERE terakhir > now() - make_interval(mins => $1) ORDER BY kanal, terakhir DESC`, [MENIT_ONLINE])

/** Angka kartu ringkasan untuk hari ini (zona Jakarta). */
export const ringkasHariIni = async () => (await query<{ simpan: number; login: number; gagal: number }>(
    `SELECT COUNT(*) FILTER (WHERE aksi = 'simpan')::int AS simpan, COUNT(*) FILTER (WHERE aksi = 'login')::int AS login, COUNT(*) FILTER (WHERE aksi = 'login_gagal')::int AS gagal
       FROM log_aktivitas WHERE waktu >= date_trunc('day', now() ${JKT}) ${JKT}`))[0]

export function riwayatAktivitas(f: FilterLog) {
    const v: unknown[] = [f.dari, f.sampai]
    let where = `(waktu ${JKT})::date BETWEEN $1 AND $2`
    if (f.kanal === "admin") where += " AND kanal = 'admin'"
    if (f.kanal === "anggota") where += " AND kanal <> 'admin'"
    // "Buka halaman" jauh lebih banyak daripada aksi lain, jadi hanya tampil bila dipilih (supaya login dan simpan tidak tenggelam).
    if (f.aksi) { v.push(f.aksi); where += ` AND aksi = $${v.length}` } else where += " AND aksi <> 'buka'"
    if (f.cari) { v.push(`%${f.cari}%`); where += ` AND (nama ILIKE $${v.length} OR modul ILIKE $${v.length} OR ket ILIKE $${v.length})` }
    return query<BarisLog>(
        `SELECT id, to_char(waktu ${JKT}, 'YYYY-MM-DD HH24:MI:SS') AS waktu, kanal, nama, aksi, modul, ket
           FROM log_aktivitas WHERE ${where} ORDER BY id DESC LIMIT ${BATAS_RIWAYAT}`, v)
}
