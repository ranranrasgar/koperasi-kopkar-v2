import type { Db } from '../db.ts';
import { cekBuktiTerbuka, cekPeriodeTerbuka } from './journal.ts';
import { bersihkanAlasan, cekBelumDikoreksi, cekTidakDitutup, sumberBukti, type JenisKoreksi } from './koreksi.ts';
import { fromUnits, toUnits } from './money.ts';

// Info transaksi asal sebuah bukti jurnal, dan hapus transaksi itu beserta jurnalnya. Berbeda dengan koreksi.ts (pembalik, riwayat utuh),
// di sini barisnya benar-benar dihapus; snapshot transaksi dan jurnalnya disimpan di transaksi_koreksi (aksi 'hapus') sebagai catatan.
// Yang boleh dihapus: simpanan, angsuran pinjaman tunai, dan angsuran KPR (angsuran hanya yang terakhir, supaya urutan cicilan utuh).
// Pencairan hanya ditampilkan; pembatalannya lewat batalBukti.

type Q = Pick<Db, 'query'>;

export interface BarisInfo { label: string; nilai: string; uang?: boolean }
export interface InfoAsal {
    jenis: JenisKoreksi;
    judul: string;
    baris: BarisInfo[];
    /** Jumlah baris jurnal yang ikut terhapus. */
    jurnal: number;
    /** Alasan transaksi ini tidak bisa dihapus dari sini, atau null bila boleh. */
    alasanTolak: string | null;
}

interface Asal {
    judul: string;
    baris: BarisInfo[];
    tanggal: string;
    sumberId: string;
    lama: object;
    periksa: () => Promise<void>;
    hapus: () => Promise<void>;
}

type Baris = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any -- hasil query bebas bentuk, dibaca per kolom

const orang = (nama: string | null, kode: string | null) => [nama, kode ? `(${kode})` : ''].filter(Boolean).join(' ') || '-';
const hapusJurnal = (db: Q, no: string) => db.query('DELETE FROM jurnal_umum WHERE nomor_bukti = $1', [no]);

async function periksaUmum(db: Q, jenis: JenisKoreksi, no: string, tanggal: string) {
    await cekBelumDikoreksi(db, jenis, no);
    await cekPeriodeTerbuka(db, tanggal);
    await cekBuktiTerbuka(db, no);
}

async function dariSimpanan(db: Q, no: string, kunci: boolean): Promise<Asal> {
    const s: Baris | undefined = (await db.query(
        `SELECT s.id, s.anggota_id, s.jenis_simpanan_id, s.tgl_transaksi::text tgl, s.rp_setoran, s.rp_pengambilan, s.deskripsi, s.opr, s.kode_agt,
                a.nama, j.nama_simpanan, k.kode_perkiraan || ' ' || k.nama_perkiraan kas
           FROM simpanan s LEFT JOIN anggota a ON a.id = s.anggota_id LEFT JOIN jenis_simpanan j ON j.id = s.jenis_simpanan_id LEFT JOIN perkiraan k ON k.id = s.kas_perkiraan_id
          WHERE s.no_bukti = $1 ${kunci ? 'FOR UPDATE OF s' : ''}`, [no])).rows[0];
    if (!s) throw new Error(`Bukti ${no} tidak ditemukan`);
    const setor = toUnits(s.rp_setoran), ambil = toUnits(s.rp_pengambilan);
    return {
        judul: 'Transaksi Simpanan', tanggal: s.tgl, sumberId: s.id, lama: s,
        baris: [
            { label: 'Jenis', nilai: setor > 0n ? 'Setoran' : 'Pengambilan' },
            { label: 'Tanggal', nilai: s.tgl }, { label: 'Anggota', nilai: orang(s.nama, s.kode_agt) },
            { label: 'Jenis simpanan', nilai: s.nama_simpanan ?? '-' }, { label: 'Jumlah', nilai: fromUnits(setor > 0n ? setor : ambil), uang: true },
            { label: 'Akun kas/bank', nilai: s.kas ?? '-' }, { label: 'Keterangan', nilai: s.deskripsi?.trim() || '-' }, { label: 'Operator', nilai: s.opr ?? '-' },
        ],
        periksa: async () => {
            if (no.startsWith('SHU/')) throw new Error('Bukti SHU tidak bisa dihapus di sini; koreksi lewat menu SHU atau jurnal');
            await periksaUmum(db, 'simpanan', no, s.tgl);
            const potongan = (await db.query<{ periode: string }>(
                `SELECT p.periode FROM potongan_gaji_anggota g JOIN potongan_gaji p ON p.id = g.potongan_gaji_id
                  WHERE $1 IN (g.bukti_pokok, g.bukti_wajib, g.bukti_sukarela) LIMIT 1`, [no])).rows[0];
            if (potongan) throw new Error(`Bukti ${no} berasal dari Potongan Gaji periode ${potongan.periode}, jadi tidak bisa dihapus satu per satu`);
            const saldo = toUnits((await db.query<{ s: string }>(
                'SELECT COALESCE(SUM(rp_setoran - rp_pengambilan), 0) s FROM simpanan WHERE anggota_id = $1 AND jenis_simpanan_id = $2', [s.anggota_id, s.jenis_simpanan_id])).rows[0].s);
            if (saldo - setor + ambil < 0n) throw new Error(`Saldo simpanan ${fromUnits(saldo)} tidak cukup untuk menghapus setoran ${fromUnits(setor)}; saldo akan negatif`);
        },
        hapus: async () => { await hapusJurnal(db, no); await db.query('DELETE FROM simpanan WHERE id = $1', [s.id]); },
    };
}

async function dariAngsuran(db: Q, no: string, kunci: boolean): Promise<Asal> {
    const rows: Baris[] = (await db.query(
        `SELECT x.id, x.pinjaman_tunai_id, x.angsuran_ke, x.tanggal_angsuran::text tgl, x.debit_pokok, x.debit_bunga, x.rp_adm, x.rp_provisi, x.no_pinjaman, x.deskripsi,
                p.jml_cicilan, p.lama_angsuran, a.nama, a.nik, jk.nama_kredit, k.kode_perkiraan || ' ' || k.nama_perkiraan kas
           FROM pinjaman_tunai_rincian x JOIN pinjaman_tunai p ON p.id = x.pinjaman_tunai_id JOIN anggota a ON a.id = p.anggota_id
           LEFT JOIN jenis_kredit jk ON jk.id = p.jenis_kredit_id LEFT JOIN perkiraan k ON k.id = x.kas_perkiraan_id
          WHERE x.no_bukti = $1 AND x.no_bukti <> x.no_pinjaman ${kunci ? 'FOR UPDATE OF x, p' : ''}`, [no])).rows;
    if (!rows.length) throw new Error(`Bukti ${no} tidak ditemukan`);
    const b = rows[0];
    return {
        judul: 'Angsuran Pinjaman', tanggal: b.tgl, sumberId: b.id, lama: b,
        baris: [
            { label: 'Pinjaman', nilai: `${b.no_pinjaman} (${b.nama_kredit ?? '-'})` }, { label: 'Anggota', nilai: orang(b.nama, b.nik) },
            { label: 'Angsuran ke', nilai: `${b.angsuran_ke} dari ${b.lama_angsuran}` }, { label: 'Tanggal', nilai: b.tgl },
            { label: 'Pokok', nilai: fromUnits(toUnits(b.debit_pokok)), uang: true }, { label: 'Jasa', nilai: fromUnits(toUnits(b.debit_bunga)), uang: true },
            { label: 'Administrasi', nilai: fromUnits(toUnits(b.rp_adm)), uang: true }, { label: 'Provisi', nilai: fromUnits(toUnits(b.rp_provisi)), uang: true },
            { label: 'Akun kas/bank', nilai: b.kas ?? '(belum tercatat)' },
        ],
        periksa: async () => {
            if (rows.length !== 1) throw new Error(`Bukti ${no} tercatat di ${rows.length} baris; koreksi lewat jurnal`);
            if (b.angsuran_ke <= 0) throw new Error(`Bukti ${no} bukan angsuran`);
            if (b.angsuran_ke !== b.jml_cicilan) throw new Error(`Hanya angsuran terakhir yang bisa dihapus: pinjaman ${b.no_pinjaman} sudah sampai angsuran ke-${b.jml_cicilan}, bukti ini ke-${b.angsuran_ke}`);
            await periksaUmum(db, 'angsuran', no, b.tgl);
            await cekTidakDitutup(db, b.pinjaman_tunai_id);
            const potongan = (await db.query<{ periode: string }>(
                'SELECT g.periode FROM potongan_gaji_pinjaman x JOIN potongan_gaji g ON g.id = x.potongan_gaji_id WHERE x.no_bukti = $1 LIMIT 1', [no])).rows[0];
            if (potongan) throw new Error(`Bukti ${no} berasal dari Potongan Gaji periode ${potongan.periode}, jadi tidak bisa dihapus satu per satu`);
        },
        hapus: async () => {
            await hapusJurnal(db, no);
            await db.query('DELETE FROM pinjaman_tunai_rincian WHERE id = $1', [b.id]);
            await db.query("UPDATE pinjaman_tunai_rincian_tagih SET no_bukti = '', tgl_bayar = NULL, bayar_pokok = 0, bayar_bunga = 0 WHERE pinjaman_tunai_id = $1 AND angsuran_ke = $2", [b.pinjaman_tunai_id, b.angsuran_ke]);
            await db.query(
                `UPDATE pinjaman_tunai SET jml_cicilan = $2, sisa_cicilan = lama_angsuran - $2,
                    tgl_akhir_bayar = (SELECT MAX(x.tanggal_angsuran) FROM pinjaman_tunai_rincian x WHERE x.pinjaman_tunai_id = $1 AND x.angsuran_ke > 0) WHERE id = $1`,
                [b.pinjaman_tunai_id, b.angsuran_ke - 1]);
        },
    };
}

async function dariAngsuranKpr(db: Q, no: string, kunci: boolean): Promise<Asal> {
    const rows: Baris[] = (await db.query(
        `SELECT x.id, x.kpr_id, x.angsuran_ke, x.tanggal_angsuran::text tgl, x.debit_pokok, x.deskripsi, k.no_pinjaman nomor, k.jml_cicilan, k.lama_angsuran,
                a.nama, jk.nama_kredit, kp.kode_perkiraan || ' ' || kp.nama_perkiraan kas
           FROM kpr_rincian x JOIN kpr k ON k.id = x.kpr_id JOIN anggota a ON a.id = k.anggota_id
           LEFT JOIN jenis_kredit jk ON jk.id = k.jenis_kredit_id LEFT JOIN perkiraan kp ON kp.id = x.kas_perkiraan_id
          WHERE x.no_bukti = $1 ${kunci ? 'FOR UPDATE OF x, k' : ''}`, [no])).rows;
    if (!rows.length) throw new Error(`Bukti ${no} tidak ditemukan`);
    const b = rows[0];
    return {
        judul: 'Angsuran KPR', tanggal: b.tgl, sumberId: b.id, lama: b,
        baris: [
            { label: 'KPR', nilai: `${b.nomor} (${b.nama_kredit ?? '-'})` }, { label: 'Anggota', nilai: b.nama ?? '-' },
            { label: 'Angsuran ke', nilai: `${b.angsuran_ke} dari ${b.lama_angsuran}` }, { label: 'Tanggal', nilai: b.tgl },
            { label: 'Pokok', nilai: fromUnits(toUnits(b.debit_pokok)), uang: true }, { label: 'Akun kas/bank', nilai: b.kas ?? '(belum tercatat)' },
        ],
        periksa: async () => {
            if (rows.length !== 1) throw new Error(`Bukti ${no} tercatat di ${rows.length} baris; koreksi lewat jurnal`);
            if (b.angsuran_ke <= 0) throw new Error(`Bukti ${no} bukan angsuran`);
            if (b.angsuran_ke !== b.jml_cicilan) throw new Error(`Hanya angsuran terakhir yang bisa dihapus: KPR ${b.nomor} sudah sampai angsuran ke-${b.jml_cicilan}, bukti ini ke-${b.angsuran_ke}`);
            await periksaUmum(db, 'kpr_angsuran', no, b.tgl);
            const potongan = (await db.query<{ periode: string }>(
                'SELECT g.periode FROM potongan_gaji_pinjaman x JOIN potongan_gaji g ON g.id = x.potongan_gaji_id WHERE x.no_bukti = $1 LIMIT 1', [no])).rows[0];
            if (potongan) throw new Error(`Bukti ${no} berasal dari Potongan Gaji periode ${potongan.periode}, jadi tidak bisa dihapus satu per satu`);
        },
        hapus: async () => {
            await hapusJurnal(db, no);
            await db.query('DELETE FROM kpr_rincian WHERE id = $1', [b.id]);
            await db.query(
                'UPDATE kpr SET jml_cicilan = $2, tgl_akhir_bayar = (SELECT MAX(x.tanggal_angsuran) FROM kpr_rincian x WHERE x.kpr_id = $1 AND x.angsuran_ke > 0) WHERE id = $1',
                [b.kpr_id, b.angsuran_ke - 1]);
        },
    };
}

/** Pencairan (tunai atau KPR): hanya info; tidak bisa dihapus dari sini karena seluruh jadwal dan buku pinjamannya ikut. */
async function dariPencairan(db: Q, no: string, kpr: boolean): Promise<Asal> {
    const p: Baris | undefined = (await db.query(
        `SELECT p.id, p.tgl_pinjaman::text tgl, p.rp_pinjaman_pokok, p.lama_angsuran, p.jml_cicilan, a.nama, a.nik, jk.nama_kredit
           FROM ${kpr ? 'kpr' : 'pinjaman_tunai'} p JOIN anggota a ON a.id = p.anggota_id LEFT JOIN jenis_kredit jk ON jk.id = p.jenis_kredit_id WHERE p.no_pinjaman = $1`, [no])).rows[0];
    if (!p) throw new Error(`Pinjaman ${no} tidak ditemukan`);
    return {
        judul: kpr ? 'Pencairan KPR' : 'Pencairan Pinjaman', tanggal: p.tgl, sumberId: p.id, lama: p,
        baris: [
            { label: 'Pinjaman', nilai: `${no} (${p.nama_kredit ?? '-'})` }, { label: 'Anggota', nilai: orang(p.nama, p.nik) }, { label: 'Tanggal', nilai: p.tgl },
            { label: 'Pokok', nilai: fromUnits(toUnits(p.rp_pinjaman_pokok)), uang: true }, { label: 'Angsuran terbayar', nilai: `${p.jml_cicilan} dari ${p.lama_angsuran}` },
        ],
        periksa: async () => { throw new Error('Pencairan tidak bisa dihapus dari sini karena jadwal dan buku pinjamannya ikut; gunakan Batalkan Transaksi di Audit Data'); },
        hapus: async () => { throw new Error('Pencairan tidak bisa dihapus dari sini'); },
    };
}

const MUAT: Record<JenisKoreksi, (db: Q, no: string, kunci: boolean) => Promise<Asal>> = {
    simpanan: dariSimpanan, angsuran: dariAngsuran, kpr_angsuran: dariAngsuranKpr,
    pencairan: (db, no) => dariPencairan(db, no, false), kpr_pencairan: (db, no) => dariPencairan(db, no, true),
};

/** Transaksi asal sebuah nomor bukti jurnal, untuk ditampilkan sebagai info; null bila bukti bukan dari simpanan atau pinjaman. Hanya membaca. */
export async function infoTransaksiAsal(db: Q, nomorBukti: string): Promise<InfoAsal | null> {
    let jenis: JenisKoreksi;
    try { jenis = await sumberBukti(db, nomorBukti); } catch { return null; }
    const a = await MUAT[jenis](db, nomorBukti, false);
    const jurnal = Number((await db.query<{ n: string }>('SELECT count(*) n FROM jurnal_umum WHERE nomor_bukti = $1', [nomorBukti])).rows[0].n);
    let alasanTolak: string | null = null;
    try { await a.periksa(); } catch (e) { alasanTolak = e instanceof Error ? e.message : 'Tidak bisa dihapus'; }
    return { jenis, judul: a.judul, baris: a.baris, jurnal, alasanTolak };
}

export interface HapusInput { noBukti: string; alasan: string; opr: string; operatorId?: number }

/** Hapus transaksi asal beserta seluruh jurnalnya, lalu catat snapshot-nya di transaksi_koreksi. Jalankan di dalam transaksi. */
export async function hapusTransaksiAsal(db: Db, i: HapusInput): Promise<{ jenis: JenisKoreksi; judul: string; jurnalDihapus: number }> {
    const alasan = bersihkanAlasan(i.alasan);
    const jenis = await sumberBukti(db, i.noBukti);
    const a = await MUAT[jenis](db, i.noBukti, true);
    await a.periksa();
    const jurnal = (await db.query('SELECT kode_perkiraan, debit_jurnalumum, kredit_jurnalumum, deskripsi FROM jurnal_umum WHERE nomor_bukti = $1 ORDER BY urutan', [i.noBukti])).rows;
    await a.hapus();
    await db.query(
        `INSERT INTO transaksi_koreksi (jenis, sumber_id, no_bukti, aksi, alasan, opr, operator_id, data_lama, data_baru)
         VALUES ($1, $2, $3, 'hapus', $4, $5, $6, $7, '{}')`,
        [jenis, a.sumberId, i.noBukti, alasan, i.opr, i.operatorId ?? null, JSON.stringify({ ...a.lama, jurnal })]);
    return { jenis, judul: a.judul, jurnalDihapus: jurnal.length };
}
