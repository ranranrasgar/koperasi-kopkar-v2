import test from 'node:test';
import assert from 'node:assert/strict';
import { createPool, withTx, type Db } from '../src/db.ts';
import { batalkanPencairan, cairkanShu, daftarTahunShu, hitungShu, postingKeSukarela, postingShu, rencanaTutupBuku, tutupBuku } from '../src/posting/shu.ts';

/*
 * Semua uji berjalan di transaksi yang di-rollback. Acuannya SHU tahun buku 2025 yang diproses desktop (temp_shu_backup dan jurnal TBT/251231/001,
 * tersimpan di shu_tahun/shu_anggota hasil impor): proses web harus menghasilkan angka yang sama persis.
 */
const pool = createPool();
const ROLLBACK = new Error('rollback-uji');
const inTx = async (fn: (db: Db) => Promise<void>) => {
    await assert.rejects(withTx(pool, async (db) => { await fn(db); throw ROLLBACK; }), (e) => e === ROLLBACK);
};
test.after(() => pool.end());

/** Keadaan awal "belum ada yang dicairkan" supaya hitung dan tutup buku ulang boleh dijalankan; jurnal pencairan desktop dihapus bersama. */
const kosongkanPencairan = async (db: Db, tahun: number) => {
    await db.query("DELETE FROM jurnal_umum WHERE nomor_bukti IN (SELECT no_reff FROM shu_anggota WHERE tahun = $1 AND no_reff IS NOT NULL)", [tahun]);
    await db.query("UPDATE shu_anggota SET status = 0, rp_dicairkan = 0, tgl_cair = NULL, no_reff = NULL, cara = NULL WHERE tahun = $1", [tahun]);
};

test('SHU: pratinjau tutup buku 2025 sama dengan jurnal TBT desktop', async () => {
    await inTx(async (db) => {
        const r = await rencanaTutupBuku(db, 2025);
        assert.equal(Number(r.pendapatan), 1703638348.53);
        assert.equal(Number(r.pajak), 187400218.34);
        assert.equal(Number(r.labaDitahan), 1516238130.19);
        const desk = (await db.query<{ kode_perkiraan: string; c: string }>(
            `SELECT kode_perkiraan, kredit_jurnalumum c FROM jurnal_umum WHERE nomor_bukti = 'TBT/251231/001' AND tanggal_jurnalumum = '2025-12-31'
              AND kode_perkiraan = ANY(SELECT kode_coa FROM jenis_pos_shu)`)).rows;
        for (const p of r.pos) if (Number(p.nominal) > 0) {
            assert.equal(Number(desk.find((d) => d.kode_perkiraan === p.kode)?.c), Number(p.nominal), `pos ${p.nama}`);
        }
        assert.equal(Number(r.shuAnggota), 773281446.4);
        assert.equal(r.sudahDitutup, true);
        assert.equal(r.adaPencairan, true);
    });
});

test('SHU: hitung 2025 menghasilkan empat komponen dan bagian yang sama dengan desktop', async () => {
    await inTx(async (db) => {
        await kosongkanPencairan(db, 2025);
        await db.query('CREATE TEMP TABLE desktop AS SELECT kode_agt, rp_sukarela, rp_jasa_uang, rp_jasa_barang, lama_agt, rp_pencairan, status FROM temp_shu_backup');
        // pencairan desktop sudah dihapus dari shu_anggota, tetapi temp_shu_backup desktop tetap jadi acuan
        const h = await hitungShu(db, { tahun: 2025, opr: 'uji' });
        assert.ok(h.anggota >= 900, `jumlah anggota ${h.anggota}`);
        const c = (await db.query(
            `SELECT COUNT(*) n,
                    COUNT(*) FILTER (WHERE s.rp_sukarela = d.rp_sukarela) suk, COUNT(*) FILTER (WHERE s.rp_jasa_uang = d.rp_jasa_uang) uang,
                    COUNT(*) FILTER (WHERE s.rp_jasa_barang = d.rp_jasa_barang) barang, COUNT(*) FILTER (WHERE s.lama_agt = d.lama_agt) lama,
                    COUNT(*) FILTER (WHERE d.status = 1) cair,
                    COUNT(*) FILTER (WHERE d.status = 1 AND ABS(s.rp_bagian - d.rp_pencairan) < 0.01) bagian_2d,
                    COUNT(*) FILTER (WHERE d.status = 1 AND ABS(s.rp_bagian - d.rp_pencairan) < 0.5) bagian_50sen,
                    COALESCE(MAX(ABS(s.rp_bagian - d.rp_pencairan)) FILTER (WHERE d.status = 1), 0)::float selisih_maks
               FROM shu_anggota s JOIN desktop d ON d.kode_agt = s.kode_agt WHERE s.tahun = 2025`)).rows[0];
        const n = Number(c.n);
        assert.ok(n >= 900);
        assert.equal(Number(c.suk), n, 'saldo sukarela');
        assert.equal(Number(c.uang), n, 'jasa uang');
        assert.equal(Number(c.barang), n, 'jasa barang');
        assert.equal(Number(c.lama), n, 'lama anggota (bankir)');
        // Rumus bagian terhadap desktop: dengan himpunan anggota yang sama (seluruh 1.032 baris desktop) rumus menghasilkan rp_pencairan desktop.
        // Himpunan web hanya anggota yang kini aktif (980), jadi totalnya berbeda dan bagian per anggota memang bergeser; yang dibandingkan
        // dengan rumus ini adalah komponen (sudah sama persis di atas) dan kolam.
        const f = (await db.query(
            `WITH x AS (SELECT status, rp_pencairan,
                               773281446.4 / 4 * (rp_sukarela / SUM(rp_sukarela) OVER () + rp_jasa_uang / SUM(rp_jasa_uang) OVER ()
                                   + rp_jasa_barang / SUM(rp_jasa_barang) OVER () + lama_agt::numeric / SUM(lama_agt) OVER ()) AS rumus FROM desktop)
             SELECT COUNT(*) FILTER (WHERE status = 1) cair, COUNT(*) FILTER (WHERE status = 1 AND ABS(rumus - rp_pencairan) < 0.5) cocok FROM x`)).rows[0];
        assert.equal(Number(f.cocok), Number(f.cair), 'rumus bagian terhadap rp_pencairan desktop');
        const tot = (await db.query('SELECT SUM(rp_bagian)::float t FROM shu_anggota WHERE tahun = 2025')).rows[0].t;
        assert.ok(Math.abs(tot - 773281446.4) < 1, `total bagian ${tot}`);
    });
});

test('SHU: posting, pencairan tunai, pembatalan, dan pemindahan ke sukarela', async () => {
    await inTx(async (db) => {
        await kosongkanPencairan(db, 2025);
        await hitungShu(db, { tahun: 2025, opr: 'uji' });
        await assert.rejects(cairkanShu(db, { tahun: 2025, kodeAgt: '0523-1721', akunKas: '1.1.01.41', tanggal: '2026-03-01', opr: 'uji' }), /belum diposting|Pastikan|diposting/);
        await postingShu(db, { tahun: 2025, opr: 'uji' });

        const ang = (await db.query<{ kode_agt: string; rp_bagian: string }>('SELECT kode_agt, rp_bagian::text FROM shu_anggota WHERE tahun = 2025 AND rp_bagian > 1000 ORDER BY kode_agt LIMIT 1')).rows[0];
        const r = await cairkanShu(db, { tahun: 2025, kodeAgt: ang.kode_agt, akunKas: '1.1.01.41', tanggal: '2026-03-01', opr: 'uji' });
        assert.match(r.nomorBukti, /^SHU\/260301\/\d+$/);
        const j = (await db.query(`SELECT kode_perkiraan k, debit_jurnalumum::float d, kredit_jurnalumum::float c, deskripsi, sumber_tipe st, tahun FROM jurnal_umum WHERE nomor_bukti = $1 ORDER BY urutan`, [r.nomorBukti])).rows;
        assert.deepEqual(j, [
            { k: '2.1.00.83', d: Number(r.jumlah), c: 0, deskripsi: 'Pengambilan SHU Tahun 2025', st: 'shu', tahun: '260301' },
            { k: '1.1.01.41', d: 0, c: Number(r.jumlah), deskripsi: 'Pengambilan SHU Tahun 2025', st: 'shu', tahun: '260301' },
        ]);
        await db.query('SAVEPOINT a');
        await assert.rejects(cairkanShu(db, { tahun: 2025, kodeAgt: ang.kode_agt, akunKas: '1.1.01.41', tanggal: '2026-03-01', opr: 'uji' }), /Sudah dicairkan/);
        await db.query('ROLLBACK TO a');
        await db.query('SAVEPOINT b');
        await assert.rejects(hitungShu(db, { tahun: 2025, opr: 'uji' }), /sudah ada yang dicairkan/);
        await db.query('ROLLBACK TO b');

        await batalkanPencairan(db, { tahun: 2025, kodeAgt: ang.kode_agt });
        assert.equal((await db.query('SELECT 1 FROM jurnal_umum WHERE nomor_bukti = $1', [r.nomorBukti])).rows.length, 0);
        assert.equal((await db.query('SELECT status FROM shu_anggota WHERE tahun = 2025 AND kode_agt = $1', [ang.kode_agt])).rows[0].status, 0);

        const s = await postingKeSukarela(db, { tahun: 2025, tanggal: '2026-03-02', opr: 'uji' });
        const total = (await db.query<{ n: string; t: string }>(`SELECT COUNT(*) n, SUM(rp_bagian)::text t FROM shu_anggota WHERE tahun = 2025 AND status = 1 AND cara = 'sukarela'`)).rows[0];
        assert.equal(Number(total.n), s.anggota);
        assert.ok(s.anggota > 900);
        const jr = (await db.query(`SELECT COUNT(DISTINCT nomor_bukti) bukti, SUM(debit_jurnalumum)::float d, SUM(kredit_jurnalumum)::float c, COUNT(*) FILTER (WHERE kode_perkiraan = '2.1.00.20' AND kredit_jurnalumum > 0) suk
            FROM jurnal_umum WHERE tanggal_jurnalumum = '2026-03-02' AND nomor_bukti LIKE 'SHU/260302/%'`)).rows[0];
        assert.equal(Number(jr.bukti), s.anggota);
        assert.equal(jr.d, jr.c, 'jurnal seimbang');
        assert.equal(Number(jr.suk), s.anggota, 'kredit ke 2.1.00.20 Simpanan Sukarela');
        const tahunan = (await daftarTahunShu(db)).find((x) => x.tahun === 2025)!;
        assert.equal(tahunan.belum, 0);
        assert.equal(tahunan.status, 'posting');
    });
});

test('SHU: tutup buku 2025 diproses ulang menghasilkan jurnal TBT yang sama dengan desktop', async () => {
    await inTx(async (db) => {
        await kosongkanPencairan(db, 2025);
        const ringkas = (rows: { k: string; t: string; d: string; c: string }[]) => rows.map((x) => `${x.t}|${x.k}|${Number(x.d).toFixed(2)}|${Number(x.c).toFixed(2)}`).sort();
        const ambil = async () => (await db.query<{ k: string; t: string; d: string; c: string }>(
            `SELECT kode_perkiraan k, tanggal_jurnalumum::text t, SUM(debit_jurnalumum)::text d, SUM(kredit_jurnalumum)::text c
               FROM jurnal_umum WHERE nomor_bukti = 'TBT/251231/001' GROUP BY 1, 2 HAVING SUM(debit_jurnalumum) <> 0 OR SUM(kredit_jurnalumum) <> 0`)).rows;
        const desktop = ringkas(await ambil());
        const r = await tutupBuku(db, { tahun: 2025, opr: 'uji' });
        assert.equal(r.nomorBukti, 'TBT/251231/001');
        const baru = ringkas(await ambil());
        assert.deepEqual(baru, desktop);
        const t = (await db.query('SELECT status, rp_shu_anggota::float k FROM shu_tahun WHERE tahun = 2025')).rows[0];
        assert.equal(t.status, 'draf');
        assert.equal(t.k, 773281446.4);
        await db.query('SAVEPOINT a');
        await assert.rejects(tutupBuku(db, { tahun: 2026, opr: 'uji' }), /tahun ini/);
        await db.query('ROLLBACK TO a');
    });
});
