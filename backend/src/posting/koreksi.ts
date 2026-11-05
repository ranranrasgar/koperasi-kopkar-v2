import type { Db } from '../db.ts';
import { postJournal } from './journal.ts';
import { fromUnits, toUnits } from './money.ts';

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
        'SELECT no_bukti FROM transaksi_koreksi WHERE jenis = $1 AND (no_bukti = $2 OR no_bukti_pembalik = $2)', [jenis, no])).rows[0];
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

/** Batalkan satu bukti: sumbernya dicari dari nomor bukti, lalu diproses dengan aturan sumber itu. */
export async function batalBukti(db: Db, i: BatalInput): Promise<BatalHasil> {
    const ada = (await db.query<{ jenis: JenisKoreksi }>(
        `SELECT 'simpanan' jenis FROM simpanan WHERE no_bukti = $1
         UNION ALL SELECT 'angsuran' FROM pinjaman_tunai_rincian WHERE no_bukti = $1 AND no_bukti <> no_pinjaman
         UNION ALL SELECT 'pencairan' FROM pinjaman_tunai WHERE no_pinjaman = $1
         UNION ALL SELECT 'kpr_angsuran' FROM kpr_rincian WHERE no_bukti = $1
         UNION ALL SELECT 'kpr_pencairan' FROM kpr WHERE no_pinjaman = $1`, [i.noBukti])).rows;
    const jenis = [...new Set(ada.map((x) => x.jenis))];
    if (jenis.length === 0) throw new Error(`Bukti ${i.noBukti} tidak ditemukan`);
    if (jenis.length > 1) throw new Error(`Nomor ${i.noBukti} dipakai di lebih dari satu sumber (${jenis.join(', ')}); koreksi lewat jurnal`);
    const proses = { simpanan: batalSimpanan, angsuran: batalAngsuran, pencairan: batalPencairan, kpr_angsuran: batalAngsuranKpr, kpr_pencairan: batalPencairanKpr };
    return proses[jenis[0]](db, i);
}
