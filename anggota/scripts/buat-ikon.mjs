// Buat ikon PWA dari logo koperasi (anggota/public/logo.png) ke anggota/public/ikon/.
//
//   node anggota/scripts/buat-ikon.mjs [logo.png]
//
// Logo saat ini 320 px, jadi ikon 512 sedikit diperbesar; jalankan ulang dengan logo resolusi tinggi (>= 1024 px,
// PNG berlatar transparan) bila tersedia. Ikon maskable dan Apple memakai latar putih: Android memotong ikon maskable
// menjadi lingkaran/rounded square (isi harus di 80% tengah), dan iOS mengisi bagian transparan dengan hitam.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const akar = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const sumber = process.argv[2] ?? path.join(akar, 'public/logo.png');
const tujuan = path.join(akar, 'public/ikon');
fs.mkdirSync(tujuan, { recursive: true });

const PUTIH = { r: 255, g: 255, b: 255, alpha: 1 };
const BENING = { r: 0, g: 0, b: 0, alpha: 0 };

/** Logo di tengah kanvas ukuran x ukuran, menempati `isi` bagian (0..1) dari sisinya. */
async function buat(nama, ukuran, isi, latar) {
    const sisi = Math.round(ukuran * isi);
    const logo = await sharp(sumber).resize(sisi, sisi, { fit: 'contain', background: BENING, kernel: 'lanczos3' }).toBuffer();
    await sharp({ create: { width: ukuran, height: ukuran, channels: 4, background: latar } })
        .composite([{ input: logo, gravity: 'center' }])
        .png({ compressionLevel: 9 })
        .toFile(path.join(tujuan, nama));
    console.log(`${nama} ${ukuran}x${ukuran}`);
}

await buat('ikon-192.png', 192, 0.94, BENING);
await buat('ikon-512.png', 512, 0.94, BENING);
await buat('ikon-maskable-512.png', 512, 0.66, PUTIH);
await buat('ikon-maskable-192.png', 192, 0.66, PUTIH);
await buat('apple-touch-icon.png', 180, 0.84, PUTIH);
await buat('favicon-32.png', 32, 1, BENING);

/**
 * Ikon kecil notifikasi (badge) di bilah status Android: hanya bentuknya yang dipakai (putih di atas transparan), warna dibuang oleh Android,
 * jadi logo berwarna di atas latar putih diubah menjadi siluet: makin jauh dari putih, makin pekat.
 */
async function buatBadge(nama, ukuran) {
    const { data, info } = await sharp(sumber).resize(ukuran, ukuran, { fit: 'contain', background: BENING, kernel: 'lanczos3' })
        .ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const out = Buffer.alloc(info.width * info.height * 4, 255);
    for (let i = 0; i < info.width * info.height; i++) {
        const [r, g, b, a] = [data[i * 4], data[i * 4 + 1], data[i * 4 + 2], data[i * 4 + 3]];
        const jauh = Math.max(255 - r, 255 - g, 255 - b); // jarak dari putih
        out[i * 4 + 3] = Math.round((a / 255) * Math.min(255, Math.max(0, (jauh - 40) * 3)));
    }
    await sharp(out, { raw: { width: info.width, height: info.height, channels: 4 } }).png({ compressionLevel: 9 }).toFile(path.join(tujuan, nama));
    console.log(`${nama} ${ukuran}x${ukuran} (monokrom)`);
}
await buatBadge('badge-96.png', 96);
