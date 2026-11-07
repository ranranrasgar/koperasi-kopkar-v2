import "server-only"
import { query } from "@/lib/db"

const JKT = "AT TIME ZONE 'Asia/Jakarta'"

export interface BarisAbsensi { id: string; tanggal: string; kode_agt: string; nik: string | null; nama: string; masuk: string; pulang: string | null }

/** Absensi staff pada rentang tanggal, terbaru dulu. */
export function daftarAbsensi(dari: string, sampai: string) {
    return query<BarisAbsensi>(
        `SELECT s.id, to_char(s.tanggal, 'YYYY-MM-DD') AS tanggal, a.kode_agt, a.nik, a.nama,
                to_char(s.masuk ${JKT}, 'HH24:MI') AS masuk, to_char(s.pulang ${JKT}, 'HH24:MI') AS pulang
           FROM absensi_staff s JOIN anggota a ON a.id = s.anggota_id
          WHERE s.tanggal BETWEEN $1 AND $2
          ORDER BY s.tanggal DESC, s.masuk DESC`, [dari, sampai])
}
