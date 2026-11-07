import type { Db } from '../db.ts';
import { cekAkunDetail, cekBuktiTerbuka, postJournal, type JournalLine } from './journal.ts';

/** Nilai kolom status jurnal_umum untuk jurnal penyesuaian (dipakai neraca lajur untuk memisahkan kolom penyesuaian). */
export const STATUS_PENYESUAIAN = 'Penyesuaian';

export interface JurnalUmumInput {
    tanggal: string; // YYYY-MM-DD
    deskripsi: string;
    opr: string;
    lines: JournalLine[]; // deskripsi per baris boleh diisi, seperti jurnal memorial desktop
    /** Jurnal penyesuaian: nomor JP/yymmdd/n dan status 'Penyesuaian' pada tiap barisnya. Hanya berlaku untuk jurnal baru. */
    penyesuaian?: boolean;
    /** No. Reff (kolom no_bukti_transaksi). Kosong = sama dengan nomor bukti. */
    noReff?: string;
}

const yymmdd = (d: string) => d.slice(2, 4) + d.slice(5, 7) + d.slice(8, 10);

/**
 * Jurnal umum (memorial) yang diinput kasir. Nomor JU/yymmdd/n diambil dari seq_jurnal_umum_no; sequence
 * dimulai di atas nomor JU tertinggi dari desktop sehingga tidak pernah sama dengan nomor lama
 * (postJournal menghapus baris dengan nomor yang sama sebelum mengisi ulang).
 * Jurnal penyesuaian memakai tabel yang sama dengan nomor JP/yymmdd/n (seq_jurnal_penyesuaian_no) dan status 'Penyesuaian'.
 */
/** Nomor urut berikutnya untuk pratinjau di form, tanpa memakai sequence. Nomor final diberikan saat simpan, jadi bisa berbeda bila ada jurnal lain lebih dulu. */
export async function nomorJurnalBerikut(db: Pick<Db, 'query'>, penyesuaian: boolean): Promise<number> {
    const r = await db.query<{ n: string }>(`SELECT CASE WHEN is_called THEN last_value + 1 ELSE last_value END n FROM ${penyesuaian ? 'seq_jurnal_penyesuaian_no' : 'seq_jurnal_umum_no'}`);
    return Number(r.rows[0].n);
}

const cekReff = (r?: string) => {
    const v = r?.trim();
    if (v && v.length > 100) throw new Error('No. Reff maksimal 100 karakter');
    return v || undefined;
};

export async function postJurnalUmum(db: Db, i: JurnalUmumInput): Promise<{ nomorBukti: string; baris: number }> {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(i.tanggal)) throw new Error('Tanggal jurnal tidak valid');
    if (!i.deskripsi.trim()) throw new Error('Keterangan jurnal wajib diisi');
    await cekAkunDetail(db, i.lines.map((l) => l.kodePerkiraan));
    const awalan = i.penyesuaian ? 'JP' : 'JU';
    const n = Number((await db.query(`SELECT nextval('${i.penyesuaian ? 'seq_jurnal_penyesuaian_no' : 'seq_jurnal_umum_no'}') v`)).rows[0].v);
    const nomorBukti = `${awalan}/${yymmdd(i.tanggal)}/${n}`;
    const ada = await db.query('SELECT 1 FROM jurnal_umum WHERE nomor_bukti = $1 LIMIT 1', [nomorBukti]);
    if (ada.rows[0]) throw new Error(`Nomor jurnal ${nomorBukti} sudah dipakai`);
    const baris = await postJournal(db, {
        nomorBukti, tanggal: i.tanggal, deskripsi: i.deskripsi.trim(), opr: i.opr,
        sumberTipe: i.penyesuaian ? 'penyesuaian' : 'jurnal', sumberId: null, tahunPrefix: awalan, lines: i.lines,
        noBuktiTransaksi: cekReff(i.noReff), status: i.penyesuaian ? STATUS_PENYESUAIAN : '',
    });
    return { nomorBukti, baris };
}

export interface BarisBukti { kodePerkiraan: string; namaPerkiraan: string; deskripsi: string; debit: string; kredit: string }
export interface BuktiJurnal {
    nomorBukti: string; noReff: string; tanggal: string; deskripsi: string; opr: string; baris: BarisBukti[];
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
        tanggal: string; opr: string | null; status: string | null; no_bukti_transaksi: string; keterangan_bukti: string | null }>(
        `SELECT j.kode_perkiraan, p.nama_perkiraan, j.deskripsi, j.debit_jurnalumum d, j.kredit_jurnalumum k, j.tanggal_jurnalumum::text tanggal, j.opr, j.status,
                j.no_bukti_transaksi, j.keterangan_bukti
           FROM jurnal_umum j LEFT JOIN perkiraan p ON p.kode_perkiraan = j.kode_perkiraan
          WHERE j.nomor_bukti = $1 ORDER BY CASE WHEN j.debit_jurnalumum > 0 THEN 0 ELSE 1 END, j.urutan`, [nomorBukti]);
    if (!r.rows.length) return null;
    const baris = r.rows.map((x) => ({ kodePerkiraan: x.kode_perkiraan, namaPerkiraan: x.nama_perkiraan ?? '', deskripsi: x.deskripsi ?? '', debit: x.d, kredit: x.k }));
    return {
        nomorBukti, noReff: r.rows[0].no_bukti_transaksi || nomorBukti, tanggal: r.rows[0].tanggal, opr: r.rows[0].opr ?? '', baris,
        penyesuaian: r.rows.every((x) => x.status === STATUS_PENYESUAIAN),
        // Jurnal lama tanpa keterangan_bukti: keterangan baris yang paling sering (baris tanpa keterangan sendiri memakainya).
        deskripsi: r.rows[0].keterangan_bukti ?? [...baris.reduce((m, x) => m.set(x.deskripsi, (m.get(x.deskripsi) ?? 0) + 1), new Map<string, number>())]
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
    await cekAkunDetail(db, i.lines.map((l) => l.kodePerkiraan), b.baris.map((x) => x.kodePerkiraan));
    const awalan = nomorBukti.slice(0, 2);
    const baris = await postJournal(db, { nomorBukti, tanggal: i.tanggal, deskripsi: i.deskripsi.trim(), opr: i.opr,
        sumberTipe: awalan === 'JP' ? 'penyesuaian' : 'jurnal', sumberId: null, tahunPrefix: awalan, lines: i.lines,
        noBuktiTransaksi: cekReff(i.noReff), status: b.penyesuaian ? STATUS_PENYESUAIAN : '' });
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

/**
 * Hapus satu baris bukti JU/, JP/, atau BB/, mis. baris kosong tanpa akun. Bukti harus seimbang setelah baris dihapus,
 * jadi yang bisa dihapus hanya baris bernilai nol atau baris yang memang membuat bukti itu tidak seimbang.
 */
export async function hapusBarisJurnal(db: Db, urutan: number) {
    const r = (await db.query<{ nomor_bukti: string; bernilai: boolean }>(
        'SELECT nomor_bukti, (debit_jurnalumum <> 0 OR kredit_jurnalumum <> 0) AS bernilai FROM jurnal_umum WHERE urutan = $1', [urutan])).rows[0];
    if (!r) throw new Error('Baris jurnal tidak ditemukan');
    const b = await bacaJurnalUmum(db, r.nomor_bukti);
    if (!b) throw new Error(`Bukti ${r.nomor_bukti} tidak ditemukan`);
    if (b.terkunci) throw new Error(`Bukti ${r.nomor_bukti}: ${b.terkunci}`);
    await cekBuktiTerbuka(db, r.nomor_bukti);
    if (r.bernilai) {
        const s = (await db.query<{ selisih: string }>(
            'SELECT COALESCE(SUM(debit_jurnalumum - kredit_jurnalumum), 0) AS selisih FROM jurnal_umum WHERE nomor_bukti = $1 AND urutan <> $2', [r.nomor_bukti, urutan])).rows[0];
        if (Math.abs(Number(s.selisih)) >= 0.01) throw new Error(`Menghapus baris ini membuat bukti ${r.nomor_bukti} tidak seimbang`);
    }
    await db.query('DELETE FROM jurnal_umum WHERE urutan = $1', [urutan]);
    return r.nomor_bukti;
}

/**
 * Hapus semua baris kosong (debit dan kredit nol) ke akun yang tidak ada di COA pada bukti JU/, JP/, dan BB/ dalam rentang tanggal.
 * Baris berisi tidak disentuh. Bukti yang terkunci, mis. sudah direkonsiliasi, dilewati.
 */
export async function hapusSemuaBarisKosong(db: Db, dari: string, sampai: string) {
    const baris = (await db.query<{ urutan: string; nomor_bukti: string }>(
        `SELECT j.urutan, j.nomor_bukti FROM jurnal_umum j LEFT JOIN perkiraan p ON p.kode_perkiraan = j.kode_perkiraan
          WHERE p.id IS NULL AND j.debit_jurnalumum = 0 AND j.kredit_jurnalumum = 0 AND j.tanggal_jurnalumum BETWEEN $1 AND $2
            AND (j.nomor_bukti LIKE 'JU/%' OR j.nomor_bukti LIKE 'JP/%' OR j.nomor_bukti LIKE 'BB/%')`, [dari, sampai])).rows;
    let dihapus = 0, dilewati = 0;
    for (const no of new Set(baris.map((b) => b.nomor_bukti))) {
        const urutan = baris.filter((b) => b.nomor_bukti === no).map((b) => b.urutan);
        if ((await bacaJurnalUmum(db, no))?.terkunci) { dilewati += urutan.length; continue; }
        await cekBuktiTerbuka(db, no);
        dihapus += (await db.query('DELETE FROM jurnal_umum WHERE urutan = ANY($1::bigint[])', [urutan])).rowCount ?? 0;
    }
    return { dihapus, dilewati };
}

/** Hapus bukti JU/, JP/, atau BB/. */
export async function hapusJurnalUmum(db: Db, nomorBukti: string) {
    const b = await bacaJurnalUmum(db, nomorBukti);
    if (!b) throw new Error(`Bukti ${nomorBukti} tidak ditemukan`);
    if (b.terkunci) throw new Error(`Bukti ${nomorBukti}: ${b.terkunci}`);
    await cekBuktiTerbuka(db, nomorBukti);
    await db.query('DELETE FROM jurnal_umum WHERE nomor_bukti = $1', [nomorBukti]);
}
