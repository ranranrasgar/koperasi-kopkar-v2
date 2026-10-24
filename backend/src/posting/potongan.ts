import type { Db } from '../db.ts';
import { fromUnits, toUnits } from './money.ts';
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
    if (p.status !== 'draf') throw new Error(`Periode ${periode} sudah ${p.status === 'sebagian' ? 'diposting sebagian' : 'diposting'}; data tidak bisa diubah lagi`);
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
    if (ada && ada.status !== 'draf') throw new Error(`Periode ${periode} sudah ${ada.status === 'sebagian' ? 'diposting sebagian' : 'diposting'}, tidak bisa digenerate ulang`);
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
            s_pokok, s_wajib, s_sukarela, koperasi, bank, kpr, adm)
         SELECT $1, a.id, a.kode_agt, a.nik, a.nama, a.status_staff, a.bank_nama, a.bank_no_rek, a.bank_atas_nama,
                a.simpanan_pokok, a.simpanan_wajib, a.simpanan_sukarela, COALESCE(j.koperasi, 0), COALESCE(j.bank, 0), COALESCE(j.kpr, 0),
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
    sPokok?: string;
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
                s_pokok = COALESCE($9::numeric, g.s_pokok),
                koperasi = COALESCE(j.koperasi, 0), bank = COALESCE(j.bank, 0), kpr = COALESCE(j.kpr, 0)
           FROM (SELECT SUM(pokok + jasa + adm + provisi) FILTER (WHERE grup = 'KOPERASI') AS koperasi,
                        SUM(pokok + jasa + adm + provisi) FILTER (WHERE grup = 'BANK / PIHAK LAIN') AS bank,
                        SUM(pokok) FILTER (WHERE grup = 'KPR') AS kpr
                   FROM potongan_gaji_pinjaman WHERE potongan_gaji_id = $7 AND anggota_id = $8) j
          WHERE g.id = $1`,
        [g.id, u.dipotong, u.dipotong ? null : (u.alasan || null), opr, uang(u.sWajib, 'Simpanan wajib') ?? null,
         uang(u.sSukarela, 'Simpanan sukarela') ?? null, id, g.anggota_id, uang(u.sPokok, 'Simpanan pokok') ?? null]);
    await isiTempPotonganAll(db, id, periode, g.anggota_id);
}

/** Bagian posting, seperti form posting desktop: Simpanan (centang Pokok/Wajib/Sukarela), Pinjaman Koperasi, Bank, KPR. */
export const BAGIAN = ['pokok', 'wajib', 'sukarela', 'koperasi', 'bank', 'kpr'] as const;
export type Bagian = typeof BAGIAN[number];
const GRUP: Record<string, Bagian> = { KOPERASI: 'koperasi', 'BANK / PIHAK LAIN': 'bank', KPR: 'kpr' };
const KODE_SIMPANAN = { pokok: '01', wajib: '02', sukarela: '03' } as const;
/** Bagian yang harus diposting sebelum periode selesai (bila ada nilainya). Simpanan pokok opsional, seperti CheckBox1 desktop. */
const BAGIAN_WAJIB: Bagian[] = ['wajib', 'sukarela', 'koperasi', 'bank', 'kpr'];

export interface RingkasBagian {
    bagian: Bagian; transaksi: number; jumlah: string
    posting: { tgl_posting: string; kas: string; diposting_oleh: string; diposting_pada: string } | null
}

/** Jumlah transaksi dan nominal per bagian (anggota yang dipotong), beserta keterangan posting bila sudah diposting. */
export async function ringkasBagian(db: Pick<Db, 'query'>, periode: string): Promise<RingkasBagian[]> {
    const r = await db.query<{ bagian: Bagian; transaksi: string; jumlah: string; tgl_posting: string | null; kas: string | null;
        diposting_oleh: string | null; diposting_pada: string | null }>(
        `WITH p AS (SELECT id FROM potongan_gaji WHERE periode = $1),
              x AS (
                SELECT 'pokok' bagian, COUNT(*) FILTER (WHERE g.s_pokok > 0) n, COALESCE(SUM(g.s_pokok), 0) rp FROM potongan_gaji_anggota g, p WHERE g.potongan_gaji_id = p.id AND g.dipotong
                UNION ALL SELECT 'wajib', COUNT(*) FILTER (WHERE g.s_wajib > 0), COALESCE(SUM(g.s_wajib), 0) FROM potongan_gaji_anggota g, p WHERE g.potongan_gaji_id = p.id AND g.dipotong
                UNION ALL SELECT 'sukarela', COUNT(*) FILTER (WHERE g.s_sukarela > 0), COALESCE(SUM(g.s_sukarela), 0) FROM potongan_gaji_anggota g, p WHERE g.potongan_gaji_id = p.id AND g.dipotong
                UNION ALL SELECT CASE x.grup WHEN 'KOPERASI' THEN 'koperasi' WHEN 'KPR' THEN 'kpr' ELSE 'bank' END,
                       COUNT(*) FILTER (WHERE x.pokok + x.jasa + x.adm + x.provisi > 0), COALESCE(SUM(x.pokok + x.jasa + x.adm + x.provisi), 0)
                  FROM potongan_gaji_pinjaman x JOIN p ON x.potongan_gaji_id = p.id
                  JOIN potongan_gaji_anggota g ON g.potongan_gaji_id = p.id AND g.anggota_id = x.anggota_id AND g.dipotong GROUP BY x.grup)
         SELECT b.bagian, COALESCE(s.transaksi, x.n, 0)::text transaksi, COALESCE(s.jumlah, x.rp, 0)::text jumlah,
                s.tgl_posting::text tgl_posting, k.kode_perkiraan || ' ' || k.nama_perkiraan kas, s.diposting_oleh,
                to_char(s.diposting_pada, 'YYYY-MM-DD HH24:MI') diposting_pada
           FROM unnest($2::text[]) WITH ORDINALITY b(bagian, urut)
           LEFT JOIN x ON x.bagian = b.bagian
           LEFT JOIN potongan_gaji_posting s ON s.potongan_gaji_id = (SELECT id FROM p) AND s.bagian = b.bagian
           LEFT JOIN perkiraan k ON k.id = s.kas_perkiraan_id
          ORDER BY b.urut`, [periode, [...BAGIAN]]);
    return r.rows.map((b) => ({
        bagian: b.bagian, transaksi: Number(b.transaksi), jumlah: b.jumlah,
        posting: b.tgl_posting ? { tgl_posting: b.tgl_posting, kas: b.kas ?? '', diposting_oleh: b.diposting_oleh ?? '', diposting_pada: b.diposting_pada ?? '' } : null,
    }));
}

export interface PostingPotonganInput { periode: string; tanggal: string; kasPerkiraanId: number | string; opr: string; bagian: Bagian[] }
export interface RingkasPosting { periode: string; bagian: { bagian: Bagian; transaksi: number }[]; selesai: boolean }

/**
 * Posting bagian-bagian potongan gaji yang dipilih (seperti tombol Posting di tiap form desktop), dengan tanggal dan akun
 * kas yang sama untuk bagian-bagian itu. Tiap bagian hanya bisa diposting sekali. Setelah bagian pertama diposting, data
 * periode terkunci (tidak bisa diubah atau digenerate ulang); setelah semua bagian wajib yang ada nilainya diposting,
 * periode selesai (diposting).
 *
 * Transaksi lewat mesin posting yang sama dengan form kasir: simpanan pokok/wajib/sukarela (SMPM, jurnal kas lawan akun
 * jenis simpanan), angsuran pinjaman tunai (pokok, jasa, adm, provisi persis hasil generate; jml_cicilan naik; jurnal ke
 * COA jenis kredit, no_bukti_transaksi = nomor pinjaman), angsuran KPR. Dijalankan di satu transaksi oleh pemanggil:
 * satu galat membatalkan semua bagian di panggilan ini. Adm bank tidak dibukukan (desktop juga tidak).
 */
export async function postingPotongan(db: Db, i: PostingPotonganInput): Promise<RingkasPosting> {
    cekPeriode(i.periode);
    if (i.tanggal.slice(0, 7) !== i.periode) throw new Error(`Tanggal posting ${i.tanggal} harus di bulan periode ${i.periode}`);
    const pilih = [...new Set(i.bagian)].filter((b): b is Bagian => (BAGIAN as readonly string[]).includes(b));
    if (pilih.length === 0) throw new Error('Pilih minimal satu bagian yang akan diposting');
    const per = (await db.query<{ id: string; status: string }>('SELECT id, status FROM potongan_gaji WHERE periode = $1 FOR UPDATE', [i.periode])).rows[0];
    if (!per) throw new Error(`Periode ${i.periode} belum digenerate`);
    if (per.status === 'diposting') throw new Error(`Periode ${i.periode} sudah selesai diposting`);
    const id = per.id;
    const sudah = (await db.query<{ bagian: Bagian }>('SELECT bagian FROM potongan_gaji_posting WHERE potongan_gaji_id = $1', [id])).rows.map((r) => r.bagian);
    const dobel = pilih.filter((b) => sudah.includes(b));
    if (dobel.length) throw new Error(`Bagian ${dobel.join(', ')} sudah diposting`);
    const deskripsi = `Potongan gaji ${i.periode}`;

    const anggota = (await db.query<{ id: string; anggota_id: string; kode_agt: string; s_pokok: string; s_wajib: string; s_sukarela: string }>(
        `SELECT id, anggota_id, kode_agt, s_pokok, s_wajib, s_sukarela FROM potongan_gaji_anggota
          WHERE potongan_gaji_id = $1 AND dipotong ORDER BY nama, kode_agt`, [id])).rows;
    const pinjaman = (await db.query<{ id: string; grup: string; jenis: string; pinjaman_id: string; no_pinjaman: string; angsuran_ke: number;
        pokok: string; jasa: string; adm: string; provisi: string }>(
        `SELECT p.id, p.grup, p.jenis, p.pinjaman_id, p.no_pinjaman, p.angsuran_ke, p.pokok, p.jasa, p.adm, p.provisi
           FROM potongan_gaji_pinjaman p JOIN potongan_gaji_anggota g ON g.potongan_gaji_id = p.potongan_gaji_id AND g.anggota_id = p.anggota_id
          WHERE p.potongan_gaji_id = $1 AND g.dipotong ORDER BY g.nama, g.kode_agt, p.no_pinjaman`, [id])).rows;

    const hasil: { bagian: Bagian; transaksi: number; jumlah: bigint }[] = [];
    for (const b of BAGIAN.filter((x) => pilih.includes(x))) {
        let transaksi = 0, jumlah = 0n;
        if (b === 'pokok' || b === 'wajib' || b === 'sukarela') {
            const kolom = `s_${b}` as const;
            for (const a of anggota) {
                const rp = a[kolom];
                if (toUnits(rp) <= 0n) continue;
                const noBukti = (await setorSimpanan(db, { kodeAgt: a.kode_agt, jenisSimpanan: KODE_SIMPANAN[b], tanggal: i.tanggal, jumlah: rp,
                    kasPerkiraanId: i.kasPerkiraanId, opr: i.opr, deskripsi })).noBukti;
                await db.query(`UPDATE potongan_gaji_anggota SET bukti_${b} = $2 WHERE id = $1`, [a.id, noBukti]);
                transaksi++; jumlah += toUnits(rp);
            }
        } else {
            for (const p of pinjaman.filter((x) => GRUP[x.grup] === b)) {
                const total = toUnits(p.pokok) + toUnits(p.jasa) + toUnits(p.adm) + toUnits(p.provisi);
                // Semua nominal nol: operator memutuskan pinjaman ini tidak dipotong bulan ini.
                if (total === 0n) continue;
                let noBukti: string;
                if (p.jenis === 'tunai') {
                    noBukti = (await bayarAngsuran(db, { noPinjaman: p.no_pinjaman, tanggal: i.tanggal, kasPerkiraanId: i.kasPerkiraanId, opr: i.opr,
                        angsuranKe: p.angsuran_ke, override: { pokok: p.pokok, jasa: p.jasa, adm: p.adm, provisi: p.provisi } })).noBukti;
                } else {
                    const k = (await db.query<{ jml_cicilan: number }>('SELECT jml_cicilan FROM kpr WHERE id = $1', [p.pinjaman_id])).rows[0];
                    if (k?.jml_cicilan + 1 !== p.angsuran_ke)
                        throw new Error(`KPR ${p.no_pinjaman}: angsuran berikutnya ke-${(k?.jml_cicilan ?? 0) + 1}, bukan ke-${p.angsuran_ke}`);
                    noBukti = (await bayarAngsuranKpr(db, { noPinjaman: p.no_pinjaman, tanggal: i.tanggal, kasPerkiraanId: i.kasPerkiraanId, opr: i.opr,
                        jumlah: p.pokok })).noBukti;
                }
                await db.query('UPDATE potongan_gaji_pinjaman SET no_bukti = $2 WHERE id = $1', [p.id, noBukti]);
                transaksi++; jumlah += total;
            }
        }
        await db.query(
            `INSERT INTO potongan_gaji_posting (potongan_gaji_id, bagian, tgl_posting, kas_perkiraan_id, transaksi, jumlah, diposting_oleh)
             VALUES ($1, $2, $3, $4, $5, $6, $7)`, [id, b, i.tanggal, i.kasPerkiraanId, transaksi, fromUnits(jumlah), i.opr]);
        hasil.push({ bagian: b, transaksi, jumlah });
    }

    // Selesai bila semua bagian wajib yang ada transaksinya sudah diposting.
    const ringkas = await ringkasBagian(db, i.periode);
    const selesai = ringkas.every((r) => !BAGIAN_WAJIB.includes(r.bagian) || r.posting || r.transaksi === 0);
    await db.query(
        `UPDATE potongan_gaji SET status = $2, tgl_posting = $3, kas_perkiraan_id = $4, diposting_oleh = $5, diposting_pada = now() WHERE id = $1`,
        [id, selesai ? 'diposting' : 'sebagian', i.tanggal, i.kasPerkiraanId, i.opr]);
    return { periode: i.periode, bagian: hasil.map((h) => ({ bagian: h.bagian, transaksi: h.transaksi })), selesai };
}
