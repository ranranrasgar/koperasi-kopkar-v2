import type { Db } from '../db.ts';
import { postJournal } from './journal.ts';
import { fromUnits, toUnits } from './money.ts';

// Koreksi transaksi yang sudah diposting. Baris lama tidak diubah atau dihapus: pembatalan membuat transaksi pembalik bertanggal
// hari pembatalan, sehingga saldo dan Buku Besar periode lama tetap utuh, dan setiap koreksi tercatat di transaksi_koreksi.

export interface BatalInput {
    noBukti: string;
    tanggal: string; // YYYY-MM-DD, tanggal transaksi pembalik
    alasan: string;
    opr: string;
    operatorId?: number;
}

export const MIN_ALASAN = 10;

/**
 * Batalkan satu transaksi simpanan. Setoran dibalik menjadi pengambilan dan sebaliknya; jurnal asalnya dibalik baris per baris, jadi akun
 * kasnya sama dengan transaksi asal. Bukti tanpa jurnal dibalik di buku simpanan saja. Jalankan di dalam transaksi.
 */
export async function batalSimpanan(db: Db, i: BatalInput): Promise<{ noBukti: string; saldoSetelah: string }> {
    const alasan = i.alasan.trim().replace(/\s+/g, ' ');
    if (alasan.length < MIN_ALASAN) throw new Error(`Alasan wajib diisi, minimal ${MIN_ALASAN} karakter`);
    if (alasan.length > 255) throw new Error('Alasan maksimal 255 karakter');

    // Kunci baris anggota supaya saldonya tidak berubah bersamaan, sama dengan setoran dan pengambilan.
    const s = (await db.query(
        `SELECT s.*, a.nama, a.nik FROM simpanan s JOIN anggota a ON a.id = s.anggota_id WHERE s.no_bukti = $1 FOR UPDATE OF s, a`, [i.noBukti])).rows[0];
    if (!s) throw new Error(`Bukti ${i.noBukti} tidak ditemukan`);
    if (i.noBukti.startsWith('SHU/')) throw new Error('Bukti SHU tidak bisa dibatalkan di sini; koreksi lewat menu SHU atau jurnal');
    const ada = (await db.query<{ no_bukti: string }>(
        "SELECT no_bukti FROM transaksi_koreksi WHERE jenis = 'simpanan' AND (no_bukti = $1 OR no_bukti_pembalik = $1)", [i.noBukti])).rows[0];
    if (ada) throw new Error(ada.no_bukti === i.noBukti ? `Bukti ${i.noBukti} sudah dibatalkan` : `Bukti ${i.noBukti} adalah pembalik dari ${ada.no_bukti}; tidak bisa dibatalkan`);
    const potongan = (await db.query<{ periode: string }>(
        `SELECT p.periode FROM potongan_gaji_anggota g JOIN potongan_gaji p ON p.id = g.potongan_gaji_id
          WHERE $1 IN (g.bukti_pokok, g.bukti_wajib, g.bukti_sukarela) LIMIT 1`, [i.noBukti])).rows[0];
    if (potongan) throw new Error(`Bukti ${i.noBukti} berasal dari Potongan Gaji periode ${potongan.periode}, jadi tidak bisa dibatalkan satu per satu`);

    const setor = toUnits(s.rp_setoran), ambil = toUnits(s.rp_pengambilan);
    if (setor === ambil) throw new Error(`Bukti ${i.noBukti} tidak bernilai`);
    const saldoNow = toUnits((await db.query<{ s: string }>(
        'SELECT COALESCE(SUM(rp_setoran - rp_pengambilan), 0) s FROM simpanan WHERE anggota_id = $1 AND jenis_simpanan_id = $2',
        [s.anggota_id, s.jenis_simpanan_id])).rows[0].s);
    const saldoBaru = saldoNow - setor + ambil;
    if (saldoBaru < 0n) throw new Error(`Saldo tersisa ${fromUnits(saldoNow)} tidak cukup untuk membatalkan setoran ${fromUnits(setor)}`);

    const urut = Number((await db.query("SELECT nextval('seq_simpanan_urut') v")).rows[0].v);
    const noBukti = `BTL-${i.tanggal.slice(2, 4)}${i.tanggal.slice(5, 7)}-${urut}`;
    const ket = `Batal ${i.noBukti}: ${alasan}`.slice(0, 100);
    const ins = await db.query<{ id: string }>(
        `INSERT INTO simpanan (urut, no_bukti, jenis_simpanan, kode_agt, tgl_transaksi, jam_transaksi, deskripsi, persen_laba,
            rp_setoran, rp_pengambilan, rp_saldo, opr, anggota_id, jenis_simpanan_id, kas_perkiraan_id)
         VALUES ($1,$2,$3,$4,$5,LOCALTIME(0),$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING id`,
        [urut, noBukti, s.jenis_simpanan, s.kode_agt, i.tanggal, ket, s.persen_laba, fromUnits(ambil), fromUnits(setor), fromUnits(saldoBaru),
         i.opr, s.anggota_id, s.jenis_simpanan_id, s.kas_perkiraan_id]);

    const jurnal = (await db.query<{ kode_perkiraan: string; debit_jurnalumum: string; kredit_jurnalumum: string }>(
        'SELECT kode_perkiraan, debit_jurnalumum, kredit_jurnalumum FROM jurnal_umum WHERE nomor_bukti = $1 ORDER BY urutan', [i.noBukti])).rows;
    if (jurnal.length > 0) await postJournal(db, {
        nomorBukti: noBukti, tanggal: i.tanggal, deskripsi: `${ket} a/n: ${s.nama}/${s.nik}`.slice(0, 200), opr: i.opr, sumberTipe: 'simpanan', sumberId: ins.rows[0].id,
        lines: jurnal.map((j) => ({ kodePerkiraan: j.kode_perkiraan, debit: j.kredit_jurnalumum, kredit: j.debit_jurnalumum })),
    });

    await db.query(
        `INSERT INTO transaksi_koreksi (jenis, sumber_id, no_bukti, aksi, alasan, no_bukti_pembalik, opr, operator_id, data_lama, data_baru)
         VALUES ('simpanan', $1, $2, 'batal', $3, $4, $5, $6, $7, $8)`,
        [s.id, i.noBukti, alasan, noBukti, i.opr, i.operatorId ?? null,
         JSON.stringify({ tgl_transaksi: s.tgl_transaksi, kode_agt: s.kode_agt, jenis_simpanan: s.jenis_simpanan, rp_setoran: s.rp_setoran, rp_pengambilan: s.rp_pengambilan, deskripsi: s.deskripsi, opr: s.opr, jurnal }),
         JSON.stringify({ no_bukti: noBukti, tanggal: i.tanggal, berjurnal: jurnal.length > 0, saldo_setelah: fromUnits(saldoBaru) })]);
    return { noBukti, saldoSetelah: fromUnits(saldoBaru) };
}
