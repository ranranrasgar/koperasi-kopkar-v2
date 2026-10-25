import test from 'node:test';
import assert from 'node:assert/strict';
import { createPool, withTx, type Db } from '../src/db.ts';
import { toUnits } from '../src/posting/money.ts';
import { barisJurnalAngsuran, cairkanPinjaman, bayarAngsuran } from '../src/posting/pinjaman.ts';

const pool = createPool();
const ROLLBACK = new Error('rollback-uji');
const inTx = async (fn: (db: Db) => Promise<void>) => {
    await assert.rejects(withTx(pool, async (db) => { await fn(db); throw ROLLBACK; }), (e) => e === ROLLBACK);
};
test.after(() => pool.end());

test('paritas: jurnal angsuran dari nilai rincian = jurnal produksi', async () => {
    const rows = (await pool.query(`SELECT r.no_bukti, r.debit_pokok, r.debit_bunga, r.rp_adm, r.rp_provisi, kp.kode_perkiraan kas,
            k1.kode_perkiraan kredit, k2.kode_perkiraan jasa, k3.kode_perkiraan adm, k4.kode_perkiraan provisi
        FROM pinjaman_tunai_rincian r
        JOIN pinjaman_tunai p ON p.id = r.pinjaman_tunai_id JOIN jenis_kredit jk ON jk.id = p.jenis_kredit_id
        JOIN perkiraan kp ON kp.id = r.kas_perkiraan_id
        JOIN perkiraan k1 ON k1.id = jk.coa_kredit_id JOIN perkiraan k2 ON k2.id = jk.coa_jasa_id
        JOIN perkiraan k3 ON k3.id = jk.coa_adm_id JOIN perkiraan k4 ON k4.id = jk.coa_provisi_id
        WHERE r.no_bukti LIKE 'ANGS-CR-%' AND r.tanggal_angsuran >= '2026-04-01' ORDER BY r.id DESC LIMIT 300`)).rows;
    let cocok = 0; const selisih: string[] = [];
    for (const r of rows) {
        const lines = barisJurnalAngsuran({ pokok: toUnits(r.debit_pokok), jasa: toUnits(r.debit_bunga), adm: toUnits(r.rp_adm), provisi: toUnits(r.rp_provisi) },
            { kas: r.kas, kredit: r.kredit, jasa: r.jasa, adm: r.adm, provisi: r.provisi });
        const mesin = lines.filter((l) => Number(l.debit ?? 0) + Number(l.kredit ?? 0) !== 0).map((l) => `${l.kodePerkiraan}:${Number(l.debit ?? 0)}/${Number(l.kredit ?? 0)}`).sort();
        const prod = (await pool.query(`SELECT kode_perkiraan k, debit_jurnalumum d, kredit_jurnalumum c FROM jurnal_umum WHERE nomor_bukti = $1`, [r.no_bukti])).rows
            .map((j) => `${j.k}:${Number(j.d)}/${Number(j.c)}`).sort();
        if (JSON.stringify(mesin) === JSON.stringify(prod)) cocok++; else selisih.push(`${r.no_bukti}\n    mesin ${mesin}\n    prod  ${prod}`);
    }
    console.log(`jurnal angsuran cocok ${cocok} dari ${rows.length}`);
    for (const s of selisih.slice(0, 5)) console.log('  ', s);
    assert.ok(cocok / rows.length > 0.97, `${selisih.length} selisih`);
});

test('alur penuh: cairkan lalu bayar semua angsuran; saldo nol dan jurnal seimbang', async () => {
    const a = (await pool.query(`SELECT kode_agt FROM anggota WHERE rp_grade >= 1000000 ORDER BY id LIMIT 1`)).rows[0]; // jenis C01 mengunci grade: anggota harus berplafon cukup
    await inTx(async (db) => {
        const kas = (await db.query(`SELECT id FROM perkiraan WHERE kode_perkiraan = '1.1.01.41'`)).rows[0].id;
        const c = await cairkanPinjaman(db, { kodeAgt: a.kode_agt, kodeKredit: 'C01', tglPinjaman: '2026-10-22', pokok: 1000000, lama: 6, kasPerkiraanId: kas, opr: 'uji' });
        assert.match(c.noPinjaman, /^CR-1026-\d+$/);
        assert.equal(c.jasaTotal, '90000.0000');
        assert.equal(c.jadwal.length, 6);
        assert.equal(c.jadwal[0].tanggal, '2026-11-10');
        let total = 0n;
        for (let ke = 1; ke <= 6; ke++) {
            const r = await bayarAngsuran(db, { noPinjaman: c.noPinjaman, tanggal: '2026-11-10', kasPerkiraanId: kas, opr: 'uji' });
            assert.equal(r.ke, ke);
            assert.equal(r.adm, ke === 1 ? '10000.0000' : '0.0000');
            total += toUnits(r.pokok);
            assert.equal(r.lunas, ke === 6);
        }
        assert.equal(total, toUnits(1000000)); // angsuran terakhir menyerap sisa: pokok pas
        const s = (await db.query(`SELECT SUM(kredit_pokok-debit_pokok) p, SUM(kredit_bunga-debit_bunga) b FROM pinjaman_tunai_rincian WHERE no_pinjaman=$1`, [c.noPinjaman])).rows[0];
        assert.equal(Number(s.p), 0); assert.equal(Number(s.b), 0);
        const j = (await db.query(`SELECT SUM(debit_jurnalumum) d, SUM(kredit_jurnalumum) k FROM jurnal_umum WHERE nomor_bukti = $1 OR nomor_bukti LIKE 'ANGS-CR-1126-%'`, [c.noPinjaman])).rows[0];
        assert.equal(j.d, j.k);
        const tagih = (await db.query(`SELECT COUNT(*) FILTER (WHERE tgl_bayar IS NOT NULL) n FROM pinjaman_tunai_rincian_tagih WHERE no_pinjaman=$1`, [c.noPinjaman])).rows[0];
        assert.equal(Number(tagih.n), 6);
        await db.query('SAVEPOINT x');
        await assert.rejects(bayarAngsuran(db, { noPinjaman: c.noPinjaman, tanggal: '2026-11-10', kasPerkiraanId: kas, opr: 'uji' }), /sudah lunas/);
        await db.query('ROLLBACK TO x');
    });
});

test('pencairan ditolak: lama melebihi maksimum, anggota tidak ada', async () => {
    await inTx(async (db) => {
        const kas = (await db.query(`SELECT id FROM perkiraan WHERE kode_perkiraan = '1.1.01.41'`)).rows[0].id;
        const a = (await db.query(`SELECT kode_agt FROM anggota ORDER BY id LIMIT 1`)).rows[0];
        await db.query('SAVEPOINT x');
        await assert.rejects(cairkanPinjaman(db, { kodeAgt: a.kode_agt, kodeKredit: 'C01', tglPinjaman: '2026-10-22', pokok: 1000000, lama: 13, kasPerkiraanId: kas, opr: 'u' }), /melebihi maksimum/);
        await db.query('ROLLBACK TO x');
        await assert.rejects(cairkanPinjaman(db, { kodeAgt: 'TIDAK-ADA', kodeKredit: 'C01', tglPinjaman: '2026-10-22', pokok: 1000, lama: 1, kasPerkiraanId: kas, opr: 'u' }), /tidak ditemukan/);
    });
});
