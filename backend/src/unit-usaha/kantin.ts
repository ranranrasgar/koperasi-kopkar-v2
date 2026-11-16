import type { Db } from '../db.ts';
import { fromUnits, toUnits } from '../posting/money.ts';

// Data master unit usaha kantin: unit (model milik koperasi / tenant), akun COA otomatis, operator per unit, kategori dan produk.
// Rancangan: docs/prd-kantin.md. Tabel di database/postgres/anggota-web.sql (npm run anggota:pasang).

type Pemanggil = Pick<Db, 'query'>;
export type ModelKantin = 'milik' | 'bagi_hasil' | 'sewa';
export type PeranKantin = 'pengelola' | 'kasir';

export class KantinSalah extends Error {}

export const LABEL_MODEL: Record<ModelKantin, string> = { milik: 'Milik koperasi', bagi_hasil: 'Tenant bagi hasil', sewa: 'Tenant sewa tetap' };

// ---------- uang dan teks ----------

const POLA_UANG = /^\d{1,14}(\.\d{1,4})?$/;
/** Nominal tidak negatif dari isian (angka polos, desimal titik atau koma), dalam bentuk teks numeric. */
export function uang(v: unknown, label: string): string {
    const s = String(v ?? '').trim().replace(',', '.') || '0';
    if (!POLA_UANG.test(s)) throw new KantinSalah(`${label} harus angka tidak negatif`);
    return fromUnits(toUnits(s));
}
function teks(v: unknown, label: string, maks: number, wajib = false) {
    const s = String(v ?? '').trim();
    if (wajib && !s) throw new KantinSalah(`${label} wajib diisi`);
    if (s.length > maks) throw new KantinSalah(`${label} maksimal ${maks} karakter`);
    return s;
}
const atauNull = (s: string) => s || null;
function jam(v: unknown, label: string) {
    const s = String(v ?? '').trim();
    if (!s) return null;
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(s)) throw new KantinSalah(`${label} harus jam JJ:MM`);
    return s;
}
function tanggal(v: unknown, label: string, wajib = false) {
    const s = String(v ?? '').trim();
    if (!s) { if (wajib) throw new KantinSalah(`${label} wajib diisi`); return null; }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(s) || Number.isNaN(Date.parse(s))) throw new KantinSalah(`${label} tidak valid`);
    return s;
}

// ---------- akun COA otomatis ----------

interface SpekAkun { kolom: string; induk: string; mulai: number; awalan: string; dk: 'D' | 'C'; flag: string }
const KAS = '1.1.01.00', KEWAJIBAN = '2.1.00.00';
/** Induk baru yang dibuat bila belum ada: kode, nama, induknya, D/K. */
const INDUK_BARU: Record<string, [string, string, 'D' | 'C']> = {
    '4.1.00.00': ['PENDAPATAN UNIT USAHA', '4.0.00.00', 'C'],
    '5.3.00.00': ['HARGA POKOK PENJUALAN', '5.0.00.00', 'D'],
};
const AKUN_MODEL: Record<ModelKantin, SpekAkun[]> = {
    milik: [
        { kolom: 'akun_kas_id', induk: KAS, mulai: 80, awalan: 'Kas', dk: 'D', flag: 'BANK' }, // BANK: muncul di Bank Book untuk setoran harian
        { kolom: 'akun_persediaan_id', induk: KAS, mulai: 80, awalan: 'Persediaan', dk: 'D', flag: '-' },
        { kolom: 'akun_penjualan_id', induk: '4.1.00.00', mulai: 10, awalan: 'Penjualan', dk: 'C', flag: '-' },
        { kolom: 'akun_hpp_id', induk: '5.3.00.00', mulai: 10, awalan: 'HPP', dk: 'D', flag: '-' },
    ],
    bagi_hasil: [
        { kolom: 'akun_piutang_tenant_id', induk: KAS, mulai: 80, awalan: 'Piutang Tenant', dk: 'D', flag: '-' },
        { kolom: 'akun_utang_tenant_id', induk: KEWAJIBAN, mulai: 74, awalan: 'Utang ke Tenant', dk: 'C', flag: '-' },
        { kolom: 'akun_pendapatan_tenant_id', induk: '4.1.00.00', mulai: 10, awalan: 'Pendapatan Bagi Hasil', dk: 'C', flag: '-' },
    ],
    sewa: [
        { kolom: 'akun_piutang_tenant_id', induk: KAS, mulai: 80, awalan: 'Piutang Tenant', dk: 'D', flag: '-' },
        { kolom: 'akun_utang_tenant_id', induk: KEWAJIBAN, mulai: 74, awalan: 'Utang ke Tenant', dk: 'C', flag: '-' },
        { kolom: 'akun_pendapatan_tenant_id', induk: '4.1.00.00', mulai: 10, awalan: 'Pendapatan Sewa', dk: 'C', flag: '-' },
    ],
};
const KOLOM_AKUN = [...new Set(Object.values(AKUN_MODEL).flat().map((a) => a.kolom))];

interface Induk { id: string; pr_id: number; kode_perkiraan: string; kode_klasifikasi: number; klasifikasi_id: string }

async function induk(db: Pemanggil, kode: string): Promise<Induk> {
    const cari = () => db.query<Induk>('SELECT id, pr_id, kode_perkiraan, kode_klasifikasi, klasifikasi_id FROM perkiraan WHERE kode_perkiraan = $1', [kode]);
    const ada = (await cari()).rows[0];
    if (ada) return ada;
    const baru = INDUK_BARU[kode];
    if (!baru) throw new KantinSalah(`Akun induk ${kode} tidak ada di COA`);
    const atas = await induk(db, baru[1]);
    await sisipAkun(db, atas, kode, baru[0], baru[2], '');
    return (await cari()).rows[0];
}

async function sisipAkun(db: Pemanggil, atas: Induk, kode: string, nama: string, dk: 'D' | 'C', flag: string) {
    const { rows: [{ pr_id }] } = await db.query<{ pr_id: number }>('SELECT COALESCE(MAX(pr_id), 0) + 1 AS pr_id FROM perkiraan');
    const r = await db.query<{ id: string }>(
        `INSERT INTO perkiraan (pr_id, pr_parent, parent_id, kode_perkiraan, nama_perkiraan, d_k, kode_klasifikasi, klasifikasi_id, keterangan)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
        [pr_id, atas.pr_id, atas.id, kode, nama.slice(0, 100), dk, atas.kode_klasifikasi, atas.klasifikasi_id, flag]);
    return r.rows[0].id;
}

/** Buat satu akun detail di bawah induk dengan nomor dua digit terakhir yang pertama kosong mulai `mulai` (mis. 1.1.01.80). */
async function buatAkun(db: Pemanggil, s: SpekAkun, namaUnit: string) {
    const atas = await induk(db, s.induk);
    const awal = s.induk.slice(0, s.induk.lastIndexOf('.') + 1);
    const terpakai = new Set((await db.query<{ k: string }>('SELECT kode_perkiraan k FROM perkiraan WHERE kode_perkiraan LIKE $1', [`${awal}__`])).rows.map((r) => r.k));
    for (let n = s.mulai; n <= 99; n++) {
        const kode = `${awal}${String(n).padStart(2, '0')}`;
        if (!terpakai.has(kode)) return { id: await sisipAkun(db, atas, kode, `${s.awalan} ${namaUnit}`.trim(), s.dk, s.flag), kode };
    }
    throw new KantinSalah(`Nomor akun di bawah ${s.induk} sudah penuh; buat akun ${s.awalan} ${namaUnit} manual di COA`);
}

/** Akun bersama semua kantin menurut namanya (mis. Selisih Kas Kantin), dibuat sekali bila belum ada; mengembalikan kode akunnya. */
export async function akunBersama(db: Pemanggil, nama: string, indukKode: string, mulai: number, dk: 'D' | 'C') {
    const ada = (await db.query<{ kode_perkiraan: string }>('SELECT kode_perkiraan FROM perkiraan WHERE nama_perkiraan = $1 ORDER BY id LIMIT 1', [nama])).rows[0];
    if (ada) return ada.kode_perkiraan;
    await db.query('SELECT pg_advisory_xact_lock(hashtext($1))', ['perkiraan.pr_id']);
    const lagi = (await db.query<{ kode_perkiraan: string }>('SELECT kode_perkiraan FROM perkiraan WHERE nama_perkiraan = $1 ORDER BY id LIMIT 1', [nama])).rows[0];
    if (lagi) return lagi.kode_perkiraan;
    return (await buatAkun(db, { kolom: '', induk: indukKode, mulai, awalan: nama, dk, flag: '-' }, '')).kode;
}

// ---------- unit usaha ----------

export interface TenantInput { namaUsaha: string; pemilik?: string; telepon?: string; email?: string; bank?: string; noRekening?: string; namaRekening?: string }
export interface KontrakInput { mulai: string; selesai?: string; persenBagiHasil?: string | number; minimumBulanan?: string | number; sewaBulanan?: string | number; periode?: 'bulanan' | 'mingguan' }
export interface UnitInput {
    id?: number | null;
    kode: string; nama: string; lokasi?: string; jamBuka?: string; jamTutup?: string;
    aktif: boolean; tampilAnggota: boolean; model: ModelKantin;
    terimaTunai: boolean; terimaSukarela: boolean;
    batasSukarelaTransaksi?: string | number; batasSukarelaHarian?: string | number; saldoSukarelaMinimal?: string | number; menitBatalPesanan?: number | string;
    tenant?: TenantInput | null; kontrak?: KontrakInput | null;
    operator: { oprId: number; peran: PeranKantin }[];
}

/**
 * Simpan unit usaha kantin (baru atau ubah) beserta tenant/kontrak dan operatornya. Akun COA yang dibutuhkan model unit dibuat
 * otomatis bila belum ada (akun lama tidak pernah diubah atau dihapus, termasuk saat model diganti). Mengembalikan akun yang baru dibuat.
 */
export async function simpanUnit(db: Pemanggil, i: UnitInput, opr: string) {
    const kode = teks(i.kode, 'Kode unit', 20, true).toUpperCase();
    if (!/^[A-Z0-9-]{2,20}$/.test(kode)) throw new KantinSalah('Kode unit 2-20 huruf, angka, atau tanda minus (mis. KTN01)');
    const nama = teks(i.nama, 'Nama unit', 80, true);
    if (!(i.model in AKUN_MODEL)) throw new KantinSalah('Model unit tidak dikenal');
    const menit = Number(i.menitBatalPesanan ?? 30);
    if (!Number.isInteger(menit) || menit < 5 || menit > 1440) throw new KantinSalah('Batas waktu ambil pesanan 5-1440 menit');
    const nilai = [kode, nama, atauNull(teks(i.lokasi, 'Lokasi', 100)), jam(i.jamBuka, 'Jam buka'), jam(i.jamTutup, 'Jam tutup'),
        !!i.aktif, !!i.tampilAnggota, i.model, !!i.terimaTunai, !!i.terimaSukarela,
        uang(i.batasSukarelaTransaksi, 'Batas sukarela per transaksi'), uang(i.batasSukarelaHarian, 'Batas sukarela per hari'),
        uang(i.saldoSukarelaMinimal, 'Saldo sukarela minimal'), menit];
    if (!i.terimaTunai && !i.terimaSukarela) throw new KantinSalah('Pilih minimal satu cara bayar');
    const tenant = periksaTenant(i);

    await db.query('SELECT pg_advisory_xact_lock(hashtext($1))', ['perkiraan.pr_id']); // sama dengan Tambah Akun COA
    if ((await db.query('SELECT 1 FROM unit_usaha WHERE kode = $1 AND id IS DISTINCT FROM $2', [kode, i.id ?? null])).rowCount)
        throw new KantinSalah(`Kode unit ${kode} sudah dipakai`);

    let id: number;
    if (i.id) {
        const r = await db.query(`UPDATE unit_usaha SET kode=$1, nama=$2, lokasi=$3, jam_buka=$4, jam_tutup=$5, aktif=$6, tampil_anggota=$7, model=$8,
                terima_tunai=$9, terima_sukarela=$10, batas_sukarela_transaksi=$11, batas_sukarela_harian=$12, saldo_sukarela_minimal=$13,
                menit_batal_pesanan=$14, diubah_pada=now() WHERE id=$15`, [...nilai, i.id]);
        if (!r.rowCount) throw new KantinSalah('Unit usaha tidak ditemukan');
        id = Number(i.id);
    } else {
        id = Number((await db.query<{ id: string }>(`INSERT INTO unit_usaha (kode, nama, lokasi, jam_buka, jam_tutup, aktif, tampil_anggota, model,
                terima_tunai, terima_sukarela, batas_sukarela_transaksi, batas_sukarela_harian, saldo_sukarela_minimal, menit_batal_pesanan, dibuat_oleh)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15) RETURNING id`, [...nilai, opr])).rows[0].id);
    }

    // Akun yang belum ada untuk model ini.
    const sekarang = (await db.query<Record<string, string | null>>(`SELECT ${KOLOM_AKUN.join(', ')} FROM unit_usaha WHERE id = $1`, [id])).rows[0];
    const akunBaru: string[] = [];
    for (const s of AKUN_MODEL[i.model]) {
        if (sekarang[s.kolom]) continue;
        const a = await buatAkun(db, s, nama);
        await db.query(`UPDATE unit_usaha SET ${s.kolom} = $1 WHERE id = $2`, [a.id, id]);
        akunBaru.push(`${a.kode} ${s.awalan} ${nama}`);
    }

    await simpanTenant(db, id, tenant);
    await aturOperator(db, id, i.operator ?? []);
    return { id, akunBaru };
}

/** Data tenant dan kontrak yang sudah diperiksa; null untuk model milik (tenant lama, bila pernah ada, tetap tersimpan sebagai riwayat). */
function periksaTenant(i: UnitInput) {
    if (i.model === 'milik') return null;
    const t = i.tenant, k = i.kontrak;
    if (!t || !k) throw new KantinSalah('Isi data tenant dan kontraknya');
    const data = [teks(t.namaUsaha, 'Nama usaha tenant', 100, true), atauNull(teks(t.pemilik, 'Pemilik', 100)), atauNull(teks(t.telepon, 'Telepon', 30)),
        atauNull(teks(t.email, 'Email tenant', 100)), atauNull(teks(t.bank, 'Bank', 50)), atauNull(teks(t.noRekening, 'No. rekening', 50)),
        atauNull(teks(t.namaRekening, 'Nama rekening', 100))];
    const persen = uang(k.persenBagiHasil, 'Persen bagi hasil');
    if (toUnits(persen) > toUnits(100)) throw new KantinSalah('Persen bagi hasil maksimal 100');
    if (i.model === 'bagi_hasil' && toUnits(persen) <= 0n) throw new KantinSalah('Persen bagi hasil wajib diisi');
    const sewa = uang(k.sewaBulanan, 'Sewa per bulan');
    if (i.model === 'sewa' && toUnits(sewa) <= 0n) throw new KantinSalah('Sewa per bulan wajib diisi');
    const mulai = tanggal(k.mulai, 'Mulai kontrak', true)!, selesai = tanggal(k.selesai, 'Selesai kontrak');
    if (selesai && selesai < mulai) throw new KantinSalah('Selesai kontrak sebelum tanggal mulai');
    const periode = k.periode ?? 'bulanan';
    if (periode !== 'bulanan' && periode !== 'mingguan') throw new KantinSalah('Periode penyelesaian bulanan atau mingguan');
    return { data, mulai, kontrak: [persen, uang(k.minimumBulanan, 'Bagi hasil minimum per bulan'), sewa, periode, selesai] };
}

async function simpanTenant(db: Pemanggil, unitId: number, t: ReturnType<typeof periksaTenant>) {
    if (!t) return;
    const { data, mulai, kontrak } = t;
    const ada = (await db.query<{ tenant_id: string | null }>('SELECT tenant_id FROM unit_usaha WHERE id = $1 FOR UPDATE', [unitId])).rows[0].tenant_id;
    let tenantId = ada;
    if (ada) await db.query(`UPDATE tenant SET nama_usaha=$1, pemilik=$2, telepon=$3, email=$4, bank=$5, no_rekening=$6, nama_rekening=$7 WHERE id=$8`, [...data, ada]);
    else {
        tenantId = (await db.query<{ id: string }>(`INSERT INTO tenant (nama_usaha, pemilik, telepon, email, bank, no_rekening, nama_rekening)
            VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`, data)).rows[0].id;
        await db.query('UPDATE unit_usaha SET tenant_id = $1 WHERE id = $2', [tenantId, unitId]);
    }
    // Kontrak yang berlaku diperbarui bila tanggal mulainya sama; tanggal mulai baru = kontrak baru (yang lama tersimpan).
    const ubah = await db.query(`UPDATE tenant_kontrak SET persen_bagi_hasil=$1, minimum_bulanan=$2, sewa_bulanan=$3, periode_penyelesaian=$4, selesai=$5
        WHERE unit_usaha_id=$6 AND tenant_id=$7 AND mulai=$8`, [...kontrak, unitId, tenantId, mulai]);
    if (!ubah.rowCount)
        await db.query(`INSERT INTO tenant_kontrak (persen_bagi_hasil, minimum_bulanan, sewa_bulanan, periode_penyelesaian, selesai, unit_usaha_id, tenant_id, mulai)
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`, [...kontrak, unitId, tenantId, mulai]);
}

/** Ganti seluruh daftar operator unit. */
export async function aturOperator(db: Pemanggil, unitId: number, daftar: { oprId: number; peran: PeranKantin }[]) {
    const unik = new Map<number, PeranKantin>();
    for (const d of daftar) {
        if (!Number.isSafeInteger(d.oprId) || d.oprId < 1) throw new KantinSalah('Operator tidak valid');
        if (d.peran !== 'pengelola' && d.peran !== 'kasir') throw new KantinSalah('Peran operator harus pengelola atau kasir');
        unik.set(d.oprId, d.peran);
    }
    const ids = [...unik.keys()];
    if (ids.length && Number((await db.query<{ n: string }>('SELECT count(*) n FROM opr WHERE id = ANY($1::bigint[])', [ids])).rows[0].n) !== ids.length)
        throw new KantinSalah('Ada operator yang tidak ditemukan');
    await db.query('DELETE FROM unit_usaha_opr WHERE unit_usaha_id = $1', [unitId]);
    for (const [oprId, peran] of unik)
        await db.query('INSERT INTO unit_usaha_opr (unit_usaha_id, opr_id, peran) VALUES ($1, $2, $3)', [unitId, oprId, peran]);
}

export interface UnitOperator { id: number; kode: string; nama: string; model: ModelKantin; aktif: boolean; peran: PeranKantin | 'admin' }

/** Unit kantin yang boleh dipakai operator: semua untuk admin (izin Unit Usaha / superadmin), selain itu hanya yang ditugaskan. */
export async function unitOperator(db: Pemanggil, oprId: number, semua: boolean): Promise<UnitOperator[]> {
    const r = await db.query<{ id: string; kode: string; nama: string; model: ModelKantin; aktif: boolean; peran: PeranKantin | null }>(
        `SELECT u.id, u.kode, u.nama, u.model, u.aktif, o.peran FROM unit_usaha u
           LEFT JOIN unit_usaha_opr o ON o.unit_usaha_id = u.id AND o.opr_id = $1
          WHERE u.jenis = 'KANTIN' AND ($2 OR o.opr_id IS NOT NULL) ORDER BY u.aktif DESC, u.nama`, [oprId, semua]);
    return r.rows.map((x) => ({ ...x, id: Number(x.id), peran: x.peran ?? 'admin' }));
}

// ---------- produk ----------

export interface ProdukInput {
    id?: number | null; unitId: number;
    kode?: string; barcode?: string; nama: string; kategori?: string; satuan?: string;
    hargaBeli?: string | number; hargaJual: string | number;
    kelolaStok: boolean; stokMinimal?: string | number; tampilAnggota: boolean; aktif: boolean; keterangan?: string;
}

/** Simpan produk kantin. Kode kosong = otomatis P0001, P0002, ... per unit. Perubahan harga dicatat di kantin_harga_riwayat. */
export async function simpanProduk(db: Pemanggil, i: ProdukInput, opr: string) {
    const nama = teks(i.nama, 'Nama produk', 100, true);
    const satuan = teks(i.satuan, 'Satuan', 20) || 'pcs';
    const barcode = atauNull(teks(i.barcode, 'Barcode', 50));
    const beli = uang(i.hargaBeli, 'Harga beli'), jual = uang(i.hargaJual, 'Harga jual');
    if (toUnits(jual) <= 0n) throw new KantinSalah('Harga jual wajib diisi');
    const stokMin = uang(i.stokMinimal, 'Stok minimal');
    const unit = (await db.query<{ id: string }>("SELECT id FROM unit_usaha WHERE id = $1 AND jenis = 'KANTIN'", [i.unitId])).rows[0];
    if (!unit) throw new KantinSalah('Kantin tidak ditemukan');

    await db.query('SELECT pg_advisory_xact_lock(hashtext($1), $2::int)', ['kantin_produk', i.unitId]);
    let kode = teks(i.kode, 'Kode produk', 30).toUpperCase();
    if (!kode) {
        const n = (await db.query<{ n: number }>(`SELECT COALESCE(MAX(substring(kode from 2)::int), 0) + 1 n FROM kantin_produk
            WHERE unit_usaha_id = $1 AND kode ~ '^P[0-9]{1,9}$'`, [i.unitId])).rows[0].n;
        kode = `P${String(n).padStart(4, '0')}`;
    }
    if ((await db.query('SELECT 1 FROM kantin_produk WHERE unit_usaha_id = $1 AND kode = $2 AND id IS DISTINCT FROM $3', [i.unitId, kode, i.id ?? null])).rowCount)
        throw new KantinSalah(`Kode produk ${kode} sudah dipakai di kantin ini`);
    if (barcode && (await db.query('SELECT 1 FROM kantin_produk WHERE unit_usaha_id = $1 AND barcode = $2 AND id IS DISTINCT FROM $3', [i.unitId, barcode, i.id ?? null])).rowCount)
        throw new KantinSalah(`Barcode ${barcode} sudah dipakai produk lain`);

    const kategoriId = await kategori(db, i.unitId, teks(i.kategori, 'Kategori', 50));
    const isi = [kode, barcode, nama, satuan, beli, jual, !!i.kelolaStok, stokMin, !!i.tampilAnggota, !!i.aktif, atauNull(teks(i.keterangan, 'Keterangan', 255)), kategoriId];

    if (i.id) {
        const lama = (await db.query<{ harga_beli: string; harga_jual: string; kelola_stok: boolean; stok: string }>(
            'SELECT harga_beli, harga_jual, kelola_stok, stok FROM kantin_produk WHERE id = $1 AND unit_usaha_id = $2 FOR UPDATE', [i.id, i.unitId])).rows[0];
        if (!lama) throw new KantinSalah('Produk tidak ditemukan di kantin ini');
        if (lama.kelola_stok && !i.kelolaStok && toUnits(lama.stok) !== 0n)
            throw new KantinSalah('Stok produk masih ada; habiskan atau sesuaikan stoknya dulu sebelum mematikan kelola stok');
        // Produk tanpa stok memakai harga beli sebagai HPP; produk berstok mengikuti rata-rata dari stok masuk.
        await db.query(`UPDATE kantin_produk SET kode=$1, barcode=$2, nama=$3, satuan=$4, harga_beli=$5, harga_jual=$6, kelola_stok=$7, stok_minimal=$8,
                tampil_anggota=$9, aktif=$10, keterangan=$11, kategori_id=$12, diubah_pada=now(),
                harga_pokok = CASE WHEN $7 AND stok > 0 THEN harga_pokok ELSE $5 END WHERE id=$13`, [...isi, i.id]);
        if (toUnits(lama.harga_beli) !== toUnits(beli) || toUnits(lama.harga_jual) !== toUnits(jual))
            await db.query(`INSERT INTO kantin_harga_riwayat (produk_id, harga_beli_lama, harga_beli_baru, harga_jual_lama, harga_jual_baru, opr)
                VALUES ($1, $2, $3, $4, $5, $6)`, [i.id, lama.harga_beli, beli, lama.harga_jual, jual, opr]);
        return { id: Number(i.id), kode };
    }
    const id = Number((await db.query<{ id: string }>(`INSERT INTO kantin_produk (kode, barcode, nama, satuan, harga_beli, harga_jual, kelola_stok, stok_minimal,
            tampil_anggota, aktif, keterangan, kategori_id, unit_usaha_id, harga_pokok) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$5) RETURNING id`,
        [...isi, i.unitId])).rows[0].id);
    await db.query(`INSERT INTO kantin_harga_riwayat (produk_id, harga_beli_baru, harga_jual_baru, opr) VALUES ($1, $2, $3, $4)`, [id, beli, jual, opr]);
    return { id, kode };
}

/** Id kategori menurut nama (tidak peka huruf besar-kecil), dibuat bila belum ada; null bila kosong. */
async function kategori(db: Pemanggil, unitId: number, nama: string) {
    if (!nama) return null;
    const ada = (await db.query<{ id: string }>('SELECT id FROM kantin_kategori WHERE unit_usaha_id = $1 AND lower(nama) = lower($2)', [unitId, nama])).rows[0];
    if (ada) return Number(ada.id);
    return Number((await db.query<{ id: string }>(`INSERT INTO kantin_kategori (unit_usaha_id, nama, urutan)
        SELECT $1, $2, COALESCE(MAX(urutan), 0) + 1 FROM kantin_kategori WHERE unit_usaha_id = $1 RETURNING id`, [unitId, nama])).rows[0].id);
}
