import "server-only"
import { query } from "@/lib/db"

/** Batas kolektibilitas umum perbankan (OJK), dipakai juga di Kredit Macet: hari keterlambatan -> kategori. */
export function kolektibilitas(hari: number) {
    return hari <= 0 ? "Lancar" : hari > 180 ? "Macet" : hari > 120 ? "Diragukan" : hari > 90 ? "Kurang Lancar" : "Dalam Perhatian Khusus"
}

export interface RiwayatPinjaman {
    jenis: "tunai" | "kpr"; no_pinjaman: string; tgl_pinjaman: string; kode_kredit: string | null; nama_kredit: string | null
    pokok: number; lama: number; dibayar: number; sisa_pokok: number; angsuran_bulan: number
    /** Angsuran jatuh tempo (bulan jatuh temponya sudah berakhir) yang belum dibayar, dan hari sejak jatuh tempo tertua. */
    tunggak: number; rp_tunggak: number; hari_tunggak: number
    /** Keterlambatan bayar terlama (hari) dan jumlah angsuran yang dibayar lebih dari 30 hari setelah jatuh tempo, selama pinjaman ini. */
    maks_telat: number; kali_telat: number
    status: "Lunas" | "Berjalan" | "Menunggak"
}

export interface RiwayatAnggota {
    anggota: { nama: string; kode_agt: string; status_staff: string | null; rp_grade: number; tgl_masuk: string | null; aktif: boolean; simpanan: number }
    ringkas: {
        total: number; berjalan: number; lunas: number; sisa_pokok: number; angsuran_bulan: number
        tunggak_kali: number; rp_tunggak: number; hari_tunggak: number; kolektibilitas: string
        maks_telat: number; kali_telat: number; pernah_macet: number; macet_sekarang: number
    }
    daftar: RiwayatPinjaman[]
}

/** Sisa pokok sampai nilai ini dianggap lunas (receh pembulatan), sama dengan Daftar Pinjaman. */
const SISA_LUNAS = 100

/**
 * Profil dan riwayat pinjaman satu anggota untuk membantu keputusan pencairan: pinjaman yang pernah ada, sisa utang, tunggakan sekarang,
 * keterlambatan bayar dulu (tanggal bayar angsuran dibanding jatuh tempo di jadwal tagih), dan apakah pernah macet (terlambat lebih dari 180 hari).
 * Angsuran dari potongan gaji dibukukan akhir bulan sebelum jatuh tempo, jadi bayar lebih awal bukan keterlambatan.
 */
export async function riwayatAnggota(kodeAgt: string): Promise<RiwayatAnggota | null> {
    const [a] = await query<{ id: number; nama: string; kode_agt: string; status_staff: string | null; rp_grade: number | null; tgl: string | null; aktif: boolean }>(
        "SELECT id, nama, kode_agt, status_staff, rp_grade, tglpencatatan::text AS tgl, (aktif = 'Y') AS aktif FROM anggota WHERE kode_agt = $1", [kodeAgt])
    if (!a) return null
    const [[simp], tunai, kpr] = await Promise.all([
        query<{ total: number }>("SELECT COALESCE(SUM(rp_setoran - rp_pengambilan), 0) AS total FROM simpanan WHERE anggota_id = $1", [a.id]),
        query<Omit<RiwayatPinjaman, "jenis" | "status">>(`
            WITH hari AS (SELECT (now() AT TIME ZONE 'Asia/Jakarta')::date AS ini)
            SELECT p.no_pinjaman, p.tgl_pinjaman::text AS tgl_pinjaman, jk.kode_kredit, jk.nama_kredit, p.rp_pinjaman_pokok AS pokok, p.lama_angsuran AS lama,
                   p.jml_cicilan AS dibayar, COALESCE(b.sisa, 0) AS sisa_pokok,
                   COALESCE((SELECT t.debit_pokok + t.debit_bunga FROM pinjaman_tunai_rincian_tagih t WHERE t.pinjaman_tunai_id = p.id AND t.angsuran_ke = p.jml_cicilan + 1), 0) AS angsuran_bulan,
                   CASE WHEN COALESCE(b.sisa, 1000000) > $2 THEN COALESCE(g.tunggak, 0) ELSE 0 END AS tunggak,
                   CASE WHEN COALESCE(b.sisa, 1000000) > $2 THEN COALESCE(g.rp_tunggak, 0) ELSE 0 END AS rp_tunggak,
                   CASE WHEN COALESCE(b.sisa, 1000000) > $2 AND g.tertua IS NOT NULL THEN GREATEST((SELECT ini FROM hari) - g.tertua, 0) ELSE 0 END AS hari_tunggak,
                   COALESCE(l.maks_telat, 0) AS maks_telat, COALESCE(l.kali_telat, 0) AS kali_telat
              FROM pinjaman_tunai p LEFT JOIN jenis_kredit jk ON jk.id = p.jenis_kredit_id
              LEFT JOIN LATERAL (SELECT SUM(kredit_pokok - debit_pokok) AS sisa FROM pinjaman_tunai_rincian WHERE pinjaman_tunai_id = p.id) b ON true
              LEFT JOIN LATERAL (
                   SELECT COUNT(*) FILTER (WHERE t.angsuran_ke > p.jml_cicilan) AS tunggak,
                          COALESCE(SUM(t.debit_pokok + t.debit_bunga + t.rp_adm + t.rp_provisi) FILTER (WHERE t.angsuran_ke > p.jml_cicilan), 0) AS rp_tunggak,
                          MIN(t.tanggal_angsuran) FILTER (WHERE t.angsuran_ke > p.jml_cicilan) AS tertua
                     FROM pinjaman_tunai_rincian_tagih t
                    WHERE t.pinjaman_tunai_id = p.id AND t.angsuran_ke > 0 AND t.tanggal_angsuran < date_trunc('month', (SELECT ini FROM hari))::date) g ON true
              LEFT JOIN LATERAL (
                   SELECT MAX(GREATEST(r.tanggal_angsuran - t.tanggal_angsuran, 0)) AS maks_telat,
                          COUNT(*) FILTER (WHERE r.tanggal_angsuran - t.tanggal_angsuran > 30) AS kali_telat
                     FROM pinjaman_tunai_rincian_tagih t
                     JOIN pinjaman_tunai_rincian r ON r.pinjaman_tunai_id = t.pinjaman_tunai_id AND r.angsuran_ke = t.angsuran_ke
                    WHERE t.pinjaman_tunai_id = p.id AND t.angsuran_ke > 0) l ON true
             WHERE p.anggota_id = $1 ORDER BY p.tgl_pinjaman DESC, p.id DESC`, [a.id, SISA_LUNAS]),
        query<Omit<RiwayatPinjaman, "jenis" | "status">>(`
            SELECT k.no_pinjaman, k.tgl_pinjaman::text AS tgl_pinjaman, jk.kode_kredit, jk.nama_kredit, k.rp_pinjaman_pokok AS pokok, k.lama_angsuran AS lama,
                   k.jml_cicilan AS dibayar, COALESCE(b.sisa, 0) AS sisa_pokok, k.rp_angsuran_per_bulan AS angsuran_bulan,
                   0 AS tunggak, 0 AS rp_tunggak, 0 AS hari_tunggak, 0 AS maks_telat, 0 AS kali_telat
              FROM kpr k LEFT JOIN jenis_kredit jk ON jk.id = k.jenis_kredit_id
              LEFT JOIN LATERAL (SELECT SUM(kredit_pokok - debit_pokok) AS sisa FROM kpr_rincian WHERE kpr_id = k.id) b ON true
             WHERE k.anggota_id = $1 ORDER BY k.tgl_pinjaman DESC, k.id DESC`, [a.id]),
    ])
    const daftar: RiwayatPinjaman[] = [
        ...tunai.map((p) => ({ ...p, jenis: "tunai" as const })), ...kpr.map((p) => ({ ...p, jenis: "kpr" as const })),
    ].map((p) => ({ ...p, status: p.sisa_pokok <= SISA_LUNAS || p.dibayar >= p.lama ? "Lunas" as const : p.tunggak > 0 ? "Menunggak" as const : "Berjalan" as const }))
        .sort((x, y) => (x.tgl_pinjaman < y.tgl_pinjaman ? 1 : -1))
    const aktif = daftar.filter((p) => p.status !== "Lunas")
    const hari = Math.max(0, ...daftar.map((p) => p.hari_tunggak))
    return {
        anggota: { nama: a.nama, kode_agt: a.kode_agt, status_staff: a.status_staff, rp_grade: a.rp_grade ?? 0, tgl_masuk: a.tgl, aktif: a.aktif, simpanan: simp?.total ?? 0 },
        ringkas: {
            total: daftar.length, berjalan: aktif.length, lunas: daftar.length - aktif.length,
            sisa_pokok: aktif.reduce((t, p) => t + p.sisa_pokok, 0), angsuran_bulan: aktif.reduce((t, p) => t + p.angsuran_bulan, 0),
            tunggak_kali: daftar.reduce((t, p) => t + p.tunggak, 0), rp_tunggak: daftar.reduce((t, p) => t + p.rp_tunggak, 0),
            hari_tunggak: hari, kolektibilitas: kolektibilitas(hari),
            maks_telat: Math.max(0, ...daftar.map((p) => p.maks_telat)), kali_telat: daftar.reduce((t, p) => t + p.kali_telat, 0),
            pernah_macet: daftar.filter((p) => p.maks_telat > 180 || p.hari_tunggak > 180).length, macet_sekarang: daftar.filter((p) => p.hari_tunggak > 180).length,
        },
        daftar,
    }
}
