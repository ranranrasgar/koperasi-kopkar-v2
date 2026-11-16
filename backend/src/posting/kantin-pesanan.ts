import type { Db } from '../db.ts';
import { KantinSalah } from '../unit-usaha/kantin.ts';
import { batalJual, jualAplikasiSukarela } from './kantin.ts';
import { fromUnits, toUnits } from './money.ts';

// Belanja dari aplikasi anggota: tas (kantin_tas), checkout menjadi pesanan (kantin_pesanan), dan alur pesanan di kasir.
//   Sukarela: penjualan langsung diposting saat checkout (sumber 'mobile', tanpa sesi kasir), pesanan berstatus 'dibayar'.
//   Tunai: pesanan 'menunggu' tanpa penjualan; kasir memuatnya ke keranjang dan memposting penjualan tunai saat anggota membayar (selesai).
// Rancangan: docs/prd-kantin.md bagian 4.5.

type Q = Pick<Db, 'query'>;
const LANJUT: Record<string, string[]> = { dibayar: ['diproses', 'siap'], menunggu: ['diproses', 'siap'], diproses: ['siap'], siap: ['selesai'] };
export const LABEL_STATUS: Record<string, string> = {
    menunggu: 'Menunggu (bayar tunai saat ambil)', dibayar: 'Dibayar, menunggu diproses', diproses: 'Sedang disiapkan', siap: 'Siap diambil', selesai: 'Selesai', batal: 'Dibatalkan',
};

function jumlah(v: unknown) {
    const n = Number(v);
    if (!Number.isInteger(n) || n < 0 || n > 99) throw new KantinSalah('Jumlah 0-99');
    return n;
}

/** Atur jumlah satu produk di tas anggota (0 = hapus). Produk harus aktif dan tampil di aplikasi. */
export async function aturTas(db: Q, i: { anggotaId: number; unitId: number; produkId: number; qty: number }) {
    const q = jumlah(i.qty);
    if (q === 0) { await db.query('DELETE FROM kantin_tas WHERE anggota_id = $1 AND unit_usaha_id = $2 AND produk_id = $3', [i.anggotaId, i.unitId, i.produkId]); return; }
    const p = (await db.query<{ nama: string; kelola_stok: boolean; stok: string }>(`SELECT p.nama, p.kelola_stok, p.stok FROM kantin_produk p JOIN unit_usaha u ON u.id = p.unit_usaha_id
        WHERE p.id = $1 AND p.unit_usaha_id = $2 AND p.aktif AND p.tampil_anggota AND u.aktif AND u.tampil_anggota`, [i.produkId, i.unitId])).rows[0];
    if (!p) throw new KantinSalah('Produk tidak tersedia');
    if (p.kelola_stok && Number(p.stok) < q) throw new KantinSalah(`Stok ${p.nama} tinggal ${Number(p.stok)}`);
    await db.query(`INSERT INTO kantin_tas (anggota_id, unit_usaha_id, produk_id, qty) VALUES ($1, $2, $3, $4)
        ON CONFLICT (anggota_id, unit_usaha_id, produk_id) DO UPDATE SET qty = EXCLUDED.qty, diubah_pada = now()`, [i.anggotaId, i.unitId, i.produkId, q]);
}

/** Batalkan pesanan tunai yang tidak diambil sampai batas waktunya. Dipanggil setiap daftar pesanan dibaca. */
export async function batalkanKedaluwarsa(db: Q) {
    await db.query(`UPDATE kantin_pesanan SET status = 'batal', alasan_batal = 'Tidak diambil sampai batas waktu', diubah_pada = now(), diubah_oleh = 'sistem'
        WHERE metode = 'tunai' AND status IN ('menunggu', 'diproses', 'siap') AND batas_ambil < now()`);
}

/**
 * Checkout tas satu kantin menjadi pesanan. Harga dan stok dibaca ulang di server; bila total berbeda dengan yang dilihat anggota (`totalDilihat`),
 * ditolak supaya anggota tidak membayar nilai yang tidak ia setujui. Sukarela: PIN sudah diperiksa pemanggil.
 */
export async function checkout(db: Db, i: { anggotaId: number; unitId: number; metode: 'tunai' | 'sukarela'; catatan?: string; totalDilihat: string | number; tanggal: string }) {
    const u = (await db.query<{ nama: string; aktif: boolean; tampil_anggota: boolean; terima_tunai: boolean; terima_sukarela: boolean; buka: boolean; menit: number }>(
        `SELECT nama, aktif, tampil_anggota, terima_tunai, terima_sukarela, menit_batal_pesanan menit,
                (jam_buka IS NULL OR jam_tutup IS NULL OR (now() AT TIME ZONE 'Asia/Jakarta')::time BETWEEN jam_buka AND jam_tutup) buka
           FROM unit_usaha WHERE id = $1 AND jenis = 'KANTIN'`, [i.unitId])).rows[0];
    if (!u?.aktif || !u.tampil_anggota) throw new KantinSalah('Kantin tidak tersedia');
    if (!u.buka) throw new KantinSalah(`${u.nama} sedang tutup`);
    if (i.metode === 'tunai' && !u.terima_tunai) throw new KantinSalah(`${u.nama} tidak menerima tunai`);
    if (i.metode === 'sukarela' && !u.terima_sukarela) throw new KantinSalah(`${u.nama} tidak menerima Simpanan Sukarela`);
    const tas = (await db.query<{ produk_id: string; qty: string; nama: string; satuan: string; harga_jual: string; aktif: boolean; tampil_anggota: boolean; kelola_stok: boolean; stok: string }>(
        `SELECT t.produk_id, t.qty, p.nama, p.satuan, p.harga_jual, p.aktif, p.tampil_anggota, p.kelola_stok, p.stok FROM kantin_tas t JOIN kantin_produk p ON p.id = t.produk_id
          WHERE t.anggota_id = $1 AND t.unit_usaha_id = $2 ORDER BY p.nama`, [i.anggotaId, i.unitId])).rows;
    if (!tas.length) throw new KantinSalah('Tas belanja kosong');
    let total = 0n;
    for (const t of tas) {
        if (!t.aktif || !t.tampil_anggota) throw new KantinSalah(`${t.nama} sudah tidak dijual; hapus dari tas`);
        if (t.kelola_stok && toUnits(t.stok) < toUnits(t.qty)) throw new KantinSalah(`Stok ${t.nama} tinggal ${Number(t.stok)}`);
        total += (toUnits(t.harga_jual) * toUnits(t.qty)) / 10000n;
    }
    if (total !== toUnits(String(i.totalDilihat))) throw new KantinSalah('Harga atau stok berubah. Periksa tas Anda lagi.');
    const isi = tas.map((t) => ({ produkId: Number(t.produk_id), nama: t.nama, satuan: t.satuan, qty: t.qty, harga: t.harga_jual }));
    const catatan = i.catatan?.trim().slice(0, 255) || null;

    let penjualanId: number | null = null, noBukti: string | null = null, saldo: string | undefined;
    if (i.metode === 'sukarela') {
        const r = await jualAplikasiSukarela(db, { unitId: i.unitId, anggotaId: i.anggotaId, tanggal: i.tanggal, items: isi.map((x) => ({ produkId: x.produkId, qty: x.qty })), catatan: catatan ?? undefined });
        penjualanId = r.id; noBukti = r.noBukti; saldo = r.saldoSukarela;
    }
    const id = Number((await db.query<{ id: string }>(`INSERT INTO kantin_pesanan (unit_usaha_id, anggota_id, isi, total, metode, status, catatan, batas_ambil, penjualan_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7, CASE WHEN $10 THEN now() + make_interval(mins => $8) END, $9) RETURNING id`,
        [i.unitId, i.anggotaId, JSON.stringify(isi), fromUnits(total), i.metode, i.metode === 'sukarela' ? 'dibayar' : 'menunggu', catatan, u.menit, penjualanId, i.metode === 'tunai'])).rows[0].id);
    await db.query('DELETE FROM kantin_tas WHERE anggota_id = $1 AND unit_usaha_id = $2', [i.anggotaId, i.unitId]);
    return { id, kantin: u.nama, total: fromUnits(total), noBukti, saldoSukarela: saldo, menit: u.menit };
}

/** Kasir memajukan status pesanan. Pesanan tunai hanya selesai lewat penjualan tunai di kasir (dimuat ke keranjang). */
export async function ubahStatusPesanan(db: Q, i: { id: number; unitId: number; status: 'diproses' | 'siap' | 'selesai'; opr: string }) {
    const p = (await db.query<{ status: string; metode: string; anggota_id: string }>('SELECT status, metode, anggota_id FROM kantin_pesanan WHERE id = $1 AND unit_usaha_id = $2 FOR UPDATE', [i.id, i.unitId])).rows[0];
    if (!p) throw new KantinSalah('Pesanan tidak ditemukan di kantin ini');
    if (!(LANJUT[p.status] ?? []).includes(i.status)) throw new KantinSalah(`Pesanan berstatus ${LABEL_STATUS[p.status] ?? p.status}`);
    if (i.status === 'selesai' && p.metode === 'tunai') throw new KantinSalah('Pesanan tunai selesai setelah dibayar di kasir: muat ke keranjang lalu Bayar Tunai');
    await db.query('UPDATE kantin_pesanan SET status = $1, diubah_pada = now(), diubah_oleh = $2 WHERE id = $3', [i.status, i.opr, i.id]);
    return { anggotaId: Number(p.anggota_id) };
}

/** Tolak/batalkan pesanan; pesanan sukarela yang sudah dibayar dikembalikan (nota dibatalkan, saldo kembali). */
export async function batalPesanan(db: Db, i: { id: number; unitId: number; alasan: string; opr: string; hariIni: string; olehAnggota?: number }) {
    const alasan = i.alasan.trim();
    if (alasan.length < 3) throw new KantinSalah('Tulis alasannya');
    const p = (await db.query<{ status: string; anggota_id: string; penjualan_id: string | null; metode: string }>(
        'SELECT status, anggota_id, penjualan_id, metode FROM kantin_pesanan WHERE id = $1 AND unit_usaha_id = $2 FOR UPDATE', [i.id, i.unitId])).rows[0];
    if (!p) throw new KantinSalah('Pesanan tidak ditemukan');
    if (i.olehAnggota !== undefined) {
        if (Number(p.anggota_id) !== i.olehAnggota) throw new KantinSalah('Pesanan tidak ditemukan');
        if (!['menunggu', 'dibayar'].includes(p.status)) throw new KantinSalah('Pesanan sudah diproses kantin; hubungi kasir untuk membatalkan');
    }
    if (p.status === 'selesai' || p.status === 'batal') throw new KantinSalah(`Pesanan sudah ${p.status}`);
    if (p.penjualan_id) await batalJual(db, { id: Number(p.penjualan_id), unitId: i.unitId, alasan: `Pesanan #${i.id} dibatalkan: ${alasan}`, opr: i.opr, hariIni: i.hariIni, semuaHari: true });
    await db.query(`UPDATE kantin_pesanan SET status = 'batal', alasan_batal = $1, diubah_pada = now(), diubah_oleh = $2 WHERE id = $3`, [alasan.slice(0, 255), i.opr, i.id]);
    return { anggotaId: Number(p.anggota_id), metode: p.metode, dikembalikan: !!p.penjualan_id };
}
