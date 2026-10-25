import nodemailer, { type Transporter } from 'nodemailer';
import { htmlEmail, teksEmail, type KopEmail } from './templat.ts';

// Antrean email keluar (tabel email_antrean, anggota-web.sql). Penulis (aplikasi anggota dan admin) hanya memasukkan
// baris ke antrean; pengiriman bertahap oleh pekerja (pekerja.ts) atau prosesAntrean. Tanpa SMTP (SMTP_HOST dan SMTP_FROM
// belum diisi) email dicatat saja (status 'dicatat') seperti sebelum SMTP ada, supaya alur bisa diuji.
//
// Env: SMTP_HOST, SMTP_PORT (587), SMTP_SECURE ('1' = TLS langsung, otomatis untuk port 465), SMTP_USER, SMTP_PASS,
// SMTP_FROM (mis. "Kopkar MJS <no-reply@kopkarmjsmattel.com>"). EMAIL_UJI_JSON=1 hanya untuk uji otomatis (tidak mengirim).
// Kuota (hosting bersama biasanya membatasi per jam, Gmail per hari): EMAIL_MAKS_PER_JAM dan EMAIL_MAKS_PER_HARI (kosong = tanpa batas).
// Email verifikasi dan sistem (kode, reset password) tidak ikut dibatasi dan didahulukan.

interface Db { query: (sql: string, params?: unknown[]) => Promise<{ rows: any[]; rowCount?: number | null }> }

/** lampiran: satu berkas (mis. PDF); disimpan di antrean sampai email terkirim. */
export interface EmailKeluar { jenis: string; ke: string; judul: string; teks: string; tautan?: string | null; lampiran?: { nama: string; isi: Buffer } | null }

const MAKS_PERCOBAAN = 3;
/** Jenis yang isinya (mis. kode verifikasi) ikut ditulis ke log saat SMTP belum diatur, untuk pengujian di komputer pengembang. */
const JENIS_LOG_PENUH = new Set(['verifikasi', 'sistem']);
const JENIS_PRIORITAS = ['verifikasi', 'sistem'];

// Server uji (KOPKAR_SERVER_UJI, salinan data asli dengan alamat email anggota sungguhan) tidak pernah mengirim email
// sungguhan, walau SMTP diisi di .env.local bersama; email hanya dicatat. EMAIL_UJI_KIRIM=1 mengizinkan (hati-hati).
const serverUji = () => !!process.env.KOPKAR_SERVER_UJI && process.env.EMAIL_UJI_KIRIM !== '1';

// EMAIL_UJI_KE (alamat atau @domain, dipisah koma): di server uji hanya penerima ini yang benar-benar dikirimi; selebihnya tetap dicatat.
const aman = (ke: string) => (process.env.EMAIL_UJI_KE ?? '').toLowerCase().split(',').map((x) => x.trim()).filter(Boolean)
    .some((x) => (x.startsWith('@') ? ke.toLowerCase().endsWith(x) : ke.toLowerCase() === x));
const bolehKirim = (ke: string) => !serverUji() || aman(ke);

export const smtpSiap = () => process.env.EMAIL_UJI_JSON === '1' || ((!serverUji() || !!process.env.EMAIL_UJI_KE) && !!process.env.SMTP_HOST && !!process.env.SMTP_FROM);

let transport: Transporter | null = null;
function ambilTransport(): Transporter | null {
    if (process.env.EMAIL_UJI_JSON === '1') return nodemailer.createTransport({ jsonTransport: true });
    if (!smtpSiap()) return null;
    if (!transport) {
        const port = Number(process.env.SMTP_PORT || 587);
        transport = nodemailer.createTransport({
            host: process.env.SMTP_HOST, port, secure: process.env.SMTP_SECURE === '1' || port === 465,
            auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS ?? '' } : undefined,
            pool: true, maxConnections: 2, connectionTimeout: 15_000, socketTimeout: 30_000,
        });
    }
    return transport;
}

const alamatSah = (a: string) => /^[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]+$/.test(a) && a.length <= 150;

/** Masukkan satu email ke antrean; alamat tidak sah diabaikan (mengembalikan false). */
export async function antreEmail(db: Db, e: EmailKeluar) {
    if (!alamatSah(e.ke)) return false;
    await db.query('INSERT INTO email_antrean (jenis, ke, judul, teks, tautan, lampiran_nama, lampiran) VALUES ($1, $2, $3, $4, $5, $6, $7)',
        [e.jenis.slice(0, 30), e.ke, e.judul.slice(0, 200), e.teks, e.tautan?.slice(0, 300) ?? null, e.lampiran?.nama.slice(0, 150) ?? null, e.lampiran?.isi ?? null]);
    return true;
}

/** Masukkan banyak email sekaligus (siaran); mengembalikan jumlah yang masuk antrean. */
export async function antreEmailBanyak(db: Db, daftar: EmailKeluar[]) {
    const sah = daftar.filter((e) => alamatSah(e.ke));
    if (sah.length === 0) return 0;
    // Email berlampiran dimasukkan satu per satu; lainnya sekaligus.
    if (sah.some((e) => e.lampiran)) {
        for (const e of sah) await antreEmail(db, e);
        return sah.length;
    }
    await db.query(
        `INSERT INTO email_antrean (jenis, ke, judul, teks, tautan)
         SELECT * FROM unnest($1::text[], $2::text[], $3::text[], $4::text[], $5::text[])`,
        [sah.map((e) => e.jenis.slice(0, 30)), sah.map((e) => e.ke), sah.map((e) => e.judul.slice(0, 200)), sah.map((e) => e.teks), sah.map((e) => e.tautan?.slice(0, 300) ?? null)]);
    return sah.length;
}

export interface HasilProses { terkirim: number; gagal: number; dicatat: number; sisa: number }

const tidur = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Proses sampai `batas` email yang menunggu. Baris diambil dengan FOR UPDATE SKIP LOCKED dan "disewa" 5 menit,
 * jadi beberapa proses (aplikasi anggota dan admin) tidak mengirim email yang sama. Gagal diulang maksimal 3 kali
 * dengan jeda bertambah, lalu berstatus 'gagal'. jedaMs = jeda antar email (laju kirim).
 */
/** Sisa kuota kirim untuk email biasa (bukan verifikasi/sistem) menurut EMAIL_MAKS_PER_JAM / EMAIL_MAKS_PER_HARI. */
export async function sisaKuota(db: Db): Promise<number> {
    const jam = Number(process.env.EMAIL_MAKS_PER_JAM) || 0, hari = Number(process.env.EMAIL_MAKS_PER_HARI) || 0;
    if (!jam && !hari) return Infinity;
    const r = (await db.query(
        `SELECT count(*) FILTER (WHERE dikirim_pada > now() - interval '1 hour')::int jam, count(*)::int hari
           FROM email_antrean WHERE status = 'terkirim' AND dikirim_pada > now() - interval '1 day' AND jenis <> ALL($1::text[])`, [JENIS_PRIORITAS])).rows[0];
    return Math.max(0, Math.min(jam ? jam - r.jam : Infinity, hari ? hari - r.hari : Infinity));
}

/** Kop email resmi dari identitas koperasi; null bila tabel kosong atau gagal dibaca (email tetap terkirim dengan kop bawaan). */
async function kopKoperasi(db: Db): Promise<KopEmail | null> {
    try {
        const k = (await db.query('SELECT nama_perusahaan, alamat_perusahaan1, kota_perusahaan FROM perusahaan ORDER BY id LIMIT 1')).rows[0];
        const nama = String(k?.nama_perusahaan ?? '').trim();
        if (!nama) return null;
        return { nama, alamat: [k.alamat_perusahaan1, k.kota_perusahaan].map((x) => String(x ?? '').trim()).filter(Boolean).join(', ') };
    } catch { return null; }
}

export async function prosesAntrean(db: Db, opsi: { batas?: number; jedaMs?: number } = {}): Promise<HasilProses> {
    const batas = opsi.batas ?? 20;
    const ambil = async (prioritas: boolean, limit: number) => limit <= 0 ? [] : (await db.query(
        `UPDATE email_antrean SET percobaan = percobaan + 1, coba_lagi_pada = now() + interval '5 minutes'
          WHERE id IN (SELECT id FROM email_antrean WHERE status = 'menunggu' AND coba_lagi_pada <= now()
                          AND (jenis = ANY($2::text[])) = $3 ORDER BY id LIMIT $1 FOR UPDATE SKIP LOCKED)
          RETURNING id, jenis, ke, judul, teks, tautan, percobaan, lampiran_nama, lampiran`, [limit, JENIS_PRIORITAS, prioritas])).rows;
    // Verifikasi/sistem didahulukan dan tidak kena kuota; email biasa hanya sebanyak sisa kuota.
    const penting = await ambil(true, batas);
    const biasa = await ambil(false, Math.min(batas - penting.length, await sisaKuota(db)));
    const diambil = [...penting, ...biasa];
    const hasil: HasilProses = { terkirim: 0, gagal: 0, dicatat: 0, sisa: 0 };
    const t = ambilTransport();
    const kop = diambil.length && t ? await kopKoperasi(db) : null;

    for (const r of diambil.sort((a, b) => Number(a.id) - Number(b.id))) {
        if (!t || !bolehKirim(r.ke)) {
            console.info(`[email dicatat, SMTP belum diatur] jenis=${r.jenis} ke=${r.ke} judul="${r.judul}"${JENIS_LOG_PENUH.has(r.jenis) ? `\n${r.teks}${r.tautan ? `\n${r.tautan}` : ''}` : ''}`);
            await db.query(`UPDATE email_antrean SET status = 'dicatat', galat = $2, lampiran = NULL WHERE id = $1`, [r.id, t ? 'Server uji: penerima di luar EMAIL_UJI_KE tidak dikirimi' : 'SMTP belum diatur']);
            hasil.dicatat++;
            continue;
        }
        try {
            await t.sendMail({
                from: process.env.SMTP_FROM ?? 'Kopkar MJS <no-reply@localhost>', to: r.ke, subject: r.judul,
                text: teksEmail({ judul: r.judul, teks: r.teks, tautan: r.tautan }), html: htmlEmail({ judul: r.judul, teks: r.teks, tautan: r.tautan, kop }),
                attachments: r.lampiran ? [{ filename: r.lampiran_nama || 'lampiran.pdf', content: r.lampiran, contentType: /\.pdf$/i.test(r.lampiran_nama ?? '') ? 'application/pdf' : undefined }] : undefined,
            });
            await db.query(`UPDATE email_antrean SET status = 'terkirim', dikirim_pada = now(), galat = NULL, lampiran = NULL WHERE id = $1`, [r.id]);
            hasil.terkirim++;
        } catch (e) {
            const habis = Number(r.percobaan) >= MAKS_PERCOBAAN;
            await db.query(
                `UPDATE email_antrean SET galat = $2, status = $3, coba_lagi_pada = now() + ($4::int * interval '5 minutes') WHERE id = $1`,
                [r.id, String((e as Error).message ?? e).slice(0, 300), habis ? 'gagal' : 'menunggu', Number(r.percobaan)]);
            hasil.gagal++;
        }
        if (opsi.jedaMs) await tidur(opsi.jedaMs);
    }
    hasil.sisa = Number((await db.query(`SELECT count(*)::int n FROM email_antrean WHERE status = 'menunggu'`)).rows[0].n);
    return hasil;
}

/** Ringkasan antrean untuk pemantauan (mis. halaman admin): jumlah per status. */
export async function ringkasAntrean(db: Db) {
    const r = await db.query(`SELECT status, count(*)::int n FROM email_antrean GROUP BY 1`);
    return Object.fromEntries(r.rows.map((x) => [x.status, x.n as number])) as Record<string, number>;
}
