import type { Db } from '../db.ts';
import { postJournal, type JournalLine } from './journal.ts';
import { fromUnits, round2, toUnits } from './money.ts';
import { barisJurnalAngsuran } from './pinjaman.ts';

// Koreksi transaksi yang sudah diposting. Tidak ada baris yang dihapus: pembatalan membuat pembalik bertanggal hari pembatalan, sehingga
// saldo dan Buku Besar periode lama tetap utuh, dan setiap koreksi tercatat di transaksi_koreksi.
//
// Awalan bukti pembalik berbeda per sumber karena tiap sumber punya sequence sendiri, sedangkan postJournal mengganti jurnal bernomor sama:
// BTL simpanan, BTLA angsuran, BTLC pencairan, BTLKA angsuran KPR, BTLKC pencairan KPR.

export interface BatalInput {
    noBukti: string;
    tanggal: string; // YYYY-MM-DD, tanggal pembalik
    alasan: string;
    opr: string;
    operatorId?: number;
}

export interface BatalHasil { jenis: JenisKoreksi; noBukti: string }
export type JenisKoreksi = 'simpanan' | 'angsuran' | 'pencairan' | 'kpr_angsuran' | 'kpr_pencairan';

export const MIN_ALASAN = 10;
const SISA_LUNAS = 100;

const yymm = (t: string) => t.slice(2, 4) + t.slice(5, 7);
const nomor = (awalan: string, t: string, urut: number) => `${awalan}-${yymm(t)}-${urut}`;

function bersihkanAlasan(a: string) {
    const alasan = a.trim().replace(/\s+/g, ' ');
    if (alasan.length < MIN_ALASAN) throw new Error(`Alasan wajib diisi, minimal ${MIN_ALASAN} karakter`);
    if (alasan.length > 255) throw new Error('Alasan maksimal 255 karakter');
    return alasan;
}

async function cekBelumDikoreksi(db: Db, jenis: JenisKoreksi, no: string) {
    const ada = (await db.query<{ no_bukti: string }>(
        "SELECT no_bukti FROM transaksi_koreksi WHERE jenis = $1 AND aksi = 'batal' AND (no_bukti = $2 OR no_bukti_pembalik = $2)", [jenis, no])).rows[0];
    if (ada) throw new Error(ada.no_bukti === no ? `Bukti ${no} sudah dibatalkan` : `Bukti ${no} adalah pembalik dari ${ada.no_bukti}; tidak bisa dibatalkan`);
}

/** Balik jurnal asal baris per baris, jadi akun kasnya sama dengan transaksi asal. Bukti tanpa jurnal tidak dibalik. Mengembalikan baris jurnal asal. */
async function balikJurnal(db: Db, asal: string, pembalik: string, tanggal: string, deskripsi: string, opr: string, sumberTipe: string, sumberId: string) {
    const jurnal = (await db.query<{ kode_perkiraan: string; debit_jurnalumum: string; kredit_jurnalumum: string }>(
        'SELECT kode_perkiraan, debit_jurnalumum, kredit_jurnalumum FROM jurnal_umum WHERE nomor_bukti = $1 ORDER BY urutan', [asal])).rows;
    if (jurnal.length > 0) await postJournal(db, {
        nomorBukti: pembalik, tanggal, deskripsi: deskripsi.slice(0, 200), opr, sumberTipe, sumberId,
        lines: jurnal.map((j) => ({ kodePerkiraan: j.kode_perkiraan, debit: j.kredit_jurnalumum, kredit: j.debit_jurnalumum })),
    });
    return jurnal;
}

const catat = (db: Db, jenis: JenisKoreksi, sumberId: string, i: BatalInput, alasan: string, pembalik: string, lama: object, baru: object) => db.query(
    `INSERT INTO transaksi_koreksi (jenis, sumber_id, no_bukti, aksi, alasan, no_bukti_pembalik, opr, operator_id, data_lama, data_baru)
     VALUES ($1, $2, $3, 'batal', $4, $5, $6, $7, $8, $9)`,
    [jenis, sumberId, i.noBukti, alasan, pembalik, i.opr, i.operatorId ?? null, JSON.stringify(lama), JSON.stringify(baru)]);

/** Batalkan satu transaksi simpanan: setoran dibalik menjadi pengambilan dan sebaliknya. Jalankan di dalam transaksi. */
export async function batalSimpanan(db: Db, i: BatalInput): Promise<BatalHasil & { saldoSetelah: string }> {
    const alasan = bersihkanAlasan(i.alasan);
    // Kunci baris anggota supaya saldonya tidak berubah bersamaan, sama dengan setoran dan pengambilan.
    const s = (await db.query(
        `SELECT s.*, a.nama, a.nik FROM simpanan s JOIN anggota a ON a.id = s.anggota_id WHERE s.no_bukti = $1 FOR UPDATE OF s, a`, [i.noBukti])).rows[0];
    if (!s) throw new Error(`Bukti ${i.noBukti} tidak ditemukan`);
    if (i.noBukti.startsWith('SHU/')) throw new Error('Bukti SHU tidak bisa dibatalkan di sini; koreksi lewat menu SHU atau jurnal');
    await cekBelumDikoreksi(db, 'simpanan', i.noBukti);
    const potongan = (await db.query<{ periode: string }>(
        `SELECT p.periode FROM potongan_gaji_anggota g JOIN potongan_gaji p ON p.id = g.potongan_gaji_id
          WHERE $1 IN (g.bukti_pokok, g.bukti_wajib, g.bukti_sukarela) LIMIT 1`, [i.noBukti])).rows[0];
    if (potongan) throw new Error(`Bukti ${i.noBukti} berasal dari Potongan Gaji periode ${potongan.periode}, jadi tidak bisa dibatalkan satu per satu`);

    const setor = toUnits(s.rp_setoran), ambil = toUnits(s.rp_pengambilan);
    if (setor === ambil) throw new Error(`Bukti ${i.noBukti} tidak bernilai`);
    const saldoNow = toUnits((await db.query<{ s: string }>(
        'SELECT COALESCE(SUM(rp_setoran - rp_pengambilan), 0) s FROM simpanan WHERE anggota_id = $1 AND jenis_simpanan_id = $2',
        [s.anggota_id, s.jenis_simpanan_id])).rows[0].s);
    const saldoBaru = saldoNow - setor + ambil;
    if (saldoBaru < 0n) throw new Error(`Saldo tersisa ${fromUnits(saldoNow)} tidak cukup untuk membatalkan setoran ${fromUnits(setor)}`);

    const urut = Number((await db.query("SELECT nextval('seq_simpanan_urut') v")).rows[0].v);
    const noBukti = nomor('BTL', i.tanggal, urut);
    const ket = `Batal ${i.noBukti}: ${alasan}`.slice(0, 100);
    const ins = await db.query<{ id: string }>(
        `INSERT INTO simpanan (urut, no_bukti, jenis_simpanan, kode_agt, tgl_transaksi, jam_transaksi, deskripsi, persen_laba,
            rp_setoran, rp_pengambilan, rp_saldo, opr, anggota_id, jenis_simpanan_id, kas_perkiraan_id)
         VALUES ($1,$2,$3,$4,$5,LOCALTIME(0),$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING id`,
        [urut, noBukti, s.jenis_simpanan, s.kode_agt, i.tanggal, ket, s.persen_laba, fromUnits(ambil), fromUnits(setor), fromUnits(saldoBaru),
         i.opr, s.anggota_id, s.jenis_simpanan_id, s.kas_perkiraan_id]);
    const jurnal = await balikJurnal(db, i.noBukti, noBukti, i.tanggal, `${ket} a/n: ${s.nama}/${s.nik}`, i.opr, 'simpanan', ins.rows[0].id);
    await catat(db, 'simpanan', s.id, i, alasan, noBukti,
        { tgl_transaksi: s.tgl_transaksi, kode_agt: s.kode_agt, jenis_simpanan: s.jenis_simpanan, rp_setoran: s.rp_setoran, rp_pengambilan: s.rp_pengambilan, deskripsi: s.deskripsi, opr: s.opr, jurnal },
        { no_bukti: noBukti, tanggal: i.tanggal, berjurnal: jurnal.length > 0, saldo_setelah: fromUnits(saldoBaru) });
    return { jenis: 'simpanan', noBukti, saldoSetelah: fromUnits(saldoBaru) };
}

/**
 * Batalkan angsuran pinjaman tunai, hanya angsuran terakhir, supaya urutan cicilan tetap utuh. Baris asal dan pembaliknya bernilai minus sama-sama
 * diberi angsuran_ke 0: keduanya tetap terlihat di buku pinjaman dan saling menghapus, tetapi tidak lagi dihitung sebagai angsuran ke sekian di layar
 * mana pun. Jadwal tagih dan penghitung cicilan kembali, jadi angsuran itu bisa dibayar lagi. Jalankan di dalam transaksi.
 */
async function batalAngsuran(db: Db, i: BatalInput): Promise<BatalHasil> {
    const alasan = bersihkanAlasan(i.alasan);
    const r = (await db.query(`SELECT r.*, p.jml_cicilan, p.lama_angsuran, p.tgl_akhir_bayar, p.no_pinjaman AS nomor_pinjaman, a.nama, a.nik
        FROM pinjaman_tunai_rincian r JOIN pinjaman_tunai p ON p.id = r.pinjaman_tunai_id JOIN anggota a ON a.id = p.anggota_id
        WHERE r.no_bukti = $1 FOR UPDATE OF r, p`, [i.noBukti])).rows;
    if (r.length !== 1) throw new Error(`Bukti ${i.noBukti} tercatat di ${r.length} baris; koreksi lewat jurnal`);
    const b = r[0];
    await cekBelumDikoreksi(db, 'angsuran', i.noBukti);
    const ke: number = b.angsuran_ke;
    if (ke <= 0) throw new Error(`Bukti ${i.noBukti} bukan angsuran`);
    if (ke !== b.jml_cicilan) throw new Error(`Hanya angsuran terakhir yang bisa dibatalkan: pinjaman ${b.nomor_pinjaman} sudah sampai angsuran ke-${b.jml_cicilan}, bukti ini ke-${ke}`);
    await cekTidakDitutup(db, b.pinjaman_tunai_id);
    const potongan = (await db.query<{ periode: string }>(
        `SELECT g.periode FROM potongan_gaji_pinjaman x JOIN potongan_gaji g ON g.id = x.potongan_gaji_id WHERE x.no_bukti = $1 LIMIT 1`, [i.noBukti])).rows[0];
    if (potongan) throw new Error(`Bukti ${i.noBukti} berasal dari Potongan Gaji periode ${potongan.periode}, jadi tidak bisa dibatalkan satu per satu`);

    const sisa = (await db.query<{ p: string; b: string }>(
        `SELECT COALESCE(SUM(kredit_pokok - debit_pokok),0) p, COALESCE(SUM(kredit_bunga - debit_bunga),0) b FROM pinjaman_tunai_rincian WHERE pinjaman_tunai_id = $1`,
        [b.pinjaman_tunai_id])).rows[0];
    const urut = Number((await db.query("SELECT nextval('seq_pinjaman_rincian_urut') v")).rows[0].v);
    const noBukti = nomor('BTLA', i.tanggal, urut);
    const ket = `Batal ${i.noBukti}: ${alasan}`.slice(0, 100);
    await db.query(
        `INSERT INTO pinjaman_tunai_rincian (no_bukti, urut, no_pinjaman, deskripsi, debit_pokok, saldo_pokok, debit_bunga, saldo_bunga,
            rp_adm, rp_provisi, angsuran_ke, tanggal_angsuran, kas_perkiraan_id, pinjaman_tunai_id)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,0,$11,$12,$13)`,
        [noBukti, urut, b.nomor_pinjaman, ket, fromUnits(-toUnits(b.debit_pokok)), fromUnits(toUnits(sisa.p) + toUnits(b.debit_pokok)),
         fromUnits(-toUnits(b.debit_bunga)), fromUnits(toUnits(sisa.b) + toUnits(b.debit_bunga)),
         fromUnits(-toUnits(b.rp_adm)), fromUnits(-toUnits(b.rp_provisi)), i.tanggal, b.kas_perkiraan_id, b.pinjaman_tunai_id]);
    await db.query("UPDATE pinjaman_tunai_rincian SET angsuran_ke = 0, deskripsi = $2 WHERE id = $1", [b.id, `DIBATALKAN: ${b.deskripsi}`.slice(0, 100)]);
    await db.query(
        `UPDATE pinjaman_tunai_rincian_tagih SET no_bukti = '', tgl_bayar = NULL, bayar_pokok = 0, bayar_bunga = 0 WHERE pinjaman_tunai_id = $1 AND angsuran_ke = $2`,
        [b.pinjaman_tunai_id, ke]);
    await db.query(
        `UPDATE pinjaman_tunai SET jml_cicilan = $2, sisa_cicilan = lama_angsuran - $2,
            tgl_akhir_bayar = (SELECT MAX(x.tanggal_angsuran) FROM pinjaman_tunai_rincian x WHERE x.pinjaman_tunai_id = $1 AND x.angsuran_ke > 0) WHERE id = $1`,
        [b.pinjaman_tunai_id, ke - 1]);
    const jurnal = await balikJurnal(db, i.noBukti, noBukti, i.tanggal, `${ket} a/n: ${b.nama}/${b.nik}`, i.opr, 'pinjaman_tunai_rincian', b.pinjaman_tunai_id);
    await catat(db, 'angsuran', b.id, i, alasan, noBukti,
        { no_pinjaman: b.nomor_pinjaman, angsuran_ke: ke, tanggal: b.tanggal_angsuran, debit_pokok: b.debit_pokok, debit_bunga: b.debit_bunga, rp_adm: b.rp_adm, rp_provisi: b.rp_provisi, deskripsi: b.deskripsi, tgl_akhir_bayar: b.tgl_akhir_bayar, jurnal },
        { no_bukti: noBukti, tanggal: i.tanggal, berjurnal: jurnal.length > 0, jml_cicilan: ke - 1 });
    return { jenis: 'angsuran', noBukti };
}

async function cekTidakDitutup(db: Db, pinjamanId: string) {
    const t = (await db.query('SELECT 1 FROM pinjaman_penutupan WHERE pinjaman_tunai_id = $1 AND dibatalkan_pada IS NULL', [pinjamanId])).rowCount;
    if (t) throw new Error('Pinjaman ini sedang ditutup tanpa jurnal; batalkan penutupannya dulu');
}

/**
 * Batalkan pencairan pinjaman tunai yang belum punya angsuran. Baris pinjaman tetap ada: pembalik di buku pinjaman membuat sisanya nol, dan penghitung
 * cicilan penuh membuat semua layar (Kredit Macet, Generate Potongan, aplikasi anggota) menganggapnya selesai, sama dengan penutupan pinjaman. Jalankan di dalam transaksi.
 */
async function batalPencairan(db: Db, i: BatalInput): Promise<BatalHasil> {
    const alasan = bersihkanAlasan(i.alasan);
    const p = (await db.query(`SELECT p.*, a.nama, a.nik FROM pinjaman_tunai p JOIN anggota a ON a.id = p.anggota_id WHERE p.no_pinjaman = $1 FOR UPDATE OF p`, [i.noBukti])).rows[0];
    await cekBelumDikoreksi(db, 'pencairan', i.noBukti);
    const angsuran = (await db.query(`SELECT 1 FROM pinjaman_tunai_rincian WHERE pinjaman_tunai_id = $1 AND angsuran_ke > 0 LIMIT 1`, [p.id])).rowCount;
    if (p.jml_cicilan > 0 || angsuran) throw new Error(`Pinjaman ${i.noBukti} sudah punya angsuran; batalkan semua angsurannya dulu`);
    await cekTidakDitutup(db, p.id);
    const potongan = (await db.query<{ periode: string }>(
        `SELECT g.periode FROM potongan_gaji_pinjaman x JOIN potongan_gaji g ON g.id = x.potongan_gaji_id
          WHERE x.pinjaman_id = $1 AND x.jenis <> 'kpr' AND g.status <> 'diposting' LIMIT 1`, [p.id])).rows[0];
    if (potongan) throw new Error(`Pinjaman ${i.noBukti} ada di Potongan Gaji periode ${potongan.periode} yang belum selesai; generate ulang atau selesaikan periode itu dulu`);
    const titipan = (await db.query(`SELECT 1 FROM pinjaman_tunai_titipan WHERE pinjaman_tunai_id = $1 AND status <> 'POSTING' LIMIT 1`, [p.id])).rowCount;
    if (titipan) throw new Error(`Pinjaman ${i.noBukti} masih punya titipan angsuran; selesaikan titipannya dulu`);

    const sisa = (await db.query<{ p: string; b: string }>(
        `SELECT COALESCE(SUM(kredit_pokok),0) p, COALESCE(SUM(kredit_bunga),0) b FROM pinjaman_tunai_rincian WHERE pinjaman_tunai_id = $1`, [p.id])).rows[0];
    const urut = Number((await db.query("SELECT nextval('seq_pinjaman_rincian_urut') v")).rows[0].v);
    const noBukti = nomor('BTLC', i.tanggal, urut);
    const ket = `Batal ${i.noBukti}: ${alasan}`.slice(0, 100);
    await db.query(
        `INSERT INTO pinjaman_tunai_rincian (no_bukti, urut, no_pinjaman, deskripsi, kredit_pokok, saldo_pokok, kredit_bunga, saldo_bunga,
            angsuran_ke, tanggal_angsuran, pinjaman_tunai_id)
         VALUES ($1,$2,$3,$4,$5,0,$6,0,0,$7,$8)`,
        [noBukti, urut, i.noBukti, ket, fromUnits(-toUnits(sisa.p)), fromUnits(-toUnits(sisa.b)), i.tanggal, p.id]);
    await db.query('UPDATE pinjaman_tunai SET jml_cicilan = lama_angsuran, sisa_cicilan = 0 WHERE id = $1', [p.id]);
    const jurnal = await balikJurnal(db, i.noBukti, noBukti, i.tanggal, `${ket} a/n: ${p.nama}/${p.nik}`, i.opr, 'pinjaman_tunai', p.id);
    await catat(db, 'pencairan', p.id, i, alasan, noBukti,
        { tgl_pinjaman: p.tgl_pinjaman, kode_agt: p.kode_agt, kode_kredit: p.kode_kredit, rp_pinjaman_pokok: p.rp_pinjaman_pokok, lama_angsuran: p.lama_angsuran, jurnal },
        { no_bukti: noBukti, tanggal: i.tanggal, berjurnal: jurnal.length > 0 });
    return { jenis: 'pencairan', noBukti };
}

/** Batalkan angsuran KPR terakhir, dengan pola yang sama dengan batalAngsuran. Jalankan di dalam transaksi. */
async function batalAngsuranKpr(db: Db, i: BatalInput): Promise<BatalHasil> {
    const alasan = bersihkanAlasan(i.alasan);
    const r = (await db.query(`SELECT r.*, k.jml_cicilan, k.tgl_akhir_bayar, k.no_pinjaman AS nomor_kpr, a.nama
        FROM kpr_rincian r JOIN kpr k ON k.id = r.kpr_id JOIN anggota a ON a.id = k.anggota_id WHERE r.no_bukti = $1 FOR UPDATE OF r, k`, [i.noBukti])).rows;
    if (r.length !== 1) throw new Error(`Bukti ${i.noBukti} tercatat di ${r.length} baris; koreksi lewat jurnal`);
    const b = r[0];
    await cekBelumDikoreksi(db, 'kpr_angsuran', i.noBukti);
    const ke: number = b.angsuran_ke;
    if (ke <= 0) throw new Error(`Bukti ${i.noBukti} bukan angsuran`);
    if (ke !== b.jml_cicilan) throw new Error(`Hanya angsuran terakhir yang bisa dibatalkan: KPR ${b.nomor_kpr} sudah sampai angsuran ke-${b.jml_cicilan}, bukti ini ke-${ke}`);
    const potongan = (await db.query<{ periode: string }>(
        `SELECT g.periode FROM potongan_gaji_pinjaman x JOIN potongan_gaji g ON g.id = x.potongan_gaji_id WHERE x.no_bukti = $1 LIMIT 1`, [i.noBukti])).rows[0];
    if (potongan) throw new Error(`Bukti ${i.noBukti} berasal dari Potongan Gaji periode ${potongan.periode}, jadi tidak bisa dibatalkan satu per satu`);

    const sisa = (await db.query<{ s: string }>('SELECT COALESCE(SUM(kredit_pokok - debit_pokok), 0) s FROM kpr_rincian WHERE kpr_id = $1', [b.kpr_id])).rows[0].s;
    const urut = Number((await db.query("SELECT nextval('seq_kpr_rincian_urut') v")).rows[0].v);
    const noBukti = nomor('BTLKA', i.tanggal, urut);
    const ket = `Batal ${i.noBukti}: ${alasan}`.slice(0, 100);
    await db.query(
        `INSERT INTO kpr_rincian (no_bukti, urut, no_pinjaman, deskripsi, debit_pokok, saldo_pokok, angsuran_ke, tanggal_angsuran, kas_perkiraan_id, kpr_id)
         VALUES ($1,$2,$3,$4,$5,$6,0,$7,$8,$9)`,
        [noBukti, urut, b.nomor_kpr, ket, fromUnits(-toUnits(b.debit_pokok)), fromUnits(toUnits(sisa) + toUnits(b.debit_pokok)), i.tanggal, b.kas_perkiraan_id, b.kpr_id]);
    await db.query("UPDATE kpr_rincian SET angsuran_ke = 0, deskripsi = $2 WHERE id = $1", [b.id, `DIBATALKAN: ${b.deskripsi}`.slice(0, 100)]);
    await db.query(
        `UPDATE kpr SET jml_cicilan = $2, tgl_akhir_bayar = (SELECT MAX(x.tanggal_angsuran) FROM kpr_rincian x WHERE x.kpr_id = $1 AND x.angsuran_ke > 0) WHERE id = $1`,
        [b.kpr_id, ke - 1]);
    const jurnal = await balikJurnal(db, i.noBukti, noBukti, i.tanggal, `${ket} a/n: ${b.nama}`, i.opr, 'kpr_rincian', b.kpr_id);
    await catat(db, 'kpr_angsuran', b.id, i, alasan, noBukti,
        { no_pinjaman: b.nomor_kpr, angsuran_ke: ke, tanggal: b.tanggal_angsuran, debit_pokok: b.debit_pokok, deskripsi: b.deskripsi, tgl_akhir_bayar: b.tgl_akhir_bayar, jurnal },
        { no_bukti: noBukti, tanggal: i.tanggal, berjurnal: jurnal.length > 0, jml_cicilan: ke - 1 });
    return { jenis: 'kpr_angsuran', noBukti };
}

/** Batalkan pencairan KPR yang belum punya angsuran. Pencairan KPR tidak berjurnal, jadi hanya buku KPR yang dibalik. Jalankan di dalam transaksi. */
async function batalPencairanKpr(db: Db, i: BatalInput): Promise<BatalHasil> {
    const alasan = bersihkanAlasan(i.alasan);
    const k = (await db.query('SELECT * FROM kpr WHERE no_pinjaman = $1 FOR UPDATE', [i.noBukti])).rows[0];
    await cekBelumDikoreksi(db, 'kpr_pencairan', i.noBukti);
    const angsuran = (await db.query('SELECT 1 FROM kpr_rincian WHERE kpr_id = $1 AND angsuran_ke > 0 LIMIT 1', [k.id])).rowCount;
    if (k.jml_cicilan > 0 || angsuran) throw new Error(`KPR ${i.noBukti} sudah punya angsuran; batalkan semua angsurannya dulu`);
    const potongan = (await db.query<{ periode: string }>(
        `SELECT g.periode FROM potongan_gaji_pinjaman x JOIN potongan_gaji g ON g.id = x.potongan_gaji_id
          WHERE x.pinjaman_id = $1 AND x.jenis = 'kpr' AND g.status <> 'diposting' LIMIT 1`, [k.id])).rows[0];
    if (potongan) throw new Error(`KPR ${i.noBukti} ada di Potongan Gaji periode ${potongan.periode} yang belum selesai; generate ulang atau selesaikan periode itu dulu`);

    const sisa = (await db.query<{ s: string }>('SELECT COALESCE(SUM(kredit_pokok), 0) s FROM kpr_rincian WHERE kpr_id = $1', [k.id])).rows[0].s;
    const urut = Number((await db.query("SELECT nextval('seq_kpr_rincian_urut') v")).rows[0].v);
    const noBukti = nomor('BTLKC', i.tanggal, urut);
    await db.query(
        `INSERT INTO kpr_rincian (no_bukti, urut, no_pinjaman, deskripsi, kredit_pokok, saldo_pokok, angsuran_ke, tanggal_angsuran, kpr_id)
         VALUES ($1,$2,$3,$4,$5,0,0,$6,$7)`,
        [noBukti, urut, i.noBukti, `Batal ${i.noBukti}: ${alasan}`.slice(0, 100), fromUnits(-toUnits(sisa)), i.tanggal, k.id]);
    await catat(db, 'kpr_pencairan', k.id, i, alasan, noBukti,
        { tgl_pinjaman: k.tgl_pinjaman, kode_agt: k.kode_agt, kode_kredit: k.kode_kredit, rp_pinjaman_pokok: k.rp_pinjaman_pokok, lama_angsuran: k.lama_angsuran },
        { no_bukti: noBukti, tanggal: i.tanggal });
    return { jenis: 'kpr_pencairan', noBukti };
}

/** Sumber satu nomor bukti. Nomor yang dipakai lebih dari satu sumber ditolak, supaya koreksi tidak mengenai transaksi yang salah. */
async function sumberBukti(db: Pick<Db, 'query'>, no: string): Promise<JenisKoreksi> {
    const ada = (await db.query<{ jenis: JenisKoreksi }>(
        `SELECT 'simpanan' jenis FROM simpanan WHERE no_bukti = $1
         UNION ALL SELECT 'angsuran' FROM pinjaman_tunai_rincian WHERE no_bukti = $1 AND no_bukti <> no_pinjaman
         UNION ALL SELECT 'pencairan' FROM pinjaman_tunai WHERE no_pinjaman = $1
         UNION ALL SELECT 'kpr_angsuran' FROM kpr_rincian WHERE no_bukti = $1
         UNION ALL SELECT 'kpr_pencairan' FROM kpr WHERE no_pinjaman = $1`, [no])).rows;
    const jenis = [...new Set(ada.map((x) => x.jenis))];
    if (jenis.length === 0) throw new Error(`Bukti ${no} tidak ditemukan`);
    if (jenis.length > 1) throw new Error(`Nomor ${no} dipakai di lebih dari satu sumber (${jenis.join(', ')}); koreksi lewat jurnal`);
    return jenis[0];
}

/** Batalkan satu bukti: sumbernya dicari dari nomor bukti, lalu diproses dengan aturan sumber itu. */
export async function batalBukti(db: Db, i: BatalInput): Promise<BatalHasil> {
    const proses = { simpanan: batalSimpanan, angsuran: batalAngsuran, pencairan: batalPencairan, kpr_angsuran: batalAngsuranKpr, kpr_pencairan: batalPencairanKpr };
    return proses[await sumberBukti(db, i.noBukti)](db, i);
}

// ---------- jurnal susulan ----------

export interface RancanganJurnal {
    jenis: JenisKoreksi; noBukti: string; tanggal: string; deskripsi: string; sumberTipe: string; sumberId: string; noBuktiTransaksi?: string
    baris: { kodePerkiraan: string; namaPerkiraan: string | null; debit: string; kredit: string }[]
}

const akunKas = async (db: Pick<Db, 'query'>, id: string | null, no: string) => {
    const kode = id ? (await db.query<{ kode_perkiraan: string }>('SELECT kode_perkiraan FROM perkiraan WHERE id = $1', [id])).rows[0]?.kode_perkiraan : null;
    if (!kode) throw new Error(`Bukti ${no} tidak mencatat akun kas, jadi jurnalnya harus dibuat manual di Jurnal Umum`);
    return kode;
};

/** Baris jurnal yang seharusnya ada untuk bukti tanpa jurnal, dari data transaksinya, dengan rumus yang sama dengan posting aslinya. Tidak menulis apa pun. */
export async function rancangJurnalSusulan(db: Pick<Db, 'query'>, no: string): Promise<RancanganJurnal> {
    const jenis = await sumberBukti(db, no);
    if ((await db.query('SELECT 1 FROM jurnal_umum WHERE nomor_bukti = $1 LIMIT 1', [no])).rowCount) throw new Error(`Bukti ${no} sudah punya jurnal`);
    let r: Omit<RancanganJurnal, 'baris' | 'jenis' | 'noBukti'>, lines: JournalLine[];
    if (jenis === 'simpanan') {
        const s = (await db.query(`SELECT s.id, s.tgl_transaksi::text tanggal, s.rp_setoran, s.rp_pengambilan, s.kas_perkiraan_id, a.nama, a.nik, j.nama_simpanan, p.kode_perkiraan akun
            FROM simpanan s JOIN anggota a ON a.id = s.anggota_id JOIN jenis_simpanan j ON j.id = s.jenis_simpanan_id JOIN perkiraan p ON p.id = j.coa_id WHERE s.no_bukti = $1`, [no])).rows[0];
        if (!s) throw new Error(`Jenis simpanan bukti ${no} tidak dikenali`);
        const kas = await akunKas(db, s.kas_perkiraan_id, no), setor = round2(toUnits(s.rp_setoran)), ambil = round2(toUnits(s.rp_pengambilan));
        r = { tanggal: s.tanggal, deskripsi: `${setor > 0n ? 'Setoran' : 'Pengambilan'} ${s.nama_simpanan} a/n: ${s.nama}/${s.nik}`, sumberTipe: 'simpanan', sumberId: s.id };
        lines = setor > 0n ? [{ kodePerkiraan: kas, debit: fromUnits(setor) }, { kodePerkiraan: s.akun, kredit: fromUnits(setor) }]
            : [{ kodePerkiraan: s.akun, debit: fromUnits(ambil) }, { kodePerkiraan: kas, kredit: fromUnits(ambil) }];
    } else if (jenis === 'angsuran') {
        const b = (await db.query(`SELECT x.tanggal_angsuran::text tanggal, x.debit_pokok, x.debit_bunga, x.rp_adm, x.rp_provisi, x.kas_perkiraan_id, x.angsuran_ke, x.no_pinjaman nomor, p.id pinjaman_id, a.nama, a.nik, jk.nama_kredit,
                p1.kode_perkiraan akun_kredit, p2.kode_perkiraan akun_jasa, p3.kode_perkiraan akun_adm, p4.kode_perkiraan akun_provisi
            FROM pinjaman_tunai_rincian x JOIN pinjaman_tunai p ON p.id = x.pinjaman_tunai_id JOIN anggota a ON a.id = p.anggota_id JOIN jenis_kredit jk ON jk.id = p.jenis_kredit_id
            LEFT JOIN perkiraan p1 ON p1.id = jk.coa_kredit_id LEFT JOIN perkiraan p2 ON p2.id = jk.coa_jasa_id LEFT JOIN perkiraan p3 ON p3.id = jk.coa_adm_id LEFT JOIN perkiraan p4 ON p4.id = jk.coa_provisi_id
            WHERE x.no_bukti = $1`, [no])).rows;
        if (b.length !== 1 || b[0].angsuran_ke <= 0) throw new Error(`Bukti ${no} bukan satu baris angsuran`);
        const x = b[0];
        r = { tanggal: x.tanggal, deskripsi: `Setoran ${x.nama_kredit} a/n: ${x.nama}/${x.nik}`, sumberTipe: 'pinjaman_tunai_rincian', sumberId: x.pinjaman_id, noBuktiTransaksi: x.nomor };
        lines = barisJurnalAngsuran({ pokok: toUnits(x.debit_pokok), jasa: toUnits(x.debit_bunga), adm: toUnits(x.rp_adm), provisi: toUnits(x.rp_provisi) },
            { kas: await akunKas(db, x.kas_perkiraan_id, no), kredit: x.akun_kredit, jasa: x.akun_jasa, adm: x.akun_adm, provisi: x.akun_provisi });
    } else if (jenis === 'pencairan') {
        const p = (await db.query(`SELECT p.id, p.tgl_pinjaman::text tanggal, p.rp_pinjaman_pokok, p.kas_perkiraan_id, a.nama, a.nik, jk.nama_kredit, k.kode_perkiraan akun_kredit
            FROM pinjaman_tunai p JOIN anggota a ON a.id = p.anggota_id JOIN jenis_kredit jk ON jk.id = p.jenis_kredit_id JOIN perkiraan k ON k.id = jk.coa_kredit_id WHERE p.no_pinjaman = $1`, [no])).rows[0];
        if (!p) throw new Error(`Jenis kredit pinjaman ${no} tidak dikenali`);
        const pokok = fromUnits(round2(toUnits(p.rp_pinjaman_pokok)));
        r = { tanggal: p.tanggal, deskripsi: `Pencairan ${p.nama_kredit} a/n: ${p.nama}/${p.nik}`, sumberTipe: 'pinjaman_tunai', sumberId: p.id };
        lines = [{ kodePerkiraan: p.akun_kredit, debit: pokok }, { kodePerkiraan: await akunKas(db, p.kas_perkiraan_id, no), kredit: pokok }];
    } else if (jenis === 'kpr_angsuran') {
        const b = (await db.query(`SELECT x.tanggal_angsuran::text tanggal, x.debit_pokok, x.kas_perkiraan_id, x.angsuran_ke, k.no_pinjaman nomor, k.id kpr_id, a.nama, jk.nama_kredit, p.kode_perkiraan akun_titipan
            FROM kpr_rincian x JOIN kpr k ON k.id = x.kpr_id JOIN anggota a ON a.id = k.anggota_id JOIN jenis_kredit jk ON jk.id = k.jenis_kredit_id JOIN perkiraan p ON p.id = jk.coa_kredit_id WHERE x.no_bukti = $1`, [no])).rows;
        if (b.length !== 1 || b[0].angsuran_ke <= 0) throw new Error(`Bukti ${no} bukan satu baris angsuran`);
        const x = b[0], rp = fromUnits(round2(toUnits(x.debit_pokok)));
        r = { tanggal: x.tanggal, deskripsi: `Setoran ${x.nama_kredit} a/n: ${x.nama}`, sumberTipe: 'kpr_rincian', sumberId: x.kpr_id, noBuktiTransaksi: x.nomor };
        lines = [{ kodePerkiraan: await akunKas(db, x.kas_perkiraan_id, no), debit: rp }, { kodePerkiraan: x.akun_titipan, kredit: rp }];
    } else throw new Error('Pencairan KPR memang tidak berjurnal');

    const pakai = lines.filter((l) => toUnits(l.debit ?? 0) !== 0n || toUnits(l.kredit ?? 0) !== 0n);
    const nama = (await db.query<{ kode_perkiraan: string; nama_perkiraan: string }>('SELECT kode_perkiraan, nama_perkiraan FROM perkiraan WHERE kode_perkiraan = ANY($1)', [pakai.map((l) => l.kodePerkiraan)])).rows;
    return { ...r, jenis, noBukti: no, baris: pakai.map((l) => ({ kodePerkiraan: l.kodePerkiraan, namaPerkiraan: nama.find((n) => n.kode_perkiraan === l.kodePerkiraan)?.nama_perkiraan ?? null,
        debit: String(l.debit ?? '0'), kredit: String(l.kredit ?? '0') })) };
}

/** Tulis jurnal yang hilang dengan nomor bukti dan tanggal transaksinya, lalu catat di log. Tahun yang sudah ditutup ditolak postJournal. Jalankan di dalam transaksi. */
export async function buatJurnalSusulan(db: Db, i: Omit<BatalInput, 'tanggal'>): Promise<RancanganJurnal> {
    const alasan = bersihkanAlasan(i.alasan);
    const r = await rancangJurnalSusulan(db, i.noBukti);
    await postJournal(db, { nomorBukti: r.noBukti, tanggal: r.tanggal, deskripsi: r.deskripsi.slice(0, 200), opr: i.opr, sumberTipe: r.sumberTipe, sumberId: r.sumberId,
        noBuktiTransaksi: r.noBuktiTransaksi, lines: r.baris.map((b) => ({ kodePerkiraan: b.kodePerkiraan, debit: b.debit, kredit: b.kredit })) });
    await db.query(
        `INSERT INTO transaksi_koreksi (jenis, sumber_id, no_bukti, aksi, alasan, opr, operator_id, data_lama, data_baru)
         VALUES ($1, $2, $3, 'jurnal_susulan', $4, $5, $6, '{}', $7)`,
        [r.jenis, r.sumberId, r.noBukti, alasan, i.opr, i.operatorId ?? null, JSON.stringify({ tanggal: r.tanggal, baris: r.baris })]);
    return r;
}
