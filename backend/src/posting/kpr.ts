import type { Db } from '../db.js';
import { postJournal } from './journal.js';
import { fromUnits, toUnits } from './money.js';

// KPR dipotong dari gaji dan diteruskan ke bank: akun kredit adalah TITIPAN (kewajiban),
// tanpa bunga. Pencairan hanya mencatat rincian (tidak ada jurnal); angsuran = debit kas, kredit titipan.

const mmyy = (d: string) => d.slice(5, 7) + d.slice(2, 4);

export interface KprPencairanInput {
    kodeAgt: string;
    kodeKredit: string;        // mis. 'C10' (BTN Bekasi), 'C29' (BRI 2018)
    tglPinjaman: string;
    pokok: string | number;
    lama: number;
    angsuranPerBulan?: string | number; // bawaan: pokok / lama dibulatkan ke rupiah
    jatuhTempoHari?: number;
    kasPerkiraanId: number | string;
    opr: string;
}

async function jenis(db: Db, by: { kode?: string; id?: string }) {
    const r = await db.query<{ id: string; nama_kredit: string; jatuh_tempo: number; mak_cicilan: number; akun_titipan: string | null }>(
        `SELECT jk.id, jk.nama_kredit, jk.jatuh_tempo, jk.mak_cicilan, p.kode_perkiraan akun_titipan
           FROM jenis_kredit jk LEFT JOIN perkiraan p ON p.id = jk.coa_kredit_id
          WHERE ${by.kode ? 'jk.kode_kredit = $1' : 'jk.id = $1'}`, [by.kode ?? by.id]);
    if (!r.rows[0]) throw new Error(`Jenis kredit ${by.kode ?? by.id} tidak ada`);
    if (!r.rows[0].akun_titipan) throw new Error(`Jenis kredit ${r.rows[0].nama_kredit} belum punya akun titipan`);
    return r.rows[0];
}

export async function cairkanKpr(db: Db, i: KprPencairanInput): Promise<{ id: number; noPinjaman: string; angsuranPerBulan: string }> {
    const a = await db.query<{ id: string }>('SELECT id FROM anggota WHERE kode_agt = $1 FOR UPDATE', [i.kodeAgt]);
    if (!a.rows[0]) throw new Error(`Anggota ${i.kodeAgt} tidak ditemukan`);
    const jk = await jenis(db, { kode: i.kodeKredit });
    if (!Number.isInteger(i.lama) || i.lama < 1) throw new Error('Lama angsuran harus bilangan bulat >= 1');
    if (jk.mak_cicilan > 0 && i.lama > jk.mak_cicilan) throw new Error(`Lama ${i.lama} melebihi maksimum ${jk.mak_cicilan} untuk ${jk.nama_kredit}`);
    const pokok = toUnits(i.pokok);
    if (pokok <= 0n) throw new Error('Pokok harus lebih dari nol');
    const n = BigInt(i.lama);
    const angsuran = i.angsuranPerBulan !== undefined ? toUnits(i.angsuranPerBulan) : ((pokok * 2n + n * 10000n) / (n * 20000n)) * 10000n;

    const urut = Number((await db.query("SELECT nextval('seq_kpr_no') v")).rows[0].v);
    const noPinjaman = `KPR-${mmyy(i.tglPinjaman)}-${urut}`;
    const h = await db.query<{ id: string }>(
        `INSERT INTO kpr (kode_agt, kode_kredit, no_pinjaman, no_pinjaman_urut, tgl_pinjaman, jatuh_tempo, rp_pinjaman_pokok, lama_angsuran,
            jml_cicilan, rp_angsuran_per_bulan, anggota_id, jenis_kredit_id, kas_perkiraan_id)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,0,$9,$10,$11,$12) RETURNING id`,
        [i.kodeAgt, i.kodeKredit, noPinjaman, urut, i.tglPinjaman, i.jatuhTempoHari ?? jk.jatuh_tempo, fromUnits(pokok), i.lama,
         fromUnits(angsuran), a.rows[0].id, jk.id, i.kasPerkiraanId]);
    const urutR = Number((await db.query("SELECT nextval('seq_kpr_rincian_urut') v")).rows[0].v);
    await db.query(
        `INSERT INTO kpr_rincian (no_bukti, urut, no_pinjaman, deskripsi, kredit_pokok, saldo_pokok, angsuran_ke, tanggal_angsuran, kpr_id)
         VALUES ('',$1,$2,'PENCAIRAN PINJAMAN',$3,$3,0,$4,$5)`, [urutR, noPinjaman, fromUnits(pokok), i.tglPinjaman, h.rows[0].id]);
    return { id: Number(h.rows[0].id), noPinjaman, angsuranPerBulan: fromUnits(angsuran) };
}

export interface KprAngsuranInput {
    noPinjaman: string;
    tanggal: string;
    kasPerkiraanId: number | string;
    opr: string;
    /** Bawaan: rp_angsuran_per_bulan, dibatasi sisa pokok. Isi bila anggota membayar jumlah lain. */
    jumlah?: string | number;
}

export interface KprAngsuranResult { noBukti: string; ke: number; jumlah: string; sisaPokok: string; lunas: boolean }

export async function bayarAngsuranKpr(db: Db, i: KprAngsuranInput): Promise<KprAngsuranResult> {
    const k = (await db.query(`SELECT k.*, a.nama FROM kpr k JOIN anggota a ON a.id = k.anggota_id WHERE k.no_pinjaman = $1 FOR UPDATE OF k`, [i.noPinjaman])).rows[0];
    if (!k) throw new Error(`KPR ${i.noPinjaman} tidak ditemukan`);
    const kas = await db.query<{ kode_perkiraan: string }>('SELECT kode_perkiraan FROM perkiraan WHERE id = $1', [i.kasPerkiraanId]);
    if (!kas.rows[0]) throw new Error(`Akun kas ${i.kasPerkiraanId} tidak ada`);
    const jk = await jenis(db, { id: k.jenis_kredit_id });

    const sisa = toUnits((await db.query<{ s: string }>(
        'SELECT COALESCE(SUM(kredit_pokok - debit_pokok), 0) s FROM kpr_rincian WHERE kpr_id = $1', [k.id])).rows[0].s);
    if (sisa <= 0n) throw new Error(`KPR ${i.noPinjaman} sudah lunas`);
    let jumlah = i.jumlah !== undefined ? toUnits(i.jumlah) : toUnits(k.rp_angsuran_per_bulan);
    if (jumlah <= 0n) throw new Error('Jumlah angsuran harus lebih dari nol');
    const ke = k.jml_cicilan + 1;
    if (jumlah > sisa && i.jumlah !== undefined) throw new Error(`Jumlah ${fromUnits(jumlah)} melebihi sisa pokok ${fromUnits(sisa)}`);
    // Angsuran terakhir (ke-lama) atau yang melebihi sisa mengambil sisa persis, supaya saldo pas nol.
    if (i.jumlah === undefined && (jumlah > sisa || ke >= k.lama_angsuran)) jumlah = sisa;
    const sisaBaru = sisa - jumlah;

    const urut = Number((await db.query("SELECT nextval('seq_kpr_rincian_urut') v")).rows[0].v);
    const noBukti = `ANGS-KPR-${mmyy(i.tanggal)}-${urut}`;
    await db.query(
        `INSERT INTO kpr_rincian (no_bukti, urut, no_pinjaman, deskripsi, debit_pokok, saldo_pokok, angsuran_ke, tanggal_angsuran, kas_perkiraan_id, kpr_id)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
        [noBukti, urut, i.noPinjaman, `Setoran ke ${ke}`, fromUnits(jumlah), fromUnits(sisaBaru), ke, i.tanggal, i.kasPerkiraanId, k.id]);
    await db.query('UPDATE kpr SET jml_cicilan = $1, tgl_akhir_bayar = $2 WHERE id = $3', [ke, i.tanggal, k.id]);

    await postJournal(db, {
        nomorBukti: noBukti, tanggal: i.tanggal, opr: i.opr, sumberTipe: 'kpr_rincian', sumberId: k.id,
        deskripsi: `Setoran ${jk.nama_kredit} a/n: ${k.nama}`,
        lines: [{ kodePerkiraan: kas.rows[0].kode_perkiraan, debit: fromUnits(jumlah) }, { kodePerkiraan: jk.akun_titipan!, kredit: fromUnits(jumlah) }],
    });
    return { noBukti, ke, jumlah: fromUnits(jumlah), sisaPokok: fromUnits(sisaBaru), lunas: sisaBaru === 0n };
}
