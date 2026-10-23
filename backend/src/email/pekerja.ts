import pg from 'pg';
import { prosesAntrean } from './antrean.ts';

// Pekerja pengiriman email di dalam proses server (dipanggil dari instrumentation.ts aplikasi anggota dan admin):
// tiap 20 detik mengirim sampai 20 email dengan jeda 350 md (±170/menit, ramah akun SMTP biasa). Beberapa proses
// aman karena prosesAntrean memakai SKIP LOCKED. EMAIL_PEKERJA=0 mematikannya (mis. pada server uji kedua).

const g = globalThis as unknown as { kopkarPekerjaEmail?: boolean };

export function mulaiPekerjaEmail() {
    if (g.kopkarPekerjaEmail || process.env.EMAIL_PEKERJA === '0' || !process.env.PG_URL) return;
    g.kopkarPekerjaEmail = true;
    const pool = new pg.Pool({ connectionString: process.env.PG_URL, max: 2 });
    // Sama dengan createPool (db.ts): koneksi menganggur yang diputus server (restore, restart) tidak boleh menghentikan proses.
    pool.on('error', (e) => console.error('pekerja email: koneksi database terputus:', e.message));
    let jalan = false;
    const putaran = async () => {
        if (jalan) return;
        jalan = true;
        try {
            await prosesAntrean(pool, { batas: 20, jedaMs: 350 });
        } catch (e) {
            console.error('pekerja email gagal:', (e as Error).message);
        } finally {
            jalan = false;
        }
    };
    setInterval(putaran, 20_000).unref();
    setTimeout(putaran, 3_000).unref();
}
