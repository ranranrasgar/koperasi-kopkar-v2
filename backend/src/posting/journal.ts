import type { Db } from '../db.js';
import { fromUnits, toUnits } from './money.js';

export interface JournalLine {
    kodePerkiraan: string;
    debit?: string | number;
    kredit?: string | number;
}

export interface JournalInput {
    nomorBukti: string;
    tanggal: string; // YYYY-MM-DD
    deskripsi: string;
    opr: string;
    sumberTipe: string;
    sumberId: number | string;
    lines: JournalLine[];
}

const yymmdd = (d: string) => d.slice(2, 4) + d.slice(5, 7) + d.slice(8, 10);

/**
 * Posting ke jurnal_umum. Meniru PostKeJurnalUmum desktop (baris bernilai nol dilewati,
 * hapus lalu isi ulang per nomor_bukti) dan menambah pemeriksaan yang tidak ada di desktop:
 * total debit harus sama dengan total kredit.
 */
export async function postJournal(db: Db, j: JournalInput): Promise<number> {
    const lines = j.lines.filter((l) => toUnits(l.debit ?? 0) !== 0n || toUnits(l.kredit ?? 0) !== 0n);
    const d = lines.reduce((s, l) => s + toUnits(l.debit ?? 0), 0n);
    const k = lines.reduce((s, l) => s + toUnits(l.kredit ?? 0), 0n);
    if (lines.length === 0) throw new Error(`Jurnal ${j.nomorBukti} kosong`);
    if (d !== k) throw new Error(`Jurnal ${j.nomorBukti} tidak seimbang: debit ${fromUnits(d)} kredit ${fromUnits(k)}`);

    const kodes = [...new Set(lines.map((l) => l.kodePerkiraan))];
    const acc = await db.query<{ id: string; kode_perkiraan: string }>(
        'SELECT id, kode_perkiraan FROM perkiraan WHERE kode_perkiraan = ANY($1)', [kodes]);
    const idOf = new Map(acc.rows.map((r) => [r.kode_perkiraan, r.id]));
    for (const c of kodes) if (!idOf.has(c)) throw new Error(`Akun ${c} tidak ada di perkiraan`);

    await db.query('DELETE FROM jurnal_umum WHERE nomor_bukti = $1', [j.nomorBukti]);
    const urut = Number((await db.query("SELECT nextval('seq_jurnal_urut') v")).rows[0].v);
    for (const l of lines) {
        const urutan = Number((await db.query("SELECT nextval('seq_jurnal_urutan') v")).rows[0].v);
        await db.query(
            `INSERT INTO jurnal_umum (urutan, tanggal_jurnalumum, nomor_bukti, no_bukti_transaksi, tahun, kode_perkiraan,
                urut, debit_jurnalumum, kredit_jurnalumum, deskripsi, opr, sumber_tipe, sumber_id, perkiraan_id, tgl_transaksi)
             VALUES ($1,$2,$3,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$2)`,
            [urutan, j.tanggal, j.nomorBukti, yymmdd(j.tanggal), l.kodePerkiraan, urut,
             fromUnits(toUnits(l.debit ?? 0)), fromUnits(toUnits(l.kredit ?? 0)), j.deskripsi, j.opr,
             j.sumberTipe, j.sumberId, idOf.get(l.kodePerkiraan)]);
    }
    return lines.length;
}
