import { bacaQr } from './anggota/qr.ts';
import type { Db } from './db.ts';

// Absensi staff: satu baris per anggota per hari. Pindai pertama hari itu = masuk, pindai berikutnya = pulang; setelah itu pindai hanya memberi tahu.
type Pemanggil = Pick<Db, 'query'>;

const JEDA_DETIK = 300; // pindai ulang dalam 5 menit dianggap tidak sengaja, supaya masuk tidak langsung tercatat pulang
const JKT = "AT TIME ZONE 'Asia/Jakarta'";
const JAM = /^([01]\d|2[0-3]):[0-5]\d$/;

export class GalatAbsen extends Error {}
export type HasilAbsen = { ok: true; kode_agt: string; nik: string | null; nama: string; pesan: string; sudah: boolean } | { ok: false; error: string };

/** Catat absensi dari hasil pindai QR saya. Hanya anggota aktif berstatus Staff. `sudah` berarti tidak ada yang berubah. */
export async function absenQr(db: Pemanggil, teks: string): Promise<HasilAbsen> {
    const q = await bacaQr(db, teks);
    if (!q) return { ok: false, error: 'QR tidak dikenal atau sudah kedaluwarsa. Minta anggota membuat QR baru.' };
    if (!q.aktif) return { ok: false, error: `${q.nama} tidak aktif` };
    const a = (await db.query<{ id: string; staff: boolean }>(
        `SELECT id, lower(trim(status_staff)) = 'staff' AS staff FROM anggota WHERE kode_agt = $1`, [q.kode_agt])).rows[0];
    if (!a?.staff) return { ok: false, error: `${q.nama} bukan staff, absensi hanya untuk staff` };

    const hasil = (pesan: string, sudah = false) => ({ ok: true as const, kode_agt: q.kode_agt, nik: q.nik, nama: q.nama, pesan, sudah });
    const hari = `(now() ${JKT})::date`;
    const masuk = await db.query<{ pukul: string }>(
        `INSERT INTO absensi_staff (anggota_id, tanggal, masuk) VALUES ($1, ${hari}, now()) ON CONFLICT (anggota_id, tanggal) DO NOTHING
         RETURNING to_char(masuk ${JKT}, 'HH24:MI') AS pukul`, [a.id]);
    if (masuk.rowCount) return hasil(`${q.nama}: masuk pukul ${masuk.rows[0].pukul}`);
    const pulang = await db.query<{ pukul: string }>(
        `UPDATE absensi_staff SET pulang = now() WHERE anggota_id = $1 AND tanggal = ${hari}
            AND pulang IS NULL AND masuk <= now() - make_interval(secs => $2)
         RETURNING to_char(pulang ${JKT}, 'HH24:MI') AS pukul`, [a.id, JEDA_DETIK]);
    if (pulang.rowCount) return hasil(`${q.nama}: pulang pukul ${pulang.rows[0].pukul}`);
    const r = (await db.query<{ masuk: string; pulang: string | null }>(
        `SELECT to_char(masuk ${JKT}, 'HH24:MI') AS masuk, to_char(pulang ${JKT}, 'HH24:MI') AS pulang
           FROM absensi_staff WHERE anggota_id = $1 AND tanggal = ${hari}`, [a.id])).rows[0];
    return hasil(`${q.nama} sudah absen hari ini: masuk ${r.masuk}, pulang ${r.pulang ?? 'belum'}`, true);
}

/** Koreksi jam masuk dan pulang (zona Asia/Jakarta). pulang kosong berarti belum pulang. */
export async function ubahAbsen(db: Pemanggil, id: number, masuk: string, pulang: string) {
    if (!JAM.test(masuk)) throw new GalatAbsen('Jam masuk tidak valid');
    if (pulang && !JAM.test(pulang)) throw new GalatAbsen('Jam pulang tidak valid');
    if (pulang && pulang < masuk) throw new GalatAbsen('Jam pulang tidak boleh sebelum jam masuk');
    const r = await db.query<{ nama: string; tanggal: string }>(
        `UPDATE absensi_staff s SET masuk = (s.tanggal + $2::time) ${JKT}, pulang = (s.tanggal + $3::time) ${JKT}
           FROM anggota a WHERE a.id = s.anggota_id AND s.id = $1
         RETURNING a.nama, to_char(s.tanggal, 'YYYY-MM-DD') AS tanggal`, [id, masuk, pulang || null]);
    if (!r.rowCount) throw new GalatAbsen('Data absensi tidak ditemukan');
    return `Absensi ${r.rows[0].nama} ${r.rows[0].tanggal} diubah: masuk ${masuk}, pulang ${pulang || 'belum'}`;
}

export async function hapusAbsen(db: Pemanggil, id: number) {
    const r = await db.query<{ nama: string; tanggal: string }>(
        `DELETE FROM absensi_staff s USING anggota a WHERE a.id = s.anggota_id AND s.id = $1
         RETURNING a.nama, to_char(s.tanggal, 'YYYY-MM-DD') AS tanggal`, [id]);
    if (!r.rowCount) throw new GalatAbsen('Data absensi tidak ditemukan');
    return `Absensi ${r.rows[0].nama} ${r.rows[0].tanggal} dihapus`;
}
