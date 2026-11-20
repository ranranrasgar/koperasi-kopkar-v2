import type { Db } from '../db.ts';
import { jamBobot, jamLembur, KODE_HADIR, rentangPeriode, type KodeHadir } from './hitung.ts';
import { bacaPengaturanGaji } from './pengaturan.ts';

// Periode gaji dan kehadiran harian karyawan koperasi (docs/prd-penggajian.md Tahap 2).
type Q = Pick<Db, 'query'>;
export class GalatGaji extends Error {}

export interface Periode { id: string; periode: string; dari: string; sampai: string; status: 'draf' | 'final' }

const KOLOM_PERIODE = "id, periode, dari::text dari, sampai::text sampai, status";

export async function bacaPeriode(db: Q, periode: string): Promise<Periode | null> {
    return (await db.query<Periode>(`SELECT ${KOLOM_PERIODE} FROM gaji_periode WHERE periode = $1`, [periode])).rows[0] ?? null;
}

/** Buka periode gaji (rentang tanggal dari Pengaturan Gaji). Bila sudah ada, kembalikan yang ada; rentangnya tidak berubah walau pengaturan berubah. */
export async function bukaPeriode(db: Q, periode: string, opr: string): Promise<Periode> {
    const ada = await bacaPeriode(db, periode);
    if (ada) return ada;
    let r: { dari: string; sampai: string };
    try { r = rentangPeriode(periode, (await bacaPengaturanGaji(db)).tanggalAwal); } catch (e) { throw new GalatGaji(e instanceof Error ? e.message : 'Periode tidak valid'); }
    return (await db.query<Periode>(
        `INSERT INTO gaji_periode (periode, dari, sampai, dibuat_oleh) VALUES ($1, $2, $3, $4)
         ON CONFLICT (periode) DO UPDATE SET periode = EXCLUDED.periode RETURNING ${KOLOM_PERIODE}`,
        [periode, r.dari, r.sampai, opr.slice(0, 50)])).rows[0];
}

/** Periode yang masih draf, dikunci supaya tidak difinalkan bersamaan dengan perubahan kehadiran. */
async function periodeDraf(db: Q, periodeId: string | number): Promise<Periode> {
    const p = (await db.query<Periode>(`SELECT ${KOLOM_PERIODE} FROM gaji_periode WHERE id = $1 FOR UPDATE`, [periodeId])).rows[0];
    if (!p) throw new GalatGaji('Periode gaji tidak ditemukan');
    if (p.status !== 'draf') throw new GalatGaji(`Periode ${p.periode} sudah final; kehadiran tidak bisa diubah`);
    return p;
}

/** Ubah kode kehadiran satu hari; kode kosong menghapus isian hari itu. */
export async function aturHadir(db: Q, i: { periodeId: string | number; karyawanId: string | number; tanggal: string; kode: string | null }): Promise<string> {
    const p = await periodeDraf(db, i.periodeId);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(i.tanggal) || i.tanggal < p.dari || i.tanggal > p.sampai) throw new GalatGaji(`Tanggal ${i.tanggal} di luar periode ${p.periode}`);
    const k = (await db.query<{ kode: string; nama: string }>('SELECT kode, nama FROM karyawan WHERE id = $1', [i.karyawanId])).rows[0];
    if (!k) throw new GalatGaji('Karyawan tidak ditemukan');
    if (!i.kode) {
        await db.query('DELETE FROM gaji_hadir WHERE periode_id = $1 AND karyawan_id = $2 AND tanggal = $3', [p.id, i.karyawanId, i.tanggal]);
        return `Kehadiran ${k.kode} ${i.tanggal} dikosongkan`;
    }
    if (!(i.kode in KODE_HADIR)) throw new GalatGaji(`Kode kehadiran ${i.kode} tidak dikenal`);
    await db.query(`INSERT INTO gaji_hadir (periode_id, karyawan_id, tanggal, kode) VALUES ($1, $2, $3, $4)
        ON CONFLICT (periode_id, karyawan_id, tanggal) DO UPDATE SET kode = EXCLUDED.kode`, [p.id, i.karyawanId, i.tanggal, i.kode]);
    return `Kehadiran ${k.kode} ${i.tanggal}: ${i.kode}`;
}

/**
 * Isi hari yang masih kosong: hari dengan pindai QR (karyawan tertaut anggota) menjadi ATN; bila `pola`, hari kerja lain ATN dan hari istirahat RD
 * (Minggu, ditambah Sabtu bila 5 hari kerja seminggu). Isian yang sudah ada tidak ditimpa. `karyawanId` kosong = semua karyawan aktif.
 */
export async function isiHadirKosong(db: Q, i: { periodeId: string | number; karyawanId?: string | number | null; pola: boolean }): Promise<{ qr: number; pola: number }> {
    const p = await periodeDraf(db, i.periodeId);
    const saring = i.karyawanId ? 'AND k.id = $4' : '';
    const arg = [p.id, p.dari, p.sampai, ...(i.karyawanId ? [i.karyawanId] : [])];
    const qr = (await db.query(
        `INSERT INTO gaji_hadir (periode_id, karyawan_id, tanggal, kode)
         SELECT $1, k.id, s.tanggal, 'ATN' FROM karyawan k JOIN absensi_staff s ON s.anggota_id = k.anggota_id
          WHERE k.aktif AND s.tanggal BETWEEN $2 AND $3 ${saring}
         ON CONFLICT DO NOTHING`, arg)).rowCount ?? 0;
    let pola = 0;
    if (i.pola) {
        const libur = (await bacaPengaturanGaji(db)).hariKerjaSeminggu === 5 ? '(0, 6)' : '(0)';
        pola = (await db.query(
            `INSERT INTO gaji_hadir (periode_id, karyawan_id, tanggal, kode)
             SELECT $1, k.id, d::date, CASE WHEN EXTRACT(DOW FROM d) IN ${libur} THEN 'RD' ELSE 'ATN' END
               FROM karyawan k CROSS JOIN generate_series($2::date, $3::date, interval '1 day') d
              WHERE k.aktif AND (k.tgl_masuk IS NULL OR k.tgl_masuk <= d::date) ${saring}
             ON CONFLICT DO NOTHING`, arg)).rowCount ?? 0;
    }
    return { qr, pola };
}

export interface BarisHadir { karyawan_id: string; kode: string; nama: string; jabatan: string | null; tertaut: boolean; hari: Record<string, KodeHadir>; jumlah: Partial<Record<KodeHadir, number>> }

/** Grid kehadiran: karyawan aktif dan karyawan yang sudah punya isian di periode ini, dengan kode per tanggal dan jumlah per kode. */
export async function gridHadir(db: Q, periodeId: string | number): Promise<BarisHadir[]> {
    const k = (await db.query<{ id: string; kode: string; nama: string; jabatan: string | null; tertaut: boolean }>(
        `SELECT k.id, k.kode, k.nama, k.jabatan, k.anggota_id IS NOT NULL tertaut FROM karyawan k
          WHERE k.aktif OR EXISTS (SELECT 1 FROM gaji_hadir h WHERE h.karyawan_id = k.id AND h.periode_id = $1) ORDER BY k.kode`, [periodeId])).rows;
    const h = (await db.query<{ karyawan_id: string; tanggal: string; kode: KodeHadir }>(
        'SELECT karyawan_id, tanggal::text tanggal, kode FROM gaji_hadir WHERE periode_id = $1', [periodeId])).rows;
    return k.map((x) => {
        const hari: Record<string, KodeHadir> = {};
        const jumlah: Partial<Record<KodeHadir, number>> = {};
        for (const r of h) if (r.karyawan_id === x.id) { hari[r.tanggal] = r.kode; jumlah[r.kode] = (jumlah[r.kode] ?? 0) + 1; }
        return { karyawan_id: x.id, kode: x.kode, nama: x.nama, jabatan: x.jabatan, tertaut: x.tertaut, hari, jumlah };
    });
}

// ---------- lembur harian (Tahap 3) ----------

const JAM = /^([01]\d|2[0-3]):[0-5]\d$/;
const TIDAK_HADIR: KodeHadir[] = ['ABS', 'UNP', 'ANN', 'MED', 'MAT'];

export interface InputLembur {
    periodeId: string | number; karyawanId: string | number; tanggal: string; mulai: string; selesai: string;
    /** Kosong = dari kode kehadiran hari itu: RD hari istirahat, selain itu hari kerja. */
    jenisHari?: 'kerja' | 'istirahat' | null; keterangan?: string | null; opr: string;
}

/**
 * Simpan lembur satu hari (satu baris per karyawan per hari; simpan ulang memperbarui). Jam dan jam berbobot dihitung dengan aturan
 * Rate Lembur (jamLembur, jamBobot) dan Pengaturan Gaji (hari kerja seminggu). Ditolak di hari berkode tidak hadir, cuti, atau sakit.
 */
export async function simpanLembur(db: Q, i: InputLembur): Promise<{ pesan: string; jam: number; jamBobot: number }> {
    const p = await periodeDraf(db, i.periodeId);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(i.tanggal) || i.tanggal < p.dari || i.tanggal > p.sampai) throw new GalatGaji(`Tanggal ${i.tanggal} di luar periode ${p.periode}`);
    if (!JAM.test(i.mulai) || !JAM.test(i.selesai)) throw new GalatGaji('Jam mulai dan selesai harus HH:MM');
    const k = (await db.query<{ kode: string }>('SELECT kode FROM karyawan WHERE id = $1', [i.karyawanId])).rows[0];
    if (!k) throw new GalatGaji('Karyawan tidak ditemukan');
    const hadir = (await db.query<{ kode: KodeHadir }>('SELECT kode FROM gaji_hadir WHERE periode_id = $1 AND karyawan_id = $2 AND tanggal = $3',
        [p.id, i.karyawanId, i.tanggal])).rows[0]?.kode;
    if (hadir && TIDAK_HADIR.includes(hadir)) throw new GalatGaji(`${k.kode} tanggal ${i.tanggal} berkode ${hadir} (${KODE_HADIR[hadir]}); lembur tidak bisa dicatat`);
    const jenis = i.jenisHari ?? (hadir === 'RD' ? 'istirahat' : 'kerja');
    if (jenis !== 'kerja' && jenis !== 'istirahat') throw new GalatGaji('Jenis hari tidak dikenal');
    const jam = jamLembur(i.mulai, i.selesai, jenis);
    if (jam <= 0) throw new GalatGaji('Lembur kurang dari 1 jam penuh tidak dihitung');
    const bobot = jamBobot(jam, jenis, (await bacaPengaturanGaji(db)).hariKerjaSeminggu);
    const ket = i.keterangan?.trim().slice(0, 255) || null;
    await db.query(`INSERT INTO gaji_lembur (periode_id, karyawan_id, tanggal, mulai, selesai, jenis_hari, jam, jam_bobot, keterangan, opr)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        ON CONFLICT (periode_id, karyawan_id, tanggal) DO UPDATE SET mulai = EXCLUDED.mulai, selesai = EXCLUDED.selesai, jenis_hari = EXCLUDED.jenis_hari,
            jam = EXCLUDED.jam, jam_bobot = EXCLUDED.jam_bobot, keterangan = EXCLUDED.keterangan, opr = EXCLUDED.opr`,
    [p.id, i.karyawanId, i.tanggal, i.mulai, i.selesai, jenis, jam, bobot, ket, i.opr.slice(0, 50)]);
    return { pesan: `Lembur ${k.kode} ${i.tanggal}: ${jam} jam (${jenis === 'kerja' ? 'hari kerja' : 'hari istirahat'}), bobot ${bobot}`, jam, jamBobot: bobot };
}

export async function hapusLembur(db: Q, id: string | number): Promise<string> {
    const l = (await db.query<{ periode_id: string; kode: string; tanggal: string }>(
        'SELECT l.periode_id, k.kode, l.tanggal::text tanggal FROM gaji_lembur l JOIN karyawan k ON k.id = l.karyawan_id WHERE l.id = $1', [id])).rows[0];
    if (!l) throw new GalatGaji('Data lembur tidak ditemukan');
    await periodeDraf(db, l.periode_id);
    await db.query('DELETE FROM gaji_lembur WHERE id = $1', [id]);
    return `Lembur ${l.kode} ${l.tanggal} dihapus`;
}

export interface BarisLembur {
    id: string; karyawan_id: string; kode: string; nama: string; tanggal: string; mulai: string; selesai: string; jenis_hari: 'kerja' | 'istirahat';
    jam: number; jam_bobot: number; keterangan: string | null; opr: string; jml_upah: string;
}

export async function daftarLembur(db: Q, periodeId: string | number): Promise<BarisLembur[]> {
    return (await db.query<BarisLembur>(
        `SELECT l.id, l.karyawan_id, k.kode, k.nama, l.tanggal::text tanggal, to_char(l.mulai, 'HH24:MI') mulai, to_char(l.selesai, 'HH24:MI') selesai,
                l.jenis_hari, l.jam::float8 jam, l.jam_bobot::float8 jam_bobot, l.keterangan, l.opr, (k.umk + k.tunj_jabatan)::text jml_upah
           FROM gaji_lembur l JOIN karyawan k ON k.id = l.karyawan_id WHERE l.periode_id = $1 ORDER BY l.tanggal, k.kode`, [periodeId])).rows;
}
