import { kirimKeOperator } from './push.ts';

// Notifikasi sistem untuk operator (tabel notif_admin, anggota-web.sql): mis. pengajuan kredit baru dari anggota.
// Tercatat untuk lonceng navbar admin dan dikirim juga sebagai Web Push ke browser operator yang grupnya berizin menu itu.

interface Db { query: (sql: string, params?: unknown[]) => Promise<{ rows: any[]; rowCount?: number | null }> }

/** Nama menu hak akses; harus sama dengan MENU.pengajuan di frontend/src/config/akses.ts. */
export const MENU_PENGAJUAN = 'Pengajuan Pinjaman';

export interface NotifAdmin { id: number; judul: string; isi: string; url: string; waktu: string; baru: boolean }

/** Operator o (grup g) berhak atas notifikasi n: grup superadmin, atau grup yang berizin menu notifikasi itu. */
const BERHAK = `(g.nama_grup = 'superadmin' OR EXISTS (SELECT 1 FROM opr_hak_akses h WHERE h.grup_id = g.id AND h.menu = n.menu AND h.akses = 'T'))`;
const AKTIF = `n.dibuat_pada > now() - interval '30 days'`;

/**
 * Catat notifikasi untuk operator berizin `menu` lalu kirim push ke browser mereka. Push tidak pernah melempar galat;
 * pencatatan melempar bila tabel belum dipasang, jadi panggil di luar transaksi utama dan tangkap galatnya.
 */
export async function beritahuAdmin(db: Db, n: { menu: string; judul: string; isi: string; url: string }) {
    await db.query('INSERT INTO notif_admin (menu, judul, isi, url) VALUES ($1, $2, $3, $4)', [n.menu, n.judul.slice(0, 80), n.isi.slice(0, 300), n.url]);
    return kirimKeOperator(db, n.menu, { judul: n.judul.slice(0, 60), isi: n.isi.slice(0, 140), url: n.url });
}

export async function notifAdminUntukOperator(db: Db, oprId: number): Promise<NotifAdmin[]> {
    try {
        const r = await db.query(
            `SELECT n.id, n.judul, n.isi, n.url, to_char(n.dibuat_pada, 'YYYY-MM-DD HH24:MI') waktu, (b.opr_id IS NULL) baru
               FROM notif_admin n
               JOIN opr o ON o.id = $1 JOIN opr_grup g ON g.id = o.grup_id
               LEFT JOIN notif_admin_baca b ON b.notif_id = n.id AND b.opr_id = o.id
              WHERE ${AKTIF} AND ${BERHAK} ORDER BY n.dibuat_pada DESC, n.id DESC LIMIT 100`, [oprId]);
        return r.rows.map((x) => ({ ...x, id: Number(x.id) })) as NotifAdmin[];
    } catch (e) {
        if ((e as { code?: string }).code === '42P01') return [];
        throw e;
    }
}

export async function hitungNotifAdminBaru(db: Db, oprId: number) {
    try {
        const r = await db.query(
            `SELECT count(*)::int n FROM notif_admin n
               JOIN opr o ON o.id = $1 JOIN opr_grup g ON g.id = o.grup_id
              WHERE ${AKTIF} AND ${BERHAK} AND NOT EXISTS (SELECT 1 FROM notif_admin_baca b WHERE b.notif_id = n.id AND b.opr_id = o.id)`, [oprId]);
        return r.rows[0].n as number;
    } catch (e) {
        if ((e as { code?: string }).code === '42P01') return 0;
        throw e;
    }
}

export async function tandaiNotifAdminDibaca(db: Db, oprId: number, ids: number[]) {
    if (ids.length === 0) return;
    await db.query('INSERT INTO notif_admin_baca (opr_id, notif_id) SELECT $1, unnest($2::bigint[]) ON CONFLICT DO NOTHING', [oprId, ids]);
}
