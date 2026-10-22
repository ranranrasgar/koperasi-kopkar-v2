import "server-only"
import type pg from "pg"
import { connection } from "next/server"
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
    await connection() // data selalu dibaca saat request, tidak pernah saat build
    const r = await pool.query(sql, params)
    const conv = r.fields.filter((f) => f.dataTypeID === NUMERIC || f.dataTypeID === INT8).map((f) => f.name)
    if (conv.length === 0) return r.rows as T[]
    return r.rows.map((row) => {
        for (const k of conv) if (row[k] !== null) row[k] = Number(row[k])
        return row
    }) as T[]
}

/**
 * Mode uji: posting dijalankan penuh lalu selalu di-rollback, untuk mencoba form tanpa mengubah data. Nomor dari
 * sequence tetap terpakai (sequence tidak ikut rollback).
 *
 * Diatur dari Sistem & Pengaturan -> Mode Uji / Live (pengaturan_web.mode_uji), dibaca setiap kali supaya berlaku
 * langsung. KOPKAR_UJI_ROLLBACK=1/0 di env mengunci mode dan mengalahkan pengaturan (server uji memakai 0).
 */
export const modeUjiTerkunci: boolean | null =
    process.env.KOPKAR_UJI_ROLLBACK === "1" ? true : process.env.KOPKAR_UJI_ROLLBACK === "0" ? false : null

export interface ModeAplikasi { uji: boolean; terkunci: boolean; diubahPada: string | null; diubahOleh: string | null }

export async function modeAplikasi(): Promise<ModeAplikasi> {
    if (modeUjiTerkunci !== null) return { uji: modeUjiTerkunci, terkunci: true, diubahPada: null, diubahOleh: null }
    try {
        const r = await pool.query<{ nilai: string; diubah_pada: string; diubah_oleh: string | null }>(
            "SELECT nilai, diubah_pada::text, diubah_oleh FROM pengaturan_web WHERE kunci = 'mode_uji'")
        const b = r.rows[0]
        return { uji: b?.nilai === "1", terkunci: false, diubahPada: b?.diubah_pada ?? null, diubahOleh: b?.diubah_oleh ?? null }
    } catch (e) {
        // Tabel belum dipasang (npm run pengaturan:pasang): live, sama seperti sebelum pengaturan ada.
        if ((e as { code?: string }).code === "42P01") return { uji: false, terkunci: false, diubahPada: null, diubahOleh: null }
        throw e
    }
}

export const modeUji = async () => (await modeAplikasi()).uji

/** Nama database uji bila web dijalankan lewat npm run dev:uji (data tersimpan, tapi di salinan database), selain itu null. */
export const serverUji = process.env.KOPKAR_SERVER_UJI || null
const BATAL = Symbol("rollback-uji")

/** Transaksi untuk mesin posting: commit bila fn selesai, rollback bila melempar (atau selalu, di mode uji). */
export async function tx<T>(fn: (db: Db) => Promise<T>): Promise<T> {
    if (!(await modeUji())) return withTx(pool, fn)
    let hasil: T | undefined
    try {
        await withTx(pool, async (db) => { hasil = await fn(db); throw BATAL })
    } catch (e) {
        if (e !== BATAL) throw e
    }
    return hasil as T
}
