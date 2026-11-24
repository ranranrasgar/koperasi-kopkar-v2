import crypto from 'node:crypto';
import type { Db } from '../db.ts';
import { pakaiQrBayar } from '../anggota/qr.ts';
import { akunBersama, KantinSalah, uang, type ModelKantin } from '../unit-usaha/kantin.ts';
import { cekAkunDetail, cekBuktiTerbuka, postJournal, type JournalLine } from './journal.ts';
import { fromUnits, round2, toUnits } from './money.ts';

// Transaksi uang kantin: stok masuk, penjualan tunai, batal penjualan, sesi kasir. Rancangan: docs/prd-kantin.md bagian 4 dan 6.
// Jurnal menurut model unit:
//   milik       tunai: Dr Kas Kantin / Cr Penjualan, Dr HPP / Cr Persediaan. Stok masuk: Dr Persediaan / Cr akun bayar.
//   bagi_hasil  tunai (uang dipegang tenant): Dr Piutang Tenant / Cr Pendapatan Bagi Hasil sebesar persen kontrak. Stok milik tenant: tanpa jurnal.
//   sewa        tunai: tanpa jurnal (pendapatan koperasi = sewa bulanan).

const SATU = 10000n; // 1,0000 dalam unit uang/qty
const kali = (harga: bigint, qty: bigint) => round2((harga * qty) / SATU);
const yymm = (t: string) => t.slice(2, 4) + t.slice(5, 7);
function tgl(v: string) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(v) || Number.isNaN(Date.parse(v))) throw new KantinSalah('Tanggal tidak valid');
    return v;
}
function qty(v: unknown) {
    const s = uang(v, 'Jumlah');
    const n = toUnits(s);
    if (n <= 0n) throw new KantinSalah('Jumlah harus lebih dari nol');
    if (n % 100n !== 0n) throw new KantinSalah('Jumlah maksimal dua angka di belakang koma');
    return n;
}

interface Unit {
    id: string; nama: string; model: ModelKantin; aktif: boolean; terima_tunai: boolean; terima_sukarela: boolean
    kas: string | null; persediaan: string | null; penjualan: string | null; hpp: string | null; piutang: string | null; utang: string | null; pendapatan: string | null
}
export async function unit(db: Pick<Db, 'query'>, id: number): Promise<Unit> {
    const u = (await db.query<Unit>(`SELECT u.id, u.nama, u.model, u.aktif, u.terima_tunai, u.terima_sukarela,
            (SELECT kode_perkiraan FROM perkiraan WHERE id = u.akun_kas_id) kas, (SELECT kode_perkiraan FROM perkiraan WHERE id = u.akun_persediaan_id) persediaan,
            (SELECT kode_perkiraan FROM perkiraan WHERE id = u.akun_penjualan_id) penjualan, (SELECT kode_perkiraan FROM perkiraan WHERE id = u.akun_hpp_id) hpp,
            (SELECT kode_perkiraan FROM perkiraan WHERE id = u.akun_piutang_tenant_id) piutang, (SELECT kode_perkiraan FROM perkiraan WHERE id = u.akun_utang_tenant_id) utang,
            (SELECT kode_perkiraan FROM perkiraan WHERE id = u.akun_pendapatan_tenant_id) pendapatan
          FROM unit_usaha u WHERE u.id = $1 AND u.jenis = 'KANTIN' FOR SHARE`, [id])).rows[0];
    if (!u) throw new KantinSalah('Kantin tidak ditemukan');
    const perlu = u.model === 'milik' ? [u.kas, u.persediaan, u.penjualan, u.hpp] : [u.piutang, u.utang, u.pendapatan];
    if (perlu.some((a) => !a)) throw new KantinSalah(`Akun jurnal ${u.nama} belum lengkap; simpan ulang kantin di Daftar Unit Usaha`);
    return u;
}

// ---------- sesi kasir ----------

export async function sesiTerbuka(db: Pick<Db, 'query'>, unitId: number, oprId: number) {
    return (await db.query<{ id: string; dibuka_pada: string; modal_awal: string }>(
        'SELECT id, dibuka_pada, modal_awal FROM kantin_sesi_kasir WHERE unit_usaha_id = $1 AND opr_id = $2 AND ditutup_pada IS NULL', [unitId, oprId])).rows[0] ?? null;
}

export async function bukaSesi(db: Db, i: { unitId: number; oprId: number; opr: string; modalAwal: string | number }) {
    const u = await unit(db, i.unitId);
    if (!u.aktif) throw new KantinSalah(`${u.nama} nonaktif`);
    if (await sesiTerbuka(db, i.unitId, i.oprId)) throw new KantinSalah('Sesi kasir Anda di kantin ini masih terbuka');
    const r = await db.query<{ id: string }>('INSERT INTO kantin_sesi_kasir (unit_usaha_id, opr_id, opr, modal_awal) VALUES ($1, $2, $3, $4) RETURNING id',
        [i.unitId, i.oprId, i.opr, uang(i.modalAwal, 'Modal awal')]);
    return { id: Number(r.rows[0].id) };
}

/** Ringkasan sesi: modal, penjualan tunai (selesai), jumlah nota, nota batal, dan uang tunai yang seharusnya ada di laci. */
export async function ringkasSesi(db: Pick<Db, 'query'>, sesiId: number) {
    const r = (await db.query<{ modal: string; tunai: string; nota: string; batal: string }>(
        `SELECT s.modal_awal modal,
                COALESCE((SELECT SUM(total) FROM kantin_penjualan p WHERE p.sesi_kasir_id = s.id AND p.metode = 'tunai' AND p.status <> 'batal'), 0) tunai,
                (SELECT count(*) FROM kantin_penjualan p WHERE p.sesi_kasir_id = s.id AND p.status <> 'batal') nota,
                (SELECT count(*) FROM kantin_penjualan p WHERE p.sesi_kasir_id = s.id AND p.status = 'batal') batal
           FROM kantin_sesi_kasir s WHERE s.id = $1`, [sesiId])).rows[0];
    if (!r) throw new KantinSalah('Sesi kasir tidak ditemukan');
    return { modal: r.modal, tunai: r.tunai, nota: Number(r.nota), batal: Number(r.batal), seharusnya: fromUnits(toUnits(r.modal) + toUnits(r.tunai)) };
}

/**
 * Tutup sesi: hitung uang laci seharusnya (modal + penjualan tunai), catat uang fisik dan selisihnya. Kantin milik koperasi menjurnal selisih ke akun
 * Selisih Kas Kantin (kurang: Dr Selisih / Cr Kas Kantin; lebih: sebaliknya). Uang kantin tenant milik tenant, jadi selisihnya hanya dicatat.
 */
export async function tutupSesi(db: Db, i: { sesiId: number; oprId: number; opr: string; uangFisik: string | number; catatan?: string; tanggal: string }) {
    const s = (await db.query<{ unit_usaha_id: string; opr_id: string; ditutup_pada: string | null }>(
        'SELECT unit_usaha_id, opr_id, ditutup_pada FROM kantin_sesi_kasir WHERE id = $1 FOR UPDATE', [i.sesiId])).rows[0];
    if (!s) throw new KantinSalah('Sesi kasir tidak ditemukan');
    if (Number(s.opr_id) !== i.oprId) throw new KantinSalah('Sesi kasir ini milik operator lain');
    if (s.ditutup_pada) throw new KantinSalah('Sesi kasir sudah ditutup');
    const r = await ringkasSesi(db, i.sesiId);
    const fisik = uang(i.uangFisik, 'Uang fisik');
    const selisih = toUnits(fisik) - toUnits(r.seharusnya);
    await db.query(`UPDATE kantin_sesi_kasir SET ditutup_pada = now(), total_tunai_sistem = $1, uang_fisik = $2, selisih = $3, catatan = $4 WHERE id = $5`,
        [r.seharusnya, fisik, fromUnits(selisih), i.catatan?.trim().slice(0, 255) || null, i.sesiId]);
    const u = await unit(db, Number(s.unit_usaha_id));
    if (u.model === 'milik' && round2(selisih) !== 0n) {
        const akun = await akunBersama(db, 'Selisih Kas Kantin', '5.1.00.00', 96, 'D');
        const n = fromUnits(round2(selisih < 0n ? -selisih : selisih));
        await postJournal(db, {
            nomorBukti: `KTS-${yymm(i.tanggal)}-${i.sesiId}`, tanggal: tgl(i.tanggal), opr: i.opr, sumberTipe: 'kantin_sesi', sumberId: i.sesiId,
            deskripsi: `Selisih kas ${selisih < 0n ? 'kurang' : 'lebih'} tutup kasir ${u.nama} (${i.opr})`,
            lines: selisih < 0n ? [{ kodePerkiraan: akun, debit: n }, { kodePerkiraan: u.kas!, kredit: n }] : [{ kodePerkiraan: u.kas!, debit: n }, { kodePerkiraan: akun, kredit: n }],
        });
    }
    return { ...r, uangFisik: fisik, selisih: fromUnits(selisih) };
}

// ---------- stok masuk ----------

export interface StokMasukInput {
    unitId: number; tanggal: string; opr: string; keterangan?: string
    /** Akun lawan pembelian (kas/bank atau utang); hanya untuk kantin milik koperasi. */
    akunBayar?: string | null
    items: { produkId: number; qty: string | number; hargaBeli: string | number }[]
}

/** Barang datang: stok bertambah, HPP rata-rata bergerak diperbarui, kartu stok dicatat. Kantin milik koperasi: Dr Persediaan / Cr akun bayar. */
export async function stokMasuk(db: Db, i: StokMasukInput) {
    const tanggal = tgl(i.tanggal);
    const u = await unit(db, i.unitId);
    if (!i.items.length) throw new KantinSalah('Isi minimal satu barang');
    let akunBayar: string | null = null;
    if (u.model === 'milik') {
        akunBayar = String(i.akunBayar ?? '').trim();
        const a = (await db.query<{ keterangan: string; kode_perkiraan: string }>('SELECT keterangan, kode_perkiraan FROM perkiraan WHERE kode_perkiraan = $1', [akunBayar])).rows[0];
        if (!a) throw new KantinSalah('Pilih akun pembayaran');
        if (!['BANK', 'GC'].includes(a.keterangan) && !a.kode_perkiraan.startsWith('2.1.')) throw new KantinSalah('Akun pembayaran harus akun kas/bank atau utang lancar');
        if (akunBayar === u.persediaan) throw new KantinSalah('Akun pembayaran tidak boleh akun persediaan');
        await cekAkunDetail(db, [akunBayar]);
    }
    const no = `KTB-${yymm(tanggal)}-${(await db.query<{ n: string }>("SELECT nextval('seq_kantin_stok') n")).rows[0].n}`;
    let total = 0n;
    const baris = [...i.items].sort((a, b) => a.produkId - b.produkId); // urutan kunci tetap: tidak saling menunggu
    for (const it of baris) {
        const q = qty(it.qty), beli = toUnits(uang(it.hargaBeli, 'Harga beli'));
        const p = (await db.query<{ nama: string; stok: string; harga_pokok: string; kelola_stok: boolean }>(
            'SELECT nama, stok, harga_pokok, kelola_stok FROM kantin_produk WHERE id = $1 AND unit_usaha_id = $2 FOR UPDATE', [it.produkId, i.unitId])).rows[0];
        if (!p) throw new KantinSalah('Produk tidak ditemukan di kantin ini');
        if (!p.kelola_stok) throw new KantinSalah(`${p.nama} tidak dikelola stoknya; catat pembelian bahannya lewat Bank Book`);
        const stok = toUnits(p.stok), pokok = toUnits(p.harga_pokok);
        const stokBaru = stok + q;
        const lama = stok > 0n ? stok * pokok : 0n;
        const pokokBaru = (lama + q * beli) / (stok > 0n ? stokBaru : q);
        await db.query('UPDATE kantin_produk SET stok = $1, harga_pokok = $2, diubah_pada = now() WHERE id = $3', [fromUnits(stokBaru), fromUnits(pokokBaru), it.produkId]);
        await db.query(`INSERT INTO kantin_stok_mutasi (produk_id, unit_usaha_id, tanggal, jenis, qty, harga, stok_setelah, no_bukti, opr, keterangan)
            VALUES ($1, $2, $3, 'masuk', $4, $5, $6, $7, $8, $9)`, [it.produkId, i.unitId, tanggal, fromUnits(q), fromUnits(beli), fromUnits(stokBaru), no, i.opr, i.keterangan?.trim().slice(0, 255) || null]);
        total += kali(beli, q);
    }
    if (u.model === 'milik' && total > 0n)
        await postJournal(db, {
            nomorBukti: no, tanggal, opr: i.opr, sumberTipe: 'kantin_stok', sumberId: null,
            deskripsi: `Stok masuk ${u.nama}${i.keterangan?.trim() ? `: ${i.keterangan.trim().slice(0, 100)}` : ''}`,
            lines: [{ kodePerkiraan: u.persediaan!, debit: fromUnits(total) }, { kodePerkiraan: akunBayar!, kredit: fromUnits(total) }],
        });
    return { noBukti: no, total: fromUnits(total) };
}

/**
 * Hapus permanen satu bukti stok masuk (KTB) karena salah input: baris kartu stok dan jurnalnya dihapus tanpa jurnal balik, stok dan HPP rata-rata
 * dikembalikan. Hanya boleh bila bukti ini mutasi terakhir setiap produknya; kalau sesudahnya sudah ada penjualan/opname, urutan kartu stok dan HPP
 * yang sudah dipakai ikut salah, jadi ditolak.
 */
export async function hapusStokMasuk(db: Db, i: { unitId: number; noBukti: string }) {
    const no = String(i.noBukti ?? '').trim();
    const baris = (await db.query<{ id: string; produk_id: string; qty: string; harga: string }>(
        `SELECT id, produk_id, qty, harga FROM kantin_stok_mutasi WHERE no_bukti = $1 AND unit_usaha_id = $2 AND jenis = 'masuk' ORDER BY produk_id, id DESC`,
        [no, i.unitId])).rows;
    if (!no.startsWith('KTB-') || !baris.length) throw new KantinSalah(`Stok masuk ${no} tidak ditemukan di kantin ini`);
    await cekBuktiTerbuka(db, no);
    let total = 0n;
    for (const b of baris) {
        const p = (await db.query<{ nama: string; stok: string; harga_pokok: string }>('SELECT nama, stok, harga_pokok FROM kantin_produk WHERE id = $1 FOR UPDATE', [b.produk_id])).rows[0];
        const lanjut = (await db.query<{ no_bukti: string }>(
            'SELECT no_bukti FROM kantin_stok_mutasi WHERE produk_id = $1 AND id > $2 AND no_bukti <> $3 ORDER BY id LIMIT 1', [b.produk_id, b.id, no])).rows[0];
        if (lanjut) throw new KantinSalah(`${p.nama} sudah punya mutasi sesudahnya (${lanjut.no_bukti}); hanya stok masuk terakhir yang bisa dihapus`);
        const q = toUnits(b.qty), beli = toUnits(b.harga), stok = toUnits(p.stok), pokok = toUnits(p.harga_pokok);
        const stokLama = stok - q;
        if (stokLama < 0n) throw new KantinSalah(`Stok ${p.nama} tinggal ${fromUnits(stok).replace(/\.?0+$/, '')}, kurang dari jumlah yang dihapus`);
        // Kebalikan rata-rata bergerak. Bila stok sebelumnya nol, HPP dibiarkan: stok masuk berikutnya memakai harga belinya sendiri.
        const balik = stokLama > 0n ? (stok * pokok - q * beli) / stokLama : pokok;
        const pokokLama = balik < 0n ? 0n : balik;
        await db.query('UPDATE kantin_produk SET stok = $1, harga_pokok = $2, diubah_pada = now() WHERE id = $3', [fromUnits(stokLama), fromUnits(pokokLama), b.produk_id]);
        total += kali(beli, q);
    }
    await db.query("DELETE FROM kantin_stok_mutasi WHERE no_bukti = $1 AND unit_usaha_id = $2 AND jenis = 'masuk'", [no, i.unitId]);
    await db.query('DELETE FROM jurnal_umum WHERE nomor_bukti = $1', [no]);
    return { noBukti: no, produk: new Set(baris.map((b) => b.produk_id)).size, total: fromUnits(total) };
}

// ---------- opname dan barang rusak ----------

export interface PenyesuaianInput {
    unitId: number; tanggal: string; opr: string; keterangan?: string
    /** opname: `qty` = stok fisik hasil hitung; rusak: `qty` = jumlah yang dibuang (rusak/kedaluwarsa/hilang). */
    jenis: 'opname' | 'rusak'
    items: { produkId: number; qty: string | number }[]
}

/**
 * Sesuaikan stok produk berstok dengan nilai HPP rata-rata saat ini (HPP tidak berubah). Kantin milik koperasi menjurnal nilainya:
 * opname kurang / barang rusak: Dr Selisih Persediaan Kantin (atau Beban Barang Rusak Kantin) / Cr Persediaan; opname lebih: sebaliknya.
 * Kantin tenant: hanya stok dan kartu stok. Nomor bukti KTO-yymm-n.
 */
export async function penyesuaianStok(db: Db, i: PenyesuaianInput) {
    const tanggal = tgl(i.tanggal);
    const u = await unit(db, i.unitId);
    if (!i.items.length) throw new KantinSalah('Isi minimal satu produk');
    const ket = i.keterangan?.trim().slice(0, 255) || null;
    if (i.jenis === 'rusak' && !ket) throw new KantinSalah('Tulis keterangan (mis. kedaluwarsa, pecah)');
    const no = `KTO-${yymm(tanggal)}-${(await db.query<{ n: string }>("SELECT nextval('seq_kantin_stok') n")).rows[0].n}`;
    let kurang = 0n, lebih = 0n, baris = 0;
    for (const it of [...i.items].sort((a, b) => a.produkId - b.produkId)) {
        const p = (await db.query<{ nama: string; stok: string; harga_pokok: string; kelola_stok: boolean }>(
            'SELECT nama, stok, harga_pokok, kelola_stok FROM kantin_produk WHERE id = $1 AND unit_usaha_id = $2 FOR UPDATE', [it.produkId, i.unitId])).rows[0];
        if (!p) throw new KantinSalah('Produk tidak ditemukan di kantin ini');
        if (!p.kelola_stok) throw new KantinSalah(`${p.nama} tidak dikelola stoknya`);
        const stok = toUnits(p.stok), pokok = toUnits(p.harga_pokok);
        let selisih: bigint;
        if (i.jenis === 'opname') {
            const fisik = toUnits(uang(it.qty, 'Stok fisik'));
            if (fisik % 100n !== 0n) throw new KantinSalah('Jumlah maksimal dua angka di belakang koma');
            selisih = fisik - stok;
        } else {
            const q = qty(it.qty);
            if (q > stok) throw new KantinSalah(`Stok ${p.nama} tinggal ${fromUnits(stok).replace(/\.?0+$/, '')}`);
            selisih = -q;
        }
        if (selisih === 0n) continue;
        baris++;
        await db.query('UPDATE kantin_produk SET stok = $1, diubah_pada = now() WHERE id = $2', [fromUnits(stok + selisih), it.produkId]);
        await db.query(`INSERT INTO kantin_stok_mutasi (produk_id, unit_usaha_id, tanggal, jenis, qty, harga, stok_setelah, no_bukti, opr, keterangan)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`, [it.produkId, i.unitId, tanggal, i.jenis, fromUnits(selisih), fromUnits(pokok), fromUnits(stok + selisih), no, i.opr, ket]);
        const nilai = kali(pokok, selisih < 0n ? -selisih : selisih);
        if (selisih < 0n) kurang += nilai; else lebih += nilai;
    }
    if (!baris) throw new KantinSalah('Tidak ada stok yang berubah');
    if (u.model === 'milik' && (kurang > 0n || lebih > 0n)) {
        const akun = i.jenis === 'rusak' ? await akunBersama(db, 'Beban Barang Rusak Kantin', '5.1.00.00', 96, 'D')
            : await akunBersama(db, 'Selisih Persediaan Kantin', '5.1.00.00', 96, 'D');
        const lines: JournalLine[] = [];
        if (kurang) lines.push({ kodePerkiraan: akun, debit: fromUnits(kurang) }, { kodePerkiraan: u.persediaan!, kredit: fromUnits(kurang) });
        if (lebih) lines.push({ kodePerkiraan: u.persediaan!, debit: fromUnits(lebih) }, { kodePerkiraan: akun, kredit: fromUnits(lebih) });
        await postJournal(db, { nomorBukti: no, tanggal, opr: i.opr, sumberTipe: 'kantin_stok', sumberId: null, lines,
            deskripsi: `${i.jenis === 'rusak' ? 'Barang rusak' : 'Stok opname'} ${u.nama}${ket ? `: ${ket.slice(0, 100)}` : ''}` });
    }
    return { noBukti: no, baris, kurang: fromUnits(kurang), lebih: fromUnits(lebih) };
}

// ---------- penjualan ----------

export interface JualInput {
    /** oprId null: pesanan dari aplikasi anggota (tanpa sesi kasir, sumber 'mobile'). */
    unitId: number; oprId: number | null; opr: string; tanggal: string
    kodeAgt?: string | null
    /** Pesanan tunai dari aplikasi yang dibayar saat diambil: pembelinya anggota pemesan, pesanannya ditandai selesai. */
    pesananId?: number | null
    items: { produkId: number; qty: string | number }[]
    diskon?: string | number
    uangDiterima: string | number
    /** UUID dari browser: kirim ulang dengan kunci sama mengembalikan nota yang sudah tersimpan. */
    kunci?: string | null
    catatan?: string
}
export interface HasilJual {
    id: number; noBukti: string; total: string; kembalian: string; ulang: boolean
    /** Bayar sukarela: anggota yang membayar dan saldo sukarelanya setelah belanja. */
    anggotaId?: number; namaAnggota?: string; saldoSukarela?: string
}
/** Sukarela: dari QR bayar anggota (qrTeks, dipindai kasir) atau dari anggota yang menyetujui tagihan QR kantin di HP-nya (anggotaId). */
type Bayar = { metode: 'tunai'; uangDiterima: string | number; kodeAgt?: string | null } | { metode: 'sukarela'; qrTeks?: string; anggotaId?: number };

/** Penjualan tunai di kasir. Wajib ada sesi kasir terbuka milik operator ini. */
export const jualTunai = (db: Db, i: JualInput) => jual(db, i, { metode: 'tunai', uangDiterima: i.uangDiterima, kodeAgt: i.kodeAgt });

/**
 * Penjualan dibayar Simpanan Sukarela: kasir memindai QR bayar di HP anggota (sekali pakai, 60 detik). Saldo, batas per transaksi, batas harian
 * di kantin ini, dan saldo minimal diperiksa; satu baris pengambilan sukarela dibuat dengan nomor bukti nota (KTN-...), tanpa jurnal SMPK sendiri.
 */
export const jualSukarela = (db: Db, i: Omit<JualInput, 'uangDiterima' | 'kodeAgt'> & { qrTeks: string }) =>
    jual(db, { ...i, uangDiterima: 0 }, { metode: 'sukarela', qrTeks: i.qrTeks });

/** Pesanan dari aplikasi anggota yang dibayar Simpanan Sukarela saat checkout (PIN diperiksa pemanggil). Tanpa sesi kasir. */
export const jualAplikasiSukarela = (db: Db, i: { unitId: number; anggotaId: number; tanggal: string; items: { produkId: number; qty: string | number }[]; catatan?: string }) =>
    jual(db, { unitId: i.unitId, oprId: null, opr: 'aplikasi', tanggal: i.tanggal, items: i.items, uangDiterima: 0, catatan: i.catatan }, { metode: 'sukarela', anggotaId: i.anggotaId });

async function jual(db: Db, i: JualInput, bayar: Bayar): Promise<HasilJual> {
    const tanggal = tgl(i.tanggal);
    const kunci = i.kunci && /^[0-9a-f-]{36}$/i.test(i.kunci) ? i.kunci : null;
    if (kunci) {
        const ada = (await db.query<{ id: string; no_bukti: string; total: string; kembalian: string | null }>(
            'SELECT id, no_bukti, total, kembalian FROM kantin_penjualan WHERE kunci_idempoten = $1', [kunci])).rows[0];
        if (ada) return { id: Number(ada.id), noBukti: ada.no_bukti, total: ada.total, kembalian: ada.kembalian ?? '0', ulang: true };
    }
    const u = await unit(db, i.unitId);
    if (!u.aktif) throw new KantinSalah(`${u.nama} nonaktif`);
    if (bayar.metode === 'tunai' && !u.terima_tunai) throw new KantinSalah(`${u.nama} tidak menerima tunai`);
    if (bayar.metode === 'sukarela' && !u.terima_sukarela) throw new KantinSalah(`${u.nama} tidak menerima bayar dari Simpanan Sukarela`);
    const sesi = i.oprId === null ? null : await sesiTerbuka(db, i.unitId, i.oprId);
    if (i.oprId !== null && !sesi) throw new KantinSalah('Buka sesi kasir dulu');

    let anggotaId: string | null = null, namaAnggota = '', qrToken: string | null = null;
    if (bayar.metode === 'sukarela') {
        let pemilik = bayar.anggotaId ?? null;
        if (bayar.qrTeks !== undefined) {
            const q = await pakaiQrBayar(db, bayar.qrTeks);
            if (!q) throw new KantinSalah('QR bayar tidak berlaku atau sudah dipakai. Minta anggota membuka QR bayar yang baru.');
            qrToken = q.token; pemilik = q.anggotaId;
        }
        if (!pemilik) throw new KantinSalah('Anggota pembayar tidak diketahui');
        const a = (await db.query<{ id: string; nama: string; aktif: boolean }>('SELECT id, nama, aktif FROM anggota WHERE id = $1 FOR UPDATE', [pemilik])).rows[0];
        if (!a?.aktif) throw new KantinSalah('Anggota tidak aktif');
        anggotaId = a.id; namaAnggota = a.nama;
    } else if (i.pesananId) {
        const ps = (await db.query<{ anggota_id: string; nama: string; metode: string; status: string; unit_usaha_id: string }>(
            `SELECT p.anggota_id, a.nama, p.metode, p.status, p.unit_usaha_id FROM kantin_pesanan p JOIN anggota a ON a.id = p.anggota_id WHERE p.id = $1 FOR UPDATE OF p`, [i.pesananId])).rows[0];
        if (!ps || Number(ps.unit_usaha_id) !== i.unitId) throw new KantinSalah('Pesanan tidak ditemukan di kantin ini');
        if (ps.metode !== 'tunai' || !['menunggu', 'diproses', 'siap'].includes(ps.status)) throw new KantinSalah(`Pesanan #${i.pesananId} tidak menunggu pembayaran tunai`);
        anggotaId = ps.anggota_id; namaAnggota = ps.nama;
    } else if (bayar.kodeAgt) {
        const a = (await db.query<{ id: string; nama: string }>('SELECT id, nama FROM anggota WHERE kode_agt = $1', [bayar.kodeAgt])).rows[0];
        if (!a) throw new KantinSalah(`Anggota ${bayar.kodeAgt} tidak ditemukan`);
        anggotaId = a.id; namaAnggota = a.nama;
    }

    // Gabung baris produk yang sama, lalu kunci produk berurutan id.
    const gabung = new Map<number, bigint>();
    for (const it of i.items) {
        if (!Number.isSafeInteger(it.produkId)) throw new KantinSalah('Produk tidak valid');
        gabung.set(it.produkId, (gabung.get(it.produkId) ?? 0n) + qty(it.qty));
    }
    if (!gabung.size) throw new KantinSalah('Keranjang kosong');
    const baris: { produkId: number; nama: string; satuan: string; q: bigint; jual: bigint; pokok: bigint; sub: bigint; stok: bigint | null }[] = [];
    for (const [produkId, q] of [...gabung].sort((a, b) => a[0] - b[0])) {
        const p = (await db.query<{ nama: string; satuan: string; harga_jual: string; harga_pokok: string; kelola_stok: boolean; stok: string; aktif: boolean }>(
            'SELECT nama, satuan, harga_jual, harga_pokok, kelola_stok, stok, aktif FROM kantin_produk WHERE id = $1 AND unit_usaha_id = $2 FOR UPDATE', [produkId, i.unitId])).rows[0];
        if (!p) throw new KantinSalah('Produk tidak ditemukan di kantin ini');
        if (!p.aktif) throw new KantinSalah(`${p.nama} nonaktif`);
        const stok = p.kelola_stok ? toUnits(p.stok) : null;
        if (stok !== null && stok < q) throw new KantinSalah(`Stok ${p.nama} tinggal ${fromUnits(stok).replace(/\.?0+$/, '')}`);
        const jual = toUnits(p.harga_jual), pokok = toUnits(p.harga_pokok);
        baris.push({ produkId, nama: p.nama, satuan: p.satuan, q, jual, pokok, sub: kali(jual, q), stok });
    }
    const subtotal = baris.reduce((s, b) => s + b.sub, 0n);
    const diskon = round2(toUnits(uang(i.diskon, 'Diskon')));
    if (diskon > subtotal) throw new KantinSalah('Diskon melebihi subtotal');
    const total = subtotal - diskon;
    const totalPokok = baris.reduce((s, b) => s + kali(b.pokok, b.q), 0n);
    const rp = (n: bigint) => `Rp ${Number(fromUnits(n)).toLocaleString('id-ID')}`;

    let terima: bigint | null = null, saldoBaru: bigint | null = null;
    let sukarela: { akun: string; jenisId: string; persen: string } | null = null;
    if (bayar.metode === 'tunai') {
        terima = toUnits(uang(bayar.uangDiterima, 'Uang diterima'));
        if (terima < total) throw new KantinSalah(`Uang diterima kurang dari total ${rp(total)}`);
    } else {
        const b = (await db.query<{ batas_sukarela_transaksi: string; batas_sukarela_harian: string; saldo_sukarela_minimal: string }>(
            'SELECT batas_sukarela_transaksi, batas_sukarela_harian, saldo_sukarela_minimal FROM unit_usaha WHERE id = $1', [i.unitId])).rows[0];
        const batasT = toUnits(b.batas_sukarela_transaksi), batasH = toUnits(b.batas_sukarela_harian), minimal = toUnits(b.saldo_sukarela_minimal);
        if (batasT > 0n && total > batasT) throw new KantinSalah(`Belanja dengan Simpanan Sukarela maksimal ${rp(batasT)} per transaksi`);
        const hariIni = toUnits((await db.query<{ s: string }>(`SELECT COALESCE(SUM(total), 0) s FROM kantin_penjualan
            WHERE unit_usaha_id = $1 AND anggota_id = $2 AND tanggal = $3 AND metode = 'sukarela' AND status <> 'batal'`, [i.unitId, anggotaId, tanggal])).rows[0].s);
        if (batasH > 0n && hariIni + total > batasH) throw new KantinSalah(`Batas belanja Simpanan Sukarela ${rp(batasH)} per hari; hari ini sudah ${rp(hariIni)}`);
        const js = (await db.query<{ id: string; persen_laba: string; kode_perkiraan: string }>(
            "SELECT j.id, j.persen_laba, p.kode_perkiraan FROM jenis_simpanan j JOIN perkiraan p ON p.id = j.coa_id WHERE j.kode_simpanan = '03'")).rows[0];
        if (!js) throw new KantinSalah('Jenis Simpanan Sukarela (03) tidak ada');
        sukarela = { akun: js.kode_perkiraan, jenisId: js.id, persen: js.persen_laba };
        const saldo = toUnits((await db.query<{ s: string }>(
            'SELECT COALESCE(SUM(rp_setoran - rp_pengambilan), 0) s FROM simpanan WHERE anggota_id = $1 AND jenis_simpanan_id = $2', [anggotaId, js.id])).rows[0].s);
        if (saldo - total < minimal)
            throw new KantinSalah(minimal > 0n ? `Saldo Simpanan Sukarela ${rp(saldo)} tidak cukup (harus tersisa minimal ${rp(minimal)})` : `Saldo Simpanan Sukarela ${rp(saldo)} tidak cukup`);
        saldoBaru = saldo - total;
    }

    let persen: bigint | null = null, bagi = 0n;
    if (u.model === 'bagi_hasil') {
        const k = (await db.query<{ persen_bagi_hasil: string }>(`SELECT persen_bagi_hasil FROM tenant_kontrak WHERE unit_usaha_id = $1 AND mulai <= $2
            AND (selesai IS NULL OR selesai >= $2) ORDER BY mulai DESC LIMIT 1`, [i.unitId, tanggal])).rows[0];
        if (!k) throw new KantinSalah(`Tidak ada kontrak tenant ${u.nama} yang berlaku pada ${tanggal}`);
        persen = toUnits(k.persen_bagi_hasil);
        bagi = round2((total * persen) / (100n * SATU));
    }

    const no = `KTN-${yymm(tanggal)}-${(await db.query<{ n: string }>("SELECT nextval('seq_kantin_jual') n")).rows[0].n}`;
    const id = Number((await db.query<{ id: string }>(`INSERT INTO kantin_penjualan (no_bukti, unit_usaha_id, sesi_kasir_id, anggota_id, tanggal, metode, model,
            subtotal, diskon, total, total_pokok, persen_bagi_hasil, bagi_hasil, uang_diterima, kembalian, kunci_idempoten, catatan, opr, qr_token, sumber)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20) RETURNING id`,
        [no, i.unitId, sesi?.id ?? null, anggotaId, tanggal, bayar.metode, u.model, fromUnits(subtotal), fromUnits(diskon), fromUnits(total), fromUnits(totalPokok),
         persen === null ? null : fromUnits(persen), fromUnits(bagi), terima === null ? null : fromUnits(terima), terima === null ? null : fromUnits(terima - total),
         kunci, i.catatan?.trim().slice(0, 255) || null, i.opr, qrToken, i.oprId === null ? 'mobile' : 'pos'])).rows[0].id);
    if (i.pesananId) await db.query(`UPDATE kantin_pesanan SET penjualan_id = $1, status = 'selesai', diubah_pada = now(), diubah_oleh = $2 WHERE id = $3`, [id, i.opr, i.pesananId]);
    for (const b of baris) {
        await db.query(`INSERT INTO kantin_penjualan_item (penjualan_id, produk_id, nama_produk, satuan, qty, harga_jual, harga_pokok, subtotal)
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`, [id, b.produkId, b.nama, b.satuan, fromUnits(b.q), fromUnits(b.jual), fromUnits(b.pokok), fromUnits(b.sub)]);
        if (b.stok !== null) {
            await db.query('UPDATE kantin_produk SET stok = stok - $1 WHERE id = $2', [fromUnits(b.q), b.produkId]);
            await db.query(`INSERT INTO kantin_stok_mutasi (produk_id, unit_usaha_id, tanggal, jenis, qty, harga, stok_setelah, no_bukti, opr)
                VALUES ($1, $2, $3, 'jual', $4, $5, $6, $7, $8)`, [b.produkId, i.unitId, tanggal, fromUnits(-b.q), fromUnits(b.pokok), fromUnits(b.stok - b.q), no, i.opr]);
        }
    }

    const ket = `Penjualan ${u.nama} ${no}${namaAnggota ? ` a/n ${namaAnggota}` : ''}`;
    if (sukarela) {
        // Pengambilan sukarela sebesar total belanja; jurnalnya bagian dari jurnal nota di bawah (debit Simpanan Sukarela).
        const urut = Number((await db.query("SELECT nextval('seq_simpanan_urut') v")).rows[0].v);
        const s = await db.query<{ id: string }>(`INSERT INTO simpanan (urut, no_bukti, jenis_simpanan, kode_agt, tgl_transaksi, jam_transaksi, deskripsi, persen_laba,
                rp_setoran, rp_pengambilan, rp_saldo, opr, anggota_id, jenis_simpanan_id, kas_perkiraan_id)
            SELECT $1, $2, '03', a.kode_agt, $3, LOCALTIME(0), $4, $5, 0, $6, $7, $8, a.id, $9, NULL FROM anggota a WHERE a.id = $10 RETURNING id`,
            [urut, no, tanggal, `Belanja ${u.nama} ${no}`.slice(0, 255), sukarela.persen, fromUnits(total), fromUnits(saldoBaru!), i.opr, sukarela.jenisId, anggotaId]);
        await db.query('UPDATE kantin_penjualan SET simpanan_id = $1 WHERE id = $2', [s.rows[0].id, id]);
    }
    // Sisi debit: kas (tunai milik), Simpanan Sukarela (sukarela), atau piutang tenant (tunai tenant, sebesar bagi hasil).
    const lines: JournalLine[] = [];
    const d = (kode: string, n: bigint) => lines.push({ kodePerkiraan: kode, debit: fromUnits(n) });
    const k = (kode: string, n: bigint) => lines.push({ kodePerkiraan: kode, kredit: fromUnits(n) });
    if (u.model === 'milik') {
        d(sukarela ? sukarela.akun : u.kas!, total); k(u.penjualan!, total);
        d(u.hpp!, totalPokok); k(u.persediaan!, totalPokok);
    } else if (sukarela) {
        // Tenant: uang belanja sukarela menjadi utang koperasi ke tenant, dikurangi bagi hasil koperasi.
        d(sukarela.akun, total); k(u.utang!, total - bagi); k(u.pendapatan!, bagi);
    } else if (u.model === 'bagi_hasil') {
        d(u.piutang!, bagi); k(u.pendapatan!, bagi);
    }
    if (lines.some((l) => toUnits(l.debit ?? l.kredit ?? 0) !== 0n))
        await postJournal(db, { nomorBukti: no, tanggal, deskripsi: ket, opr: i.opr, sumberTipe: 'kantin_jual', sumberId: id, lines });
    return {
        id, noBukti: no, total: fromUnits(total), kembalian: terima === null ? '0' : fromUnits(terima - total), ulang: false,
        ...(sukarela ? { anggotaId: Number(anggotaId), namaAnggota, saldoSukarela: fromUnits(saldoBaru!) } : {}),
    };
}

/**
 * Batalkan penjualan: stok dikembalikan (HPP rata-rata ikut dihitung ulang), jurnalnya dihapus, nota ditandai batal. `semuaHari` false:
 * hanya nota hari ini (pengelola kantin); admin boleh nota lama selama periodenya belum ditutup.
 */
export async function batalJual(db: Db, i: { id: number; unitId: number; alasan: string; opr: string; hariIni: string; semuaHari: boolean }) {
    const alasan = i.alasan.trim();
    if (alasan.length < 3) throw new KantinSalah('Tulis alasan pembatalan');
    const p = (await db.query<{ no_bukti: string; tanggal: string; status: string; simpanan_id: string | null; penyelesaian_id: string | null; anggota_id: string | null }>(
        'SELECT no_bukti, tanggal::text, status, simpanan_id, penyelesaian_id, anggota_id FROM kantin_penjualan WHERE id = $1 AND unit_usaha_id = $2 FOR UPDATE', [i.id, i.unitId])).rows[0];
    if (!p) throw new KantinSalah('Nota tidak ditemukan di kantin ini');
    if (p.status === 'batal') throw new KantinSalah(`Nota ${p.no_bukti} sudah dibatalkan`);
    if (p.penyelesaian_id) throw new KantinSalah(`Nota ${p.no_bukti} sudah masuk penyelesaian tenant; batalkan penyelesaiannya dulu`);
    if (!i.semuaHari && p.tanggal !== i.hariIni) throw new KantinSalah('Nota hari sebelumnya hanya bisa dibatalkan admin');
    // Bayar sukarela: pengambilan sukarela anggota ikut dihapus, jadi saldonya kembali.
    if (p.simpanan_id) {
        await db.query('SELECT 1 FROM anggota WHERE id = $1 FOR UPDATE', [p.anggota_id]);
        await db.query('DELETE FROM simpanan WHERE id = $1', [p.simpanan_id]);
    }
    await cekBuktiTerbuka(db, p.no_bukti);

    const item = (await db.query<{ produk_id: string; qty: string; harga_pokok: string }>(
        'SELECT produk_id, qty, harga_pokok FROM kantin_penjualan_item WHERE penjualan_id = $1 ORDER BY produk_id', [i.id])).rows;
    for (const it of item) {
        const pr = (await db.query<{ kelola_stok: boolean; stok: string; harga_pokok: string }>(
            'SELECT kelola_stok, stok, harga_pokok FROM kantin_produk WHERE id = $1 FOR UPDATE', [it.produk_id])).rows[0];
        if (!pr.kelola_stok || !(await db.query("SELECT 1 FROM kantin_stok_mutasi WHERE no_bukti = $1 AND produk_id = $2 AND jenis = 'jual'", [p.no_bukti, it.produk_id])).rowCount) continue;
        const q = toUnits(it.qty), stok = toUnits(pr.stok), pokokItem = toUnits(it.harga_pokok);
        const stokBaru = stok + q;
        const pokokBaru = stok > 0n ? (stok * toUnits(pr.harga_pokok) + q * pokokItem) / stokBaru : pokokItem;
        await db.query('UPDATE kantin_produk SET stok = $1, harga_pokok = $2 WHERE id = $3', [fromUnits(stokBaru), fromUnits(pokokBaru), it.produk_id]);
        await db.query(`INSERT INTO kantin_stok_mutasi (produk_id, unit_usaha_id, tanggal, jenis, qty, harga, stok_setelah, no_bukti, opr, keterangan)
            VALUES ($1, $2, $3, 'batal', $4, $5, $6, $7, $8, $9)`, [it.produk_id, i.unitId, i.hariIni, fromUnits(q), fromUnits(pokokItem), fromUnits(stokBaru), p.no_bukti, i.opr, alasan.slice(0, 255)]);
    }
    await db.query('DELETE FROM jurnal_umum WHERE nomor_bukti = $1', [p.no_bukti]);
    await db.query(`UPDATE kantin_penjualan SET status = 'batal', dibatalkan_pada = now(), opr_batal = $1, alasan_batal = $2 WHERE id = $3`, [i.opr, alasan.slice(0, 255), i.id]);
    return { noBukti: p.no_bukti };
}

// ---------- tagihan QR kantin (kasir menampilkan QR, anggota menyetujui di HP) ----------

const AWALAN_TAGIHAN = 'KOPKAR1:T:';
export const DETIK_TAGIHAN = 180;
const tokenTagihan = (teks: string) => new RegExp(`^${AWALAN_TAGIHAN}([A-Za-z0-9_-]{22})$`).exec(teks.trim())?.[1] ?? null;

interface IsiTagihan { items: { produkId: number; qty: string }[]; diskon: string }

/** Kasir membuat tagihan dari keranjang: total dihitung dari harga sekarang, QR berlaku DETIK_TAGIHAN detik. */
export async function buatTagihan(db: Db, i: { unitId: number; oprId: number; opr: string; items: { produkId: number; qty: string | number }[]; diskon?: string | number }) {
    const u = await unit(db, i.unitId);
    if (!u.aktif) throw new KantinSalah(`${u.nama} nonaktif`);
    if (!u.terima_sukarela) throw new KantinSalah(`${u.nama} tidak menerima bayar dari Simpanan Sukarela`);
    if (!(await sesiTerbuka(db, i.unitId, i.oprId))) throw new KantinSalah('Buka sesi kasir dulu');
    if (!i.items.length) throw new KantinSalah('Keranjang kosong');
    let subtotal = 0n;
    for (const it of i.items) {
        const p = (await db.query<{ nama: string; harga_jual: string; aktif: boolean; kelola_stok: boolean; stok: string }>(
            'SELECT nama, harga_jual, aktif, kelola_stok, stok FROM kantin_produk WHERE id = $1 AND unit_usaha_id = $2', [it.produkId, i.unitId])).rows[0];
        if (!p?.aktif) throw new KantinSalah('Produk tidak ditemukan atau nonaktif');
        const q = qty(it.qty);
        if (p.kelola_stok && toUnits(p.stok) < q) throw new KantinSalah(`Stok ${p.nama} tidak cukup`);
        subtotal += kali(toUnits(p.harga_jual), q);
    }
    const diskon = round2(toUnits(uang(i.diskon, 'Diskon')));
    if (diskon > subtotal) throw new KantinSalah('Diskon melebihi subtotal');
    const token = crypto.randomBytes(16).toString('base64url');
    const isi: IsiTagihan = { items: i.items.map((x) => ({ produkId: x.produkId, qty: String(x.qty) })), diskon: fromUnits(diskon) };
    await db.query("DELETE FROM kantin_tagihan WHERE berlaku_sampai < now() - interval '1 day' AND penjualan_id IS NULL");
    await db.query(`INSERT INTO kantin_tagihan (token, unit_usaha_id, opr_id, opr, isi, total, kunci, berlaku_sampai)
        VALUES ($1, $2, $3, $4, $5, $6, gen_random_uuid(), now() + make_interval(secs => $7))`,
        [token, i.unitId, i.oprId, i.opr, JSON.stringify(isi), fromUnits(subtotal - diskon), DETIK_TAGIHAN]);
    return { teks: `${AWALAN_TAGIHAN}${token}`, token, detik: DETIK_TAGIHAN, total: fromUnits(subtotal - diskon) };
}

export interface RincianTagihan {
    kantin: string; total: string; diskon: string; status: 'menunggu' | 'lunas' | 'kedaluwarsa' | 'batal'; sisaDetik: number
    item: { nama: string; satuan: string; qty: string; harga: string }[]
}

/** Rincian tagihan untuk layar persetujuan di HP anggota (hanya membaca). null bila bukan QR tagihan. */
export async function bacaTagihan(db: Pick<Db, 'query'>, teks: string): Promise<RincianTagihan | null> {
    const token = tokenTagihan(teks);
    if (!token) return null;
    const t = (await db.query<{ kantin: string; isi: IsiTagihan; total: string; sisa: number; penjualan_id: string | null; dibatalkan_pada: string | null; unit_usaha_id: string }>(
        `SELECT u.nama kantin, t.isi, t.total, extract(epoch FROM t.berlaku_sampai - now())::int sisa, t.penjualan_id, t.dibatalkan_pada, t.unit_usaha_id
           FROM kantin_tagihan t JOIN unit_usaha u ON u.id = t.unit_usaha_id WHERE t.token = $1`, [token])).rows[0];
    if (!t) return null;
    const item: RincianTagihan['item'] = [];
    for (const it of t.isi.items) {
        const p = (await db.query<{ nama: string; satuan: string; harga_jual: string }>('SELECT nama, satuan, harga_jual FROM kantin_produk WHERE id = $1', [it.produkId])).rows[0];
        item.push({ nama: p?.nama ?? '-', satuan: p?.satuan ?? '', qty: it.qty, harga: p?.harga_jual ?? '0' });
    }
    const status = t.penjualan_id ? 'lunas' : t.dibatalkan_pada ? 'batal' : t.sisa <= 0 ? 'kedaluwarsa' : 'menunggu';
    return { kantin: t.kantin, total: t.total, diskon: t.isi.diskon, status, sisaDetik: Math.max(t.sisa, 0), item };
}

/**
 * Anggota menyetujui tagihan (PIN sudah diperiksa pemanggil, di luar transaksi ini). Penjualan diposting atas nama kasir pembuat tagihan,
 * dibayar Simpanan Sukarela anggota ini. Bila harga berubah sejak tagihan dibuat, ditolak supaya anggota tidak membayar nilai yang tidak ia lihat.
 */
export async function bayarTagihan(db: Db, i: { teks: string; anggotaId: number; tanggal: string }) {
    const token = tokenTagihan(i.teks);
    if (!token) throw new KantinSalah('Bukan QR tagihan kantin');
    const t = (await db.query<{ unit_usaha_id: string; opr_id: string; opr: string; isi: IsiTagihan; total: string; kunci: string; aktif: boolean; penjualan_id: string | null; dibatalkan_pada: string | null }>(
        `SELECT unit_usaha_id, opr_id, opr, isi, total, kunci, berlaku_sampai > now() aktif, penjualan_id, dibatalkan_pada FROM kantin_tagihan WHERE token = $1 FOR UPDATE`, [token])).rows[0];
    if (!t) throw new KantinSalah('Tagihan tidak ditemukan');
    if (t.penjualan_id) throw new KantinSalah('Tagihan ini sudah dibayar');
    if (t.dibatalkan_pada) throw new KantinSalah('Tagihan ini dibatalkan kasir');
    if (!t.aktif) throw new KantinSalah('Tagihan sudah kedaluwarsa. Minta kasir menampilkan QR baru.');
    const r = await jual(db, { unitId: Number(t.unit_usaha_id), oprId: Number(t.opr_id), opr: t.opr, tanggal: i.tanggal, items: t.isi.items, diskon: t.isi.diskon,
        uangDiterima: 0, kunci: t.kunci }, { metode: 'sukarela', anggotaId: i.anggotaId });
    if (toUnits(r.total) !== toUnits(t.total)) throw new KantinSalah('Harga berubah sejak tagihan dibuat. Minta kasir menampilkan QR baru.');
    await db.query('UPDATE kantin_tagihan SET penjualan_id = $1 WHERE token = $2', [r.id, token]);
    return r;
}

/** Status tagihan untuk layar kasir (hanya kasir pembuatnya). */
export async function statusTagihan(db: Pick<Db, 'query'>, token: string, oprId: number) {
    const t = (await db.query<{ aktif: boolean; dibatalkan_pada: string | null; penjualan_id: string | null; no_bukti: string | null; total: string | null; nama: string | null; saldo: string | null }>(
        `SELECT t.berlaku_sampai > now() aktif, t.dibatalkan_pada, t.penjualan_id, p.no_bukti, p.total, a.nama, s.rp_saldo saldo
           FROM kantin_tagihan t LEFT JOIN kantin_penjualan p ON p.id = t.penjualan_id LEFT JOIN anggota a ON a.id = p.anggota_id
           LEFT JOIN simpanan s ON s.id = p.simpanan_id WHERE t.token = $1 AND t.opr_id = $2`, [token, oprId])).rows[0];
    if (!t) return { status: 'tidak_ada' as const };
    if (t.penjualan_id) return { status: 'lunas' as const, noBukti: t.no_bukti!, total: t.total!, namaAnggota: t.nama ?? '', saldoSukarela: t.saldo ?? '0' };
    return { status: t.dibatalkan_pada ? 'batal' as const : t.aktif ? 'menunggu' as const : 'kedaluwarsa' as const };
}

export async function batalTagihan(db: Pick<Db, 'query'>, token: string, oprId: number) {
    await db.query('UPDATE kantin_tagihan SET dibatalkan_pada = now() WHERE token = $1 AND opr_id = $2 AND penjualan_id IS NULL AND dibatalkan_pada IS NULL', [token, oprId]);
}
