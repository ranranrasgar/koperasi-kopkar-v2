import "server-only"
import { daftarTahunShu, rencanaTutupBuku } from "@kopkar/backend/src/posting/shu.ts"
import { pool, query } from "@/lib/db"
import { paged, params, sp, type SearchParams } from "@/lib/list"

/** Tahun-tahun yang punya data SHU, dengan ringkasan, terbaru dulu. */
export const tahunShu = () => daftarTahunShu(pool)

/** Angka tutup buku satu tahun (pendapatan, pajak, laba ditahan, nominal tiap pos). */
export const rencanaShu = (tahun: number) => rencanaTutupBuku(pool, tahun)

export interface BarisShu {
    kode_agt: string; nik: string | null; nama: string; status_staff: string | null; lama_agt: number
    rp_sukarela: number; rp_jasa_uang: number; rp_jasa_barang: number; rp_bagian: number
    status: number; tgl_cair: string | null; no_reff: string | null; cara: string | null
}

/** SHU anggota satu tahun: cari (kode, KPK, nama), saring status pencairan, urut, halaman, dan jumlah seluruh hasil saring. */
export async function anggotaShu(tahun: number, s: SearchParams) {
    const { values, p } = params()
    const where = [`tahun = ${p(tahun)}`]
    const q = sp(s, "q")
    if (q) { const kw = p(`%${q}%`); where.push(`(nama ILIKE ${kw} OR kode_agt ILIKE ${kw} OR nik ILIKE ${kw})`) }
    const st = sp(s, "status")
    if (st === "0" || st === "1") where.push(`status = ${p(Number(st))}`)
    const base = `SELECT kode_agt, nik, nama, status_staff, lama_agt, rp_sukarela, rp_jasa_uang, rp_jasa_barang, rp_bagian, status, tgl_cair::text AS tgl_cair, no_reff, cara
                    FROM shu_anggota WHERE ${where.join(" AND ")}`
    const sortable = Object.fromEntries(["nama", "kode_agt", "lama_agt", "rp_sukarela", "rp_jasa_uang", "rp_jasa_barang", "rp_bagian", "status"].map((k) => [k, k]))
    return paged<BarisShu, "rp_sukarela" | "rp_jasa_uang" | "rp_jasa_barang" | "rp_bagian">({
        base, values, searchParams: s, sortable, defaultSort: "nama", urutanLanjut: "kode_agt", pageSize: 50,
        jumlahkan: ["rp_sukarela", "rp_jasa_uang", "rp_jasa_barang", "rp_bagian"],
    })
}

/** Tahun yang boleh ditutup buku: lima tahun terakhir sebelum tahun berjalan, dengan penanda sudah ditutup. */
export async function tahunTutupBuku(tahunIni: number) {
    const r = await query<{ tahun: number }>(
        `SELECT DISTINCT substring(deskripsi FROM 'Tutup Buku Tahun ([0-9]{4})')::int AS tahun FROM jurnal_umum WHERE nomor_bukti LIKE 'TBT/%'`)
    const ditutup = new Set(r.map((x) => x.tahun))
    return Array.from({ length: 6 }, (_, i) => tahunIni - 1 - i).map((t) => ({ tahun: t, ditutup: ditutup.has(t) }))
}

/** Akun kas/bank (keterangan GC atau BANK) untuk pembayaran SHU tunai. */
export const akunKasShu = () =>
    query<{ id: number; kode_perkiraan: string; nama_perkiraan: string }>("SELECT id, kode_perkiraan, nama_perkiraan FROM perkiraan WHERE keterangan IN ('GC', 'BANK') ORDER BY nama_perkiraan")
