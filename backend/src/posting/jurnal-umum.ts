import type { Db } from '../db.ts';
import { postJournal, type JournalLine } from './journal.ts';

/** Nilai kolom status jurnal_umum untuk jurnal penyesuaian (dipakai neraca lajur untuk memisahkan kolom penyesuaian). */
export const STATUS_PENYESUAIAN = 'Penyesuaian';

export interface JurnalUmumInput {
    tanggal: string; // YYYY-MM-DD
    deskripsi: string;
    opr: string;
    lines: JournalLine[]; // deskripsi per baris boleh diisi, seperti jurnal memorial desktop
    /** Jurnal penyesuaian: nomor JP/yymmdd/n dan status 'Penyesuaian' pada tiap barisnya. Hanya berlaku untuk jurnal baru. */
    penyesuaian?: boolean;
}

const yymmdd = (d: string) => d.slice(2, 4) + d.slice(5, 7) + d.slice(8, 10);

/**
 * Jurnal umum (memorial) yang diinput kasir. Nomor JU/yymmdd/n diambil dari seq_jurnal_umum_no; sequence
 * dimulai di atas nomor JU tertinggi dari desktop sehingga tidak pernah sama dengan nomor lama
 * (postJournal menghapus baris dengan nomor yang sama sebelum mengisi ulang).
 * Jurnal penyesuaian memakai tabel yang sama dengan nomor JP/yymmdd/n (seq_jurnal_penyesuaian_no) dan status 'Penyesuaian'.
 */
export async function postJurnalUmum(db: Db, i: JurnalUmumInput): Promise<{ nomorBukti: string; baris: number }> {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(i.tanggal)) throw new Error('Tanggal jurnal tidak valid');
    if (!i.deskripsi.trim()) throw new Error('Keterangan jurnal wajib diisi');
    const awalan = i.penyesuaian ? 'JP' : 'JU';
    const n = Number((await db.query(`SELECT nextval('${i.penyesuaian ? 'seq_jurnal_penyesuaian_no' : 'seq_jurnal_umum_no'}') v`)).rows[0].v);
    const nomorBukti = `${awalan}/${yymmdd(i.tanggal)}/${n}`;
    const ada = await db.query('SELECT 1 FROM jurnal_umum WHERE nomor_bukti = $1 LIMIT 1', [nomorBukti]);
    if (ada.rows[0]) throw new Error(`Nomor jurnal ${nomorBukti} sudah dipakai`);
    const baris = await postJournal(db, {
        nomorBukti, tanggal: i.tanggal, deskripsi: i.deskripsi.trim(), opr: i.opr,
        sumberTipe: i.penyesuaian ? 'penyesuaian' : 'jurnal', sumberId: null, tahunPrefix: awalan, lines: i.lines,
        status: i.penyesuaian ? STATUS_PENYESUAIAN : '',
    });
    return { nomorBukti, baris };
}

export interface BarisBukti { kodePerkiraan: string; namaPerkiraan: string; deskripsi: string; debit: string; kredit: string }
export interface BuktiJurnal {
    nomorBukti: string; tanggal: string; deskripsi: string; opr: string; baris: BarisBukti[];
    /** Bukti bertanda jurnal penyesuaian (semua barisnya berstatus 'Penyesuaian'). */
    penyesuaian: boolean;
    /** Alasan bukti tidak boleh diubah/dihapus lewat web, atau null bila boleh. */
    terkunci: string | null;
}

/**
 * Bukti yang boleh diubah atau dihapus dari web: jurnal umum (JU/), jurnal penyesuaian (JP/), dan bukti Bank Book (BB/).
 * Bukti buatan transaksi lain (simpanan, pinjaman, SHU, tutup buku) tidak boleh, supaya buku pembantunya tidak tidak sinkron.
 */
export function alasanTerkunci(nomorBukti: string): string | null {
    if (!/^(JU|JP|BB)\//.test(nomorBukti)) return 'Bukti ini dibuat oleh transaksi lain; ubah atau hapus dari asal transaksinya.';
    return null;
}

/** Baca satu bukti lengkap (untuk voucher dan form ubah); null bila tidak ada. */
export async function bacaJurnalUmum(db: Pick<Db, 'query'>, nomorBukti: string): Promise<BuktiJurnal | null> {
    const r = await db.query<{ kode_perkiraan: string; nama_perkiraan: string | null; deskripsi: string | null; d: string; k: string;
        tanggal: string; opr: string | null; status: string | null }>(
        `SELECT j.kode_perkiraan, p.nama_perkiraan, j.deskripsi, j.debit_jurnalumum d, j.kredit_jurnalumum k, j.tanggal_jurnalumum::text tanggal, j.opr, j.status
           FROM jurnal_umum j LEFT JOIN perkiraan p ON p.kode_perkiraan = j.kode_perkiraan
          WHERE j.nomor_bukti = $1 ORDER BY CASE WHEN j.debit_jurnalumum > 0 THEN 0 ELSE 1 END, j.urutan`, [nomorBukti]);
    if (!r.rows.length) return null;
    const baris = r.rows.map((x) => ({ kodePerkiraan: x.kode_perkiraan, namaPerkiraan: x.nama_perkiraan ?? '', deskripsi: x.deskripsi ?? '', debit: x.d, kredit: x.k }));
    return {
        nomorBukti, tanggal: r.rows[0].tanggal, opr: r.rows[0].opr ?? '', baris,
        penyesuaian: r.rows.every((x) => x.status === STATUS_PENYESUAIAN),
        // Keterangan jurnal = keterangan baris yang paling sering (baris tanpa keterangan sendiri memakainya).
        deskripsi: [...baris.reduce((m, x) => m.set(x.deskripsi, (m.get(x.deskripsi) ?? 0) + 1), new Map<string, number>())]
            .sort((a, b) => b[1] - a[1])[0][0],
        terkunci: alasanTerkunci(nomorBukti),
    };
}

/** Ubah jurnal umum JU/ atau jurnal penyesuaian JP/: isi diganti, nomor, tanggal, dan penanda penyesuaian tetap (tanggal bagian dari nomor). */
export async function ubahJurnalUmum(db: Db, nomorBukti: string, i: JurnalUmumInput): Promise<{ nomorBukti: string; baris: number }> {
    if (!/^(JU|JP)\//.test(nomorBukti)) throw new Error(`${nomorBukti} bukan jurnal umum atau penyesuaian; bukti BB diubah lewat Bank Book`);
    const b = await bacaJurnalUmum(db, nomorBukti);
    if (!b) throw new Error(`Bukti ${nomorBukti} tidak ditemukan`);
    if (b.terkunci) throw new Error(`Bukti ${nomorBukti}: ${b.terkunci}`);
    if (b.tanggal !== i.tanggal) throw new Error('Tanggal jurnal tidak bisa diubah; hapus lalu buat jurnal baru di tanggal lain');
    if (!i.deskripsi.trim()) throw new Error('Keterangan jurnal wajib diisi');
    const awalan = nomorBukti.slice(0, 2);
    const baris = await postJournal(db, { nomorBukti, tanggal: i.tanggal, deskripsi: i.deskripsi.trim(), opr: i.opr,
        sumberTipe: awalan === 'JP' ? 'penyesuaian' : 'jurnal', sumberId: null, tahunPrefix: awalan, lines: i.lines,
        status: b.penyesuaian ? STATUS_PENYESUAIAN : '' });
    return { nomorBukti, baris };
}

/**
 * Tandai jurnal umum JU/ sebagai penyesuaian (atau kembalikan ke jurnal umum biasa): mengubah status semua barisnya, nomor tidak berubah.
 * Untuk jurnal lama (mis. penyusutan bulanan dari desktop) yang ternyata jurnal penyesuaian. Jurnal JP/ selalu penyesuaian.
 */
export async function tandaiPenyesuaian(db: Db, nomorBukti: string, penyesuaian: boolean) {
    if (!/^JU\//.test(nomorBukti)) throw new Error(`${nomorBukti}: hanya jurnal umum JU/ yang bisa ditandai penyesuaian (JP/ sudah penyesuaian)`);
    const b = await bacaJurnalUmum(db, nomorBukti);
    if (!b) throw new Error(`Bukti ${nomorBukti} tidak ditemukan`);
    await db.query(`UPDATE jurnal_umum SET status = $2 WHERE nomor_bukti = $1 AND status IN ('', $3)`, [nomorBukti, penyesuaian ? STATUS_PENYESUAIAN : '', STATUS_PENYESUAIAN]);
}

/** Hapus bukti JU/, JP/, atau BB/. */
export async function hapusJurnalUmum(db: Db, nomorBukti: string) {
    const b = await bacaJurnalUmum(db, nomorBukti);
    if (!b) throw new Error(`Bukti ${nomorBukti} tidak ditemukan`);
    if (b.terkunci) throw new Error(`Bukti ${nomorBukti}: ${b.terkunci}`);
    await db.query('DELETE FROM jurnal_umum WHERE nomor_bukti = $1', [nomorBukti]);
}
