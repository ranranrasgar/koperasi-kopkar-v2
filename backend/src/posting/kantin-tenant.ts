import type { Db } from '../db.ts';
import { KantinSalah } from '../unit-usaha/kantin.ts';
import { cekAkunDetail, cekBuktiTerbuka, postJournal, type JournalLine } from './journal.ts';
import { unit } from './kantin.ts';
import { fromUnits, round2, toUnits } from './money.ts';

// Penyelesaian dengan tenant kantin (model bagi_hasil / sewa) per periode. Rancangan: docs/prd-kantin.md bagian 3a.
//   Sepanjang periode, setiap nota sudah menjurnal: tunai -> Dr Piutang Tenant / Cr Pendapatan (bagi hasil);
//   sukarela -> Dr Simpanan Sukarela / Cr Utang ke Tenant (total - bagi hasil) + Cr Pendapatan (bagi hasil).
//   Penyelesaian: kekurangan minimum bulanan (bagi hasil) atau sewa dijurnal Dr Piutang Tenant / Cr Pendapatan, lalu utang dan piutang
//   disalingkan: Dr Utang ke Tenant, Cr Piutang Tenant, selisihnya lewat akun kas/bank (neto positif = koperasi membayar tenant).

const TGL = /^\d{4}-\d{2}-\d{2}$/;

export interface HitungPenyelesaian {
    unitId: number; nama: string; model: string; tenant: string | null; dari: string; sampai: string
    nota: number; penjualan: string; tunai: string; sukarela: string; bagiHasil: string
    persen: string | null; minimum: string; sewa: string; periode: string
    tambahan: string; utang: string; piutang: string; neto: string
}

/** Hitung penyelesaian satu kantin tenant untuk nota yang belum diselesaikan di periode itu. Hanya membaca. */
export async function hitungPenyelesaian(db: Pick<Db, 'query'>, unitId: number, dari: string, sampai: string): Promise<HitungPenyelesaian> {
    if (!TGL.test(dari) || !TGL.test(sampai) || dari > sampai) throw new KantinSalah('Periode tidak valid');
    const u = await unit(db, unitId);
    if (u.model === 'milik') throw new KantinSalah(`${u.nama} milik koperasi; tidak ada penyelesaian tenant`);
    const k = (await db.query<{ nama_usaha: string | null; persen_bagi_hasil: string; minimum_bulanan: string; sewa_bulanan: string; periode_penyelesaian: string }>(
        `SELECT t.nama_usaha, k.persen_bagi_hasil, k.minimum_bulanan, k.sewa_bulanan, k.periode_penyelesaian FROM tenant_kontrak k JOIN tenant t ON t.id = k.tenant_id
          WHERE k.unit_usaha_id = $1 AND k.mulai <= $2 AND (k.selesai IS NULL OR k.selesai >= $3) ORDER BY k.mulai DESC LIMIT 1`, [unitId, sampai, dari])).rows[0];
    if (!k) throw new KantinSalah(`Tidak ada kontrak tenant ${u.nama} pada periode ini`);
    const r = (await db.query<{ nota: string; penjualan: string; tunai: string; sukarela: string; bagi: string; bagi_tunai: string; bagi_sukarela: string }>(
        `SELECT count(*) nota, COALESCE(SUM(total), 0) penjualan,
                COALESCE(SUM(total) FILTER (WHERE metode = 'tunai'), 0) tunai, COALESCE(SUM(total) FILTER (WHERE metode = 'sukarela'), 0) sukarela,
                COALESCE(SUM(bagi_hasil), 0) bagi, COALESCE(SUM(bagi_hasil) FILTER (WHERE metode = 'tunai'), 0) bagi_tunai,
                COALESCE(SUM(bagi_hasil) FILTER (WHERE metode = 'sukarela'), 0) bagi_sukarela
           FROM kantin_penjualan WHERE unit_usaha_id = $1 AND tanggal BETWEEN $2 AND $3 AND status <> 'batal' AND penyelesaian_id IS NULL`,
        [unitId, dari, sampai])).rows[0];
    const bagi = toUnits(r.bagi);
    // Minimum bagi hasil dan sewa adalah nilai bulanan: hanya berlaku untuk penyelesaian bulanan.
    const bulanan = k.periode_penyelesaian === 'bulanan';
    const tambahan = !bulanan ? 0n : u.model === 'sewa' ? toUnits(k.sewa_bulanan)
        : toUnits(k.minimum_bulanan) > bagi ? toUnits(k.minimum_bulanan) - bagi : 0n;
    const utang = toUnits(r.sukarela) - toUnits(r.bagi_sukarela);
    const piutang = toUnits(r.bagi_tunai) + tambahan;
    return {
        unitId, nama: u.nama, model: u.model, tenant: k.nama_usaha, dari, sampai, nota: Number(r.nota),
        penjualan: r.penjualan, tunai: r.tunai, sukarela: r.sukarela, bagiHasil: r.bagi,
        persen: u.model === 'bagi_hasil' ? k.persen_bagi_hasil : null, minimum: k.minimum_bulanan, sewa: k.sewa_bulanan, periode: k.periode_penyelesaian,
        tambahan: fromUnits(tambahan), utang: fromUnits(utang), piutang: fromUnits(piutang), neto: fromUnits(utang - piutang),
    };
}

/** Simpan penyelesaian: jurnal KTP, nota periode ditandai (tidak bisa dibatalkan lagi), satu baris tenant_penyelesaian. */
export async function simpanPenyelesaian(db: Db, i: { unitId: number; dari: string; sampai: string; tanggal: string; akunKas: string; catatan?: string; opr: string }) {
    if (!TGL.test(i.tanggal)) throw new KantinSalah('Tanggal tidak valid');
    await db.query('SELECT pg_advisory_xact_lock(hashtext($1), $2::int)', ['tenant_penyelesaian', i.unitId]);
    const tumpang = (await db.query<{ no_bukti: string }>(`SELECT no_bukti FROM tenant_penyelesaian WHERE unit_usaha_id = $1 AND dibatalkan_pada IS NULL
        AND periode_mulai <= $3 AND periode_selesai >= $2 LIMIT 1`, [i.unitId, i.dari, i.sampai])).rows[0];
    if (tumpang) throw new KantinSalah(`Periode ini bertumpuk dengan penyelesaian ${tumpang.no_bukti}`);
    const h = await hitungPenyelesaian(db, i.unitId, i.dari, i.sampai);
    const u = await unit(db, i.unitId);
    const tambahan = toUnits(h.tambahan), utang = toUnits(h.utang), piutang = toUnits(h.piutang), neto = utang - piutang;
    if (h.nota === 0 && tambahan === 0n) throw new KantinSalah('Tidak ada nota dan tagihan pada periode ini');
    const akun = i.akunKas.trim();
    if (round2(neto) !== 0n) {
        const a = (await db.query<{ keterangan: string }>('SELECT keterangan FROM perkiraan WHERE kode_perkiraan = $1', [akun])).rows[0];
        if (!a || !['BANK', 'GC'].includes(a.keterangan)) throw new KantinSalah('Pilih akun kas/bank untuk transfer');
        await cekAkunDetail(db, [akun]);
    }
    const tenantId = (await db.query<{ tenant_id: string | null }>('SELECT tenant_id FROM unit_usaha WHERE id = $1', [i.unitId])).rows[0].tenant_id;
    const no = `KTP-${i.tanggal.slice(2, 4)}${i.tanggal.slice(5, 7)}-${(await db.query<{ n: string }>("SELECT nextval('seq_kantin_selesai') n")).rows[0].n}`;
    const id = Number((await db.query<{ id: string }>(`INSERT INTO tenant_penyelesaian (no_bukti, unit_usaha_id, tenant_id, model, periode_mulai, periode_selesai, tanggal, nota,
            total_penjualan, total_tunai, total_sukarela, bagi_hasil, tambahan, utang_tenant, piutang_tenant, neto, akun_kas, catatan, opr)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19) RETURNING id`,
        [no, i.unitId, tenantId, h.model, i.dari, i.sampai, i.tanggal, h.nota, h.penjualan, h.tunai, h.sukarela, h.bagiHasil, h.tambahan, h.utang, h.piutang,
         fromUnits(neto), round2(neto) !== 0n ? akun : null, i.catatan?.trim().slice(0, 255) || null, i.opr])).rows[0].id);
    await db.query(`UPDATE kantin_penjualan SET penyelesaian_id = $1 WHERE unit_usaha_id = $2 AND tanggal BETWEEN $3 AND $4 AND status <> 'batal' AND penyelesaian_id IS NULL`,
        [id, i.unitId, i.dari, i.sampai]);

    const lines: JournalLine[] = [];
    const d = (kode: string, n: bigint, ket?: string) => { if (n !== 0n) lines.push({ kodePerkiraan: kode, debit: fromUnits(n), deskripsi: ket }); };
    const k = (kode: string, n: bigint, ket?: string) => { if (n !== 0n) lines.push({ kodePerkiraan: kode, kredit: fromUnits(n), deskripsi: ket }); };
    const periode = `${i.dari} s.d. ${i.sampai}`;
    if (tambahan) { d(u.piutang!, tambahan); k(u.pendapatan!, tambahan, `${u.model === 'sewa' ? 'Sewa' : 'Kekurangan minimum bagi hasil'} ${u.nama} ${periode}`); }
    d(u.utang!, utang); k(u.piutang!, piutang);
    if (neto > 0n) k(akun, neto, `Transfer ke tenant ${h.tenant ?? u.nama}`);
    if (neto < 0n) d(akun, -neto, `Setoran tenant ${h.tenant ?? u.nama}`);
    if (lines.length) await postJournal(db, { nomorBukti: no, tanggal: i.tanggal, deskripsi: `Penyelesaian tenant ${u.nama} ${periode}`, opr: i.opr, sumberTipe: 'kantin_tenant', sumberId: id, lines });
    return { id, noBukti: no, ...h };
}

/** Batalkan penyelesaian: jurnalnya dihapus (periode harus terbuka) dan notanya bisa diselesaikan atau dibatalkan lagi. */
export async function batalPenyelesaian(db: Db, i: { id: number; opr: string }) {
    const p = (await db.query<{ no_bukti: string; dibatalkan_pada: string | null }>('SELECT no_bukti, dibatalkan_pada FROM tenant_penyelesaian WHERE id = $1 FOR UPDATE', [i.id])).rows[0];
    if (!p) throw new KantinSalah('Penyelesaian tidak ditemukan');
    if (p.dibatalkan_pada) throw new KantinSalah(`${p.no_bukti} sudah dibatalkan`);
    await cekBuktiTerbuka(db, p.no_bukti);
    await db.query('DELETE FROM jurnal_umum WHERE nomor_bukti = $1', [p.no_bukti]);
    await db.query('UPDATE kantin_penjualan SET penyelesaian_id = NULL WHERE penyelesaian_id = $1', [i.id]);
    await db.query('UPDATE tenant_penyelesaian SET dibatalkan_pada = now(), opr_batal = $1 WHERE id = $2', [i.opr, i.id]);
    return { noBukti: p.no_bukti };
}
