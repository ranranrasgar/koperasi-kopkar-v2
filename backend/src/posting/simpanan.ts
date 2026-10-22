import type { Db } from '../db.ts';
import { postJournal } from './journal.ts';
import { fromUnits, toUnits } from './money.ts';

export interface SimpananInput {
    kodeAgt: string;
    jenisSimpanan: string; // '01'..'05'
    tanggal: string;       // YYYY-MM-DD
    jumlah: string | number;
    kasPerkiraanId: number | string; // akun kas/bank tempat uang masuk atau keluar
    opr: string;
    deskripsi?: string | null;
}

export interface SimpananResult {
    id: number;
    noBukti: string;
    saldoSetelah: string;
}

async function post(db: Db, tipe: 'setor' | 'ambil', i: SimpananInput): Promise<SimpananResult> {
    const jumlah = toUnits(i.jumlah);
    if (jumlah <= 0n) throw new Error('Jumlah harus lebih dari nol');

    // Kunci baris anggota supaya dua kasir tidak mengubah saldo anggota yang sama bersamaan.
    const a = await db.query<{ id: string; nama: string; nik: string }>(
        'SELECT id, nama, nik FROM anggota WHERE kode_agt = $1 FOR UPDATE', [i.kodeAgt]);
    if (!a.rows[0]) throw new Error(`Anggota ${i.kodeAgt} tidak ditemukan`);
    const js = await db.query<{ id: string; nama_simpanan: string; persen_laba: string; kode_perkiraan: string }>(
        `SELECT j.id, j.nama_simpanan, j.persen_laba, p.kode_perkiraan
           FROM jenis_simpanan j JOIN perkiraan p ON p.id = j.coa_id WHERE j.kode_simpanan = $1`, [i.jenisSimpanan]);
    if (!js.rows[0]) throw new Error(`Jenis simpanan ${i.jenisSimpanan} tidak ada`);
    const kas = await db.query<{ kode_perkiraan: string }>('SELECT kode_perkiraan FROM perkiraan WHERE id = $1', [i.kasPerkiraanId]);
    if (!kas.rows[0]) throw new Error(`Akun kas ${i.kasPerkiraanId} tidak ada`);

    const saldoNow = toUnits((await db.query<{ s: string }>(
        'SELECT COALESCE(SUM(rp_setoran - rp_pengambilan), 0) s FROM simpanan WHERE anggota_id = $1 AND jenis_simpanan_id = $2',
        [a.rows[0].id, js.rows[0].id])).rows[0].s);
    if (tipe === 'ambil' && saldoNow < jumlah)
        throw new Error(`Saldo ${js.rows[0].nama_simpanan} ${fromUnits(saldoNow)} kurang dari pengambilan ${fromUnits(jumlah)}`);
    const saldoBaru = tipe === 'setor' ? saldoNow + jumlah : saldoNow - jumlah;

    const urut = Number((await db.query("SELECT nextval('seq_simpanan_urut') v")).rows[0].v);
    const noBukti = `${tipe === 'setor' ? 'SMPM' : 'SMPK'}-${i.tanggal.slice(2, 4)}${i.tanggal.slice(5, 7)}-${urut}`;
    const ins = await db.query<{ id: string }>(
        `INSERT INTO simpanan (urut, no_bukti, jenis_simpanan, kode_agt, tgl_transaksi, jam_transaksi, deskripsi, persen_laba,
            rp_setoran, rp_pengambilan, rp_saldo, opr, anggota_id, jenis_simpanan_id, kas_perkiraan_id)
         VALUES ($1,$2,$3,$4,$5,LOCALTIME(0),$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING id`,
        [urut, noBukti, i.jenisSimpanan, i.kodeAgt, i.tanggal, i.deskripsi ?? null, js.rows[0].persen_laba,
         tipe === 'setor' ? fromUnits(jumlah) : '0', tipe === 'ambil' ? fromUnits(jumlah) : '0', fromUnits(saldoBaru),
         i.opr, a.rows[0].id, js.rows[0].id, i.kasPerkiraanId]);

    const ket = `${tipe === 'setor' ? 'Setoran' : 'Pengambilan'} ${js.rows[0].nama_simpanan} a/n: ${a.rows[0].nama}/${a.rows[0].nik}`;
    const akunKas = kas.rows[0].kode_perkiraan, akunSimpanan = js.rows[0].kode_perkiraan;
    await postJournal(db, {
        nomorBukti: noBukti, tanggal: i.tanggal, deskripsi: ket, opr: i.opr,
        sumberTipe: 'simpanan', sumberId: ins.rows[0].id,
        lines: tipe === 'setor'
            ? [{ kodePerkiraan: akunKas, debit: fromUnits(jumlah) }, { kodePerkiraan: akunSimpanan, kredit: fromUnits(jumlah) }]
            : [{ kodePerkiraan: akunSimpanan, debit: fromUnits(jumlah) }, { kodePerkiraan: akunKas, kredit: fromUnits(jumlah) }],
    });
    return { id: Number(ins.rows[0].id), noBukti, saldoSetelah: fromUnits(saldoBaru) };
}

export const setorSimpanan = (db: Db, i: SimpananInput) => post(db, 'setor', i);
export const ambilSimpanan = (db: Db, i: SimpananInput) => post(db, 'ambil', i);
