// Uji pengaturan SMTP: membaca SMTP_* dari anggota/.env.local (atau env proses), memeriksa koneksi dan login,
// lalu mengirim satu email percobaan ke alamat yang diberikan. Tidak menyentuh database dan tidak ikut aturan
// "server uji tidak kirim email" karena ini pengujian yang disengaja.
//
//   npm run email:uji -- nama@gmail.com
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import nodemailer from 'nodemailer';

const here = path.dirname(fileURLToPath(import.meta.url));
const ke = process.argv[2];
if (!ke || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(ke)) {
    console.error('Pemakaian: npm run email:uji -- alamat@penerima.com');
    process.exit(1);
}

function envBerkas() {
    try {
        return Object.fromEntries(fs.readFileSync(path.join(here, '../../anggota/.env.local'), 'utf8').split(/\r?\n/)
            .map((l) => l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/)).filter(Boolean).map((m) => [m[1], m[2].replace(/^["']|["']$/g, '')]));
    } catch { return {}; }
}
const env = { ...envBerkas(), ...process.env };
for (const k of ['SMTP_HOST', 'SMTP_FROM']) {
    if (!env[k]) { console.error(`${k} belum diisi di anggota/.env.local`); process.exit(1); }
}
const port = Number(env.SMTP_PORT || 587);
const t = nodemailer.createTransport({
    host: env.SMTP_HOST, port, secure: env.SMTP_SECURE === '1' || port === 465,
    auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS ?? '' } : undefined, connectionTimeout: 15_000, socketTimeout: 30_000,
});

console.log(`Menghubungi ${env.SMTP_HOST}:${port} (${port === 465 || env.SMTP_SECURE === '1' ? 'TLS langsung' : 'STARTTLS'}) sebagai ${env.SMTP_USER ?? '(tanpa login)'} ...`);
try {
    await t.verify();
    console.log('Koneksi dan login berhasil.');
    const info = await t.sendMail({
        from: env.SMTP_FROM, to: ke, subject: 'Percobaan email Kopkar MJS',
        text: 'Jika Anda menerima email ini, pengaturan SMTP aplikasi anggota sudah benar.\n\nKopkar MJS · Aplikasi Anggota',
    });
    console.log(`Email percobaan dikirim ke ${ke} (${info.messageId}). Periksa juga folder spam.`);
} catch (e) {
    console.error(`GAGAL: ${e.message}`);
    if (/535|Invalid login|Username and Password not accepted|BadCredentials/i.test(e.message)) console.error('Petunjuk: login ditolak. Untuk Gmail pakai "sandi aplikasi" 16 karakter (bukan sandi akun) dan aktifkan verifikasi 2 langkah dulu.');
    if (/ECONNREFUSED|ETIMEDOUT|ENOTFOUND|ESOCKET/i.test(e.message)) console.error('Petunjuk: tidak bisa terhubung. Periksa SMTP_HOST, SMTP_PORT (587 atau 465), dan apakah jaringan/firewall memblokir port itu.');
    process.exit(1);
}
