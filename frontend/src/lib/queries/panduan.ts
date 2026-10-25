import "server-only"
import { query } from "@/lib/db"

export interface KategoriPanduan { id: number; slug: string; nama: string; keterangan: string | null; ikon: string | null; urutan: number; khusus_admin: boolean }

export interface RingkasArtikel {
    id: number; kategori_id: number; slug: string; judul: string; ringkasan: string | null; href_menu: string | null
    urutan: number; terbit: boolean; diubah_pada: string; diubah_oleh: string | null
}

export interface Artikel extends RingkasArtikel { isi: string; kategori_slug: string; kategori_nama: string }

export interface PohonPanduan { kategori: (KategoriPanduan & { artikel: RingkasArtikel[] })[] }

/** Tabel panduan belum dibuat di database ini (npm run panduan:pasang belum dijalankan). */
export class PanduanBelumDipasang extends Error {}

async function aman<T>(fn: () => Promise<T>): Promise<T> {
    try {
        return await fn()
    } catch (e) {
        if ((e as { code?: string }).code === "42P01") throw new PanduanBelumDipasang("Tabel panduan belum dipasang")
        throw e
    }
}

/**
 * Kategori beserta artikelnya, urut. `semua`: termasuk artikel yang belum terbit (untuk halaman kelola, yang juga memuat kategori khusus admin).
 * `admin`: pembaca boleh melihat kategori khusus admin (superadmin dan grup admin).
 */
export const pohonPanduan = (semua = false, admin = false): Promise<PohonPanduan> => aman(async () => {
    const [kategori, artikel] = await Promise.all([
        query<KategoriPanduan>(`SELECT id, slug, nama, keterangan, ikon, urutan, khusus_admin FROM panduan_kategori
            ${semua || admin ? "" : "WHERE NOT khusus_admin"} ORDER BY urutan, nama`),
        query<RingkasArtikel>(`SELECT id, kategori_id, slug, judul, ringkasan, href_menu, urutan, terbit, diubah_pada::text, diubah_oleh
            FROM panduan ${semua ? "" : "WHERE terbit"} ORDER BY urutan, judul`),
    ])
    return { kategori: kategori.map((k) => ({ ...k, artikel: artikel.filter((a) => a.kategori_id === k.id) })) }
})

const KOLOM = `p.id, p.kategori_id, p.slug, p.judul, p.ringkasan, p.href_menu, p.urutan, p.terbit, p.diubah_pada::text, p.diubah_oleh,
    p.isi, k.slug AS kategori_slug, k.nama AS kategori_nama`

export const artikelPanduan = (slug: string, admin = false, semua = false) => aman(async () =>
    (await query<Artikel>(`SELECT ${KOLOM} FROM panduan p JOIN panduan_kategori k ON k.id = p.kategori_id
        WHERE p.slug = $1 ${semua ? "" : "AND p.terbit"} AND ($2 OR NOT k.khusus_admin)`, [slug, admin]))[0] ?? null)

export const artikelPanduanId = (id: number) => aman(async () =>
    (await query<Artikel>(`SELECT ${KOLOM} FROM panduan p JOIN panduan_kategori k ON k.id = p.kategori_id WHERE p.id = $1`, [id]))[0] ?? null)

/**
 * Artikel untuk halaman aplikasi (tombol bantuan): cocok persis, atau halaman induk terpanjang
 * (mis. /dashboard/accounting/journal/new -> artikel /dashboard/accounting/journal). /dashboard hanya cocok persis.
 */
export const panduanUntukHalaman = (href: string, admin = false) => aman(async () =>
    (await query<{ slug: string }>(`SELECT p.slug FROM panduan p JOIN panduan_kategori k ON k.id = p.kategori_id
        WHERE p.terbit AND p.href_menu IS NOT NULL AND ($2 OR NOT k.khusus_admin)
          AND (p.href_menu = $1 OR (p.href_menu <> '/dashboard' AND $1 LIKE p.href_menu || '/%'))
        ORDER BY p.href_menu = $1 DESC, length(p.href_menu) DESC, k.urutan, p.urutan LIMIT 1`, [href, admin]))[0]?.slug ?? null)

export interface HasilCari { slug: string; judul: string; ringkasan: string | null; kategori_nama: string; cuplikan: string | null }

/** Cari di judul, ringkasan, dan isi; cuplikan isi di sekitar kata yang ditemukan. */
export const cariPanduan = (kata: string, admin = false) => aman(async () => {
    const pola = `%${kata.replace(/[\\%_]/g, (m) => "\\" + m)}%`
    const baris = await query<HasilCari & { isi: string; skor: number }>(`
        SELECT p.slug, p.judul, p.ringkasan, k.nama AS kategori_nama, p.isi,
               (p.judul ILIKE $1)::int * 3 + (p.ringkasan ILIKE $1)::int * 2 + (p.isi ILIKE $1)::int AS skor
          FROM panduan p JOIN panduan_kategori k ON k.id = p.kategori_id
         WHERE p.terbit AND ($2 OR NOT k.khusus_admin) AND (p.judul ILIKE $1 OR p.ringkasan ILIKE $1 OR p.isi ILIKE $1)
         ORDER BY skor DESC, k.urutan, p.urutan LIMIT 30`, [pola, admin])
    const kecil = kata.toLowerCase()
    return baris.map(({ isi, skor: _, ...b }) => {
        const polos = isi.replace(/[#*`>|_[\]()]/g, " ").replace(/\s+/g, " ")
        const i = polos.toLowerCase().indexOf(kecil)
        return { ...b, cuplikan: i < 0 ? null : `${i > 60 ? "…" : ""}${polos.slice(Math.max(0, i - 60), i + kata.length + 100).trim()}…` }
    })
})
