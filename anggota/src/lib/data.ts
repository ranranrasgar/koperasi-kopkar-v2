import "server-only"
import * as bersama from "@kopkar/backend/src/anggota/queries.ts"
import { poolAngka, query } from "@/lib/db"

// Data untuk halaman PWA. Setiap fungsi menerima anggotaId dari sesi (lib/anggota.ts), tidak pernah dari URL,
// dan rincian pinjaman selalu dicek pemiliknya (id pinjaman + anggota_id). Relasi lewat id/FK.
//
// Keputusan PRD: sisa pinjaman dari rincian (buku pinjaman) seperti admin, KPR ditampilkan terpisah (K3);
// potongan bulan ini diproyeksikan langsung dengan rumus halaman Potongan Gaji admin (K2).

/** Sisa pokok di bawah ini dianggap lunas (receh pembulatan), sama dengan status lunas laporan pinjaman admin. */
const SISA_LUNAS = 100

export interface SaldoSimpanan { kode: string; nama: string; saldo: number }

export async function saldoSimpanan(anggotaId: number) {
    return query<SaldoSimpanan>(
        `SELECT js.kode_simpanan kode, js.nama_simpanan nama, s.saldo
           FROM (SELECT jenis_simpanan_id, SUM(rp_setoran - rp_pengambilan) saldo FROM simpanan
                  WHERE anggota_id = $1 GROUP BY jenis_simpanan_id) s
           JOIN jenis_simpanan js ON js.id = s.jenis_simpanan_id
          ORDER BY js.kode_simpanan`, [anggotaId])
}

export interface MutasiSimpanan {
    id: number; tgl_transaksi: string; no_bukti: string; deskripsi: string | null
    rp_setoran: number; rp_pengambilan: number; saldo: number
}

/** Mutasi satu jenis simpanan, terbaru dulu, dengan saldo berjalan (rekening koran). */
export async function mutasiSimpanan(anggotaId: number, kode: string, batas: number) {
    const [jenis] = await query<{ id: number; nama: string }>(
        "SELECT id, nama_simpanan nama FROM jenis_simpanan WHERE kode_simpanan = $1", [kode])
    if (!jenis) return null
    const baris = await query<MutasiSimpanan & { total: number }>(
        `SELECT id, tgl_transaksi, no_bukti, deskripsi, rp_setoran, rp_pengambilan, saldo, COUNT(*) OVER () total FROM (
            SELECT id, urut, tgl_transaksi, no_bukti, deskripsi, rp_setoran, rp_pengambilan,
                   SUM(rp_setoran - rp_pengambilan) OVER (ORDER BY tgl_transaksi, urut, id) saldo
              FROM simpanan WHERE anggota_id = $1 AND jenis_simpanan_id = $2) m
          ORDER BY tgl_transaksi DESC, urut DESC, id DESC LIMIT $3`, [anggotaId, jenis.id, batas])
    return { nama: jenis.nama, baris, total: baris[0]?.total ?? 0 }
}

export interface PinjamanAktif {
    jenis: "tunai" | "kpr"; id: number; no_pinjaman: string; tgl_pinjaman: string; nama_kredit: string | null; grup: string
    pokok: number; lama_angsuran: number; jml_cicilan: number; sisa: number; angsuran: number | null; jatuh_tempo: string | null
}

/** Pinjaman tunai dan KPR yang masih bersisa, dengan angsuran berikutnya. */
export async function pinjamanAktif(anggotaId: number) {
    return query<PinjamanAktif>(
        `SELECT 'tunai' jenis, p.id, p.no_pinjaman, p.tgl_pinjaman, jk.nama_kredit, COALESCE(jk.group_pinjaman, 'KOPERASI') grup,
                p.rp_pinjaman_pokok pokok, p.lama_angsuran, p.jml_cicilan, r.sisa,
                t.debit_pokok + t.debit_bunga + t.rp_adm + t.rp_provisi angsuran, t.tanggal_angsuran jatuh_tempo
           FROM pinjaman_tunai p
           LEFT JOIN jenis_kredit jk ON jk.id = p.jenis_kredit_id
           JOIN LATERAL (SELECT SUM(kredit_pokok - debit_pokok) sisa FROM pinjaman_tunai_rincian WHERE pinjaman_tunai_id = p.id) r ON r.sisa > ${SISA_LUNAS}
           LEFT JOIN pinjaman_tunai_rincian_tagih t ON t.pinjaman_tunai_id = p.id AND t.angsuran_ke = p.jml_cicilan + 1
          WHERE p.anggota_id = $1
         UNION ALL
         SELECT 'kpr', k.id, k.no_pinjaman, k.tgl_pinjaman, jk.nama_kredit, 'KPR', k.rp_pinjaman_pokok, k.lama_angsuran, k.jml_cicilan, r.sisa,
                LEAST(k.rp_angsuran_per_bulan, r.sisa), t.tanggal_angsuran
           FROM kpr k
           LEFT JOIN jenis_kredit jk ON jk.id = k.jenis_kredit_id
           JOIN LATERAL (SELECT SUM(kredit_pokok - debit_pokok) sisa FROM kpr_rincian WHERE kpr_id = k.id) r ON r.sisa > ${SISA_LUNAS}
           LEFT JOIN kpr_rincian_tagih t ON t.kpr_id = k.id AND t.angsuran_ke = k.jml_cicilan + 1
          WHERE k.anggota_id = $1
          ORDER BY 1 DESC, 4 DESC`, [anggotaId])
}

export interface JadwalAngsuran {
    angsuran_ke: number; tanggal_angsuran: string; pokok: number; jasa: number; biaya: number; total: number
    lunas: boolean; tgl_bayar: string | null
}
export interface BayarAngsuran { tanggal_angsuran: string; no_bukti: string; angsuran_ke: number; pokok: number; jasa: number }

/** Rincian satu pinjaman milik anggota ini (null bila bukan miliknya): data pokok, jadwal, dan pembayaran. */
export async function rincianPinjaman(anggotaId: number, jenis: "tunai" | "kpr", id: number) {
    const [p] = (await pinjamanAktifAtauLunas(anggotaId, jenis, id))
    if (!p) return null
    const tagih = jenis === "tunai" ? "pinjaman_tunai_rincian_tagih" : "kpr_rincian_tagih"
    const rinci = jenis === "tunai" ? "pinjaman_tunai_rincian" : "kpr_rincian"
    const fk = jenis === "tunai" ? "pinjaman_tunai_id" : "kpr_id"
    const biaya = jenis === "tunai" ? "rp_adm + rp_provisi" : "0"
    const [jadwal, bayar] = await Promise.all([
        query<JadwalAngsuran>(
            `SELECT angsuran_ke, tanggal_angsuran, debit_pokok pokok, debit_bunga jasa, ${biaya} biaya,
                    debit_pokok + debit_bunga + ${biaya} total, angsuran_ke <= $2 lunas, tgl_bayar
               FROM ${tagih} WHERE ${fk} = $1 AND angsuran_ke <> 0 ORDER BY angsuran_ke`, [id, p.jml_cicilan]),
        query<BayarAngsuran>(
            `SELECT tanggal_angsuran, no_bukti, angsuran_ke, debit_pokok pokok, debit_bunga jasa
               FROM ${rinci} WHERE ${fk} = $1 AND angsuran_ke <> 0 AND debit_pokok + debit_bunga > 0
              ORDER BY tanggal_angsuran DESC, angsuran_ke DESC`, [id]),
    ])
    return { pinjaman: p, jadwal, bayar }
}

async function pinjamanAktifAtauLunas(anggotaId: number, jenis: "tunai" | "kpr", id: number) {
    const tabel = jenis === "tunai" ? "pinjaman_tunai" : "kpr"
    const rinci = jenis === "tunai" ? "pinjaman_tunai_rincian" : "kpr_rincian"
    const fk = jenis === "tunai" ? "pinjaman_tunai_id" : "kpr_id"
    return query<Omit<PinjamanAktif, "angsuran" | "jatuh_tempo"> & { persen_bunga: number | null }>(
        `SELECT $3::text jenis, p.id, p.no_pinjaman, p.tgl_pinjaman, jk.nama_kredit,
                ${jenis === "tunai" ? "COALESCE(jk.group_pinjaman, 'KOPERASI')" : "'KPR'"} grup,
                p.rp_pinjaman_pokok pokok, p.lama_angsuran, p.jml_cicilan, jk.bunga_kredit persen_bunga,
                COALESCE((SELECT SUM(kredit_pokok - debit_pokok) FROM ${rinci} WHERE ${fk} = p.id), 0) sisa
           FROM ${tabel} p LEFT JOIN jenis_kredit jk ON jk.id = p.jenis_kredit_id
          WHERE p.id = $1 AND p.anggota_id = $2`, [id, anggotaId, jenis])
}

export interface Potongan {
    wajib: number; sukarela: number; koperasi: number; bank: number; kpr: number; adm: number; total: number
    bank_nama: string | null; bank_no_rek: string | null; bank_atas_nama: string | null; terdebet: boolean
}

/** Proyeksi potongan gaji bulan berjalan: rumus proyeksiPotongan admin (frontend/src/lib/queries/pinjaman-lap.ts) untuk satu anggota. */
export async function potonganBulanIni(anggotaId: number) {
    const [p] = await query<Potongan>(
        `WITH pt AS (
            SELECT COALESCE(jk.group_pinjaman, 'KOPERASI') g, SUM(t.debit_pokok + t.debit_bunga + t.rp_adm + t.rp_provisi) rp
              FROM pinjaman_tunai p LEFT JOIN jenis_kredit jk ON jk.id = p.jenis_kredit_id
              JOIN pinjaman_tunai_rincian_tagih t ON t.pinjaman_tunai_id = p.id AND t.angsuran_ke = p.jml_cicilan + 1
             WHERE p.anggota_id = $1 AND p.jml_cicilan < p.lama_angsuran GROUP BY 1),
         k AS (
            SELECT SUM(LEAST(k.rp_angsuran_per_bulan, r.sisa)) rp
              FROM kpr k JOIN LATERAL (SELECT SUM(kredit_pokok - debit_pokok) sisa FROM kpr_rincian WHERE kpr_id = k.id) r ON r.sisa > 0
             WHERE k.anggota_id = $1)
         SELECT x.*, wajib + sukarela + koperasi + bank + kpr + adm total FROM (
            SELECT a.simpanan_wajib wajib, a.simpanan_sukarela sukarela,
                   COALESCE((SELECT rp FROM pt WHERE g = 'KOPERASI'), 0) koperasi,
                   COALESCE((SELECT rp FROM pt WHERE g = 'BANK / PIHAK LAIN'), 0) bank,
                   COALESCE((SELECT rp FROM k), 0) kpr,
                   COALESCE((SELECT rp_adm_bank FROM perusahaan ORDER BY id LIMIT 1), 0) adm,
                   a.bank_nama, a.bank_no_rek, a.bank_atas_nama,
                   EXISTS (SELECT 1 FROM temp_potongan_all WHERE anggota_id = a.id) terdebet
              FROM anggota a WHERE a.id = $1) x`, [anggotaId])
    return p ?? null
}

export interface Shu {
    rp_sukarela: number; rp_uang: number; rp_barang: number; rp_lama: number
    temp_sukarela: number; temp_uang: number; temp_barang: number; temp_lama: number; total_shu: number; no_reff: string
}

export const tahunShu = () => bersama.getTahunShu(poolAngka)

/**
 * SHU satu tahun buku. Rumus aplikasi lama (getShu) bergantung pada rp_labaditahan, yang di data tutup buku 2025
 * bernilai 0 sehingga hasilnya selalu 0. Hasil hitung SHU desktop per anggota tersimpan di rp_pencairan; itulah
 * yang ditampilkan sebagai SHU diterima, rumus lama hanya dipakai bila rp_pencairan kosong.
 */
export async function shu(anggotaId: number, tahun: string) {
    const [hitung, [b]] = await Promise.all([
        bersama.getShu(poolAngka, anggotaId, tahun) as Promise<Shu>,
        query<{ rp_pencairan: number | null }>(
            `SELECT rp_pencairan FROM temp_shu_backup WHERE anggota_id = $1
                AND tgl_tutup_buku >= make_date($2::int, 1, 1) AND tgl_tutup_buku < make_date($2::int + 1, 1, 1) LIMIT 1`,
            [anggotaId, /^\d{4}$/.test(tahun) ? tahun : "0"]),
    ])
    const diterima = b?.rp_pencairan && b.rp_pencairan > 0 ? b.rp_pencairan : hitung.total_shu
    return { ...hitung, diterima, adaData: !!b }
}

export interface Riwayat { tgl: string; ref: string; title: string; sub: string; amount: number; category: string }
export const riwayat = (anggotaId: number, batas: number) =>
    bersama.getHistory(poolAngka, anggotaId, 0, batas) as Promise<Riwayat[]>

export interface Notifikasi { title: string | null; pesan: string | null; datetimes: string }
export const notifikasi = (anggotaId: number, batas: number) =>
    bersama.getLogNotifikasi(poolAngka, anggotaId, 0, batas) as Promise<Notifikasi[]>

export interface Himbauan { id: number; judul_himbauan: string | null; isi_himbauan: string | null }
export const himbauan = () => bersama.getHimbauan(poolAngka) as Promise<Himbauan | null>
export interface Promo { id: number; judul: string | null; isi: string | null }
export const promo = () => bersama.getPromos(poolAngka) as Promise<Promo[]>

export interface Profil {
    kode_agt: string; tglpencatatan: string | null; nik: string | null; nama: string; jns_kelamin: string | null
    alamat: string | null; kota: string | null; kode_pos: number | null; tlp_rumah: string | null; hp: string | null
    status: string | null; nama_istri_suami: string | null; jml_tanggungan: string | null; jml_anak: string | null
    status_staff: string | null; rp_grade: number | null; grade: string | null
    simpanan_pokok: number | null; simpanan_wajib: number | null; simpanan_sukarela: number | null
    pekerjaan: string | null; nama_perusahaan: string | null; jabatan: string | null
    lama_bekerja_tahun: string | null; lama_bekerja_bulan: string | null
    bank_no_rek: string | null; bank_nama: string | null; bank_atas_nama: string | null
}
export const profil = async (anggotaId: number) => ((await bersama.getAnggota(poolAngka, anggotaId)) as Profil[])[0] ?? null
