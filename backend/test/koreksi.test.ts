import test from 'node:test';
import assert from 'node:assert/strict';
import { createPool, withTx, type Db } from '../src/db.ts';
import { batalBukti, batalPinjaman, batalSimpanan, buatJurnalSusulan, rancangJurnalSusulan } from '../src/posting/koreksi.ts';
import { bayarAngsuranKpr, cairkanKpr } from '../src/posting/kpr.ts';
import { bayarAngsuran, cairkanPinjaman } from '../src/posting/pinjaman.ts';
import { cekBuktiTerbuka, postJournal } from '../src/posting/journal.ts';
import { ambilSimpanan, setorSimpanan } from '../src/posting/simpanan.ts';

const pool = createPool();
const ROLLBACK = new Error('rollback-uji');
const inTx = async (fn: (db: Db) => Promise<void>) => {
    await assert.rejects(withTx(pool, async (db) => { await fn(db); throw ROLLBACK; }), (e) => e === ROLLBACK);
};
test.after(() => pool.end());

const TANGGAL = '2026-11-06';
const alasan = 'Salah input nominal setoran';
const saldo = async (db: Db, kode: string, jenis: string) => Number((await db.query(
    'SELECT COALESCE(SUM(rp_setoran - rp_pengambilan), 0) s FROM simpanan WHERE kode_agt = $1 AND jenis_simpanan = $2', [kode, jenis])).rows[0].s);
const jurnalBukti = async (db: Db, no: string) => (await db.query(
    'SELECT kode_perkiraan k, debit_jurnalumum::float d, kredit_jurnalumum::float c FROM jurnal_umum WHERE nomor_bukti = $1 ORDER BY urutan', [no])).rows;
const gagal = async (db: Db, fn: () => Promise<unknown>, pola: RegExp) => {
    await db.query('SAVEPOINT g');
    await assert.rejects(fn(), pola);
    await db.query('ROLLBACK TO SAVEPOINT g');
};

test('batal setoran: saldo kembali, jurnal dibalik, tercatat, dan tidak bisa diulang', async () => {
    const a = (await pool.query("SELECT kode_agt FROM anggota WHERE aktif ORDER BY id LIMIT 1")).rows[0].kode_agt;
    await inTx(async (db) => {
        const kas = (await db.query("SELECT id FROM perkiraan WHERE kode_perkiraan = '1.1.01.41'")).rows[0].id;
        const awal = await saldo(db, a, '03');
        const { noBukti } = await setorSimpanan(db, { kodeAgt: a, jenisSimpanan: '03', tanggal: TANGGAL, jumlah: 750000, kasPerkiraanId: kas, opr: 'uji' });
        const asal = await jurnalBukti(db, noBukti);

        await gagal(db, () => batalSimpanan(db, { noBukti, tanggal: TANGGAL, alasan: 'pendek', opr: 'uji' }), /minimal 10/);
        const r = await batalSimpanan(db, { noBukti, tanggal: TANGGAL, alasan, opr: 'uji', operatorId: 1 });
        assert.match(r.noBukti, /^BTL-2611-\d+$/);
        assert.equal(await saldo(db, a, '03'), awal);
        assert.deepEqual((await jurnalBukti(db, r.noBukti)).map((j) => [j.k, j.d, j.c]), asal.map((j) => [j.k, j.c, j.d]));
        assert.equal((await db.query('SELECT rp_setoran FROM simpanan WHERE no_bukti = $1', [noBukti])).rows[0].rp_setoran, '750000.0000', 'baris asal tidak berubah');
        const log = (await db.query('SELECT * FROM transaksi_koreksi WHERE no_bukti = $1', [noBukti])).rows;
        assert.equal(log.length, 1);
        assert.equal(log[0].no_bukti_pembalik, r.noBukti);
        assert.equal(log[0].alasan, alasan);
        assert.equal(log[0].data_lama.rp_setoran, '750000.0000');

        await gagal(db, () => batalSimpanan(db, { noBukti, tanggal: TANGGAL, alasan, opr: 'uji' }), /sudah dibatalkan/);
        await gagal(db, () => batalSimpanan(db, { noBukti: r.noBukti, tanggal: TANGGAL, alasan, opr: 'uji' }), /adalah pembalik/);
    });
});

test('batal pengambilan menambah saldo; setoran yang sudah terpakai tidak bisa dibatalkan', async () => {
    const a = (await pool.query(`SELECT a.kode_agt FROM anggota a WHERE a.aktif AND NOT EXISTS (SELECT 1 FROM simpanan s WHERE s.anggota_id = a.id AND s.jenis_simpanan = '04') ORDER BY a.id LIMIT 1`)).rows[0].kode_agt;
    await inTx(async (db) => {
        const kas = (await db.query("SELECT id FROM perkiraan WHERE kode_perkiraan = '1.1.01.41'")).rows[0].id;
        const b = { kodeAgt: a, jenisSimpanan: '04', tanggal: TANGGAL, kasPerkiraanId: kas, opr: 'uji' };
        const setor = await setorSimpanan(db, { ...b, jumlah: 100000 });
        const ambil = await ambilSimpanan(db, { ...b, jumlah: 60000 });
        await gagal(db, () => batalSimpanan(db, { noBukti: setor.noBukti, tanggal: TANGGAL, alasan, opr: 'uji' }), /tidak cukup/);
        const r = await batalSimpanan(db, { noBukti: ambil.noBukti, tanggal: TANGGAL, alasan, opr: 'uji' });
        assert.equal(Number(r.saldoSetelah), 100000);
        await batalSimpanan(db, { noBukti: setor.noBukti, tanggal: TANGGAL, alasan, opr: 'uji' });
        assert.equal(await saldo(db, a, '04'), 0);
    });
});

test('bukti SHU, bukti tanpa jurnal, dan bukti yang tidak ada', async () => {
    const shu = (await pool.query("SELECT no_bukti FROM simpanan WHERE no_bukti LIKE 'SHU/%' LIMIT 1")).rows[0]?.no_bukti;
    const tanpa = (await pool.query(`SELECT s.no_bukti FROM simpanan s WHERE s.rp_pengambilan > 0 AND s.tgl_transaksi >= '2018-01-01'
        AND NOT EXISTS (SELECT 1 FROM jurnal_umum j WHERE j.nomor_bukti = s.no_bukti) LIMIT 1`)).rows[0]?.no_bukti;
    await inTx(async (db) => {
        await gagal(db, () => batalSimpanan(db, { noBukti: 'TIDAK-ADA', tanggal: TANGGAL, alasan, opr: 'uji' }), /tidak ditemukan/);
        if (shu) await gagal(db, () => batalSimpanan(db, { noBukti: shu, tanggal: TANGGAL, alasan, opr: 'uji' }), /Bukti SHU/);
        if (tanpa) {
            const r = await batalSimpanan(db, { noBukti: tanpa, tanggal: TANGGAL, alasan, opr: 'uji' });
            assert.equal((await jurnalBukti(db, r.noBukti)).length, 0, 'bukti tanpa jurnal dibalik di buku simpanan saja');
        }
    });
});

test('kunci periode: jurnal di tahun yang sudah ditutup ditolak, tutup buku boleh', async () => {
    await inTx(async (db) => {
        const o = (await db.query(`SELECT MAX(tanggal_jurnalumum)::text t FROM jurnal_umum WHERE nomor_bukti LIKE 'TBT/%' AND tanggal_jurnalumum = date_trunc('year', tanggal_jurnalumum)::date`)).rows[0].t as string;
        const lama = `${Number(o.slice(0, 4)) - 1}-06-30`;
        const lines = [{ kodePerkiraan: '1.1.01.41', debit: 1000 }, { kodePerkiraan: '2.1.00.20', kredit: 1000 }];
        const j = { deskripsi: 'uji', opr: 'uji', sumberTipe: null, sumberId: null, lines };
        await gagal(db, () => postJournal(db, { ...j, nomorBukti: 'UJI/1', tanggal: lama }), /sudah ditutup/);
        await postJournal(db, { ...j, nomorBukti: 'TBT/UJI', tanggal: lama });
        await gagal(db, () => cekBuktiTerbuka(db, 'TBT/UJI'), /sudah ditutup/);
        assert.equal(await postJournal(db, { ...j, nomorBukti: 'UJI/2', tanggal: o }), 2);
    });
});

test('batal angsuran: hanya yang terakhir, cicilan dan jadwal kembali, bisa dibayar lagi; pencairan setelah semua angsuran batal', async () => {
    const a = (await pool.query('SELECT kode_agt FROM anggota WHERE rp_grade >= 1000000 ORDER BY id LIMIT 1')).rows[0].kode_agt;
    await inTx(async (db) => {
        const kas = (await db.query("SELECT id FROM perkiraan WHERE kode_perkiraan = '1.1.01.41'")).rows[0].id;
        const b = { tanggal: TANGGAL, alasan, opr: 'uji' };
        const c = await cairkanPinjaman(db, { kodeAgt: a, kodeKredit: 'C01', tglPinjaman: TANGGAL, pokok: 1000000, lama: 6, kasPerkiraanId: kas, opr: 'uji' });
        const bayar = () => bayarAngsuran(db, { noPinjaman: c.noPinjaman, tanggal: TANGGAL, kasPerkiraanId: kas, opr: 'uji' });
        const a1 = await bayar(), a2 = await bayar();
        const buku = async () => (await db.query('SELECT SUM(kredit_pokok - debit_pokok)::float p, SUM(kredit_bunga - debit_bunga)::float b FROM pinjaman_tunai_rincian WHERE no_pinjaman = $1', [c.noPinjaman])).rows[0];
        const hdr = async () => (await db.query('SELECT jml_cicilan, sisa_cicilan FROM pinjaman_tunai WHERE no_pinjaman = $1', [c.noPinjaman])).rows[0];
        const sesudah1 = await buku();

        await gagal(db, () => batalBukti(db, { ...b, noBukti: c.noPinjaman }), /sudah punya angsuran/);
        await gagal(db, () => batalBukti(db, { ...b, noBukti: a1.noBukti }), /Hanya angsuran terakhir/);
        const r2 = await batalBukti(db, { ...b, noBukti: a2.noBukti });
        assert.equal(r2.jenis, 'angsuran');
        assert.match(r2.noBukti, /^BTLA-2611-\d+$/);
        assert.deepEqual(await hdr(), { jml_cicilan: 1, sisa_cicilan: 5 });
        const t = (await db.query('SELECT no_bukti, tgl_bayar FROM pinjaman_tunai_rincian_tagih WHERE no_pinjaman = $1 AND angsuran_ke = 2', [c.noPinjaman])).rows[0];
        assert.deepEqual(t, { no_bukti: '', tgl_bayar: null });
        assert.deepEqual((await jurnalBukti(db, r2.noBukti)).map((j) => [j.k, j.d, j.c]), (await jurnalBukti(db, a2.noBukti)).map((j) => [j.k, j.c, j.d]));
        await gagal(db, () => batalBukti(db, { ...b, noBukti: a2.noBukti }), /sudah dibatalkan|bukan angsuran/);
        assert.equal((await bayar()).ke, 2, 'angsuran ke-2 bisa dibayar lagi');
        const a2b = (await db.query("SELECT no_bukti FROM pinjaman_tunai_rincian WHERE no_pinjaman = $1 AND angsuran_ke = 2", [c.noPinjaman])).rows[0].no_bukti;
        await batalBukti(db, { ...b, noBukti: a2b });
        await batalBukti(db, { ...b, noBukti: a1.noBukti });
        const k = await buku();
        assert.ok(Math.abs(k.p - 1000000) < 0.01 && k.b > 0, 'saldo kembali ke pencairan');
        assert.ok(sesudah1.p < 1000000);

        const rc = await batalBukti(db, { ...b, noBukti: c.noPinjaman });
        assert.equal(rc.jenis, 'pencairan');
        const akhir = await buku();
        assert.deepEqual([akhir.p, akhir.b], [0, 0]);
        assert.deepEqual(await hdr(), { jml_cicilan: 6, sisa_cicilan: 0 });
        const nilai = async (no: string) => (await jurnalBukti(db, no)).reduce((x, j) => x + j.d - j.c, 0);
        assert.equal(await nilai(rc.noBukti), 0);
        await gagal(db, () => batalBukti(db, { ...b, noBukti: c.noPinjaman }), /sudah dibatalkan/);
    });
});

test('batal pinjaman sekaligus: semua angsuran dari yang terakhir lalu pencairan, dalam satu langkah', async () => {
    const a = (await pool.query('SELECT kode_agt FROM anggota WHERE rp_grade >= 1000000 ORDER BY id LIMIT 1')).rows[0].kode_agt;
    await inTx(async (db) => {
        const kas = (await db.query("SELECT id FROM perkiraan WHERE kode_perkiraan = '1.1.01.41'")).rows[0].id;
        const c = await cairkanPinjaman(db, { kodeAgt: a, kodeKredit: 'C01', tglPinjaman: TANGGAL, pokok: 1000000, lama: 3, kasPerkiraanId: kas, opr: 'uji' });
        // Kasus SUMIRAH: uang dikembalikan lewat angsuran berjasa 0.
        for (let k = 0; k < 3; k++) await bayarAngsuran(db, { noPinjaman: c.noPinjaman, tanggal: TANGGAL, kasPerkiraanId: kas, opr: 'uji', override: { jasa: 0 }, dariKasir: true, alasanJasa: 'pinjaman dibatalkan anggota' });
        await gagal(db, () => batalPinjaman(db, { noBukti: c.noPinjaman, tanggal: TANGGAL, alasan: 'pendek', opr: 'uji' }), /minimal 10/);
        await gagal(db, () => batalPinjaman(db, { noBukti: 'CR-TIDAK-ADA', tanggal: TANGGAL, alasan, opr: 'uji' }), /tidak ditemukan/);

        const r = await batalPinjaman(db, { noBukti: c.noPinjaman, tanggal: TANGGAL, alasan, opr: 'uji', operatorId: 1 });
        assert.equal(r.angsuran.length, 3);
        assert.match(r.pencairan, /^BTLC-2611-\d+$/);
        const buku = (await db.query('SELECT SUM(kredit_pokok - debit_pokok)::float p, SUM(kredit_bunga - debit_bunga)::float b, SUM(debit_pokok + debit_bunga)::float bayar FROM pinjaman_tunai_rincian WHERE no_pinjaman = $1', [c.noPinjaman])).rows[0];
        assert.deepEqual([buku.p, buku.b, buku.bayar], [0, 0, 0], 'buku nol, tidak ada uang terhitung dibayar');
        const jurnal = (await db.query(`SELECT SUM(debit_jurnalumum - kredit_jurnalumum)::float s, count(*)::int n FROM jurnal_umum
            WHERE (nomor_bukti = $1 OR nomor_bukti IN (SELECT no_bukti FROM pinjaman_tunai_rincian WHERE no_pinjaman = $1)) AND kode_perkiraan = '1.1.01.41'`, [c.noPinjaman])).rows[0];
        assert.ok(jurnal.n > 0);
        assert.equal(jurnal.s, 0, 'kas kembali seperti sebelum pencairan');
        const log = (await db.query("SELECT jenis, count(*)::int n FROM transaksi_koreksi WHERE alasan = $1 AND no_bukti_pembalik = ANY($2) GROUP BY jenis ORDER BY jenis", [alasan, [r.pencairan, ...r.angsuran]])).rows;
        assert.deepEqual(log, [{ jenis: 'angsuran', n: 3 }, { jenis: 'pencairan', n: 1 }]);
        await gagal(db, () => batalPinjaman(db, { noBukti: c.noPinjaman, tanggal: TANGGAL, alasan, opr: 'uji' }), /sudah dibatalkan/);
    });
});

test('batal KPR: angsuran terakhir dibalik dengan jurnal, pencairan tanpa jurnal', async () => {
    const a = (await pool.query('SELECT kode_agt FROM anggota WHERE rp_grade >= 1000000 ORDER BY id LIMIT 1')).rows[0].kode_agt;
    const jk = (await pool.query("SELECT kode_kredit FROM jenis_kredit WHERE group_pinjaman = 'KPR' AND coa_kredit_id IS NOT NULL AND kunci_jika_melebihi_grade = 0 ORDER BY id LIMIT 1")).rows[0].kode_kredit;
    await inTx(async (db) => {
        const kas = (await db.query("SELECT id FROM perkiraan WHERE kode_perkiraan = '1.1.01.41'")).rows[0].id;
        const b = { tanggal: TANGGAL, alasan, opr: 'uji' };
        const c = await cairkanKpr(db, { kodeAgt: a, kodeKredit: jk, tglPinjaman: TANGGAL, pokok: 600000, lama: 6, kasPerkiraanId: kas, opr: 'uji' });
        const x = await bayarAngsuranKpr(db, { noPinjaman: c.noPinjaman, tanggal: TANGGAL, kasPerkiraanId: kas, opr: 'uji' });
        await gagal(db, () => batalBukti(db, { ...b, noBukti: c.noPinjaman }), /sudah punya angsuran/);
        const r = await batalBukti(db, { ...b, noBukti: x.noBukti });
        assert.equal(r.jenis, 'kpr_angsuran');
        const sisa = async () => Number((await db.query('SELECT SUM(kredit_pokok - debit_pokok) s FROM kpr_rincian WHERE no_pinjaman = $1', [c.noPinjaman])).rows[0].s);
        assert.equal(await sisa(), 600000);
        assert.equal((await db.query('SELECT jml_cicilan FROM kpr WHERE no_pinjaman = $1', [c.noPinjaman])).rows[0].jml_cicilan, 0);
        assert.equal((await jurnalBukti(db, r.noBukti)).length, 2);
        const rc = await batalBukti(db, { ...b, noBukti: c.noPinjaman });
        assert.equal(rc.jenis, 'kpr_pencairan');
        assert.equal(await sisa(), 0);
        assert.equal((await jurnalBukti(db, rc.noBukti)).length, 0, 'pencairan KPR tidak berjurnal');
    });
});

test('jurnal susulan: baris sama dengan jurnal asli, tercatat, tidak bisa diulang, batal tetap jalan', async () => {
    const a = (await pool.query('SELECT kode_agt FROM anggota WHERE rp_grade >= 1000000 ORDER BY id LIMIT 1')).rows[0].kode_agt;
    await inTx(async (db) => {
        const kas = (await db.query("SELECT id FROM perkiraan WHERE kode_perkiraan = '1.1.01.41'")).rows[0].id;
        const urut = (j: { k: string; d: number; c: number }[]) => j.map((x) => [x.k, x.d, x.c]).sort();
        const uji = async (no: string) => {
            const asal = await jurnalBukti(db, no);
            await gagal(db, () => rancangJurnalSusulan(db, no), /sudah punya jurnal/);
            await db.query('DELETE FROM jurnal_umum WHERE nomor_bukti = $1', [no]);
            await buatJurnalSusulan(db, { noBukti: no, alasan, opr: 'uji' });
            assert.deepEqual(urut(await jurnalBukti(db, no)), urut(asal), no);
        };
        const c = await cairkanPinjaman(db, { kodeAgt: a, kodeKredit: 'C01', tglPinjaman: TANGGAL, pokok: 1000000, lama: 6, kasPerkiraanId: kas, opr: 'uji' });
        const x = await bayarAngsuran(db, { noPinjaman: c.noPinjaman, tanggal: TANGGAL, kasPerkiraanId: kas, opr: 'uji' });
        const s = await setorSimpanan(db, { kodeAgt: a, jenisSimpanan: '03', tanggal: TANGGAL, jumlah: 50000, kasPerkiraanId: kas, opr: 'uji' });
        await uji(c.noPinjaman); await uji(x.noBukti); await uji(s.noBukti);
        assert.equal((await db.query("SELECT count(*)::int n FROM transaksi_koreksi WHERE aksi = 'jurnal_susulan' AND no_bukti = $1", [s.noBukti])).rows[0].n, 1);
        await batalBukti(db, { noBukti: s.noBukti, tanggal: TANGGAL, alasan, opr: 'uji' });
        const t = await setorSimpanan(db, { kodeAgt: a, jenisSimpanan: '03', tanggal: TANGGAL, jumlah: 50000, kasPerkiraanId: kas, opr: 'uji' });
        await db.query('DELETE FROM jurnal_umum WHERE nomor_bukti = $1', [t.noBukti]);
        const b = await batalBukti(db, { noBukti: t.noBukti, tanggal: TANGGAL, alasan, opr: 'uji' });
        await gagal(db, () => rancangJurnalSusulan(db, t.noBukti), /sudah dibatalkan/);
        await gagal(db, () => rancangJurnalSusulan(db, b.noBukti), /sudah dibatalkan/);
    });
});

test('pokok manual: ditandai, dibatasi sisa pokok, jurnal mengikuti, batal tetap jalan', async () => {
    const a = (await pool.query('SELECT kode_agt FROM anggota WHERE rp_grade >= 1000000 ORDER BY id LIMIT 1')).rows[0].kode_agt;
    await inTx(async (db) => {
        const kas = (await db.query("SELECT id FROM perkiraan WHERE kode_perkiraan = '1.1.01.41'")).rows[0].id;
        const c = await cairkanPinjaman(db, { kodeAgt: a, kodeKredit: 'C01', tglPinjaman: TANGGAL, pokok: 1000000, lama: 6, kasPerkiraanId: kas, opr: 'uji' });
        const dasar = { noPinjaman: c.noPinjaman, tanggal: TANGGAL, kasPerkiraanId: kas, opr: 'uji', pokokManual: true };
        await gagal(db, () => bayarAngsuran(db, { ...dasar, override: { pokok: '1000001' } }), /melebihi sisa pokok/);
        await gagal(db, () => bayarAngsuran(db, { ...dasar, override: { pokok: 0, jasa: 0, adm: 0, provisi: 0 } }), /lebih dari nol/);
        const r = await bayarAngsuran(db, { ...dasar, override: { pokok: '400000' } });
        assert.equal(Number(r.pokok), 400000);
        assert.equal(Number(r.sisaPokok), 600000);
        const b = (await db.query('SELECT deskripsi, debit_pokok::float d FROM pinjaman_tunai_rincian WHERE no_bukti = $1', [r.noBukti])).rows[0];
        assert.deepEqual(b, { deskripsi: 'Setoran ke 1 (pokok diubah)', d: 400000 });
        const j = await jurnalBukti(db, r.noBukti);
        assert.equal(j.reduce((t, x) => t + x.d, 0), j.reduce((t, x) => t + x.c, 0));
        assert.ok(j.some((x) => x.c === 400000));
        await batalBukti(db, { noBukti: r.noBukti, tanggal: TANGGAL, alasan, opr: 'uji' });
    });
});

test('pinjaman bank: angsuran mengikuti pembagian terakhir yang berbeda dari jadwal, koperasi tetap jadwal', async () => {
    const a = (await pool.query('SELECT kode_agt FROM anggota WHERE rp_grade >= 1000000 ORDER BY id LIMIT 1')).rows[0].kode_agt;
    await inTx(async (db) => {
        const kas = (await db.query("SELECT id FROM perkiraan WHERE kode_perkiraan = '1.1.01.41'")).rows[0].id;
        const uji = async (kodeKredit: string) => {
            const c = await cairkanPinjaman(db, { kodeAgt: a, kodeKredit, tglPinjaman: TANGGAL, pokok: 1000000, lama: 5, kasPerkiraanId: kas, opr: 'uji' });
            const dasar = { noPinjaman: c.noPinjaman, tanggal: TANGGAL, kasPerkiraanId: kas, opr: 'uji' };
            const baku = (await db.query('SELECT debit_pokok::float p, debit_bunga::float j FROM pinjaman_tunai_rincian_tagih t JOIN pinjaman_tunai x ON x.id = t.pinjaman_tunai_id WHERE x.no_pinjaman = $1 AND t.angsuran_ke = 1', [c.noPinjaman])).rows[0];
            await bayarAngsuran(db, { ...dasar, override: { pokok: baku.p - 50000, jasa: baku.j + 50000 } });
            return { r: await bayarAngsuran(db, dasar), baku };
        };
        const bank = await uji('C16');
        assert.equal(Number(bank.r.pokok), bank.baku.p - 50000);
        assert.equal(Number(bank.r.jasa), bank.baku.j + 50000);
        const kop = await uji('C01');
        assert.equal(Number(kop.r.pokok), kop.baku.p);
    });
});
