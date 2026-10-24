import type { Db } from '../db.ts';
import { postJournal, type JournalLine } from './journal.ts';
import { fromUnits, toUnits } from './money.ts';

/**
 * Bank Book (Buku Kas & Bank), pengganti form Bank & Cash Book desktop: satu akun kas/bank lawan satu atau lebih akun.
 * Operator mengisi akun lawan dengan debit atau kredit; sisi kas/bank diisi
 * sebesar totalnya, sehingga jurnal selalu seimbang. Nomor bukti BB/yymmdd/NNN urut per hari, seperti desktop.
 */

/** Akun yang tampil di Bank Book (perkiraan.keterangan GC atau BANK, sama dengan query desktop). */
export const SQL_AKUN_BANKBOOK = "SELECT id, kode_perkiraan, nama_perkiraan FROM perkiraan WHERE keterangan IN ('GC', 'BANK') ORDER BY nama_perkiraan";

export interface BarisLawan { kodePerkiraan: string; debit?: string | number; kredit?: string | number; deskripsi?: string | null }

export interface BankBookInput {
    akunBank: string;  // kode_perkiraan akun kas/bank
    tanggal: string;   // YYYY-MM-DD
    deskripsi: string;
    lawan: BarisLawan[];
    opr: string;
}

const yymmdd = (d: string) => d.slice(2, 4) + d.slice(5, 7) + d.slice(8, 10);

async function cekAkunBank(db: Db, kode: string) {
    const r = await db.query<{ nama_perkiraan: string }>(
        "SELECT nama_perkiraan FROM perkiraan WHERE kode_perkiraan = $1 AND keterangan IN ('GC', 'BANK')", [kode]);
    if (!r.rows[0]) throw new Error(`Akun ${kode} bukan akun kas/bank`);
}

/**
 * Baris jurnal dari input; galat bila ada yang tidak sah. Sisi kas/bank satu baris sebesar selisih: kredit lawan menambah
 * kas/bank (uang masuk), debit lawan mengurangi (uang keluar).
 */
function susunBaris(i: BankBookInput): JournalLine[] {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(i.tanggal)) throw new Error('Tanggal tidak valid');
    if (!i.deskripsi.trim()) throw new Error('Keterangan wajib diisi');
    const lawan = i.lawan.filter((l) => l.kodePerkiraan || toUnits(l.debit || 0) !== 0n || toUnits(l.kredit || 0) !== 0n);
    if (lawan.length === 0) throw new Error('Isi minimal satu akun lawan');
    let totalD = 0n, totalK = 0n;
    const baris: JournalLine[] = [];
    for (const [n, l] of lawan.entries()) {
        if (!l.kodePerkiraan) throw new Error(`Baris ${n + 1}: pilih akun lawan`);
        if (l.kodePerkiraan === i.akunBank) throw new Error(`Baris ${n + 1}: akun lawan tidak boleh sama dengan akun kas/bank`);
        const d = toUnits(l.debit || 0), k = toUnits(l.kredit || 0);
        if (d < 0n || k < 0n) throw new Error(`Baris ${n + 1}: nominal tidak boleh negatif`);
        if (d > 0n && k > 0n) throw new Error(`Baris ${n + 1}: isi debit atau kredit, bukan keduanya`);
        if (d === 0n && k === 0n) throw new Error(`Baris ${n + 1}: nominal harus lebih dari nol`);
        totalD += d; totalK += k;
        baris.push({ kodePerkiraan: l.kodePerkiraan, debit: fromUnits(d), kredit: fromUnits(k), deskripsi: l.deskripsi?.trim() || undefined });
    }
    const bersih = totalK - totalD;
    if (bersih === 0n) throw new Error('Debit dan kredit sama besar, tidak ada pergerakan kas/bank');
    const bank: JournalLine = bersih > 0n ? { kodePerkiraan: i.akunBank, debit: fromUnits(bersih) } : { kodePerkiraan: i.akunBank, kredit: fromUnits(-bersih) };
    return [bank, ...baris];
}

/** Bukti BB yang boleh diubah/dihapus: ada dan dibuat lewat Bank Book. (Tanda 'Reconcile' di baris kas/bank diisi otomatis oleh desktop saat simpan, bukan kunci.) */
async function cekBisaDiubah(db: Db, nomorBukti: string) {
    if (!/^BB\/\d{6}\/\d+$/.test(nomorBukti)) throw new Error(`${nomorBukti} bukan bukti Bank Book`);
    const r = await db.query<{ n: string; tanggal: string }>(
        `SELECT COUNT(*) n, MIN(tanggal_jurnalumum)::text tanggal
           FROM jurnal_umum WHERE nomor_bukti = $1`, [nomorBukti]);
    if (Number(r.rows[0].n) === 0) throw new Error(`Bukti ${nomorBukti} tidak ditemukan`);
    return r.rows[0].tanggal;
}

/** Simpan bukti baru, atau ubah bukti lama (nomorBukti diisi; tanggal tetap, karena tanggal bagian dari nomor). */
export async function simpanBankBook(db: Db, i: BankBookInput & { nomorBukti?: string }): Promise<{ nomorBukti: string; total: string }> {
    await cekAkunBank(db, i.akunBank);
    const lines = susunBaris(i);
    let nomorBukti = i.nomorBukti;
    if (nomorBukti) {
        const tgl = await cekBisaDiubah(db, nomorBukti);
        if (tgl !== i.tanggal) throw new Error('Tanggal bukti tidak bisa diubah; hapus lalu buat bukti baru di tanggal lain');
    } else {
        // Nomor urut per hari; kunci per hari supaya dua operator tidak mendapat nomor yang sama.
        const hari = yymmdd(i.tanggal);
        await db.query('SELECT pg_advisory_xact_lock(hashtext($1))', [`bankbook:${hari}`]);
        const n = Number((await db.query<{ n: string }>(
            `SELECT COALESCE(MAX(NULLIF(split_part(nomor_bukti, '/', 3), '')::int), 0) + 1 n FROM jurnal_umum
              WHERE nomor_bukti LIKE $1 AND split_part(nomor_bukti, '/', 3) ~ '^[0-9]+$'`, [`BB/${hari}/%`])).rows[0].n);
        nomorBukti = `BB/${hari}/${String(n).padStart(3, '0')}`;
    }
    await postJournal(db, { nomorBukti, tanggal: i.tanggal, deskripsi: i.deskripsi.trim(), opr: i.opr,
        sumberTipe: 'bankbook', sumberId: null, tahunPrefix: 'BB', lines });
    // Seperti desktop: baris sisi kas/bank langsung bertanda Reconcile dengan tanggal transaksinya.
    await db.query(`UPDATE jurnal_umum SET status = 'Reconcile', tgl_rekonsiliasi = tanggal_jurnalumum WHERE nomor_bukti = $1 AND kode_perkiraan = $2`, [nomorBukti, i.akunBank]);
    return { nomorBukti, total: lines[0].debit !== undefined ? String(lines[0].debit) : String(lines[0].kredit) };
}

export async function hapusBankBook(db: Db, nomorBukti: string) {
    await cekBisaDiubah(db, nomorBukti);
    await db.query('DELETE FROM jurnal_umum WHERE nomor_bukti = $1', [nomorBukti]);
}

export interface BuktiBankBook {
    nomorBukti: string; tanggal: string; deskripsi: string; akunBank: string
    lawan: { kodePerkiraan: string; namaPerkiraan: string; debit: string; kredit: string; deskripsi: string }[]
    terkunci: string | null; // alasan tidak bisa diubah di Bank Book, atau null
}

/**
 * Baca satu bukti untuk form ubah, dilihat dari akun kas/bank `akunBank`. Bisa diubah di Bank Book bila akun itu satu baris
 * (selisih lawan-lawannya; bentuk yang dibuat form ini dan bukti BB desktop).
 */
export async function bacaBankBook(db: Pick<Db, 'query'>, nomorBukti: string, akunBank: string): Promise<BuktiBankBook | null> {
    const r = await db.query<{ kode_perkiraan: string; nama_perkiraan: string | null; d: string; k: string; deskripsi: string | null;
        tanggal: string; status: string | null; tgl_rekonsiliasi: string | null }>(
        `SELECT j.kode_perkiraan, p.nama_perkiraan, j.debit_jurnalumum d, j.kredit_jurnalumum k, j.deskripsi, j.tanggal_jurnalumum::text tanggal,
                j.status, j.tgl_rekonsiliasi::text tgl_rekonsiliasi
           FROM jurnal_umum j LEFT JOIN perkiraan p ON p.kode_perkiraan = j.kode_perkiraan
          WHERE j.nomor_bukti = $1 ORDER BY j.urutan`, [nomorBukti]);
    if (!r.rows.length) return null;
    const bank = r.rows.filter((x) => x.kode_perkiraan === akunBank);
    const lain = r.rows.filter((x) => x.kode_perkiraan !== akunBank);
    let terkunci: string | null = null;
    if (!nomorBukti.startsWith('BB/')) terkunci = 'Bukan bukti Bank Book (dibuat oleh transaksi lain); ubah dari asal transaksinya.';
    else if (bank.length !== 1) terkunci = 'Akun kas/bank muncul lebih dari satu baris; ubah lewat Jurnal Umum.';
    return {
        nomorBukti, tanggal: r.rows[0].tanggal, deskripsi: bank[0]?.deskripsi ?? r.rows[0].deskripsi ?? '', akunBank,
        lawan: lain.map((x) => ({ kodePerkiraan: x.kode_perkiraan, namaPerkiraan: x.nama_perkiraan ?? '', debit: x.d, kredit: x.k, deskripsi: x.deskripsi ?? '' })),
        terkunci,
    };
}
