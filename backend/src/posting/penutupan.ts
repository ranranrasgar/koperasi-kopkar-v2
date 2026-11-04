import type { Db } from '../db.ts';

/**
 * Tutup pinjaman tunai sebagai lunas tanpa uang masuk: untuk pinjaman yang sudah selesai di luar koperasi (dilunasi langsung ke bank, top-up,
 * data migrasi). Hanya penghitung cicilan yang berubah, sama seperti penutupan top-up di desktop, jadi semua layar (Daftar Pinjaman, Kredit Macet,
 * Generate Potongan, aplikasi anggota) langsung menganggapnya lunas. TIDAK membuat jurnal dan TIDAK mengubah buku pinjaman, jadi neraca tetap.
 * Nilai sebelumnya disimpan di pinjaman_penutupan supaya bisa dibatalkan. Jalankan di dalam transaksi.
 */
export interface InputTutup { noPinjaman: string; alasan: string; opr: string; operatorId?: number }

const SISA_LUNAS = 100;

export async function tutupPinjaman(db: Db, i: InputTutup) {
    const alasan = i.alasan.trim();
    if (alasan.length < 5) throw new Error('Alasan wajib diisi, minimal 5 karakter');
    if (alasan.length > 255) throw new Error('Alasan maksimal 255 karakter');
    const p = (await db.query<{ id: string; jml_cicilan: number; lama_angsuran: number; sisa_cicilan: number | null }>(
        'SELECT id, jml_cicilan, lama_angsuran, sisa_cicilan FROM pinjaman_tunai WHERE no_pinjaman = $1 FOR UPDATE', [i.noPinjaman])).rows[0];
    if (!p) throw new Error(`Pinjaman ${i.noPinjaman} tidak ditemukan`);
    const sisa = (await db.query<{ s: string }>(
        'SELECT COALESCE(SUM(kredit_pokok - debit_pokok), 0)::text s FROM pinjaman_tunai_rincian WHERE pinjaman_tunai_id = $1', [p.id])).rows[0].s;
    if (p.jml_cicilan >= p.lama_angsuran || Number(sisa) <= SISA_LUNAS) throw new Error(`Pinjaman ${i.noPinjaman} sudah lunas`);

    // Potongan bulan berjalan yang belum diposting masih memuat angsuran pinjaman ini.
    const belum = (await db.query<{ periode: string; status: string }>(
        `SELECT g.periode, g.status FROM potongan_gaji_pinjaman x JOIN potongan_gaji g ON g.id = x.potongan_gaji_id
          WHERE x.pinjaman_id = $1 AND x.jenis <> 'kpr' AND g.status <> 'diposting' AND COALESCE(x.no_bukti, '') = ''`, [p.id])).rows;
    const terkunci = belum.find((b) => b.status !== 'draf');
    if (terkunci) throw new Error(`Pinjaman ini ada di Potongan Gaji ${terkunci.periode} yang sedang diposting. Selesaikan periode itu dulu.`);

    await db.query(
        `INSERT INTO pinjaman_penutupan (pinjaman_tunai_id, no_pinjaman, cicilan_sebelum, sisa_cicilan_sebelum, sisa_buku, alasan, oleh, operator_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`, [p.id, i.noPinjaman, p.jml_cicilan, p.sisa_cicilan, sisa, alasan, i.opr.slice(0, 30), i.operatorId ?? null]);
    await db.query('UPDATE pinjaman_tunai SET jml_cicilan = lama_angsuran, sisa_cicilan = 0 WHERE id = $1', [p.id]);
    return { sisaBuku: sisa, drafPotongan: belum.map((b) => b.periode) };
}

/** Batalkan penutupan: penghitung cicilan kembali ke nilai sebelum ditutup. */
export async function batalTutupPinjaman(db: Db, i: { noPinjaman: string; opr: string }) {
    const t = (await db.query<{ id: string; pinjaman_tunai_id: string; cicilan_sebelum: number; sisa_cicilan_sebelum: number | null }>(
        `SELECT id, pinjaman_tunai_id, cicilan_sebelum, sisa_cicilan_sebelum FROM pinjaman_penutupan
          WHERE no_pinjaman = $1 AND dibatalkan_pada IS NULL FOR UPDATE`, [i.noPinjaman])).rows[0];
    if (!t) throw new Error(`Pinjaman ${i.noPinjaman} tidak sedang ditutup`);
    await db.query('UPDATE pinjaman_tunai SET jml_cicilan = $2, sisa_cicilan = $3 WHERE id = $1', [t.pinjaman_tunai_id, t.cicilan_sebelum, t.sisa_cicilan_sebelum]);
    await db.query('UPDATE pinjaman_penutupan SET dibatalkan_pada = now(), dibatalkan_oleh = $2 WHERE id = $1', [t.id, i.opr.slice(0, 30)]);
}
