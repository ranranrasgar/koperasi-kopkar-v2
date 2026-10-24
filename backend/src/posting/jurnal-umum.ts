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

export interface BarisBukti { kodePerkiraan: string; namaPerkiraan: string; deskripsi: string; debit: string; kredit: string }
export interface BuktiJurnal {
    nomorBukti: string; tanggal: string; deskripsi: string; opr: string; baris: BarisBukti[];
    /** Alasan bukti tidak boleh diubah/dihapus lewat web, atau null bila boleh. */
    terkunci: string | null;
}

/**
 * Bukti yang boleh diubah atau dihapus dari web: jurnal umum (JU/) dan bukti Bank Book (BB/) yang belum direkonsiliasi.
 * Bukti buatan transaksi lain (simpanan, pinjaman, SHU, tutup buku) tidak boleh, supaya buku pembantunya tidak tidak sinkron.
 */
export function alasanTerkunci(nomorBukti: string, rekonsiliasi: boolean): string | null {
    if (!/^(JU|BB)\//.test(nomorBukti)) return 'Bukti ini dibuat oleh transaksi lain; ubah atau hapus dari asal transaksinya.';
    if (rekonsiliasi) return 'Sudah direkonsiliasi.';
    return null;
}

/** Baca satu bukti lengkap (untuk voucher dan form ubah); null bila tidak ada. */
export async function bacaJurnalUmum(db: Pick<Db, 'query'>, nomorBukti: string): Promise<BuktiJurnal | null> {
    const r = await db.query<{ kode_perkiraan: string; nama_perkiraan: string | null; deskripsi: string | null; d: string; k: string;
        tanggal: string; opr: string | null; rekon: boolean }>(
        `SELECT j.kode_perkiraan, p.nama_perkiraan, j.deskripsi, j.debit_jurnalumum d, j.kredit_jurnalumum k, j.tanggal_jurnalumum::text tanggal, j.opr,
                (j.status = 'Reconcile' OR j.tgl_rekonsiliasi IS NOT NULL) rekon
           FROM jurnal_umum j LEFT JOIN perkiraan p ON p.kode_perkiraan = j.kode_perkiraan
          WHERE j.nomor_bukti = $1 ORDER BY CASE WHEN j.debit_jurnalumum > 0 THEN 0 ELSE 1 END, j.urutan`, [nomorBukti]);
    if (!r.rows.length) return null;
    const baris = r.rows.map((x) => ({ kodePerkiraan: x.kode_perkiraan, namaPerkiraan: x.nama_perkiraan ?? '', deskripsi: x.deskripsi ?? '', debit: x.d, kredit: x.k }));
    return {
        nomorBukti, tanggal: r.rows[0].tanggal, opr: r.rows[0].opr ?? '', baris,
        // Keterangan jurnal = keterangan baris yang paling sering (baris tanpa keterangan sendiri memakainya).
        deskripsi: [...baris.reduce((m, x) => m.set(x.deskripsi, (m.get(x.deskripsi) ?? 0) + 1), new Map<string, number>())]
            .sort((a, b) => b[1] - a[1])[0][0],
        terkunci: alasanTerkunci(nomorBukti, r.rows.some((x) => x.rekon)),
    };
}

/** Ubah jurnal umum JU/: isi diganti, nomor dan tanggal tetap (tanggal bagian dari nomor). */
export async function ubahJurnalUmum(db: Db, nomorBukti: string, i: JurnalUmumInput): Promise<{ nomorBukti: string; baris: number }> {
    if (!/^JU\//.test(nomorBukti)) throw new Error(`${nomorBukti} bukan jurnal umum; bukti BB diubah lewat Bank Book`);
    const b = await bacaJurnalUmum(db, nomorBukti);
    if (!b) throw new Error(`Bukti ${nomorBukti} tidak ditemukan`);
    if (b.terkunci) throw new Error(`Bukti ${nomorBukti}: ${b.terkunci}`);
    if (b.tanggal !== i.tanggal) throw new Error('Tanggal jurnal tidak bisa diubah; hapus lalu buat jurnal baru di tanggal lain');
    if (!i.deskripsi.trim()) throw new Error('Keterangan jurnal wajib diisi');
    const baris = await postJournal(db, { nomorBukti, tanggal: i.tanggal, deskripsi: i.deskripsi.trim(), opr: i.opr,
        sumberTipe: 'jurnal', sumberId: null, tahunPrefix: 'JU', lines: i.lines });
    return { nomorBukti, baris };
}

/** Hapus bukti JU/ atau BB/ yang belum direkonsiliasi. */
export async function hapusJurnalUmum(db: Db, nomorBukti: string) {
    const b = await bacaJurnalUmum(db, nomorBukti);
    if (!b) throw new Error(`Bukti ${nomorBukti} tidak ditemukan`);
    if (b.terkunci) throw new Error(`Bukti ${nomorBukti}: ${b.terkunci}`);
    await db.query('DELETE FROM jurnal_umum WHERE nomor_bukti = $1', [nomorBukti]);
}
