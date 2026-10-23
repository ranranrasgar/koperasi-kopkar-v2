// Atur SMTP_PASS dengan aman: menanyakan sandi (tidak ditampilkan), menulisnya ke anggota/.env.local DAN
// frontend/.env.local dengan tanda kutip yang benar, lalu langsung memeriksa login SMTP. Sandi tidak pernah
// ditulis ke layar atau log.
//
//   npm run email:sandi
//   npm run email:sandi -- --berkas=a.env,b.env   (berkas lain, mis. untuk uji)
import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import { fileURLToPath } from 'node:url';
import nodemailer from 'nodemailer';

const here = path.dirname(fileURLToPath(import.meta.url));
const argBerkas = process.argv.find((a) => a.startsWith('--berkas='))?.slice(9);
const berkas = argBerkas ? argBerkas.split(',') : [path.join(here, '../../anggota/.env.local'), path.join(here, '../../frontend/.env.local')];

function tanya(pertanyaan) {
    return new Promise((ok) => {
        if (!process.stdin.isTTY) { // bukan terminal interaktif (mis. pipa): baca satu baris apa adanya
            const rl = readline.createInterface({ input: process.stdin });
            rl.once('line', (l) => { rl.close(); ok(l); });
            return;
        }
        process.stdout.write(pertanyaan);
        let isi = '';
        process.stdin.setRawMode(true);
        process.stdin.resume();
        process.stdin.setEncoding('utf8');
        const f = (c) => {
            for (const ch of c) {
                if (ch === '\r' || ch === '\n') { process.stdin.setRawMode(false); process.stdin.pause(); process.stdin.off('data', f); process.stdout.write('\n'); return ok(isi); }
                if (ch === '\u0003') { process.stdout.write('\n'); process.exit(1); }
                if (ch === '\u007f' || ch === '\b') isi = isi.slice(0, -1); else isi += ch;
            }
        };
        process.stdin.on('data', f);
    });
}

/** Tulis nilai ke format .env: polos bila aman, selain itu dalam kutip ganda dengan \ " $ di-escape (dotenv-expand). */
const tulisNilai = (v) => (/^[A-Za-z0-9._@:/+=-]+$/.test(v) ? v : `"${v.replace(/[\\"$]/g, '\\$&')}"`);
const bacaNilai = (v) => (/^".*"$/s.test(v) ? v.slice(1, -1).replace(/\\([\\"$])/g, '$1') : v.replace(/^'|'$/g, ''));

const sandi = (await tanya('Sandi kotak email SMTP (tidak ditampilkan): ')).replace(/[\r\n]+$/, '');
if (!sandi) { console.error('Sandi kosong, dibatalkan.'); process.exit(1); }

let env = {};
for (const f of berkas) {
    let t = '';
    try { t = fs.readFileSync(f, 'utf8'); } catch { console.error(`Berkas tidak ditemukan: ${f}`); process.exit(1); }
    const baris = `SMTP_PASS=${tulisNilai(sandi)}`;
    const ganti = /^\s*SMTP_PASS\s*=.*$/m;
    t = ganti.test(t) ? t.replace(ganti, () => baris) : `${t.replace(/\s*$/, '')}\n${baris}\n`;
    fs.writeFileSync(f, t);
    env = { ...env, ...Object.fromEntries(t.split(/\r?\n/).map((l) => l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/)).filter(Boolean).map((m) => [m[1], bacaNilai(m[2])])) };
    console.log(`SMTP_PASS diperbarui di ${f} (${sandi.length} karakter).`);
}

if (!env.SMTP_HOST || !env.SMTP_USER) { console.log('Sandi tersimpan. SMTP_HOST/SMTP_USER belum diisi, pengujian dilewati.'); process.exit(0); }
const port = Number(env.SMTP_PORT || 587);
const t = nodemailer.createTransport({ host: env.SMTP_HOST, port, secure: env.SMTP_SECURE === '1' || port === 465, auth: { user: env.SMTP_USER, pass: env.SMTP_PASS }, connectionTimeout: 15_000 });
console.log(`Memeriksa login ${env.SMTP_USER} di ${env.SMTP_HOST}:${port} ...`);
try {
    await t.verify();
    console.log('BERHASIL: koneksi dan login SMTP benar. Jalankan ulang server aplikasi agar pengaturan terbaca, lalu uji kirim: npm run email:uji -- alamat@penerima.com');
} catch (e) {
    console.error(`GAGAL: ${e.message}`);
    console.error('Sandi sudah tersimpan, tetapi server menolaknya. Pastikan sandi itu sama dengan yang berhasil dipakai login di webmail kotak email, atau atur ulang sandi di panel hosting lalu jalankan perintah ini lagi.');
    process.exit(1);
}
