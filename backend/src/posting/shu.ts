import type { Db } from '../db.ts';
import { postJournal, type JournalLine } from './journal.ts';
import { fromUnits, toUnits } from './money.ts';

/**
 * Sisa Hasil Usaha (SHU) per tahun buku: tutup buku, hitung SHU anggota, posting, pencairan, pembatalan, dan pemindahan ke simpanan sukarela.
 * Hasilnya sama dengan proses desktop (Tutup Buku, Hitung SHU, Pembagian SHU) tetapi dihitung dengan query himpunan dan disimpan per tahun
 * (shu_tahun, shu_anggota), jadi SHU tahun-tahun lama tetap bisa dilihat. Rumus per anggota (terbukti persis terhadap SHU 2025 desktop):
 *   bagian = kolam / 4 x ( sukarela / total sukarela + jasa uang / total jasa uang + jasa barang / total jasa barang + lama / total lama )
 * dengan kolam = SHU setelah pajak x persen pos "SHU yang dibagikan anggota" (jenis_pos_shu urut 2).
 */

const NAMA_TUTUP = (tahun: number) => `Tutup Buku Tahun ${tahun}`;
const NAMA_AMBIL = (tahun: number) => `Pengambilan SHU Tahun ${tahun}`;
const yymmdd = (d: string) => d.slice(2, 4) + d.slice(5, 7) + d.slice(8, 10);

function cekTahun(tahun: number) {
    if (!Number.isInteger(tahun) || tahun < 2000 || tahun > 2999) throw new Error('Tahun tidak valid');
}

async function tahunSekarang(db: Pick<Db, 'query'>) {
    return Number((await db.query("SELECT EXTRACT(year FROM (now() AT TIME ZONE 'Asia/Jakarta'))::int y")).rows[0].y);
}

/** Akun pos "SHU yang dibagikan anggota" (jenis_pos_shu urut 2), tempat kolam anggota dibukukan dan dari mana SHU dicairkan. */
async function akunKolam(db: Pick<Db, 'query'>) {
    const r = await db.query<{ kode_coa: string }>('SELECT kode_coa FROM jenis_pos_shu WHERE urut = 2');
    if (!r.rows[0]) throw new Error('Pos SHU urut 2 (SHU yang dibagikan anggota) belum ada di jenis_pos_shu');
    return r.rows[0].kode_coa;
}

/** Akun simpanan sukarela (jenis simpanan 03), tujuan SHU yang tidak diambil. */
async function akunSukarela(db: Pick<Db, 'query'>) {
    const r = await db.query<{ kode_perkiraan: string }>(
        "SELECT p.kode_perkiraan FROM jenis_simpanan js JOIN perkiraan p ON p.id = js.coa_id WHERE js.kode_simpanan = '03'");
    if (!r.rows[0]) throw new Error('Akun simpanan sukarela (jenis simpanan 03) tidak ditemukan');
    return r.rows[0].kode_perkiraan;
}

export interface PosShu { urut: number; nama: string; kode: string; persen: string; nominal: string }
export interface RencanaTutupBuku {
    tahun: number;
    pendapatan: string;      // pendapatan - biaya tahun itu, sebelum pajak
    persenPajak: string;
    pajak: string;
    labaDitahan: string;     // setelah pajak: dasar pembagian ke pos
    pos: PosShu[];
    shuAnggota: string;      // nominal pos urut 2 = kolam yang dibagi ke anggota
    sudahDitutup: boolean;
    adaPencairan: boolean;   // sudah ada SHU anggota tahun itu yang dicairkan
}

/** Angka tutup buku satu tahun tanpa memposting apa pun (pratinjau Tutup Buku). Semua nilai dibulatkan 2 desimal seperti desktop. */
export async function rencanaTutupBuku(db: Pick<Db, 'query'>, tahun: number): Promise<RencanaTutupBuku> {
    cekTahun(tahun);
    const r = await db.query<{ pendapatan: string; persen: string; pajak: string; laba: string }>(
        `WITH p AS (
            SELECT COALESCE(SUM(j.kredit_jurnalumum - j.debit_jurnalumum), 0) AS pendapatan
              FROM jurnal_umum j JOIN perkiraan a ON a.kode_perkiraan = j.kode_perkiraan
             WHERE a.kode_klasifikasi IN (40, 50) AND j.tanggal_jurnalumum BETWEEN make_date($1, 1, 1) AND make_date($1, 12, 31)
               AND j.nomor_bukti NOT LIKE 'TBT/%'),
         c AS (SELECT COALESCE(MAX(persen_pajak_pendapatan), 0) AS persen FROM perusahaan)
         SELECT p.pendapatan::text, c.persen::text AS persen,
                ROUND(GREATEST(p.pendapatan, 0) * c.persen / 100, 2)::text AS pajak,
                (p.pendapatan - ROUND(GREATEST(p.pendapatan, 0) * c.persen / 100, 2))::text AS laba
           FROM p, c`, [tahun]);
    const x = r.rows[0];
    const pos = (await db.query<{ urut: number; nama_pos_shu: string; kode_coa: string; prosentase: string; nominal: string }>(
        `SELECT urut, nama_pos_shu, kode_coa, prosentase::text, GREATEST(ROUND($1::numeric * prosentase / 100, 2), 0)::text AS nominal
           FROM jenis_pos_shu ORDER BY urut`, [x.laba])).rows
        .map((p) => ({ urut: p.urut, nama: p.nama_pos_shu, kode: p.kode_coa, persen: p.prosentase, nominal: p.nominal }));
    const st = (await db.query<{ ditutup: boolean; cair: string }>(
        `SELECT EXISTS (SELECT 1 FROM jurnal_umum WHERE deskripsi = $2 AND nomor_bukti LIKE 'TBT/%') AS ditutup,
                (SELECT COUNT(*) FROM shu_anggota WHERE tahun = $1 AND status = 1) AS cair`, [tahun, NAMA_TUTUP(tahun)])).rows[0];
    return {
        tahun, pendapatan: x.pendapatan, persenPajak: x.persen, pajak: x.pajak, labaDitahan: x.laba, pos,
        shuAnggota: pos.find((p) => p.urut === 2)?.nominal ?? '0', sudahDitutup: st.ditutup, adaPencairan: Number(st.cair) > 0,
    };
}

export interface HasilTutupBuku { nomorBukti: string; rencana: RencanaTutupBuku; baris: number; selisih: string }

/**
 * Tutup buku tahunan, sama dengan desktop: (1) pendapatan dan biaya tahun itu dinolkan pada 31-12, (2) laba dikreditkan ke Laba Ditahan,
 * dikurangi pajak (ke Hutang Pajak), lalu sisanya dibagi ke pos-pos SHU menurut persen, (3) saldo semua akun neraca dipindahkan sebagai
 * saldo awal pada 01-01 tahun berikutnya. Memproses ulang tahun yang sudah ditutup mengganti jurnal lamanya; ditolak bila SHU anggota
 * tahun itu sudah ada yang dicairkan.
 */
export async function tutupBuku(db: Db, i: { tahun: number; opr: string }): Promise<HasilTutupBuku> {
    const { tahun } = i;
    cekTahun(tahun);
    const sekarang = await tahunSekarang(db);
    if (tahun >= sekarang) throw new Error(`Tahun SHU tidak boleh sama dengan tahun ini (${sekarang}) atau sesudahnya`);
    const lebihBaru = await db.query(
        "SELECT 1 FROM jurnal_umum WHERE nomor_bukti LIKE 'TBT/%' AND deskripsi = $1 LIMIT 1", [NAMA_TUTUP(tahun + 1)]);
    if (lebihBaru.rows[0]) throw new Error(`Tahun ${tahun + 1} sudah ditutup buku; proses ulang tahun ${tahun + 1} dulu agar saldo awalnya tidak tertinggal`);
    const cair = await db.query('SELECT COUNT(*) n FROM shu_anggota WHERE tahun = $1 AND status = 1', [tahun]);
    if (Number(cair.rows[0].n) > 0) throw new Error(`SHU tahun ${tahun} sudah ada yang dicairkan; batalkan pencairannya dulu sebelum tutup buku diproses ulang`);

    const sudah = await db.query("SELECT 1 FROM jurnal_umum WHERE nomor_bukti LIKE 'TBT/%' AND deskripsi = $1 LIMIT 1", [NAMA_TUTUP(tahun)]);
    if (sudah.rows[0]) {
        await db.query("DELETE FROM jurnal_umum WHERE nomor_bukti LIKE 'TBT/%' AND deskripsi = $1", [NAMA_TUTUP(tahun)]);
        await db.query('DELETE FROM shu_tahun WHERE tahun = $1', [tahun]);
    }
    const rencana = await rencanaTutupBuku(db, tahun);
    const ld = await db.query<{ kode_perkiraan: string }>("SELECT kode_perkiraan FROM perkiraan WHERE keterangan = 'Laba Ditahan' ORDER BY id LIMIT 1");
    const hp = await db.query<{ kode_perkiraan: string }>("SELECT kode_perkiraan FROM perkiraan WHERE keterangan = 'Hutang Pajak' ORDER BY id LIMIT 1");
    if (!ld.rows[0]) throw new Error("Akun Laba Ditahan (perkiraan.keterangan = 'Laba Ditahan') tidak ditemukan");
    if (!hp.rows[0]) throw new Error("Akun Hutang Pajak (perkiraan.keterangan = 'Hutang Pajak') tidak ditemukan");

    const akhir = `${tahun}-12-31`, awal = `${tahun + 1}-01-01`;
    const nomorBukti = `TBT/${yymmdd(akhir)}/001`;
    const dasar = { nomorBukti, tanggal: akhir, deskripsi: NAMA_TUTUP(tahun), opr: i.opr, sumberTipe: null, sumberId: null, tahunPrefix: '', izinTakSeimbang: true };

    // 1. Pendapatan dan biaya dinolkan: saldo debit dikreditkan dan sebaliknya (per akun).
    const pl = await db.query<{ k: string; net: string }>(
        `SELECT j.kode_perkiraan AS k, SUM(j.debit_jurnalumum - j.kredit_jurnalumum)::text AS net
           FROM jurnal_umum j JOIN perkiraan a ON a.kode_perkiraan = j.kode_perkiraan
          WHERE a.kode_klasifikasi IN (40, 50) AND j.tanggal_jurnalumum BETWEEN make_date($1, 1, 1) AND make_date($1, 12, 31)
          GROUP BY j.kode_perkiraan HAVING SUM(j.debit_jurnalumum - j.kredit_jurnalumum) <> 0 ORDER BY 1`, [tahun]);
    const baris: JournalLine[] = [];
    for (const x of pl.rows) {
        const net = toUnits(x.net);
        baris.push(net > 0n ? { kodePerkiraan: x.k, kredit: fromUnits(net), tanggal: akhir } : { kodePerkiraan: x.k, debit: fromUnits(-net), tanggal: akhir });
    }
    // 2. Laba ke Laba Ditahan, pajak ke Hutang Pajak, sisanya ke pos SHU.
    const pend = toUnits(rencana.pendapatan);
    baris.push(pend >= 0n ? { kodePerkiraan: ld.rows[0].kode_perkiraan, kredit: fromUnits(pend), tanggal: akhir } : { kodePerkiraan: ld.rows[0].kode_perkiraan, debit: fromUnits(-pend), tanggal: akhir });
    if (toUnits(rencana.pajak) > 0n) {
        baris.push({ kodePerkiraan: ld.rows[0].kode_perkiraan, debit: rencana.pajak, tanggal: akhir });
        baris.push({ kodePerkiraan: hp.rows[0].kode_perkiraan, kredit: rencana.pajak, tanggal: akhir });
    }
    if (toUnits(rencana.labaDitahan) > 0n) {
        baris.push({ kodePerkiraan: ld.rows[0].kode_perkiraan, debit: rencana.labaDitahan, tanggal: akhir });
        for (const p of rencana.pos) if (toUnits(p.nominal) > 0n) baris.push({ kodePerkiraan: p.kode, kredit: p.nominal, tanggal: akhir });
    }
    let n = await postJournal(db, { ...dasar, lines: baris });

    // 3. Saldo awal neraca pada 01-01 tahun berikutnya (termasuk baris yang baru diposting di atas).
    const nr = await db.query<{ k: string; net: string }>(
        `SELECT j.kode_perkiraan AS k, SUM(j.debit_jurnalumum - j.kredit_jurnalumum)::text AS net
           FROM jurnal_umum j JOIN perkiraan a ON a.kode_perkiraan = j.kode_perkiraan
          WHERE a.kode_klasifikasi NOT IN (40, 50, 60) AND j.tanggal_jurnalumum BETWEEN make_date($1, 1, 1) AND make_date($1, 12, 31)
          GROUP BY j.kode_perkiraan HAVING SUM(j.debit_jurnalumum - j.kredit_jurnalumum) <> 0 ORDER BY 1`, [tahun]);
    const buka: JournalLine[] = nr.rows.map((x) => {
        const net = toUnits(x.net);
        return net > 0n ? { kodePerkiraan: x.k, debit: fromUnits(net), tanggal: awal } : { kodePerkiraan: x.k, debit: undefined, kredit: fromUnits(-net), tanggal: awal };
    });
    n += await postJournal(db, { ...dasar, tanggal: awal, lines: buka, tambah: true });

    const kolam = rencana.shuAnggota;
    await db.query(
        `INSERT INTO shu_tahun (tahun, tgl_tutup_buku, rp_pendapatan, rp_pajak, rp_laba_ditahan, rp_shu_anggota, status, dihitung_oleh)
         VALUES ($1, $2, $3, $4, $5, $6, 'draf', $7)`, [tahun, akhir, rencana.pendapatan, rencana.pajak, rencana.labaDitahan, kolam, i.opr]);
    const sel = (await db.query<{ s: string }>(
        'SELECT (SUM(debit_jurnalumum) - SUM(kredit_jurnalumum))::text s FROM jurnal_umum WHERE nomor_bukti = $1', [nomorBukti])).rows[0].s;
    return { nomorBukti, rencana, baris: n, selisih: sel };
}

export interface HasilHitung { tahun: number; anggota: number; kolam: string; totalBagian: string }

/**
 * Hitung SHU semua anggota untuk satu tahun yang sudah ditutup buku: satu query himpunan (anggota aktif yang masuk sampai tahun itu,
 * jasa pinjaman tahun itu untuk jenis kredit hitung_shu, saldo sukarela, dan lama anggota), hasilnya disimpan sebagai draf.
 * `sukarela` = ikutkan komponen saldo sukarela (kotak centang "hitung simpanan" di desktop).
 */
export async function hitungShu(db: Db, i: { tahun: number; opr: string; sukarela?: boolean }): Promise<HasilHitung> {
    const { tahun } = i;
    cekTahun(tahun);
    const t = (await db.query<{ status: string; kolam: string }>('SELECT status, rp_shu_anggota::text kolam FROM shu_tahun WHERE tahun = $1', [tahun])).rows[0];
    if (!t) throw new Error(`Tahun ${tahun} belum ditutup buku; proses Tutup Buku dulu`);
    if (toUnits(t.kolam) <= 0n) throw new Error('Tidak ada SHU anggota: pos SHU anggota bernilai nol pada tutup buku tahun ini');
    const cair = await db.query('SELECT COUNT(*) n FROM shu_anggota WHERE tahun = $1 AND status = 1', [tahun]);
    if (Number(cair.rows[0].n) > 0) throw new Error(`SHU tahun ${tahun} sudah ada yang dicairkan; batalkan pencairannya dulu sebelum dihitung ulang`);
    const sukarela = i.sukarela ?? true;

    await db.query('DELETE FROM shu_anggota WHERE tahun = $1', [tahun]);
    await db.query(
        `INSERT INTO shu_anggota (tahun, kode_agt, anggota_id, nik, nama, status_staff, no_rek, tgl_masuk, rp_sukarela, rp_jasa_uang, rp_jasa_barang, lama_agt, rp_bagian)
         WITH a AS (
             SELECT id, kode_agt, nik, nama, status_staff, bank_no_rek, tglpencatatan FROM anggota
              WHERE aktif = 'Y' AND agt_non_agt AND tglpencatatan < make_date($1 + 1, 1, 1)),
         jasa AS (
             SELECT p.anggota_id,
                    ROUND(SUM(pr.debit_bunga) FILTER (WHERE jk.jenis_pinjaman = 'Pinjaman Uang')) AS uang,
                    ROUND(SUM(pr.debit_bunga) FILTER (WHERE jk.jenis_pinjaman = 'Pinjaman Barang')) AS barang
               FROM pinjaman_tunai_rincian pr
               JOIN pinjaman_tunai p ON p.id = pr.pinjaman_tunai_id
               JOIN jenis_kredit jk ON jk.id = p.jenis_kredit_id
              WHERE jk.hitung_shu = 1 AND pr.tanggal_angsuran >= make_date($1, 1, 1) AND pr.tanggal_angsuran < make_date($1 + 1, 1, 1)
              GROUP BY p.anggota_id),
         suk AS (
             SELECT anggota_id, ROUND(SUM(rp_setoran - rp_pengambilan)) AS v FROM simpanan
              WHERE jenis_simpanan = '03' AND tgl_transaksi < make_date($1 + 1, 1, 1) AND $2::boolean GROUP BY anggota_id),
         b AS (
             SELECT a.*, COALESCE(suk.v, 0) AS su, COALESCE(jasa.uang, 0) AS ju, COALESCE(jasa.barang, 0) AS jb,
                    -- Lama anggota: (hari sampai 31-12 + 1) / 30, dibulatkan setengah-ke-genap (Round Delphi).
                    ((make_date($1, 12, 31) - a.tglpencatatan) + 1) / 30
                      + CASE WHEN ((make_date($1, 12, 31) - a.tglpencatatan) + 1) % 30 > 15 THEN 1
                             WHEN ((make_date($1, 12, 31) - a.tglpencatatan) + 1) % 30 = 15 AND (((make_date($1, 12, 31) - a.tglpencatatan) + 1) / 30) % 2 = 1 THEN 1
                             ELSE 0 END AS lama
               FROM a LEFT JOIN jasa ON jasa.anggota_id = a.id LEFT JOIN suk ON suk.anggota_id = a.id)
         SELECT $1, kode_agt, id, nik, nama, status_staff, bank_no_rek, tglpencatatan, su, ju, jb, lama,
                ROUND($3::numeric / 4 * (
                    CASE WHEN SUM(su) OVER () = 0 THEN 0 ELSE su / SUM(su) OVER () END +
                    CASE WHEN SUM(ju) OVER () = 0 THEN 0 ELSE ju / SUM(ju) OVER () END +
                    CASE WHEN SUM(jb) OVER () = 0 THEN 0 ELSE jb / SUM(jb) OVER () END +
                    CASE WHEN SUM(lama) OVER () = 0 THEN 0 ELSE lama::numeric / SUM(lama) OVER () END), 4)
           FROM b`, [tahun, sukarela, t.kolam]);
    await db.query(
        `UPDATE shu_tahun SET status = 'draf', hitung_sukarela = $2, dihitung_oleh = $3, dihitung_pada = now(), diposting_oleh = NULL, diposting_pada = NULL WHERE tahun = $1`,
        [tahun, sukarela, i.opr]);
    const r = (await db.query<{ n: string; total: string }>('SELECT COUNT(*) n, COALESCE(SUM(rp_bagian), 0)::text total FROM shu_anggota WHERE tahun = $1', [tahun])).rows[0];
    return { tahun, anggota: Number(r.n), kolam: t.kolam, totalBagian: r.total };
}

/** Posting hasil hitung: SHU anggota tahun itu siap dicairkan (tidak bisa dihitung ulang tanpa membatalkan pencairan). */
export async function postingShu(db: Db, i: { tahun: number; opr: string }) {
    cekTahun(i.tahun);
    const n = Number((await db.query('SELECT COUNT(*) n FROM shu_anggota WHERE tahun = $1', [i.tahun])).rows[0].n);
    if (n === 0) throw new Error(`Belum ada hasil hitung SHU tahun ${i.tahun}; jalankan Hitung SHU dulu`);
    await db.query("UPDATE shu_tahun SET status = 'posting', diposting_oleh = $2, diposting_pada = now() WHERE tahun = $1", [i.tahun, i.opr]);
    return { anggota: n };
}

async function pastikanPosting(db: Db, tahun: number) {
    const t = (await db.query<{ status: string }>('SELECT status FROM shu_tahun WHERE tahun = $1', [tahun])).rows[0];
    if (!t) throw new Error(`SHU tahun ${tahun} belum ada`);
    if (t.status !== 'posting') throw new Error(`SHU tahun ${tahun} belum diposting; posting hasil Hitung SHU dulu`);
}

async function cekAkunKas(db: Db, kode: string) {
    const r = await db.query("SELECT 1 FROM perkiraan WHERE kode_perkiraan = $1 AND keterangan IN ('GC', 'BANK')", [kode]);
    if (!r.rows[0]) throw new Error(`Akun ${kode} bukan akun kas/bank`);
}

/** Cairkan SHU satu anggota tunai: debit pos SHU anggota, kredit akun kas/bank. Nomor bukti SHU/yymmdd/urut, seperti desktop. */
export async function cairkanShu(db: Db, i: { tahun: number; kodeAgt: string; akunKas: string; tanggal: string; opr: string }): Promise<{ nomorBukti: string; jumlah: string }> {
    cekTahun(i.tahun);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(i.tanggal)) throw new Error('Tanggal tidak valid');
    await pastikanPosting(db, i.tahun);
    await cekAkunKas(db, i.akunKas);
    const a = (await db.query<{ status: number; bagian: string }>(
        'SELECT status, rp_bagian::text bagian FROM shu_anggota WHERE tahun = $1 AND kode_agt = $2 FOR UPDATE', [i.tahun, i.kodeAgt])).rows[0];
    if (!a) throw new Error(`Anggota ${i.kodeAgt} tidak ada di SHU tahun ${i.tahun}`);
    if (a.status === 1) throw new Error('Sudah dicairkan');
    const jumlah = (await db.query<{ j: string }>('SELECT ROUND($1::numeric, 2)::text j', [a.bagian])).rows[0].j;
    if (toUnits(jumlah) <= 0n) throw new Error('Anggota yang dimaksud tidak mempunyai nominal SHU');
    const urut = Number((await db.query("SELECT nextval('seq_jurnal_urut') v")).rows[0].v);
    const nomorBukti = `SHU/${yymmdd(i.tanggal)}/${urut}`;
    await postJournal(db, { nomorBukti, tanggal: i.tanggal, deskripsi: NAMA_AMBIL(i.tahun), opr: i.opr, sumberTipe: 'shu', sumberId: null, tahunPrefix: '', urut,
        lines: [{ kodePerkiraan: await akunKolam(db), debit: jumlah }, { kodePerkiraan: i.akunKas, kredit: jumlah }] });
    await db.query(`UPDATE shu_anggota SET status = 1, rp_dicairkan = rp_bagian, tgl_cair = $3, no_reff = $4, cara = 'kas' WHERE tahun = $1 AND kode_agt = $2`,
        [i.tahun, i.kodeAgt, i.tanggal, nomorBukti]);
    return { nomorBukti, jumlah };
}

/** Batalkan pencairan satu anggota: jurnalnya dihapus dan statusnya kembali belum diambil. */
export async function batalkanPencairan(db: Db, i: { tahun: number; kodeAgt: string }) {
    cekTahun(i.tahun);
    const a = (await db.query<{ status: number; no_reff: string | null }>(
        'SELECT status, no_reff FROM shu_anggota WHERE tahun = $1 AND kode_agt = $2 FOR UPDATE', [i.tahun, i.kodeAgt])).rows[0];
    if (!a) throw new Error(`Anggota ${i.kodeAgt} tidak ada di SHU tahun ${i.tahun}`);
    if (a.status !== 1) throw new Error('Belum dicairkan');
    if (a.no_reff) await db.query('DELETE FROM jurnal_umum WHERE nomor_bukti = $1', [a.no_reff]);
    await db.query(`UPDATE shu_anggota SET status = 0, rp_dicairkan = 0, tgl_cair = NULL, no_reff = NULL, cara = NULL WHERE tahun = $1 AND kode_agt = $2`, [i.tahun, i.kodeAgt]);
}

/**
 * Pindahkan SHU semua anggota yang belum diambil ke simpanan sukarela (satu jurnal per anggota: debit pos SHU anggota, kredit akun sukarela).
 * Setelah ini anggota tidak bisa mengambil SHU tahun itu. Satu perintah himpunan, bukan satu per satu.
 */
export async function postingKeSukarela(db: Db, i: { tahun: number; tanggal: string; opr: string }): Promise<{ anggota: number; jumlah: string }> {
    cekTahun(i.tahun);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(i.tanggal)) throw new Error('Tanggal tidak valid');
    await pastikanPosting(db, i.tahun);
    const kolam = await akunKolam(db), suk = await akunSukarela(db);
    const ids = (await db.query<{ kode: string; id: string }>('SELECT kode_perkiraan kode, id::text FROM perkiraan WHERE kode_perkiraan = ANY($1)', [[kolam, suk]])).rows;
    const idKolam = ids.find((x) => x.kode === kolam)!.id, idSuk = ids.find((x) => x.kode === suk)!.id;
    const hari = yymmdd(i.tanggal);
    // Satu nomor urut per anggota (urut menjadi akhiran nomor bukti), lalu dua baris jurnal per anggota.
    const r = await db.query<{ n: string; total: string }>(
        `WITH t AS (
             SELECT kode_agt, ROUND(rp_bagian, 2) AS jumlah, nextval('seq_jurnal_urut') AS urut FROM shu_anggota
              WHERE tahun = $1 AND status = 0 AND ROUND(rp_bagian, 2) > 0 ORDER BY kode_agt),
         ins AS (
             INSERT INTO jurnal_umum (urutan, tanggal_jurnalumum, nomor_bukti, no_bukti_transaksi, tahun, kode_perkiraan, urut, debit_jurnalumum, kredit_jurnalumum,
                                      deskripsi, opr, sumber_tipe, sumber_id, perkiraan_id, tgl_transaksi)
             SELECT nextval('seq_jurnal_urutan'), $2::date, 'SHU/' || $3 || '/' || t.urut, 'SHU/' || $3 || '/' || t.urut, $3, b.kode, t.urut,
                    CASE WHEN b.sisi = 'D' THEN t.jumlah ELSE 0 END, CASE WHEN b.sisi = 'K' THEN t.jumlah ELSE 0 END,
                    $4, $5, 'shu', NULL, b.pid, $2::date
               FROM t CROSS JOIN (VALUES ($6, 'D', $7::bigint), ($8, 'K', $9::bigint)) AS b(kode, sisi, pid)
             RETURNING 1),
         upd AS (
             UPDATE shu_anggota s SET status = 1, rp_dicairkan = s.rp_bagian, tgl_cair = $2::date, no_reff = 'SHU/' || $3 || '/' || t.urut, cara = 'sukarela'
               FROM t WHERE s.tahun = $1 AND s.kode_agt = t.kode_agt RETURNING t.jumlah)
         SELECT COUNT(*)::text n, COALESCE(SUM(jumlah), 0)::text total FROM upd`,
        [i.tahun, i.tanggal, hari, NAMA_AMBIL(i.tahun), i.opr, kolam, idKolam, suk, idSuk]);
    return { anggota: Number(r.rows[0].n), jumlah: r.rows[0].total };
}

export interface RingkasShu {
    tahun: number; status: string; tglTutupBuku: string; pendapatan: string; pajak: string; labaDitahan: string; kolam: string; hitungSukarela: boolean
    anggota: number; dicairkan: number; belum: number; totalBagian: string; totalDicairkan: string; totalBelum: string
}

/** Tahun-tahun yang punya data SHU, terbaru dulu, dengan ringkasan pencairannya. */
export async function daftarTahunShu(db: Pick<Db, 'query'>): Promise<RingkasShu[]> {
    const r = await db.query<Record<string, string>>(
        `SELECT t.tahun::text, t.status, t.tgl_tutup_buku::text tgl, t.rp_pendapatan::text pendapatan, t.rp_pajak::text pajak, t.rp_laba_ditahan::text laba,
                t.rp_shu_anggota::text kolam, t.hitung_sukarela::text sukarela, COUNT(a.*)::text anggota, COUNT(*) FILTER (WHERE a.status = 1)::text cair,
                COUNT(*) FILTER (WHERE a.status = 0)::text belum, COALESCE(SUM(a.rp_bagian), 0)::text total,
                COALESCE(SUM(a.rp_bagian) FILTER (WHERE a.status = 1), 0)::text total_cair, COALESCE(SUM(a.rp_bagian) FILTER (WHERE a.status = 0), 0)::text total_belum
           FROM shu_tahun t LEFT JOIN shu_anggota a ON a.tahun = t.tahun GROUP BY t.tahun ORDER BY t.tahun DESC`);
    return r.rows.map((x) => ({
        tahun: Number(x.tahun), status: x.status, tglTutupBuku: x.tgl, pendapatan: x.pendapatan, pajak: x.pajak, labaDitahan: x.laba, kolam: x.kolam,
        hitungSukarela: x.sukarela === 'true', anggota: Number(x.anggota), dicairkan: Number(x.cair), belum: Number(x.belum),
        totalBagian: x.total, totalDicairkan: x.total_cair, totalBelum: x.total_belum,
    }));
}
