import type pg from 'pg';
import { withTx, type Db } from './db.ts';

// Mode uji admin (Sistem & Pengaturan -> Mode Uji / Live, pengaturan_web.mode_uji): transaksi tulis dijalankan penuh lalu
// di-rollback. KOPKAR_UJI_ROLLBACK=1/0 di env mengunci mode. Dipakai PWA anggota dan mobile-api (aplikasi Android).

export async function modeUji(pool: pg.Pool) {
    if (process.env.KOPKAR_UJI_ROLLBACK === '1') return true;
    if (process.env.KOPKAR_UJI_ROLLBACK === '0') return false;
    try {
        const r = await pool.query<{ nilai: string }>("SELECT nilai FROM pengaturan_web WHERE kunci = 'mode_uji'");
        return r.rows[0]?.nilai === '1';
    } catch (e) {
        if ((e as { code?: string }).code === '42P01') return false;
        throw e;
    }
}

/** Transaksi tulis yang mengikuti mode uji: commit biasa, atau dijalankan penuh lalu di-rollback. */
export async function txUji<T>(pool: pg.Pool, fn: (db: Db) => Promise<T>): Promise<T> {
    if (!(await modeUji(pool))) return withTx(pool, fn);
    const BATAL = Symbol('rollback-uji');
    let hasil: T | undefined;
    try {
        await withTx(pool, async (db) => { hasil = await fn(db); throw BATAL; });
    } catch (e) {
        if (e !== BATAL) throw e;
    }
    return hasil as T;
}
