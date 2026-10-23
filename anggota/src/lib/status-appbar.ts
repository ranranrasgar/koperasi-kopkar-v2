import "server-only"
import { hitungBelumDibaca } from "@kopkar/backend/src/anggota/pesan.ts"
import { pool } from "@/lib/db"

export interface StatusAppBar { notifTerbaru: string | null; pesanBaru: number }

/** Penanda di header: waktu notifikasi terbaru (titik merah bila lebih baru dari yang terakhir dilihat) dan balasan pesan belum dibaca. */
export async function statusAppBar(anggotaId: number): Promise<StatusAppBar> {
    const [n, pesanBaru] = await Promise.all([
        pool.query(`SELECT to_char(max(datetimes), 'YYYY-MM-DD"T"HH24:MI:SS') t FROM log_notifikasi WHERE anggota_id = $1`, [anggotaId]),
        hitungBelumDibaca(pool, "anggota", anggotaId),
    ])
    return { notifTerbaru: n.rows[0].t ?? null, pesanBaru }
}
