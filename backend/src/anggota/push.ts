import webpush from 'web-push';
import { tautkanGambar } from './gambar.ts';

// Web Push untuk PWA anggota (keputusan K8): standar W3C + VAPID, tanpa Firebase/pihak ketiga. Notifikasi sampai ke
// layar HP walau aplikasi ditutup karena yang menerimanya service worker (anggota/public/sw.js).
// Dipakai PWA (daftar/hapus langganan) dan admin (kirim pengajuan diputuskan, kirim pesan/pengumuman).
// Kunci VAPID dari env: VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT.

interface Db { query: (sql: string, params?: unknown[]) => Promise<{ rows: any[] }> }

export interface LanggananPush { endpoint: string; keys: { p256dh: string; auth: string } }
/** url: halaman tujuan saat notifikasi diketuk; bila kosong, halaman detail pesan (/notifikasi/<id>). */
/** gambarId: gambar dari simpanGambar; tampil di detail notifikasi dan sebagai gambar besar di push. */
export interface IsiNotifikasi { judul: string; isi: string; url?: string; catat?: boolean; gambarId?: number }
export interface HasilKirim { penerima: number; perangkat: number; dikirim: number; gagal: number }

export const kunciPublikPush = () => process.env.VAPID_PUBLIC_KEY || null;
export const MAKS_JUDUL = 50;
export const MAKS_ISI = 500;

function siapkanVapid() {
    const { VAPID_PUBLIC_KEY: pub, VAPID_PRIVATE_KEY: priv, VAPID_SUBJECT: subjek } = process.env;
    if (!pub || !priv || !subjek) return false;
    webpush.setVapidDetails(subjek, pub, priv);
    return true;
}

export function langgananValid(s: unknown): s is LanggananPush {
    const x = s as LanggananPush | null;
    return !!x && typeof x.endpoint === 'string' && /^https:\/\//.test(x.endpoint) && x.endpoint.length < 1000
        && typeof x.keys?.p256dh === 'string' && typeof x.keys?.auth === 'string'
        && x.keys.p256dh.length < 200 && x.keys.auth.length < 100;
}

/** Simpan perangkat ini untuk akun. Endpoint yang sama dipindahkan ke akun yang sedang login. */
export async function simpanLangganan(db: Db, appUserId: number, s: LanggananPush) {
    await db.query(
        `INSERT INTO app_user_push (app_user_id, endpoint, p256dh, auth) VALUES ($1, $2, $3, $4)
         ON CONFLICT (endpoint) DO UPDATE SET app_user_id = EXCLUDED.app_user_id, p256dh = EXCLUDED.p256dh, auth = EXCLUDED.auth`,
        [appUserId, s.endpoint, s.keys.p256dh, s.keys.auth]);
}

export async function hapusLangganan(db: Db, appUserId: number, endpoint: string) {
    await db.query('DELETE FROM app_user_push WHERE app_user_id = $1 AND endpoint = $2', [appUserId, endpoint]);
}

export async function adaLangganan(db: Db, appUserId: number, endpoint: string) {
    const r = await db.query('SELECT 1 FROM app_user_push WHERE app_user_id = $1 AND endpoint = $2', [appUserId, endpoint]);
    return r.rows.length > 0;
}

/** Jumlah anggota aktif dan perangkat yang sudah mengaktifkan notifikasi (0 bila tabel belum dipasang). */
export async function ringkasanPush(db: Db) {
    const anggota = await db.query('SELECT count(*)::int n FROM anggota WHERE aktif');
    let perangkat = 0, akun = 0;
    try {
        const r = await db.query(
            `SELECT count(*)::int perangkat, count(DISTINCT u.anggota_id)::int akun
               FROM app_user_push p JOIN app_user u ON u.id = p.app_user_id JOIN anggota a ON a.id = u.anggota_id WHERE a.aktif`);
        perangkat = r.rows[0].perangkat; akun = r.rows[0].akun;
    } catch (e) {
        if ((e as { code?: string }).code !== '42P01') throw e;
    }
    return { anggotaAktif: anggota.rows[0].n as number, perangkat, anggotaBerPerangkat: akun };
}

/** Catat satu baris riwayat per anggota (log_notifikasi) dan kembalikan id-nya. urut unik: ulangi bila bentrok. */
async function catatRiwayat(db: Db, n: IsiNotifikasi, pilihAnggota: string, params: unknown[]) {
    for (let percobaan = 1; ; percobaan++) {
        try {
            const r = await db.query(
                `INSERT INTO log_notifikasi (urut, kode_agt, title, pesan, anggota_id)
                 SELECT (SELECT COALESCE(MAX(urut), 0) FROM log_notifikasi) + row_number() OVER (ORDER BY a.id), a.kode_agt, $1, $2, a.id
                   FROM anggota a WHERE ${pilihAnggota}
                 RETURNING id, anggota_id`,
                [n.judul.slice(0, MAKS_JUDUL), n.isi, ...params]);
            return r.rows as { id: string; anggota_id: string }[];
        } catch (e) {
            if ((e as { code?: string }).code !== '23505' || percobaan >= 5) throw e;
        }
    }
}

interface BarisLangganan { id: string; endpoint: string; p256dh: string; auth: string; [k: string]: unknown }

/** Kirim ke baris langganan (tabel app_user_push atau opr_push), 50 sekaligus. Yang kedaluwarsa (404/410) dihapus. */
async function kirimKeBaris(db: Db, tabel: 'app_user_push' | 'opr_push', rows: BarisLangganan[], buatMuatan: (b: BarisLangganan) => string) {
    let dikirim = 0, gagal = 0;
    const kadaluwarsa: string[] = [];
    for (let i = 0; i < rows.length; i += 50) {
        await Promise.all(rows.slice(i, i + 50).map(async (p) => {
            try {
                await webpush.sendNotification({ endpoint: p.endpoint, keys: { p256dh: p.p256dh, auth: p.auth } }, buatMuatan(p), { TTL: 86400 });
                dikirim++;
            } catch (e) {
                gagal++;
                const kode = (e as { statusCode?: number }).statusCode;
                if (kode === 404 || kode === 410) kadaluwarsa.push(p.id);
            }
        }));
    }
    if (kadaluwarsa.length) await db.query(`DELETE FROM ${tabel} WHERE id = ANY($1::bigint[])`, [kadaluwarsa]);
    return { perangkat: rows.length, dikirim, gagal };
}

/** Kirim push ke semua perangkat milik anggota-anggota ini. Tidak melempar. */
async function dorongKePerangkat(db: Db, anggotaIds: number[], buatMuatan: (anggotaId: number) => string) {
    if (anggotaIds.length === 0 || !siapkanVapid()) return { perangkat: 0, dikirim: 0, gagal: 0 };
    const rows = (await db.query(
        `SELECT p.id, p.endpoint, p.p256dh, p.auth, u.anggota_id FROM app_user_push p JOIN app_user u ON u.id = p.app_user_id
          WHERE u.anggota_id = ANY($1::bigint[])`, [anggotaIds])).rows;
    return kirimKeBaris(db, 'app_user_push', rows, (r) => buatMuatan(Number(r.anggota_id)));
}

// ---------- operator (admin) ----------

/** Push ke browser operator aktif di grup tertentu (grupIds null = semua grup). Tidak melempar. */
export async function kirimKeOperatorGrup(db: Db, grupIds: number[] | null, n: { judul: string; isi: string; url: string }) {
    if (!siapkanVapid()) return { perangkat: 0, dikirim: 0, gagal: 0 };
    try {
        const rows = (await db.query(
            `SELECT p.id, p.endpoint, p.p256dh, p.auth FROM opr_push p JOIN opr o ON o.id = p.opr_id
              WHERE upper(trim(o.status_aktif)) <> 'NON AKTIF' AND ($1::bigint[] IS NULL OR o.grup_id = ANY($1::bigint[]))`, [grupIds])).rows;
        const muatan = JSON.stringify({ judul: n.judul, isi: n.isi, url: n.url });
        return await kirimKeBaris(db, 'opr_push', rows, () => muatan);
    } catch (e) {
        if ((e as { code?: string }).code === '42P01') return { perangkat: 0, dikirim: 0, gagal: 0 };
        throw e;
    }
}

export async function simpanLanggananOpr(db: Db, oprId: number, s: LanggananPush) {
    await db.query(
        `INSERT INTO opr_push (opr_id, endpoint, p256dh, auth) VALUES ($1, $2, $3, $4)
         ON CONFLICT (endpoint) DO UPDATE SET opr_id = EXCLUDED.opr_id, p256dh = EXCLUDED.p256dh, auth = EXCLUDED.auth`,
        [oprId, s.endpoint, s.keys.p256dh, s.keys.auth]);
}

export async function hapusLanggananOpr(db: Db, oprId: number, endpoint: string) {
    await db.query('DELETE FROM opr_push WHERE opr_id = $1 AND endpoint = $2', [oprId, endpoint]);
}

export async function adaLanggananOpr(db: Db, oprId: number, endpoint: string) {
    return (await db.query('SELECT 1 FROM opr_push WHERE opr_id = $1 AND endpoint = $2', [oprId, endpoint])).rows.length > 0;
}

/**
 * Push ke browser semua operator aktif yang berizin menu ini (grup dengan akses 'T' di opr_hak_akses, atau grup
 * superadmin). Tidak melempar; tanpa VAPID atau tabel opr_push, tidak ada yang terkirim.
 */
export async function kirimKeOperator(db: Db, menu: string, n: { judul: string; isi: string; url: string }) {
    if (!siapkanVapid()) return { perangkat: 0, dikirim: 0, gagal: 0 };
    try {
        const rows = (await db.query(
            `SELECT p.id, p.endpoint, p.p256dh, p.auth
               FROM opr_push p JOIN opr o ON o.id = p.opr_id JOIN opr_grup g ON g.id = o.grup_id
              WHERE upper(trim(o.status_aktif)) <> 'NON AKTIF'
                AND (g.nama_grup = 'superadmin'
                     OR EXISTS (SELECT 1 FROM opr_hak_akses h WHERE h.grup_id = g.id AND h.menu = $1 AND h.akses = 'T'))`, [menu])).rows;
        const muatan = JSON.stringify({ judul: n.judul, isi: n.isi, url: n.url });
        return await kirimKeBaris(db, 'opr_push', rows, () => muatan);
    } catch (e) {
        if ((e as { code?: string }).code === '42P01') return { perangkat: 0, dikirim: 0, gagal: 0 };
        throw e;
    }
}

/** Alamat gambar relatif; service worker melengkapinya dengan alamat situs PWA. */
async function jalurGambar(db: Db, gambarId?: number) {
    if (!gambarId) return undefined;
    const r = await db.query('SELECT token FROM pengumuman_gambar WHERE id = $1', [gambarId]);
    return r.rows[0] ? `/gambar/${r.rows[0].token}` : undefined;
}

/**
 * Kirim ke satu anggota: tercatat di riwayat (kecuali catat=false, untuk notifikasi percobaan) lalu di-push ke semua
 * perangkatnya. Kegagalan push tidak melempar galat; riwayat tetap tersimpan.
 */
export async function kirimNotifikasi(db: Db, anggotaId: number, n: IsiNotifikasi): Promise<HasilKirim> {
    let id: string | null = null;
    if (n.catat !== false) {
        const r = await catatRiwayat(db, n, 'a.id = $3', [anggotaId]);
        if (r.length === 0) return { penerima: 0, perangkat: 0, dikirim: 0, gagal: 0 };
        id = r[0].id;
        if (n.gambarId) await tautkanGambar(db, 'notifikasi', Number(id), n.gambarId);
    }
    const url = n.url ?? (id ? `/notifikasi/${id}` : '/notifikasi');
    const gambar = await jalurGambar(db, n.gambarId);
    const h = await dorongKePerangkat(db, [anggotaId], () => JSON.stringify({ judul: n.judul, isi: n.isi, url, gambar }));
    return { penerima: 1, ...h };
}

/**
 * Siaran ke anggota aktif (pengumuman, promo): satu baris riwayat per anggota, push ke semua perangkat.
 * statusStaff membatasi ke anggota dengan status_staff itu (null/kosong = semua anggota aktif).
 */
export async function kirimKeSemuaAnggota(db: Db, n: IsiNotifikasi, opsi: { statusStaff?: string[] | null } = {}): Promise<HasilKirim> {
    const staff = opsi.statusStaff && opsi.statusStaff.length ? opsi.statusStaff : null;
    const baris = staff ? await catatRiwayat(db, n, 'a.aktif AND a.status_staff = ANY($3::text[])', [staff]) : await catatRiwayat(db, n, 'a.aktif', []);
    const idPesan = new Map(baris.map((b) => [Number(b.anggota_id), b.id]));
    if (n.gambarId && baris.length) {
        await db.query(
            `INSERT INTO pengumuman_gambar_ref (jenis, ref_id, gambar_id) SELECT 'notifikasi', unnest($1::bigint[]), $2`,
            [baris.map((b) => Number(b.id)), n.gambarId]);
    }
    const gambar = await jalurGambar(db, n.gambarId);
    const h = await dorongKePerangkat(db, [...idPesan.keys()], (aid) => JSON.stringify({
        judul: n.judul, isi: n.isi, url: n.url ?? `/notifikasi/${idPesan.get(aid)}`, gambar,
    }));
    return { penerima: baris.length, ...h };
}
