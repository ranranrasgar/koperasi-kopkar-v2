import type { Db } from '../db.ts';
import { toUnits } from './money.ts';
import { setorSimpanan } from './simpanan.ts';
import { bayarAngsuran } from './pinjaman.ts';
import { bayarAngsuranKpr } from './kpr.ts';

/**
 * Angsuran yang dipotong dari gaji bulan ini, satu baris per pinjaman anggota (tanpa syarat anggota aktif):
 * - pinjaman tunai grup KOPERASI dan BANK / PIHAK LAIN: pokok dan jasa dari baris jadwal tagih angsuran berikutnya
 *   (jml_cicilan + 1); adm dan provisi pinjaman hanya pada angsuran pertama, seperti desktop (JML_CICILAN = 0), karena
 *   jadwal tagih desktop mencatatnya dobel di angsuran ke-1 dan ke-2; pinjaman yang saldo pokok bukunya sudah habis
 *   (dilunasi sekaligus) dilewati, seperti desktop (sisa_pokok > 2000);
 * - KPR (jenis kredit grup KPR, sisa pokok > 2000 seperti desktop): angsuran per bulan, paling banyak sisa pokok.
 * Dipakai bersama oleh proyeksi Transaksi Potongan Gaji dan Generate periode, supaya keduanya selalu sama.
 */
export const SQL_ANGSURAN_POTONGAN = `
    SELECT p.anggota_id, 'tunai' AS jenis, p.id AS pinjaman_id, p.no_pinjaman, jk.group_pinjaman AS grup, t.angsuran_ke,
           t.debit_pokok AS pokok, t.debit_bunga AS jasa,
           CASE WHEN p.jml_cicilan = 0 THEN p.rp_adm ELSE 0 END AS adm, CASE WHEN p.jml_cicilan = 0 THEN p.rp_provisi ELSE 0 END AS provisi
      FROM pinjaman_tunai p JOIN jenis_kredit jk ON jk.id = p.jenis_kredit_id
      JOIN pinjaman_tunai_rincian_tagih t ON t.pinjaman_tunai_id = p.id AND t.angsuran_ke = p.jml_cicilan + 1
      -- LATERAL: saldo hanya dihitung untuk pinjaman yang punya angsuran berikutnya (subquery di WHERE 4x lebih lambat).
      LEFT JOIN LATERAL (SELECT SUM(r.kredit_pokok - r.debit_pokok) AS sisa FROM pinjaman_tunai_rincian r WHERE r.pinjaman_tunai_id = p.id) s ON true
     WHERE p.jml_cicilan < p.lama_angsuran AND jk.group_pinjaman IN ('KOPERASI', 'BANK / PIHAK LAIN')
       AND COALESCE(s.sisa, 1000000) > 100
    UNION ALL
    SELECT k.anggota_id, 'kpr', k.id, k.no_pinjaman, 'KPR', k.jml_cicilan + 1, LEAST(k.rp_angsuran_per_bulan, r.sisa), 0, 0, 0
      FROM kpr k JOIN jenis_kredit jk ON jk.id = k.jenis_kredit_id AND jk.group_pinjaman = 'KPR'
      JOIN LATERAL (SELECT SUM(kredit_pokok - debit_pokok) AS sisa FROM kpr_rincian WHERE kpr_id = k.id) r ON r.sisa > 2000`;

const PERIODE = /^\d{4}-(0[1-9]|1[0-2])$/;
const BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

function cekPeriode(periode: string) {
    if (!PERIODE.test(periode)) throw new Error(`Periode ${periode} tidak valid (YYYY-MM)`);
}

async function kunciPeriode(db: Db, periode: string) {
    const p = (await db.query<{ id: string; status: string }>('SELECT id, status FROM potongan_gaji WHERE periode = $1 FOR UPDATE', [periode])).rows[0];
    if (!p) throw new Error(`Periode ${periode} belum digenerate`);
    if (p.status !== 'draf') throw new Error(`Periode ${periode} sudah diposting`);
    return p.id;
}

/**
 * Isi ulang temp_potongan_all (tabel desktop) dari anggota yang dipotong pada periode ini. Masih dibaca oleh status
 * "Masuk daftar potongan" di aplikasi anggota dan potongan bulanan di API Android lama.
 */
async function isiTempPotonganAll(db: Db, id: string, periode: string, anggotaId?: string) {
    const ket = `${BULAN[Number(periode.slice(5, 7)) - 1]} ${periode.slice(2, 4)}`;
    // Satu anggota (setelah diubah) cukup baris anggota itu saja; generate mengisi ulang semuanya.
    if (anggotaId) await db.query('DELETE FROM temp_potongan_all WHERE anggota_id = $1', [anggotaId]);
    else await db.query('DELETE FROM temp_potongan_all');
    await db.query(
        `INSERT INTO temp_potongan_all (kode_agt, no_rek, nama_bank, atas_nama_rek, cara_bayar, nik, nama, kota, s_pokok, s_wajib, s_sukarela,
            rp_koperasi, rp_bank, rp_kpr, rp_adm_bank, keterangan, anggota_id)
         SELECT g.kode_agt, left(g.bank_no_rek, 15), left(g.bank_nama, 25), left(g.bank_atas_nama, 35), 'P', left(g.nik, 10), left(g.nama, 35),
                left(a.kota, 15), 0, g.s_wajib, g.s_sukarela, g.koperasi, g.bank, g.kpr, g.adm, $2, g.anggota_id
           FROM potongan_gaji_anggota g JOIN anggota a ON a.id = g.anggota_id
          WHERE g.potongan_gaji_id = $1 AND g.dipotong AND ($3::bigint IS NULL OR g.anggota_id = $3) ORDER BY g.nama`, [id, ket, anggotaId ?? null]);
}

export interface RingkasGenerate { periode: string; anggota: number; pinjaman: number; total: string }

/**
 * Generate potongan gaji satu periode untuk semua anggota aktif: simpanan wajib dan sukarela dari data anggota,
 * angsuran dari SQL_ANGSURAN_POTONGAN, dan adm bank perusahaan. Boleh diulang selama periode masih draf; tanda
 * "tidak dipotong" dari generate sebelumnya dipertahankan.
 */
export async function generatePotongan(db: Db, periode: string, opr: string): Promise<RingkasGenerate> {
    cekPeriode(periode);
    const ada = (await db.query<{ id: string; status: string }>('SELECT id, status FROM potongan_gaji WHERE periode = $1 FOR UPDATE', [periode])).rows[0];
    if (ada?.status === 'diposting') throw new Error(`Periode ${periode} sudah diposting, tidak bisa digenerate ulang`);
    const id = ada?.id ?? (await db.query<{ id: string }>(
        'INSERT INTO potongan_gaji (periode, dibuat_oleh) VALUES ($1, $2) RETURNING id', [periode, opr])).rows[0].id;
    if (ada) await db.query('UPDATE potongan_gaji SET digenerate_pada = now() WHERE id = $1', [id]);

    const lama = (await db.query<{ anggota_id: string; alasan: string | null; diubah_oleh: string | null; diubah_pada: string | null }>(
        'SELECT anggota_id, alasan, diubah_oleh, diubah_pada FROM potongan_gaji_anggota WHERE potongan_gaji_id = $1 AND NOT dipotong', [id])).rows;
    await db.query('DELETE FROM potongan_gaji_pinjaman WHERE potongan_gaji_id = $1', [id]);
    await db.query('DELETE FROM potongan_gaji_anggota WHERE potongan_gaji_id = $1', [id]);

    await db.query(
        `INSERT INTO potongan_gaji_pinjaman (potongan_gaji_id, anggota_id, jenis, pinjaman_id, no_pinjaman, grup, angsuran_ke, pokok, jasa, adm, provisi)
         SELECT $1, x.anggota_id, x.jenis, x.pinjaman_id, x.no_pinjaman, x.grup, x.angsuran_ke, x.pokok, x.jasa, x.adm, x.provisi
           FROM (${SQL_ANGSURAN_POTONGAN}) x JOIN anggota a ON a.id = x.anggota_id AND a.aktif`, [id]);
    await db.query(
        `INSERT INTO potongan_gaji_anggota (potongan_gaji_id, anggota_id, kode_agt, nik, nama, status_staff, bank_nama, bank_no_rek, bank_atas_nama,
            s_wajib, s_sukarela, koperasi, bank, kpr, adm)
         SELECT $1, a.id, a.kode_agt, a.nik, a.nama, a.status_staff, a.bank_nama, a.bank_no_rek, a.bank_atas_nama,
                a.simpanan_wajib, a.simpanan_sukarela, COALESCE(j.koperasi, 0), COALESCE(j.bank, 0), COALESCE(j.kpr, 0),
                COALESCE((SELECT rp_adm_bank FROM perusahaan ORDER BY id LIMIT 1), 0)
           FROM anggota a
           LEFT JOIN (SELECT anggota_id,
                             SUM(pokok + jasa + adm + provisi) FILTER (WHERE grup = 'KOPERASI') AS koperasi,
                             SUM(pokok + jasa + adm + provisi) FILTER (WHERE grup = 'BANK / PIHAK LAIN') AS bank,
                             SUM(pokok) FILTER (WHERE grup = 'KPR') AS kpr
                        FROM potongan_gaji_pinjaman WHERE potongan_gaji_id = $1 GROUP BY 1) j ON j.anggota_id = a.id
          WHERE a.aktif`, [id]);
    if (lama.length)
        await db.query(
            `UPDATE potongan_gaji_anggota g SET dipotong = false, alasan = l.alasan, diubah_oleh = l.diubah_oleh, diubah_pada = l.diubah_pada::timestamptz
               FROM unnest($2::bigint[], $3::text[], $4::text[], $5::text[]) AS l(anggota_id, alasan, diubah_oleh, diubah_pada)
              WHERE g.potongan_gaji_id = $1 AND g.anggota_id = l.anggota_id`,
            [id, lama.map((l) => l.anggota_id), lama.map((l) => l.alasan), lama.map((l) => l.diubah_oleh), lama.map((l) => l.diubah_pada)]);
    await isiTempPotonganAll(db, id, periode);

    const r = (await db.query<{ anggota: string; pinjaman: string; total: string }>(
        `SELECT COUNT(*) anggota, (SELECT COUNT(*) FROM potongan_gaji_pinjaman WHERE potongan_gaji_id = $1) pinjaman,
                SUM(s_wajib + s_sukarela + koperasi + bank + kpr + adm) total
           FROM potongan_gaji_anggota WHERE potongan_gaji_id = $1`, [id])).rows[0];
    return { periode, anggota: Number(r.anggota), pinjaman: Number(r.pinjaman), total: r.total ?? '0' };
}

/** Tandai anggota dipotong atau tidak pada periode draf (gaji tidak cukup, cuti, dibayar manual, ...). */
export const setDipotong = (db: Db, periode: string, kodeAgt: string, dipotong: boolean, alasan: string | null, opr: string) =>
    ubahPotongan(db, periode, kodeAgt, { dipotong, alasan }, opr);

export interface UbahPotongan {
    dipotong: boolean;
    alasan: string | null;
    sWajib?: string;
    sSukarela?: string;
    /** Nominal per pinjaman (id baris potongan_gaji_pinjaman). Semua nol = pinjaman itu tidak dipotong bulan ini. */
    pinjaman?: { id: string; pokok: string; jasa: string; adm: string; provisi: string }[];
}

/**
 * Ubah potongan satu anggota pada periode draf, seperti operator desktop sebelum posting: tidak dipotong, nominal
 * simpanan, atau nominal angsuran per pinjaman (mis. pembagian pokok/jasa dari rincian bank). Kolom koperasi/bank/kpr
 * anggota dihitung ulang dari baris pinjaman.
 */
export async function ubahPotongan(db: Db, periode: string, kodeAgt: string, u: UbahPotongan, opr: string) {
    cekPeriode(periode);
    const id = await kunciPeriode(db, periode);
    const uang = (v: string | undefined, label: string) => {
        if (v === undefined) return undefined;
        if (!/^\d+(\.\d{1,4})?$/.test(v)) throw new Error(`${label} harus angka 0 atau lebih`);
        return v;
    };
    const g = (await db.query<{ id: string; anggota_id: string }>(
        'SELECT id, anggota_id FROM potongan_gaji_anggota WHERE potongan_gaji_id = $1 AND kode_agt = $2', [id, kodeAgt])).rows[0];
    if (!g) throw new Error(`Anggota ${kodeAgt} tidak ada di potongan ${periode}`);
    for (const p of u.pinjaman ?? []) {
        const r = await db.query(
            `UPDATE potongan_gaji_pinjaman SET pokok = $4, jasa = $5, adm = $6, provisi = $7
              WHERE id = $1 AND potongan_gaji_id = $2 AND anggota_id = $3`,
            [p.id, id, g.anggota_id, uang(p.pokok, 'Pokok'), uang(p.jasa, 'Jasa'), uang(p.adm, 'Adm'), uang(p.provisi, 'Provisi')]);
        if (!r.rowCount) throw new Error(`Pinjaman ${p.id} bukan milik ${kodeAgt}`);
    }
    await db.query(
        `UPDATE potongan_gaji_anggota g SET dipotong = $2, alasan = $3, diubah_oleh = $4, diubah_pada = now(),
                s_wajib = COALESCE($5::numeric, g.s_wajib), s_sukarela = COALESCE($6::numeric, g.s_sukarela),
                koperasi = COALESCE(j.koperasi, 0), bank = COALESCE(j.bank, 0), kpr = COALESCE(j.kpr, 0)
           FROM (SELECT SUM(pokok + jasa + adm + provisi) FILTER (WHERE grup = 'KOPERASI') AS koperasi,
                        SUM(pokok + jasa + adm + provisi) FILTER (WHERE grup = 'BANK / PIHAK LAIN') AS bank,
                        SUM(pokok) FILTER (WHERE grup = 'KPR') AS kpr
                   FROM potongan_gaji_pinjaman WHERE potongan_gaji_id = $7 AND anggota_id = $8) j
          WHERE g.id = $1`,
        [g.id, u.dipotong, u.dipotong ? null : (u.alasan || null), opr, uang(u.sWajib, 'Simpanan wajib') ?? null,
         uang(u.sSukarela, 'Simpanan sukarela') ?? null, id, g.anggota_id]);
    await isiTempPotonganAll(db, id, periode, g.anggota_id);
}

export interface PostingPotonganInput { periode: string; tanggal: string; kasPerkiraanId: number | string; opr: string }
export interface RingkasPosting { periode: string; anggota: number; simpanan: number; angsuran: number; kpr: number }

/**
 * Posting potongan gaji periode draf: untuk tiap anggota yang dipotong, setoran simpanan wajib dan sukarela lalu angsuran
 * setiap pinjamannya (nominal persis hasil generate), lewat mesin posting yang sama dengan form kasir (nomor bukti dan
 * jurnal sama). Dijalankan di satu transaksi oleh pemanggil: satu galat membatalkan seluruh posting.
 * Adm bank tidak dibukukan (desktop juga tidak): biaya itu milik bank penyalur gaji.
 */
export async function postingPotongan(db: Db, i: PostingPotonganInput): Promise<RingkasPosting> {
    cekPeriode(i.periode);
    if (i.tanggal.slice(0, 7) !== i.periode) throw new Error(`Tanggal posting ${i.tanggal} harus di bulan periode ${i.periode}`);
    const id = await kunciPeriode(db, i.periode);
    const deskripsi = `Potongan gaji ${i.periode}`;

    const anggota = (await db.query<{ id: string; anggota_id: string; kode_agt: string; s_wajib: string; s_sukarela: string }>(
        `SELECT id, anggota_id, kode_agt, s_wajib, s_sukarela FROM potongan_gaji_anggota
          WHERE potongan_gaji_id = $1 AND dipotong ORDER BY nama, kode_agt`, [id])).rows;
    const pinjaman = (await db.query<{ id: string; anggota_id: string; jenis: string; pinjaman_id: string; no_pinjaman: string; angsuran_ke: number;
        pokok: string; jasa: string; adm: string; provisi: string }>(
        `SELECT p.id, p.anggota_id, p.jenis, p.pinjaman_id, p.no_pinjaman, p.angsuran_ke, p.pokok, p.jasa, p.adm, p.provisi
           FROM potongan_gaji_pinjaman p JOIN potongan_gaji_anggota g ON g.potongan_gaji_id = p.potongan_gaji_id AND g.anggota_id = p.anggota_id
          WHERE p.potongan_gaji_id = $1 AND g.dipotong ORDER BY p.jenis DESC, p.no_pinjaman`, [id])).rows;
    const perAnggota = new Map<string, typeof pinjaman>();
    for (const p of pinjaman) perAnggota.set(p.anggota_id, [...(perAnggota.get(p.anggota_id) ?? []), p]);

    const n = { simpanan: 0, angsuran: 0, kpr: 0 };
    for (const a of anggota) {
        const bukti: Record<string, string | null> = { wajib: null, sukarela: null };
        for (const [jenis, kode, rp] of [['wajib', '02', a.s_wajib], ['sukarela', '03', a.s_sukarela]] as const) {
            if (toUnits(rp) <= 0n) continue;
            bukti[jenis] = (await setorSimpanan(db, { kodeAgt: a.kode_agt, jenisSimpanan: kode, tanggal: i.tanggal, jumlah: rp,
                kasPerkiraanId: i.kasPerkiraanId, opr: i.opr, deskripsi })).noBukti;
            n.simpanan++;
        }
        await db.query('UPDATE potongan_gaji_anggota SET bukti_wajib = $2, bukti_sukarela = $3 WHERE id = $1', [a.id, bukti.wajib, bukti.sukarela]);

        for (const p of perAnggota.get(a.anggota_id) ?? []) {
            // Semua nominal nol: operator memutuskan pinjaman ini tidak dipotong bulan ini.
            if (toUnits(p.pokok) + toUnits(p.jasa) + toUnits(p.adm) + toUnits(p.provisi) === 0n) continue;
            let noBukti: string;
            if (p.jenis === 'tunai') {
                noBukti = (await bayarAngsuran(db, { noPinjaman: p.no_pinjaman, tanggal: i.tanggal, kasPerkiraanId: i.kasPerkiraanId, opr: i.opr,
                    angsuranKe: p.angsuran_ke, override: { pokok: p.pokok, jasa: p.jasa, adm: p.adm, provisi: p.provisi } })).noBukti;
                n.angsuran++;
            } else {
                const k = (await db.query<{ jml_cicilan: number }>('SELECT jml_cicilan FROM kpr WHERE id = $1', [p.pinjaman_id])).rows[0];
                if (k?.jml_cicilan + 1 !== p.angsuran_ke)
                    throw new Error(`KPR ${p.no_pinjaman}: angsuran berikutnya ke-${(k?.jml_cicilan ?? 0) + 1}, bukan ke-${p.angsuran_ke}. Generate ulang periode ini.`);
                noBukti = (await bayarAngsuranKpr(db, { noPinjaman: p.no_pinjaman, tanggal: i.tanggal, kasPerkiraanId: i.kasPerkiraanId, opr: i.opr,
                    jumlah: p.pokok })).noBukti;
                n.kpr++;
            }
            await db.query('UPDATE potongan_gaji_pinjaman SET no_bukti = $2 WHERE id = $1', [p.id, noBukti]);
        }
    }
    await db.query(
        `UPDATE potongan_gaji SET status = 'diposting', tgl_posting = $2, kas_perkiraan_id = $3, diposting_oleh = $4, diposting_pada = now()
          WHERE id = $1`, [id, i.tanggal, i.kasPerkiraanId, i.opr]);
    return { periode: i.periode, anggota: anggota.length, ...n };
}
