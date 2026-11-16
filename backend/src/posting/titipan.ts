import type { Db } from '../db.ts';
import { fromUnits, toUnits } from './money.ts';
import { sqlMasihDitagih } from '../pinjaman-sisa.ts';

// Titipan angsuran pinjaman tunai (pengganti form desktop "Setoran Titipan Angsuran", tabel pinjaman_tunai_titipan):
// anggota menitipkan uang sedikit demi sedikit untuk angsuran berikutnya. Titipan hanya catatan, TIDAK membuat jurnal;
// uangnya baru dibukukan saat angsuran diposting (bayarAngsuran), dan pada transaksi yang sama titipan ditandai POSTING.

export const STATUS_POSTING = 'POSTING';

export interface TitipanInput { noPinjaman: string; tanggal: string; jumlah: string }

/** Tambah satu baris titipan untuk pinjaman yang masih berjalan. Jalankan di dalam transaksi. */
export async function tambahTitipan(db: Db, i: TitipanInput): Promise<{ id: number }> {
    const p = (await db.query<{ id: string; lunas: boolean }>(
        `SELECT p.id, NOT ${sqlMasihDitagih('p')} lunas FROM pinjaman_tunai p WHERE p.no_pinjaman = $1 FOR UPDATE`, [i.noPinjaman])).rows[0];
    if (!p) throw new Error(`Pinjaman ${i.noPinjaman} tidak ditemukan`);
    if (p.lunas) throw new Error(`Pinjaman ${i.noPinjaman} sudah lunas`);
    const jumlah = toUnits(i.jumlah);
    if (jumlah <= 0n) throw new Error('Jumlah titipan harus lebih dari 0');
    const r = await db.query<{ id: string }>(
        `INSERT INTO pinjaman_tunai_titipan (no_pinjaman, urut, tanggal, rp_jumlah, status, pinjaman_tunai_id)
         VALUES ($1, nextval('seq_pinjaman_titipan_urut'), $2, $3, '', $4) RETURNING id`, [i.noPinjaman, i.tanggal, fromUnits(jumlah), p.id]);
    return { id: Number(r.rows[0].id) };
}

/** Hapus titipan yang belum diposting. Jalankan di dalam transaksi. */
export async function hapusTitipan(db: Db, id: number): Promise<void> {
    const r = await db.query('DELETE FROM pinjaman_tunai_titipan WHERE id = $1 AND status <> $2', [id, STATUS_POSTING]);
    if (r.rowCount === 0) throw new Error('Titipan tidak ada atau sudah diposting');
}

/** Tandai semua titipan pinjaman ini yang belum diposting menjadi POSTING; dipanggil di transaksi yang sama dengan posting angsuran. */
export async function postingTitipan(db: Db, noPinjaman: string): Promise<{ jumlah: number; total: string }> {
    const r = await db.query<{ n: string; total: string }>(
        `WITH u AS (UPDATE pinjaman_tunai_titipan SET status = $2 WHERE no_pinjaman = $1 AND status <> $2 RETURNING rp_jumlah)
         SELECT count(*) n, COALESCE(sum(rp_jumlah), 0)::text total FROM u`, [noPinjaman, STATUS_POSTING]);
    return { jumlah: Number(r.rows[0].n), total: r.rows[0].total };
}
