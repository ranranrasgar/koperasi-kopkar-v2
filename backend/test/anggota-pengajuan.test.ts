import test from 'node:test';
import assert from 'node:assert/strict';
import { createPool, withTx, type Db } from '../src/db.ts';
import { ajukanPinjaman, jenisKreditUntuk, pengajuanSaya, type IsianPengajuan } from '../src/anggota/pengajuan.ts';
import { estimasiAngsuran } from '../src/anggota/pengajuan-hitung.ts';

const pool = createPool();
const ROLLBACK = new Error('rollback-uji');
const inTx = async (fn: (db: Db) => Promise<void>) => {
    await assert.rejects(withTx(pool, async (db) => { await fn(db); throw ROLLBACK; }), (e) => e === ROLLBACK);
};
test.after(() => pool.end());

const HARI = '2026-10-23';
const isian = (x: Partial<IsianPengajuan> = {}): IsianPengajuan =>
    ({ kodeKredit: 'C07', lama: 5, besar: 1_000_000, tglRealisasi: HARI, keterangan: 'uji', ...x });

/** Anggota aktif non staff / staff tanpa pengajuan menunggu, dengan plafon. */
const ambil = async (db: Db, staff: boolean) => Number((await db.query(
    `SELECT a.id FROM anggota a WHERE a.aktif AND trim(a.status_staff) ${staff ? "= 'Staff'" : "<> 'Staff'"} AND a.rp_grade > 0
       AND NOT EXISTS (SELECT 1 FROM pengajuan_pinjaman p WHERE p.anggota_id = a.id AND p.status = 'P') ORDER BY a.id LIMIT 1`)).rows[0].id);

test('estimasi angsuran = jadwal mesin posting (pinjaman CR-0826-22883: 5 juta, 5 kali, jasa 2%, adm 1%)', () => {
    const e = estimasiAngsuran({ persenBunga: '2.000000', perAngsuran: true, persenAdm: '1.000000', persenProvisi: '0' }, 5_000_000, 5)!;
    assert.deepEqual(e, { pokok: 1_000_000, jasa: 100_000, biaya: 50_000, pertama: 1_150_000, berikutnya: 1_100_000, totalJasa: 500_000 });
    assert.equal(estimasiAngsuran({ persenBunga: '2', perAngsuran: true, persenAdm: '0', persenProvisi: '0' }, 0, 5), null);
});

test('jenis kredit: non staff hanya produk non staff, staff hanya produk staff', async () => {
    await inTx(async (db) => {
        const non = await jenisKreditUntuk(db, await ambil(db, false)), st = await jenisKreditUntuk(db, await ambil(db, true));
        assert.ok(non.length > 0 && non.every((j) => !j.kunciStaff));
        assert.ok(st.length > 0 && st.every((j) => j.kunciStaff));
    });
});

test('pengajuan: aturan dicek di server, persen dari jenis kredit', async () => {
    await inTx(async (db) => {
        const id = await ambil(db, false);
        const grade = Number((await db.query('SELECT rp_grade FROM anggota WHERE id = $1', [id])).rows[0].rp_grade);
        const tolak = async (x: Partial<IsianPengajuan>, pesan: RegExp) => {
            const r = await ajukanPinjaman(db, id, isian(x), HARI);
            assert.equal(r.ok, false, JSON.stringify(x));
            if (!r.ok) assert.match(r.error, pesan);
        };
        await tolak({ kodeKredit: 'C08' }, /hanya untuk staff/);
        await tolak({ kodeKredit: 'TIDAK-ADA' }, /Pilih jenis/);
        await tolak({ kodeKredit: 'C01', besar: grade + 1, lama: 12 }, /melebihi grade/);
        await tolak({ lama: 0 }, /Lama pinjaman harus/);
        await tolak({ lama: 6 }, /tidak boleh lebih dari 5 bulan/);
        await tolak({ besar: 0 }, /Besar pinjaman harus/);
        await tolak({ besar: 1.5 }, /Besar pinjaman harus/);
        await tolak({ tglRealisasi: '2026-10-22' }, /sebelum hari ini/);
        await tolak({ tglRealisasi: '2026-02-30' }, /tidak sah/);
        await tolak({ tglRealisasi: '2027-12-01' }, /satu tahun/);
        await tolak({ keterangan: 'x'.repeat(101) }, /100 karakter/);

        const ok = await ajukanPinjaman(db, id, isian({ keterangan: '  renovasi   rumah ' }), HARI);
        assert.equal(ok.ok, true);
        const row = (await db.query(`SELECT pp.*, jk.bunga_kredit, jk.persen_adm jk_adm FROM pengajuan_pinjaman pp
            JOIN jenis_kredit jk ON jk.id = pp.jenis_kredit_id WHERE pp.id = $1`, [ok.ok && ok.id])).rows[0];
        assert.equal(row.status, 'P');
        assert.equal(row.anggota_id, String(id));
        assert.equal(row.kd_kredit, 'C07');
        assert.equal(row.persen_bunga, row.bunga_kredit);
        assert.equal(row.persen_adm, row.jk_adm);
        assert.equal(row.keterangan, 'renovasi rumah');
        assert.equal(row.rp_pinjaman_pokok, '1000000.0000');
        assert.ok(Number(row.id) > 17327, 'id dari sequence identity, di atas id lama');

        await tolak({}, /masih menunggu keputusan/);
        assert.equal((await pengajuanSaya(db, id))[0].status, 'P');
    });
});

test('kunci sisa: sisa receh <= Rp 100 tidak mengunci, sisa lebih besar mengunci', async () => {
    await inTx(async (db) => {
        // Pinjaman tunai dengan sisa (pokok + jasa) receh; jenisnya dijadikan kunci_jika_sisa di transaksi ini.
        const p = (await db.query(`SELECT pt.anggota_id, pt.jenis_kredit_id, jk.kode_kredit, jk.mak_cicilan, a.status_staff
            FROM pinjaman_tunai pt JOIN pinjaman_tunai_rincian r ON r.pinjaman_tunai_id = pt.id
            JOIN jenis_kredit jk ON jk.id = pt.jenis_kredit_id JOIN anggota a ON a.id = pt.anggota_id
           WHERE a.aktif AND jk.hide = false AND jk.kunci_hanya_untuk_staff = CASE WHEN trim(a.status_staff) = 'Staff' THEN 1 ELSE 0 END
             AND jk.kunci_jika_melebihi_grade = 0
           GROUP BY pt.id, jk.id, a.id
          HAVING SUM(r.kredit_pokok + r.kredit_bunga) - SUM(r.debit_pokok + r.debit_bunga) BETWEEN 1 AND 100
             AND NOT EXISTS (SELECT 1 FROM pinjaman_tunai p2 JOIN pinjaman_tunai_rincian r2 ON r2.pinjaman_tunai_id = p2.id
                              WHERE p2.anggota_id = pt.anggota_id AND p2.jenis_kredit_id = pt.jenis_kredit_id AND p2.id <> pt.id
                              GROUP BY p2.id HAVING SUM(r2.kredit_pokok + r2.kredit_bunga) - SUM(r2.debit_pokok + r2.debit_bunga) > 100)
          LIMIT 1`)).rows[0];
        assert.ok(p, 'ada pinjaman dengan sisa receh');
        await db.query('UPDATE jenis_kredit SET kunci_jika_sisa = 1 WHERE id = $1', [p.jenis_kredit_id]);
        await db.query("DELETE FROM pengajuan_pinjaman WHERE anggota_id = $1 AND status = 'P'", [p.anggota_id]);
        const anggota = Number(p.anggota_id);
        const x = isian({ kodeKredit: p.kode_kredit, lama: 1 });

        assert.equal((await ajukanPinjaman(db, anggota, x, HARI)).ok, true, 'sisa receh tidak mengunci');
        await db.query("DELETE FROM pengajuan_pinjaman WHERE anggota_id = $1 AND status = 'P'", [anggota]);

        // Jadikan sisanya besar: tambah kredit pokok pada salah satu rincian.
        await db.query(`UPDATE pinjaman_tunai_rincian SET kredit_pokok = kredit_pokok + 500000 WHERE id = (
            SELECT r.id FROM pinjaman_tunai_rincian r JOIN pinjaman_tunai pt ON pt.id = r.pinjaman_tunai_id
             WHERE pt.anggota_id = $1 AND pt.jenis_kredit_id = $2 ORDER BY r.id LIMIT 1)`, [anggota, p.jenis_kredit_id]);
        const r = await ajukanPinjaman(db, anggota, x, HARI);
        assert.equal(r.ok, false);
        if (!r.ok) assert.match(r.error, /Selesaikan dulu tagihan/);
    });
});
