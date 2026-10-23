import { tokenGambar } from './gambar.ts';

// Sasaran himbauan/promo (tabel pengumuman_sasaran, anggota-web.sql) dan daftar pengumuman internal untuk operator.
// Tanpa baris sasaran = semua anggota saja (perilaku lama, termasuk aplikasi Android).

interface Db { query: (sql: string, params?: unknown[]) => Promise<{ rows: any[]; rowCount?: number | null }> }

export type JenisPengumuman = 'himbauan' | 'promo';

export interface Sasaran {
    anggota: boolean;
    /** null = semua anggota; selain itu hanya anggota dengan status_staff ini. */
    statusStaff: string[] | null;
    internal: boolean;
    /** null = semua grup operator; selain itu hanya grup (opr_grup.id) ini. */
    grupIds: number[] | null;
}

export const SASARAN_BAWAAN: Sasaran = { anggota: true, statusStaff: null, internal: false, grupIds: null };

export class SasaranSalah extends Error {}

/** Periksa dan rapikan sasaran dari form; melempar SasaranSalah bila tidak masuk akal. */
export function periksaSasaran(s: Sasaran): Sasaran {
    if (!s.anggota && !s.internal) throw new SasaranSalah('Pilih minimal satu penerima: anggota atau internal kantor');
    const staff = s.statusStaff ? [...new Set(s.statusStaff.map((x) => x.trim()).filter(Boolean))] : null;
    if (s.anggota && staff !== null && staff.length === 0) throw new SasaranSalah('Pilih minimal satu status anggota, atau pilih semua anggota');
    const grup = s.grupIds ? [...new Set(s.grupIds.filter((x) => Number.isInteger(x) && x > 0))] : null;
    if (s.internal && grup !== null && grup.length === 0) throw new SasaranSalah('Pilih minimal satu grup internal, atau pilih semua grup');
    return { anggota: s.anggota, statusStaff: s.anggota ? staff : null, internal: s.internal, grupIds: s.internal ? grup : null };
}

export async function simpanSasaran(db: Db, jenis: JenisPengumuman, refId: number, s: Sasaran) {
    await db.query(
        `INSERT INTO pengumuman_sasaran (jenis, ref_id, untuk_anggota, status_staff, untuk_internal, grup_ids) VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (jenis, ref_id) DO UPDATE SET untuk_anggota = EXCLUDED.untuk_anggota, status_staff = EXCLUDED.status_staff,
            untuk_internal = EXCLUDED.untuk_internal, grup_ids = EXCLUDED.grup_ids`,
        [jenis, refId, s.anggota, s.statusStaff, s.internal, s.grupIds]);
}

export async function hapusSasaran(db: Db, jenis: JenisPengumuman, refId: number) {
    try {
        await db.query('DELETE FROM pengumuman_sasaran WHERE jenis = $1 AND ref_id = $2', [jenis, refId]);
        await db.query('DELETE FROM pengumuman_baca_opr WHERE jenis = $1 AND ref_id = $2', [jenis, refId]);
    } catch (e) {
        if ((e as { code?: string }).code !== '42P01') throw e;
    }
}

export async function sasaranUntuk(db: Db, jenis: JenisPengumuman, refIds: number[]) {
    const hasil = new Map<number, Sasaran>();
    if (refIds.length === 0) return hasil;
    try {
        const r = await db.query(
            `SELECT ref_id, untuk_anggota, status_staff, untuk_internal, grup_ids FROM pengumuman_sasaran WHERE jenis = $1 AND ref_id = ANY($2::bigint[])`, [jenis, refIds]);
        for (const x of r.rows) {
            hasil.set(Number(x.ref_id), {
                anggota: x.untuk_anggota, statusStaff: x.status_staff, internal: x.untuk_internal,
                grupIds: x.grup_ids ? (x.grup_ids as string[]).map(Number) : null,
            });
        }
    } catch (e) {
        if ((e as { code?: string }).code !== '42P01') throw e;
    }
    return hasil;
}

/** Status staff yang ada di anggota aktif (pilihan sasaran anggota). */
export async function daftarStatusStaff(db: Db) {
    const r = await db.query(`SELECT status_staff s, count(*)::int n FROM anggota WHERE aktif AND trim(status_staff) <> '' GROUP BY 1 ORDER BY 2 DESC, 1`);
    return r.rows.map((x) => ({ nama: x.s as string, jumlah: x.n as number }));
}

export async function daftarGrupOperator(db: Db) {
    const r = await db.query(`SELECT g.id, g.nama_grup nama, count(o.id)::int jumlah FROM opr_grup g
        LEFT JOIN opr o ON o.grup_id = g.id AND upper(trim(o.status_aktif)) <> 'NON AKTIF' GROUP BY 1, 2 ORDER BY g.urut, g.id`);
    return r.rows.map((x) => ({ id: Number(x.id), nama: String(x.nama ?? ''), jumlah: x.jumlah as number }));
}

export interface PengumumanInternal {
    jenis: JenisPengumuman; id: number; judul: string; isi: string; gambar: string | null; waktu: string; baru: boolean
}

const UNTUK_OPERATOR = `s.untuk_internal AND (s.grup_ids IS NULL OR o.grup_id = ANY(s.grup_ids))`;

/** Himbauan/promo aktif yang ditujukan ke grup operator ini, terbaru dulu; baru = belum dibuka operator. */
export async function pengumumanUntukOperator(db: Db, oprId: number): Promise<PengumumanInternal[]> {
    let rows: any[];
    try {
        rows = (await db.query(
            `SELECT x.jenis, x.id, x.judul, x.isi, to_char(s.dibuat_pada, 'YYYY-MM-DD HH24:MI') waktu, (b.opr_id IS NULL) baru
               FROM opr o
               CROSS JOIN LATERAL (
                    SELECT 'himbauan'::text jenis, id, judul_himbauan judul, isi_himbauan isi FROM himbauan WHERE status
                    UNION ALL
                    SELECT 'promo', id, judul, isi FROM promo WHERE status) x
               JOIN pengumuman_sasaran s ON s.jenis = x.jenis AND s.ref_id = x.id AND ${UNTUK_OPERATOR}
               LEFT JOIN pengumuman_baca_opr b ON b.opr_id = o.id AND b.jenis = x.jenis AND b.ref_id = x.id
              WHERE o.id = $1 ORDER BY s.dibuat_pada DESC LIMIT 100`, [oprId])).rows;
    } catch (e) {
        if ((e as { code?: string }).code === '42P01') return [];
        throw e;
    }
    const gH = await tokenGambar(db, 'himbauan', rows.filter((x) => x.jenis === 'himbauan').map((x) => Number(x.id)));
    const gP = await tokenGambar(db, 'promo', rows.filter((x) => x.jenis === 'promo').map((x) => Number(x.id)));
    return rows.map((x) => ({
        jenis: x.jenis, id: Number(x.id), judul: String(x.judul ?? ''), isi: String(x.isi ?? ''), waktu: x.waktu, baru: x.baru,
        gambar: (x.jenis === 'himbauan' ? gH : gP).get(Number(x.id)) ?? null,
    }));
}

export async function hitungPengumumanBaru(db: Db, oprId: number) {
    try {
        const r = await db.query(
            `SELECT count(*)::int n FROM opr o
               CROSS JOIN LATERAL (SELECT 'himbauan'::text jenis, id FROM himbauan WHERE status UNION ALL SELECT 'promo', id FROM promo WHERE status) x
               JOIN pengumuman_sasaran s ON s.jenis = x.jenis AND s.ref_id = x.id AND ${UNTUK_OPERATOR}
              WHERE o.id = $1 AND NOT EXISTS (SELECT 1 FROM pengumuman_baca_opr b WHERE b.opr_id = o.id AND b.jenis = x.jenis AND b.ref_id = x.id)`, [oprId]);
        return r.rows[0].n as number;
    } catch (e) {
        if ((e as { code?: string }).code === '42P01') return 0;
        throw e;
    }
}

export async function tandaiPengumumanDibaca(db: Db, oprId: number, daftar: { jenis: JenisPengumuman; id: number }[]) {
    if (daftar.length === 0) return;
    await db.query(
        `INSERT INTO pengumuman_baca_opr (opr_id, jenis, ref_id) SELECT $1, j, i FROM unnest($2::text[], $3::bigint[]) AS t(j, i) ON CONFLICT DO NOTHING`,
        [oprId, daftar.map((d) => d.jenis), daftar.map((d) => d.id)]);
}
