import pg from 'pg';
// Parser tipe pg berlaku global. backend/src/db.ts (ikut termuat lewat modul akun, mode uji, email) memasang numeric
// sebagai teks; diimpor di sini supaya selalu dijalankan lebih dulu dan pengaturan di bawah yang berlaku.
import '@kopkar/backend/src/db.ts';

// Kontrak lama: tanggal berupa teks 'YYYY-MM-DD', angka uang berupa number JSON.
pg.types.setTypeParser(1082, (v: string) => v);
pg.types.setTypeParser(1700, (v: string) => Number(v));
pg.types.setTypeParser(20, (v: string) => Number(v)); // bigint (count, id)

export function createPool(connectionString = process.env.PG_URL) {
    if (!connectionString) throw new Error('PG_URL belum diset');
    const pool = new pg.Pool({ connectionString, max: 10 });
    // Koneksi menganggur yang diputus server (restore, restart PostgreSQL) tidak boleh menghentikan proses.
    pool.on('error', (e) => console.error('koneksi database menganggur terputus:', e.message));
    return pool;
}

export type Pool = pg.Pool;
