import "server-only"
import { query } from "@/lib/db"
import type { PageData } from "@/config/modules"
import { ukuranHalaman } from "@/lib/halaman"

export type SearchParams = Record<string, string | string[] | undefined>

/** Ambil satu nilai teks dari searchParams halaman. */
export const sp = (s: SearchParams, k: string) => {
    const v = s[k]
    return (Array.isArray(v) ? v[0] : v)?.trim() ?? ""
}

export const isTanggal = (v: string) => /^\d{4}-\d{2}-\d{2}$/.test(v)

/** Pengumpul parameter $1, $2, ... untuk menyusun WHERE dinamis. */
export function params() {
    const values: unknown[] = []
    return { values, p: (v: unknown) => { values.push(v); return `$${values.length}` } }
}

/**
 * Halaman tabel: `base` adalah SELECT lengkap tanpa ORDER BY/LIMIT. Kolom urut hanya boleh
 * dari daftar `sortable` (nama kolom hasil SELECT), karena disisipkan ke SQL.
 */
export async function paged<T = Record<string, unknown>>(opts: {
    base: string
    values: unknown[]
    searchParams: SearchParams
    sortable: Record<string, string>
    defaultSort: string
    /** Urutan tambahan setelah kolom yang dipilih pengguna (penentu urutan baris yang nilainya sama). */
    urutanLanjut?: string
    /**
     * Kolom mahal (mis. subquery per baris) yang hanya dihitung untuk baris halaman ini, setelah LIMIT/OFFSET.
     * Ditulis sebagai daftar SELECT yang merujuk kolom hasil `base` lewat alias `t`. Tidak bisa dipakai untuk urut.
     */
    kolomHalaman?: string
    pageSize?: number
}): Promise<PageData<T>> {
    const page = Math.max(1, parseInt(sp(opts.searchParams, "page") || "1", 10) || 1)
    const pageSize = ukuranHalaman(sp(opts.searchParams, "pageSize"), opts.pageSize ?? 25)
    const sortCol = opts.sortable[sp(opts.searchParams, "sortBy")]
    const dir = sp(opts.searchParams, "sortOrder") === "desc" ? "DESC" : "ASC"
    const order = sortCol ? `${sortCol} ${dir} NULLS LAST${opts.urutanLanjut ? `, ${opts.urutanLanjut}` : ""}` : opts.defaultSort

    const n = opts.values.length
    const halaman = `SELECT * FROM (${opts.base}) t ORDER BY ${order} LIMIT $${n + 1} OFFSET $${n + 2}`
    const [count, items] = await Promise.all([
        query<{ total: number }>(`SELECT COUNT(*) AS total FROM (${opts.base}) t`, opts.values),
        query<T>(opts.kolomHalaman ? `SELECT t.*, ${opts.kolomHalaman} FROM (${halaman}) t ORDER BY ${order}` : halaman,
            [...opts.values, pageSize, (page - 1) * pageSize]),
    ])
    const total = count[0]?.total ?? 0
    return { items, total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) }
}
