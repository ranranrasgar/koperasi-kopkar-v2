import "server-only"
import { ringkasBagian, type Bagian } from "@kopkar/backend/src/posting/potongan.ts"
import { pool, query } from "@/lib/db"

const BULAN = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"]
export const namaPeriode = (p: string) => `${BULAN[Number(p.slice(5, 7)) - 1]} ${p.slice(0, 4)}`
export const PERIODE = /^\d{4}-(0[1-9]|1[0-2])$/

export const NAMA_BAGIAN: Record<Bagian, string> = {
    pokok: "Simpanan Pokok", wajib: "Simpanan Wajib", sukarela: "Simpanan Sukarela",
    koperasi: "Pinjaman Koperasi", bank: "Pinjaman Bank", kpr: "Pinjaman KPR",
}
export const STATUS_PERIODE = { draf: "Draf", sebagian: "Diposting sebagian", diposting: "Diposting" } as const

/** Ringkasan per bagian posting (jumlah transaksi, nominal, dan keterangan posting) untuk modal Posting. */
export const bagianPeriode = (periode: string) => ringkasBagian(pool, periode)

export interface PeriodePotongan {
    id: number; periode: string; status: keyof typeof STATUS_PERIODE; dibuat_oleh: string; digenerate_pada: string
    tgl_posting: string | null; kas: string | null; diposting_oleh: string | null; diposting_pada: string | null
    anggota: number; tidak_dipotong: number; total: number
}

const KOLOM_PERIODE = `
    p.id, p.periode, p.status, p.dibuat_oleh, to_char(p.digenerate_pada, 'YYYY-MM-DD HH24:MI') digenerate_pada,
    p.tgl_posting, k.kode_perkiraan || ' ' || k.nama_perkiraan kas, p.diposting_oleh, to_char(p.diposting_pada, 'YYYY-MM-DD HH24:MI') diposting_pada,
    (SELECT COUNT(*)::int FROM potongan_gaji_anggota g WHERE g.potongan_gaji_id = p.id) anggota,
    (SELECT COUNT(*)::int FROM potongan_gaji_anggota g WHERE g.potongan_gaji_id = p.id AND NOT g.dipotong) tidak_dipotong,
    (SELECT COALESCE(SUM(s_wajib + s_sukarela + koperasi + bank + kpr + adm), 0)::float8 FROM potongan_gaji_anggota g
      WHERE g.potongan_gaji_id = p.id AND g.dipotong) total`

export const daftarPeriode = () =>
    query<PeriodePotongan>(`SELECT ${KOLOM_PERIODE} FROM potongan_gaji p LEFT JOIN perkiraan k ON k.id = p.kas_perkiraan_id ORDER BY p.periode DESC`)

export async function satuPeriode(periode: string) {
    const [p] = await query<PeriodePotongan>(
        `SELECT ${KOLOM_PERIODE} FROM potongan_gaji p LEFT JOIN perkiraan k ON k.id = p.kas_perkiraan_id WHERE p.periode = $1`, [periode])
    return p ?? null
}

export interface AnggotaPotongan {
    kode_agt: string; nik: string; nama: string; status_staff: string; bank_nama: string; bank_no_rek: string
    s_wajib: number; s_sukarela: number; koperasi: number; bank: number; kpr: number; adm: number; total: number
    dipotong: boolean; alasan: string | null; diubah_oleh: string | null; bukti_wajib: string | null; bukti_sukarela: string | null
}

/** Anggota satu periode, disaring nama/kode/KPK, staff, dan status dipotong; jumlah = hanya anggota yang dipotong. */
export async function anggotaPeriode(periode: string, f: { cari: string; staff: string; tampil: string }) {
    const rows = await query<AnggotaPotongan>(
        `SELECT g.kode_agt, g.nik, g.nama, g.status_staff, g.bank_nama, g.bank_no_rek,
                g.s_wajib::float8, g.s_sukarela::float8, g.koperasi::float8, g.bank::float8, g.kpr::float8, g.adm::float8,
                (g.s_wajib + g.s_sukarela + g.koperasi + g.bank + g.kpr + g.adm)::float8 total,
                g.dipotong, g.alasan, g.diubah_oleh, g.bukti_wajib, g.bukti_sukarela
           FROM potongan_gaji_anggota g JOIN potongan_gaji p ON p.id = g.potongan_gaji_id
          WHERE p.periode = $1
            AND ($2 = '' OR g.nama ILIKE '%' || $2 || '%' OR g.kode_agt ILIKE '%' || $2 || '%' OR g.nik ILIKE '%' || $2 || '%')
            AND ($3 = '' OR g.status_staff = $3)
            AND ($4 = '' OR ($4 = 'tidak' AND NOT g.dipotong) OR ($4 = 'diubah' AND g.diubah_oleh IS NOT NULL))
          ORDER BY g.nama, g.kode_agt`, [periode, f.cari, f.staff, f.tampil])
    const kolom = ["s_wajib", "s_sukarela", "koperasi", "bank", "kpr", "adm", "total"] as const
    const jumlah = Object.fromEntries(kolom.map((k) => [k, rows.filter((r) => r.dipotong).reduce((t, r) => t + r[k], 0)])) as Record<typeof kolom[number], number>
    return { rows, jumlah }
}

export interface PinjamanPotongan {
    id: string; jenis: "tunai" | "kpr"; no_pinjaman: string; grup: string; nama_kredit: string | null; angsuran_ke: number; lama_angsuran: number | null
    pokok: string; jasa: string; adm: string; provisi: string; no_bukti: string | null
}

export async function detailAnggotaPeriode(periode: string, kodeAgt: string) {
    // Nominal simpanan sebagai teks: diisikan apa adanya ke form ubah.
    const [a] = await query<Omit<AnggotaPotongan, "s_wajib" | "s_sukarela"> & {
        anggota_id: string; s_pokok: string; s_wajib: string; s_sukarela: string; bukti_pokok: string | null
    }>(
        `SELECT g.anggota_id, g.kode_agt, g.nik, g.nama, g.status_staff, g.bank_nama, g.bank_no_rek,
                g.s_pokok::text s_pokok, g.s_wajib::text s_wajib, g.s_sukarela::text s_sukarela,
                g.koperasi::float8, g.bank::float8, g.kpr::float8, g.adm::float8,
                (g.s_wajib + g.s_sukarela + g.koperasi + g.bank + g.kpr + g.adm)::float8 total,
                g.dipotong, g.alasan, g.diubah_oleh, g.bukti_pokok, g.bukti_wajib, g.bukti_sukarela
           FROM potongan_gaji_anggota g JOIN potongan_gaji p ON p.id = g.potongan_gaji_id
          WHERE p.periode = $1 AND g.kode_agt = $2`, [periode, kodeAgt])
    if (!a) return null
    const pinjaman = await query<PinjamanPotongan>(
        `SELECT x.id::text, x.jenis, x.no_pinjaman, x.grup, jk.nama_kredit, x.angsuran_ke, COALESCE(pt.lama_angsuran, k.lama_angsuran) lama_angsuran,
                x.pokok::text, x.jasa::text, x.adm::text, x.provisi::text, x.no_bukti
           FROM potongan_gaji_pinjaman x JOIN potongan_gaji p ON p.id = x.potongan_gaji_id
           LEFT JOIN pinjaman_tunai pt ON x.jenis = 'tunai' AND pt.id = x.pinjaman_id
           LEFT JOIN kpr k ON x.jenis = 'kpr' AND k.id = x.pinjaman_id
           LEFT JOIN jenis_kredit jk ON jk.id = COALESCE(pt.jenis_kredit_id, k.jenis_kredit_id)
          WHERE p.periode = $1 AND x.anggota_id = $2 ORDER BY x.jenis DESC, x.no_pinjaman`, [periode, a.anggota_id])
    return { anggota: a, pinjaman }
}

export interface RekapPotongan {
    nik: string; nama: string; bank_no_rek: string; bank_atas_nama: string; bank_nama: string; kota: string
    s_wajib: number; s_sukarela: number; koperasi: number; bank: number; kpr: number; adm: number; total: number
}

/**
 * Anggota yang dipotong pada satu periode untuk Rekap Potongan Anggota (cetak) dan file potongan gaji (export Excel),
 * sama dengan desktop: urut nama, bisa dibatasi status staff. Kota dari data anggota.
 */
export const rekapPotongan = (periode: string, staff: string) =>
    query<RekapPotongan>(
        `SELECT g.nik, g.nama, g.bank_no_rek, g.bank_atas_nama, g.bank_nama, COALESCE(a.kota, '') kota,
                g.s_wajib::float8, g.s_sukarela::float8, g.koperasi::float8, g.bank::float8, g.kpr::float8, g.adm::float8,
                (g.s_wajib + g.s_sukarela + g.koperasi + g.bank + g.kpr + g.adm)::float8 total
           FROM potongan_gaji_anggota g JOIN potongan_gaji p ON p.id = g.potongan_gaji_id JOIN anggota a ON a.id = g.anggota_id
          WHERE p.periode = $1 AND g.dipotong AND ($2 = '' OR g.status_staff = $2)
          ORDER BY g.nama, g.kode_agt`, [periode, staff])

/** Akun kas bawaan posting potongan gaji: Bank OCBC NISP (1.1.01.41), tempat perusahaan menyetor potongan gaji. */
export async function kasBawaanPotongan() {
    const [k] = await query<{ id: number }>("SELECT id FROM perkiraan WHERE kode_perkiraan = '1.1.01.41'")
    return k?.id
}
