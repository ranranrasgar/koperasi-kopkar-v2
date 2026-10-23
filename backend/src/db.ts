import pg from 'pg';

// DATE dikembalikan sebagai teks 'YYYY-MM-DD' agar tidak bergeser zona waktu.
pg.types.setTypeParser(1082, (v: string) => v);
// numeric dikembalikan sebagai teks supaya uang tidak lewat float.
pg.types.setTypeParser(1700, (v: string) => v);

export type Db = pg.PoolClient;

export function createPool(connectionString = process.env.PG_URL) {
    if (!connectionString) throw new Error('PG_URL belum diset');
    const pool = new pg.Pool({ connectionString, max: 10 });
    // Koneksi menganggur yang diputus server (restart PostgreSQL, restore database, DROP ... WITH FORCE) memancarkan
    // 'error' di pool; tanpa penangan ini proses Node berhenti. Koneksi itu dibuang dan permintaan berikutnya membuka yang baru.
    pool.on('error', (e) => console.error('koneksi database menganggur terputus:', e.message));
    return pool;
}

/** Satu transaksi database: commit bila fn selesai, rollback bila melempar. */
export async function withTx<T>(pool: pg.Pool, fn: (db: Db) => Promise<T>): Promise<T> {
    const db = await pool.connect();
    try {
        await db.query('BEGIN');
        const result = await fn(db);
        await db.query('COMMIT');
        return result;
    } catch (e) {
        await db.query('ROLLBACK');
        throw e;
    } finally {
        db.release();
    }
}
