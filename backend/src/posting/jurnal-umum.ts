import type { Db } from '../db.ts';
import { postJournal, type JournalLine } from './journal.ts';

export interface JurnalUmumInput {
    tanggal: string; // YYYY-MM-DD
    deskripsi: string;
    opr: string;
    lines: JournalLine[]; // deskripsi per baris boleh diisi, seperti jurnal memorial desktop
}

const yymmdd = (d: string) => d.slice(2, 4) + d.slice(5, 7) + d.slice(8, 10);

/**
 * Jurnal umum (memorial) yang diinput kasir. Nomor JU/yymmdd/n diambil dari seq_jurnal_umum_no; sequence
 * dimulai di atas nomor JU tertinggi dari desktop sehingga tidak pernah sama dengan nomor lama
 * (postJournal menghapus baris dengan nomor yang sama sebelum mengisi ulang).
 */
export async function postJurnalUmum(db: Db, i: JurnalUmumInput): Promise<{ nomorBukti: string; baris: number }> {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(i.tanggal)) throw new Error('Tanggal jurnal tidak valid');
    if (!i.deskripsi.trim()) throw new Error('Keterangan jurnal wajib diisi');
    const n = Number((await db.query("SELECT nextval('seq_jurnal_umum_no') v")).rows[0].v);
    const nomorBukti = `JU/${yymmdd(i.tanggal)}/${n}`;
    const ada = await db.query('SELECT 1 FROM jurnal_umum WHERE nomor_bukti = $1 LIMIT 1', [nomorBukti]);
    if (ada.rows[0]) throw new Error(`Nomor jurnal ${nomorBukti} sudah dipakai`);
    const baris = await postJournal(db, {
        nomorBukti, tanggal: i.tanggal, deskripsi: i.deskripsi.trim(), opr: i.opr,
        sumberTipe: 'jurnal', sumberId: null, tahunPrefix: 'JU', lines: i.lines,
    });
    return { nomorBukti, baris };
}
