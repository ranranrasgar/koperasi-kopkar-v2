import {
    akunUntukResetEmail, aturEmail, aturPassword, cariAkun, cekPasswordBaruAnggota, gantiPassword, masukAnggota, periksaJawaban,
    pertanyaanUntuk,
} from '@kopkar/backend/src/anggota/akun.ts';
import { jenisFoto, MAKS_FOTO, simpanFoto, tabelBelumAda } from '@kopkar/backend/src/anggota/foto.ts';
import { beritahuAdmin, MENU_PENGAJUAN } from '@kopkar/backend/src/anggota/notif-admin.ts';
import { ajukanPinjaman } from '@kopkar/backend/src/anggota/pengajuan.ts';
import { bacaTokenReset, buatTokenReset, sidikPassword } from '@kopkar/backend/src/anggota/token.ts';
import { kirimKodeVerifikasi, statusEmail } from '@kopkar/backend/src/anggota/verifikasi-email.ts';
import { cobaLagi, pesanTunggu } from '@kopkar/backend/src/batas.ts';
import { antreEmail, prosesAntrean } from '@kopkar/backend/src/email/antrean.ts';
import { modeUji, txUji } from '@kopkar/backend/src/mode-uji.ts';
import { buatTokenApi, cocokKode, Ditolak, type Pemakai } from './auth.js';
import type { Pool } from './db.js';
import { namaFoto } from './gambar.js';

// Endpoint tulis dan login untuk aplikasi Android, dengan URL, parameter, dan bentuk JSON server PHP lama
// (docs/analisis-aplikasi-mobile-lama.md bagian 3-6). Aturannya fungsi backend yang sama dengan PWA anggota
// (anggota/src/app/actions): password baru, lupa password, pengajuan dengan persen dari jenis kredit, foto, email.

export type Param = URLSearchParams;
export type Result = Record<string, unknown>;
export interface Konteks { db: Pool; p: Param; ip: string; berkas: Map<string, Uint8Array>; pemakai: () => Promise<Pemakai> }

const MENIT = 60_000;
const teks = (p: Param, k: string) => p.get(k) ?? '';
const gagal = (message: string): Result => ({ error: true, message });
const ok = (message: string, extra: Result = {}): Result => ({ error: false, message, ...extra });
const hariIni = () => new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Jakarta' });
export const alamatPwa = () => (process.env.ANGGOTA_URL || 'https://anggota.kopkarmjsmattel.com').replace(/\/+$/, '');

/** Email dari mobile-api masuk antrean bersama lalu langsung diproses (seperti kirimEmail PWA). Tidak pernah melempar. */
async function kirimEmail(db: Pool, e: { ke: string; judul: string; teks: string }) {
    try {
        await antreEmail(db as never, { jenis: 'sistem', ke: e.ke, judul: e.judul, teks: e.teks, tautan: null });
        await prosesAntrean(db as never, { batas: 5 });
    } catch (x) {
        console.error('kirim email gagal:', (x as Error).message);
    }
}

// ---------- login.php ----------

// Penguncian sementara setelah gagal berturut-turut, per username (memori proses), sama dengan masukAction PWA.
const MAKS_GAGAL = 5, KUNCI_MS = 5 * MENIT;
const gagalMasuk = new Map<string, { n: number; sampai: number }>();

/** Data diri untuk layar profil Android, dengan nama kolom v1/user.php (isLoginExist). */
async function dataLogin(db: Pool, userId: number, anggotaId: number) {
    const r = await db.query(
        `SELECT a.kode_agt, a.tglpencatatan, a.nik, a.nama, a.jns_kelamin, a.alamat, a.kota, a.kodepos, a.telp_rmh, a.hp,
                ad.no_ktp_sim, ad.no_sim, a.status, ad.nama_istri_suami, ad.jml_tanggungan, ad.jml_anak, a.status_staff,
                CASE WHEN a.agt_non_agt THEN 'Y' ELSE 'N' END agt_non_agt, a.rp_grade::text, a.grade, a.simpanan_pokok::text,
                a.simpanan_wajib::text, a.simpanan_sukarela::text, ad.pekerjaan, ad.alamat_kerja, ad.nama_perusahaan, ad.jabatan,
                ad.lama_bekerja_tahun, ad.lama_bekerja_bulan, ad.telp_ktr, ad.npwp, ad.fasilitas_listrik, ad.fasilitas_pdam,
                ad.fasilitas_lain_lain, ad.lama_menempati_tahun, ad.lama_menempati_bulan, a.bank_no_rek, a.bank_nama, a.bank_atas_nama,
                u.email, u.username
           FROM anggota a JOIN app_user u ON u.id = $1 LEFT JOIN anggota_detail ad ON ad.anggota_id = a.id
          WHERE a.id = $2`, [userId, anggotaId]);
    return r.rows[0] ? { ...r.rows[0], foto: await namaFoto(db, userId) } : null;
}

export async function login({ db, p }: Konteks): Promise<Result> {
    // Pendaftaran sekarang mengikuti PWA (email wajib dan diverifikasi, lalu disetujui admin); formulir lama Android
    // (pertanyaan keamanan, tanpa email) tidak lagi membuat akun.
    if (teks(p, 'nik').trim()) {
        return { success: false, message: `Pendaftaran akun sekarang lewat aplikasi web anggota: ${alamatPwa()}/daftar` };
    }
    const username = teks(p, 'username').trim(), password = teks(p, 'password');
    if (!username || !password) return { success: false, message: 'Username dan password wajib diisi' };

    const k = username.toLowerCase(), g = gagalMasuk.get(k);
    if (g && g.n >= MAKS_GAGAL && g.sampai > Date.now()) {
        return { success: false, message: `Terlalu banyak percobaan. Coba lagi dalam ${Math.ceil((g.sampai - Date.now()) / 60000)} menit.` };
    }
    const hasil = await masukAnggota(db, username, password);
    if (!hasil.ok) {
        if (hasil.alasan === 'salah') {
            gagalMasuk.set(k, { n: (g && g.sampai > Date.now() ? g.n : 0) + 1, sampai: Date.now() + KUNCI_MS });
            return { success: false, message: 'Username atau password salah' };
        }
        if (hasil.alasan === 'akun_nonaktif' && hasil.userId && (await statusEmail(db as never, hasil.userId)).menungguAktivasi) {
            return { success: false, message: `Email Anda belum diverifikasi. Masuk lewat aplikasi web anggota (${alamatPwa()}) untuk memasukkan kode verifikasi.` };
        }
        if (hasil.alasan === 'akun_nonaktif' && hasil.menungguAdmin) {
            return { success: false, message: 'Pendaftaran Anda sedang menunggu verifikasi admin koperasi. Anda akan mendapat email begitu akun disetujui.' };
        }
        return { success: false, message: 'Akun Anda tidak aktif. Hubungi pengurus koperasi.' };
    }
    gagalMasuk.delete(k);
    const { akun } = hasil;
    // Karyawan Mattel yang belum menjadi anggota hanya punya akses terbatas di PWA; aplikasi Android membutuhkan data anggota.
    if (!akun.anggota_id) {
        return { success: false, message: `Akun Anda belum terdaftar sebagai anggota koperasi. Buka aplikasi web anggota (${alamatPwa()}) untuk informasi pendaftaran anggota.` };
    }
    const anggota = await dataLogin(db, Number(akun.user_id), Number(akun.anggota_id));
    if (!anggota) return { success: false, message: 'Akun Anda tidak aktif. Hubungi pengurus koperasi.' };
    return { success: true, message: 'Login berhasil.', anggota, api_token: buatTokenApi(Number(akun.user_id), akun.password_hash!) };
}

// ---------- lupa dan ganti password ----------

/** isuserexist: dengan email = kirim tautan reset (PWA resetEmailAction); tanpa email = pertanyaan keamanan (pertanyaanAction). */
export async function isUserExist({ db, p, ip }: Konteks): Promise<Result> {
    const username = teks(p, 'username').trim();
    if (!username) return gagal('Username wajib diisi');
    if (p.has('email')) {
        const email = teks(p, 'email').trim();
        if (!email) return gagal('Username dan email wajib diisi');
        const tunggu = cobaLagi(`reset-email:${ip}`, 5, 15 * MENIT);
        if (tunggu) return gagal(pesanTunggu(tunggu));
        const akun = await akunUntukResetEmail(db, username, email);
        if (akun) {
            const tautan = `${alamatPwa()}/atur-password?token=${buatTokenReset(Number(akun.id), akun.password_hash)}`;
            await kirimEmail(db, {
                ke: akun.email, judul: 'Atur ulang password aplikasi anggota',
                teks: `Buka tautan berikut dalam 30 menit untuk membuat password baru:\n${tautan}\n\nAbaikan email ini bila Anda tidak memintanya.`,
            });
        }
        // Balasan selalu sama supaya tidak membocorkan apakah akun dan email itu terdaftar.
        return ok('Bila username dan email cocok, tautan untuk membuat password baru dikirim ke email tersebut. Tautan berlaku 30 menit.');
    }
    const tunggu = cobaLagi(`tanya:${ip}`, 20, 15 * MENIT);
    if (tunggu) return gagal(pesanTunggu(tunggu));
    // Username fiktif tetap mendapat pertanyaan (tidak membocorkan akun); jawaban tidak pernah dikirim.
    const pertanyaan = await pertanyaanUntuk(db, username);
    return pertanyaan ? ok('Username ada di database.', { username_exist: true, pertanyaan }) : gagal('Pertanyaan keamanan belum tersedia');
}

/** verifyjawaban: jawaban benar -> reset_token (30 menit, sama dengan tautan email) untuk updateuserpassword. */
export async function verifyJawaban({ db, p, ip }: Konteks): Promise<Result> {
    const username = teks(p, 'username').trim();
    const tunggu = cobaLagi(`jawab:${username.toLowerCase()}`, 5, 15 * MENIT) || cobaLagi(`jawab-ip:${ip}`, 20, 15 * MENIT);
    if (tunggu) return gagal(pesanTunggu(tunggu));
    const j = await periksaJawaban(db, username, teks(p, 'jawaban'));
    if (!j.ok) return gagal(j.error);
    if (!j.passwordHash) return gagal('Username atau jawaban tidak cocok');
    return ok('Jawaban benar.', { reset_token: buatTokenReset(j.userId, j.passwordHash) });
}

/**
 * updateuserpassword: lewat resetToken (lupa password), atau token login + password_lama (ganti password di Profil).
 * Ganti password membatalkan token di perangkat lain; perangkat ini menerima api_token baru.
 */
export async function updateUserPassword(k: Konteks): Promise<Result> {
    const { db, p } = k;
    const baru = teks(p, 'password');
    const resetToken = teks(p, 'resetToken').trim();
    if (resetToken) {
        const t = bacaTokenReset(resetToken);
        const akun = t ? await cariAkun(db, { id: t.u }) : null;
        if (!t || !akun?.akun_aktif || !akun.password_hash || sidikPassword(akun.password_hash) !== t.pv
            || akun.username.trim().toLowerCase() !== teks(p, 'username').trim().toLowerCase()) {
            throw new Ditolak(401, 'Token reset tidak valid atau kadaluarsa.');
        }
        const salah = cekPasswordBaruAnggota(baru);
        if (salah) return gagal(salah);
        await aturPassword(db, t.u, baru);
        return ok('Password berhasil diupdate.');
    }
    const a = await k.pemakai();
    if (a.username.trim().toLowerCase() !== teks(p, 'username').trim().toLowerCase()) throw new Ditolak(403, 'Akses ditolak.');
    const tunggu = cobaLagi(`ganti:${a.userId}`, 5, 15 * MENIT);
    if (tunggu) return gagal(pesanTunggu(tunggu));
    const r = await gantiPassword(db, a.userId, teks(p, 'password_lama'), baru, baru);
    if (!r.ok) return gagal(r.error);
    return ok('Password berhasil diupdate.', { api_token: buatTokenApi(a.userId, r.hash) });
}

// ---------- data akun ----------

/** updateemail: simpan email lalu kirim kode verifikasi (PWA emailAction). Verifikasi kode dilakukan di aplikasi web. */
export async function updateEmail(k: Konteks): Promise<Result> {
    const a = await k.pemakai();
    cocokKode(a, k.p.get('kdAnggota'));
    const email = teks(k.p, 'email').trim().toLowerCase();
    const r = await aturEmail(k.db, a.userId, email);
    if (!r.ok) return gagal(r.error);
    if (a.email && a.email.trim().toLowerCase() !== email) {
        await kirimEmail(k.db, { ke: a.email, judul: 'Email aplikasi anggota diganti',
            teks: `Email akun ${a.username} diganti ke ${email}. Hubungi pengurus koperasi bila ini bukan Anda.` });
    }
    const kode = await kirimKodeVerifikasi(k.db as never, a.userId, email, a.nama);
    if (!kode.ok && /sudah terverifikasi/.test(kode.error)) return ok('Email tersimpan dan sudah terverifikasi.');
    void prosesAntrean(k.db as never, { batas: 5 }).catch(() => undefined);
    return ok(`Email tersimpan. Kode verifikasi dikirim ke email tersebut; masukkan kodenya di aplikasi web anggota (${alamatPwa()}, menu Akun) supaya notifikasi lewat email aktif.`);
}

export async function updateFcmToken(k: Konteks): Promise<Result> {
    const a = await k.pemakai();
    cocokKode(a, k.p.get('kdAnggota'));
    const token = teks(k.p, 'token').trim();
    if (!token || token.length > 255) return gagal('Failed to update token');
    await k.db.query('UPDATE app_user SET fcm_token = $1, updated_at = now() WHERE id = $2', [token, a.userId]);
    return ok('Token updated successfully');
}

/** updateprofile: foto profil, aturan sama dengan fotoAction PWA (JPG/PNG/WEBP dari isi file, maks. 5 MB). */
export async function updateProfile(k: Konteks): Promise<Result> {
    const a = await k.pemakai();
    cocokKode(a, k.p.get('kdAnggota'));
    const isi = k.berkas.get('foto');
    if (!isi || isi.length === 0) return gagal('File foto tidak ditemukan atau gagal diupload.');
    if (isi.length > MAKS_FOTO) return gagal('Ukuran foto maksimal 5 MB.');
    const jenis = jenisFoto(isi);
    if (!jenis) return gagal('File harus berupa gambar JPG, PNG, atau WEBP.');
    try {
        await simpanFoto(k.db, a.userId, isi, jenis);
    } catch (e) {
        if (tabelBelumAda(e)) return gagal('Fitur foto belum dipasang di server');
        throw e;
    }
    return ok('Foto profil berhasil diperbarui', { foto: await namaFoto(k.db, a.userId) });
}

// ---------- pengajuan kredit ----------

// Mencegah kiriman beruntun dari tombol yang ditekan berkali-kali (sama dengan ajukanAction PWA).
const terakhirAjukan = new Map<number, number>();
const JEDA_AJUKAN_MS = 5000;

/**
 * createpinjaman: aturan ajukanPinjaman (PWA). Persen bunga, adm, provisi, dan denda kiriman aplikasi diabaikan; nilainya
 * diambil dari jenis kredit di server. Tanggal aplikasi berformat yyyy/MM/dd.
 */
export async function createPinjaman(k: Konteks): Promise<Result> {
    const a = await k.pemakai();
    cocokKode(a, k.p.get('kdAnggota'));
    if (Date.now() - (terakhirAjukan.get(a.userId) ?? 0) < JEDA_AJUKAN_MS) return gagal('Tunggu sebentar sebelum mengirim lagi.');
    terakhirAjukan.set(a.userId, Date.now());
    const angka = (nama: string) => Number(teks(k.p, nama).replace(/\D/g, '') || '0');
    const isian = {
        kodeKredit: teks(k.p, 'kdKredit'), lama: angka('lamaAngsuran'), besar: angka('rpPinjamanPokok'),
        tglRealisasi: teks(k.p, 'tglRealisasi').trim().replace(/\//g, '-'), keterangan: teks(k.p, 'keterangan'),
    };
    const hasil = await txUji(k.db, (db) => ajukanPinjaman(db, a.anggotaId, isian, hariIni()));
    if (!hasil.ok) return gagal(hasil.error);
    const uji = await modeUji(k.db);
    if (!uji) {
        try {
            const { rows: [j] } = await k.db.query(
                'SELECT jk.nama_kredit FROM pengajuan_pinjaman pp LEFT JOIN jenis_kredit jk ON jk.id = pp.jenis_kredit_id WHERE pp.id = $1', [hasil.id]);
            await beritahuAdmin(k.db as never, {
                menu: MENU_PENGAJUAN, judul: 'Pengajuan kredit baru', url: '/dashboard/loans/apply',
                isi: `${a.nama} mengajukan ${j?.nama_kredit ?? 'pinjaman'} Rp ${isian.besar.toLocaleString('id-ID')} untuk ${isian.lama} bulan.`,
            });
        } catch (e) {
            console.error('kabari admin pengajuan gagal:', e);
        }
    }
    return ok(uji ? 'Mode uji: pengajuan diperiksa tetapi tidak disimpan.' : 'Pinjaman berhasil diajukan');
}
