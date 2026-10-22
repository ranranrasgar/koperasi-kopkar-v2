"use server"

import { revalidatePath } from "next/cache"
import type { Db } from "@kopkar/backend/src/db.ts"
import { modeUji, tx } from "@/lib/db"
import { GalatSesi, operatorAktif } from "@/lib/operator"
import { SLUG_VALID } from "@/lib/panduan-teks"
import { MENU } from "@/config/akses"

export type HasilPanduan = { ok: true; pesan: string; id?: number } | { ok: false; error: string } | null

class Salah extends Error {}

/** Tulis panduan dalam satu transaksi (ikut rollback di mode uji), lalu segarkan Pusat Panduan dan menu. */
async function kelola(fn: (db: Db, opr: string) => Promise<{ pesan: string; id?: number }>): Promise<HasilPanduan> {
    try {
        const o = await operatorAktif([MENU.kelolaPanduan])
        const r = await tx((db) => fn(db, o.nama))
        if (modeUji) return { ok: true, pesan: `MODE UJI, tidak tersimpan: ${r.pesan}` }
        revalidatePath("/dashboard/panduan", "layout")
        return { ok: true, ...r }
    } catch (e) {
        if ((e as { code?: string }).code === "23505") return { ok: false, error: "Slug sudah dipakai; pakai slug lain" }
        if (!(e instanceof Salah) && !(e instanceof GalatSesi)) console.error("kelola panduan gagal:", e)
        return { ok: false, error: e instanceof Error ? e.message : "Gagal menyimpan" }
    }
}

const teks = (f: FormData, k: string, label: string, opsi: { wajib?: boolean; maks: number }) => {
    const v = String(f.get(k) ?? "").trim()
    if (opsi.wajib && !v) throw new Salah(`${label} wajib diisi`)
    if (v.length > opsi.maks) throw new Salah(`${label} maksimal ${opsi.maks.toLocaleString("id-ID")} karakter`)
    return v
}
const slug = (f: FormData) => {
    const v = teks(f, "slug", "Slug", { wajib: true, maks: 120 })
    if (!SLUG_VALID.test(v)) throw new Salah("Slug hanya huruf kecil, angka, dan strip (mis. setoran-simpanan)")
    return v
}
const urutan = (f: FormData) => {
    const n = Number(String(f.get("urutan") ?? "0").trim() || "0")
    if (!Number.isInteger(n) || n < 0 || n > 9999) throw new Salah("Urutan harus bilangan bulat 0 sampai 9999")
    return n
}
const idDari = (f: FormData) => {
    const n = Number(f.get("id") || 0)
    return Number.isInteger(n) && n > 0 ? n : null
}

// ---------- artikel ----------

export async function simpanArtikelAction(_: HasilPanduan, f: FormData): Promise<HasilPanduan> {
    return kelola(async (db, opr) => {
        const id = idDari(f)
        const kategoriId = Number(f.get("kategori_id"))
        const { rows: [k] } = await db.query("SELECT id FROM panduan_kategori WHERE id = $1", [kategoriId])
        if (!k) throw new Salah("Kategori wajib dipilih")
        const href = teks(f, "href_menu", "Halaman terkait", { maks: 200 })
        if (href && !href.startsWith("/dashboard")) throw new Salah("Halaman terkait harus alamat aplikasi (diawali /dashboard)")
        const v = [kategoriId, slug(f), teks(f, "judul", "Judul", { wajib: true, maks: 200 }), teks(f, "ringkasan", "Ringkasan", { maks: 500 }) || null,
            teks(f, "isi", "Isi", { maks: 100_000 }), href || null, urutan(f), f.get("terbit") === "on", opr]
        if (id) {
            const { rows } = await db.query(`UPDATE panduan SET kategori_id=$1, slug=$2, judul=$3, ringkasan=$4, isi=$5, href_menu=$6, urutan=$7,
                terbit=$8, diubah_oleh=$9, diubah_pada=now() WHERE id=$10 RETURNING id`, [...v, id])
            if (!rows[0]) throw new Salah("Artikel tidak ada")
            return { pesan: "Artikel disimpan", id }
        }
        const { rows: [r] } = await db.query<{ id: string }>(`INSERT INTO panduan (kategori_id, slug, judul, ringkasan, isi, href_menu, urutan, terbit, diubah_oleh)
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id`, v)
        return { pesan: "Artikel ditambahkan", id: Number(r.id) }
    })
}

export async function hapusArtikelAction(id: number): Promise<HasilPanduan> {
    return kelola(async (db) => {
        const { rows: [r] } = await db.query<{ judul: string }>("DELETE FROM panduan WHERE id = $1 RETURNING judul", [id])
        if (!r) throw new Salah("Artikel tidak ada")
        return { pesan: `Artikel "${r.judul}" dihapus` }
    })
}

export async function aturTerbitAction(id: number, terbit: boolean): Promise<HasilPanduan> {
    return kelola(async (db, opr) => {
        const { rows: [r] } = await db.query<{ judul: string }>(
            "UPDATE panduan SET terbit = $1, diubah_oleh = $2, diubah_pada = now() WHERE id = $3 RETURNING judul", [terbit, opr, id])
        if (!r) throw new Salah("Artikel tidak ada")
        return { pesan: `"${r.judul}" ${terbit ? "diterbitkan" : "disembunyikan dari pembaca"}` }
    })
}

// ---------- kategori ----------

export async function simpanKategoriAction(_: HasilPanduan, f: FormData): Promise<HasilPanduan> {
    return kelola(async (db) => {
        const id = idDari(f)
        const ikon = teks(f, "ikon", "Ikon", { maks: 40 })
        if (ikon && !/^[a-z0-9_]+$/.test(ikon)) throw new Salah("Ikon: nama ikon Material Symbols, huruf kecil dan garis bawah (mis. savings)")
        const v = [slug(f), teks(f, "nama", "Nama kategori", { wajib: true, maks: 100 }), teks(f, "keterangan", "Keterangan", { maks: 300 }) || null,
            ikon || null, urutan(f)]
        if (id) {
            const { rows } = await db.query(`UPDATE panduan_kategori SET slug=$1, nama=$2, keterangan=$3, ikon=$4, urutan=$5 WHERE id=$6 RETURNING id`, [...v, id])
            if (!rows[0]) throw new Salah("Kategori tidak ada")
            return { pesan: "Kategori disimpan", id }
        }
        const { rows: [r] } = await db.query<{ id: string }>(
            "INSERT INTO panduan_kategori (slug, nama, keterangan, ikon, urutan) VALUES ($1,$2,$3,$4,$5) RETURNING id", v)
        return { pesan: "Kategori ditambahkan", id: Number(r.id) }
    })
}

export async function hapusKategoriAction(id: number): Promise<HasilPanduan> {
    return kelola(async (db) => {
        const { rows: [n] } = await db.query<{ n: string }>("SELECT COUNT(*) AS n FROM panduan WHERE kategori_id = $1", [id])
        if (Number(n.n) > 0) throw new Salah(`Kategori masih berisi ${n.n} artikel; pindahkan atau hapus artikelnya dulu`)
        const { rows: [r] } = await db.query<{ nama: string }>("DELETE FROM panduan_kategori WHERE id = $1 RETURNING nama", [id])
        if (!r) throw new Salah("Kategori tidak ada")
        return { pesan: `Kategori "${r.nama}" dihapus` }
    })
}
