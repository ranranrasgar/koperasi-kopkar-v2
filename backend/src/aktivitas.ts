import type { Db } from './db.ts';

// Status online dan riwayat aktivitas admin, PWA, dan aplikasi Android (menu Sistem -> Aktivitas Pengguna). Dipanggil di luar tx(), jadi tetap
// tercatat di mode uji. Semua fungsi menelan galatnya sendiri: pencatatan tidak boleh menggagalkan transaksi atau login.
// Yang disimpan hanya siapa, kapan, dan pesan ringkas; jangan pernah mengirim password, isi pesan, atau isi form ke sini.

type Pemanggil = Pick<Db, 'query'>;
export type Kanal = 'admin' | 'pwa' | 'android';
export type AksiLog = 'login' | 'login_gagal' | 'logout' | 'simpan';

export interface PenggunaAktif { kanal: Kanal; penggunaId: number; nama: string; kode?: string | null; halaman?: string | null; perangkat?: string | null }
export interface IsiLog { kanal: Kanal; penggunaId?: number | null; nama: string; aksi: AksiLog; modul?: string | null; ket?: string | null }

/** Dianggap online bila sinyal terakhirnya kurang dari sekian menit. */
export const MENIT_ONLINE = 5;
export const HARI_SIMPAN = 90;
/** Akun pengembang (operator admin bernama dev): tidak dicatat di riwayat maupun daftar online, supaya kerja uji tidak mengotori audit pengguna. */
export const AKUN_PENGEMBANG = 'dev';
const akunPengembang = (kanal: Kanal, nama: string | null | undefined) => kanal === 'admin' && nama?.trim().toLowerCase() === AKUN_PENGEMBANG;
const JEDA_ANDROID_MS = 60_000;

/** Nama singkat dari User-Agent; teks aslinya tidak disimpan. */
export function namaPerangkat(ua: string | null | undefined) {
    const u = ua ?? '';
    const os = /Android/i.test(u) ? 'Android' : /iPhone|iPad/i.test(u) ? 'iOS' : /Windows/i.test(u) ? 'Windows' : /Mac OS/i.test(u) ? 'macOS' : /Linux/i.test(u) ? 'Linux' : '';
    const b = /Edg\//.test(u) ? 'Edge' : /OPR\//.test(u) ? 'Opera' : /SamsungBrowser/.test(u) ? 'Samsung Internet' : /Firefox\//.test(u) ? 'Firefox'
        : /Chrome\//.test(u) ? 'Chrome' : /Safari\//.test(u) ? 'Safari' : '';
    return [b, os].filter(Boolean).join(', ') || 'Tidak dikenal';
}

export async function tandaiAktif(db: Pemanggil, p: PenggunaAktif) {
    if (akunPengembang(p.kanal, p.nama)) return;
    try {
        await db.query(
            `INSERT INTO pengguna_aktif (kanal, pengguna_id, nama, kode, halaman, perangkat, terakhir) VALUES ($1, $2, $3, $4, $5, $6, now())
             ON CONFLICT (kanal, pengguna_id) DO UPDATE SET nama = EXCLUDED.nama, kode = EXCLUDED.kode, halaman = EXCLUDED.halaman, perangkat = EXCLUDED.perangkat, terakhir = now()`,
            [p.kanal, p.penggunaId, p.nama.slice(0, 120), p.kode?.slice(0, 40) ?? null, p.halaman?.slice(0, 120) ?? null, p.perangkat?.slice(0, 60) ?? null]);
    } catch (e) {
        console.error('tandai aktif gagal:', e);
    }
}

const terakhirAndroid = new Map<number, number>();
/** Aplikasi Android tidak mengirim sinyal; setiap permintaannya menjadi sinyal, paling sering sekali semenit per akun. */
export function tandaiAktifAndroid(db: Pemanggil, p: Omit<PenggunaAktif, 'kanal' | 'halaman' | 'perangkat'>) {
    const kini = Date.now();
    if (kini - (terakhirAndroid.get(p.penggunaId) ?? 0) < JEDA_ANDROID_MS) return;
    terakhirAndroid.set(p.penggunaId, kini);
    void tandaiAktif(db, { ...p, kanal: 'android', perangkat: 'Aplikasi Android' });
}

/** Keluar: status online langsung hilang, tidak menunggu batas 5 menit. */
export async function hapusAktif(db: Pemanggil, kanal: Kanal, penggunaId: number) {
    try {
        await db.query('DELETE FROM pengguna_aktif WHERE kanal = $1 AND pengguna_id = $2', [kanal, penggunaId]);
    } catch (e) {
        console.error('hapus status aktif gagal:', e);
    }
}

/** Sesekali membuang data lama. Tanpa penjadwal supaya berjalan sama di admin, PWA, dan mobile-api. */
async function pangkas(db: Pemanggil) {
    await db.query(`DELETE FROM log_aktivitas WHERE waktu < now() - make_interval(days => $1)`, [HARI_SIMPAN]);
    await db.query(`DELETE FROM pengguna_aktif WHERE terakhir < now() - make_interval(days => $1)`, [HARI_SIMPAN]);
}

export async function catatAktivitas(db: Pemanggil, l: IsiLog, peluangPangkas = 0.002) {
    if (akunPengembang(l.kanal, l.nama)) return;
    try {
        const ket = l.ket?.replace(/Rp\s?[\d.,]+/g, 'Rp ...').slice(0, 255) ?? null; // nilai rupiah tidak ikut disalin ke riwayat
        await db.query('INSERT INTO log_aktivitas (kanal, pengguna_id, nama, aksi, modul, ket) VALUES ($1, $2, $3, $4, $5, $6)',
            [l.kanal, l.penggunaId ?? null, l.nama.slice(0, 120), l.aksi, l.modul?.replace(/ \(web\)$/, '').slice(0, 80) ?? null, ket]);
        if (Math.random() < peluangPangkas) await pangkas(db);
    } catch (e) {
        console.error('catat aktivitas gagal:', e);
    }
}

/** Hapus riwayat lebih tua dari sekian hari, atau semua bila hari = null. Status online tidak disentuh. */
export async function hapusRiwayat(db: Pemanggil, hari: number | null) {
    const r = hari === null ? await db.query('DELETE FROM log_aktivitas')
        : await db.query('DELETE FROM log_aktivitas WHERE waktu < now() - make_interval(days => $1)', [hari]);
    return r.rowCount ?? 0;
}

/** Login gagal: nama yang diketik tidak disimpan bila akunnya tidak ada, karena bisa saja password yang salah ketik. */
export const catatLoginGagal = (db: Pemanggil, kanal: Kanal, penggunaId: number | null | undefined, nama: string | null | undefined) =>
    catatAktivitas(db, { kanal, penggunaId, nama: nama ?? '(tidak dikenal)', aksi: 'login_gagal', ket: 'Password salah atau akun tidak dikenal' });
