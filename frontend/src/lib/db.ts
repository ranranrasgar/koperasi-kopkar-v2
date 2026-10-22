import "server-only"
import type pg from "pg"
import { createPool, withTx, type Db } from "@kopkar/backend/src/db.ts"

// Satu pool per proses; di mode dev modul dimuat ulang, jadi pool disimpan di globalThis.
const g = globalThis as unknown as { kopkarPool?: pg.Pool }
export const pool = g.kopkarPool ?? createPool()
if (process.env.NODE_ENV !== "production") g.kopkarPool = pool

// OID tipe PostgreSQL yang dikirim ke klien sebagai number.
const NUMERIC = 1700, INT8 = 20

/**
 * Query baca untuk halaman: numeric (uang) dan bigint (id, count) diubah menjadi number,
 * tanggal tetap teks 'YYYY-MM-DD' (parser dari backend/src/db.ts).
 */
export async function query<T = Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<T[]> {
    const r = await pool.query(sql, params)
    const conv = r.fields.filter((f) => f.dataTypeID === NUMERIC || f.dataTypeID === INT8).map((f) => f.name)
    if (conv.length === 0) return r.rows as T[]
    return r.rows.map((row) => {
        for (const k of conv) if (row[k] !== null) row[k] = Number(row[k])
        return row
    }) as T[]
}

/** Transaksi untuk mesin posting: commit bila fn selesai, rollback bila melempar. */
export const tx = <T>(fn: (db: Db) => Promise<T>) => withTx(pool, fn)
