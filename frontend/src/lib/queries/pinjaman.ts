import "server-only"
import { query } from "@/lib/db"
import { params, sp, type SearchParams } from "@/lib/list"
import type { PageData } from "@/config/modules"
import { ukuranHalaman } from "@/lib/halaman"
import { sqlLaporanPinjaman, type KOLOM_JUMLAH } from "@/lib/queries/pinjaman-sql"

export const GRUP_PINJAMAN = ["KOPERASI", "BANK / PIHAK LAIN", "KPR"]

// Semua jenis ditampilkan; hide=true (mis. seluruh jenis KPR) ditaruh di bawah dan ditandai di form.
export const jenisKredit = (grup?: string) =>
    query<{ kode_kredit: string; nama_kredit: string; group_pinjaman: string; bunga_kredit: number; bunga_per: string;
        mak_cicilan: number; persen_adm: number; persen_provisi: number; jatuh_tempo: number; hide: boolean
        kunci_staff: boolean; kunci_sisa: boolean; kunci_grade: boolean; maks_plafond: number }>(
        `SELECT kode_kredit, nama_kredit, group_pinjaman, bunga_kredit, bunga_per, mak_cicilan, persen_adm, persen_provisi, jatuh_tempo,
                COALESCE(hide, false) AS hide, kunci_hanya_untuk_staff = 1 AS kunci_staff, kunci_jika_sisa = 1 AS kunci_sisa,
                kunci_jika_melebihi_grade = 1 AS kunci_grade, COALESCE(maks_plafond, 0) AS maks_plafond
           FROM jenis_kredit WHERE ($1::text IS NULL OR group_pinjaman = $1)
          ORDER BY COALESCE(hide, false), kode_kredit`, [grup && grup !== "All" ? grup : null])

export interface LaporanPinjamanRow {
    tgl_pinjaman: string; no_pinjaman: string; kode_agt: string; nik: string | null; nama: string; bank_no_rek: string | null; bank_atas_nama: string | null
    rp_pinjaman_pokok: number; rp_provisi: number; temp_total_plafond: number; temp_total_jasa: number
    temp_angs_per_bulan: number; lama_angsuran: number; jml_cicilan: number; sisa_cicilan: number
    jml_tunggakan: number | null; bayar_pokok: number; bayar_bunga: number; sisa_pokok: number; sisa_buku: number; lunas: boolean; kode_kredit: string | null
    uang_muka: number; rp_adm: number; angs_pokok: number; angs_jasa: number; total_bayar: number; jatuh_tempo: string | null; opr: string | null
}

/** Tahun realisasi yang ada datanya, terbaru dulu, untuk filter Daftar Pinjaman. */
export const tahunPinjaman = () => query<{ tahun: number }>(
    "SELECT DISTINCT EXTRACT(YEAR FROM tgl_pinjaman)::int AS tahun FROM pinjaman_tunai WHERE tgl_pinjaman IS NOT NULL ORDER BY tahun DESC")

/**
 * Laporan pinjaman. Kontrak (plafond, jasa, angsuran) memakai rumus desktop; yang dibayar dan sisa dihitung dari buku pinjaman
 * (lihat pinjaman-sql.ts). Hanya halaman yang tampil yang dihitung dari buku, sehingga cepat walau tabel besar.
 */
export type JumlahPinjaman = Record<(typeof KOLOM_JUMLAH)[number], number>

export async function laporanPinjaman(s: SearchParams): Promise<PageData<LaporanPinjamanRow> & { jumlah: JumlahPinjaman }> {
    const page = Math.max(1, parseInt(sp(s, "page") || "1", 10) || 1)
    const pageSize = ukuranHalaman(sp(s, "pageSize"), 25)
    const q = sqlLaporanPinjaman({
        grup: sp(s, "grup") || "KOPERASI",
        hanyaBerbuku: true,
        keyword: sp(s, "keyword"),
        kolomCari: null,
        bulan: parseInt(sp(s, "bulan"), 10) || undefined,
        tahun: parseInt(sp(s, "tahun"), 10) || undefined,
        aktif: sp(s, "aktif") === "S" ? null : sp(s, "aktif") !== "T",
        kredit: sp(s, "kredit"),
        status: parseInt(sp(s, "lunas") || "0", 10) || 0,
        urutKolom: sp(s, "sortBy") || null,
        urutArah: sp(s, "sortOrder") === "desc" ? "DESC" : "ASC",
        limit: pageSize,
        offset: (page - 1) * pageSize,
    })
    const [count, items, [jumlah]] = await Promise.all([
        query<{ total: number }>(q.sqlCount, q.valuesCount),
        query<LaporanPinjamanRow>(q.sqlItems, q.valuesItems),
        query<JumlahPinjaman>(q.sqlJumlah, q.valuesCount),
    ])
    const total = count[0]?.total ?? 0
    return { items, total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)), jumlah }
}

export interface PinjamanBerjalan {
    no_pinjaman: string; tgl_pinjaman: string; nama_kredit: string | null; rp_pinjaman_pokok: number
    lama_angsuran: number; jml_cicilan: number
}

/** Pinjaman tunai anggota yang belum lunas, untuk form angsuran. */
export const pinjamanBerjalan = (kodeAgt: string) =>
    query<PinjamanBerjalan>(
        `SELECT p.no_pinjaman, p.tgl_pinjaman, jk.nama_kredit, p.rp_pinjaman_pokok, p.lama_angsuran, p.jml_cicilan
           FROM pinjaman_tunai p JOIN anggota a ON a.id = p.anggota_id LEFT JOIN jenis_kredit jk ON jk.id = p.jenis_kredit_id
          WHERE a.kode_agt = $1 AND p.jml_cicilan < p.lama_angsuran
          ORDER BY p.tgl_pinjaman`, [kodeAgt])

export interface KprBerjalan {
    no_pinjaman: string; tgl_pinjaman: string; nama_kredit: string | null; rp_pinjaman_pokok: number
    rp_angsuran_per_bulan: number; lama_angsuran: number; jml_cicilan: number; sisa_pokok: number
}

/** KPR anggota dengan sisa pokok titipan > 0, untuk form angsuran KPR. */
export const kprBerjalan = (kodeAgt: string) =>
    query<KprBerjalan>(
        `SELECT k.no_pinjaman, k.tgl_pinjaman, jk.nama_kredit, k.rp_pinjaman_pokok, k.rp_angsuran_per_bulan, k.lama_angsuran, k.jml_cicilan,
                r.sisa AS sisa_pokok
           FROM kpr k JOIN anggota a ON a.id = k.anggota_id LEFT JOIN jenis_kredit jk ON jk.id = k.jenis_kredit_id
           JOIN LATERAL (SELECT COALESCE(SUM(kredit_pokok - debit_pokok), 0) AS sisa FROM kpr_rincian WHERE kpr_id = k.id) r ON true
          WHERE a.kode_agt = $1 AND r.sisa > 0
          ORDER BY k.tgl_pinjaman`, [kodeAgt])
