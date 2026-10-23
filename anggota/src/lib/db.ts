import "server-only"
import type pg from "pg"
import { connection } from "next/server"
import { createPool, withTx, type Db } from "@kopkar/backend/src/db.ts"

// Satu pool per proses; di mode dev modul dimuat ulang, jadi pool disimpan di globalThis.
const g = globalThis as unknown as { kopkarAnggotaPool?: pg.Pool }
export const pool = g.kopkarAnggotaPool ?? createPool()
if (process.env.NODE_ENV !== "production") g.kopkarAnggotaPool = pool

const NUMERIC = 1700, INT8 = 20

/** Query baca: numeric (uang) dan bigint menjadi number, tanggal tetap teks 'YYYY-MM-DD'. Sama dengan frontend/. */
export async function query<T = Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<T[]> {
    await connection() // data selalu dibaca saat request, tidak pernah saat build
    const r = await pool.query(sql, params)
    const conv = r.fields.filter((f) => f.dataTypeID === NUMERIC || f.dataTypeID === INT8).map((f) => f.name)
    if (conv.length === 0) return r.rows as T[]
    return r.rows.map((row) => {
        for (const k of conv) if (row[k] !== null) row[k] = Number(row[k])
        return row
    }) as T[]
}

/** Nama database uji bila dijalankan lewat npm run dev:uji -w anggota, selain itu null. */
export const serverUji = process.env.KOPKAR_SERVER_UJI || null

/**
 * Transaksi tulis (pengajuan, profil). Mode uji admin (pengaturan_web.mode_uji / KOPKAR_UJI_ROLLBACK) berlaku juga di sini:
 * dijalankan penuh lalu di-rollback.
 */
export async function tx<T>(fn: (db: Db) => Promise<T>): Promise<T> {
    if (!(await modeUji())) return withTx(pool, fn)
    const BATAL = Symbol("rollback-uji")
    let hasil: T | undefined
    try {
        await withTx(pool, async (db) => { hasil = await fn(db); throw BATAL })
    } catch (e) {
        if (e !== BATAL) throw e
    }
    return hasil as T
}

async function modeUji() {
    if (process.env.KOPKAR_UJI_ROLLBACK === "1") return true
    if (process.env.KOPKAR_UJI_ROLLBACK === "0") return false
    try {
        const r = await pool.query<{ nilai: string }>("SELECT nilai FROM pengaturan_web WHERE kunci = 'mode_uji'")
        return r.rows[0]?.nilai === "1"
    } catch (e) {
        if ((e as { code?: string }).code === "42P01") return false
        throw e
    }
}
