import test from 'node:test';
import assert from 'node:assert/strict';
import { createPool } from '../src/db.ts';
import { toUnits, fromUnits } from '../src/posting/money.ts';
import { cicilan, jadwal, jatuhTempo, persenToMicro, type Terms } from '../src/posting/pinjaman-calc.ts';

const pool = createPool();
test.after(() => pool.end());

const termsOf = (p: any): Terms => ({
    pokok: toUnits(p.rp_pinjaman_pokok), persenBunga: persenToMicro(p.persen_bunga), perAngsuran: p.bunga_per === 1 && p.lama_angsuran > 1 ? true : p.bunga_per === 1,
    lama: p.lama_angsuran, persenAdm: persenToMicro(p.persen_adm), persenProvisi: persenToMicro(p.persen_provisi),
});

// Catatan: jadwal desktop menaruh adm/provisi di dua baris pertama (ke-1 dan ke-2); mesin hanya di ke-1, jadi keduanya tidak dibandingkan di jadwal.
// Pinjaman yang dicairkan sejak 2025-12 dan sudah lunas: data era aturan sekarang.
const loans = async () => (await pool.query(`SELECT * FROM pinjaman_tunai
    WHERE tgl_pinjaman >= '2025-12-01' AND lama_angsuran > 0 AND jml_cicilan = lama_angsuran ORDER BY id DESC LIMIT 400`)).rows;

test('paritas: angsuran dihitung mesin = rincian produksi (pokok, jasa, adm, provisi)', async () => {
    let cocok = 0, selisih: string[] = [];
    for (const p of await loans()) {
        const rows = (await pool.query(`SELECT angsuran_ke ke, debit_pokok, debit_bunga, rp_adm, rp_provisi, tanggal_angsuran tanggal FROM pinjaman_tunai_rincian
            WHERE pinjaman_tunai_id = $1 AND angsuran_ke > 0 ORDER BY angsuran_ke, id`, [p.id])).rows;
        // Sebelum 2026-04-01 desktop membayar pokok pecahan dengan nilai jadwal yang dibulatkan; paritas hanya untuk aturan sekarang.
        if (rows.some((r: any) => r.tanggal < '2026-04-01')) continue;
        if (rows.length !== p.lama_angsuran) { selisih.push(`${p.no_pinjaman}: jumlah rincian ${rows.length} != lama ${p.lama_angsuran}`); continue; }
        const t = termsOf(p);
        let ok = true;
        for (const r of rows) {
            const c = cicilan(t, r.ke);
            const abs = (x: bigint) => (x < 0n ? -x : x);
            const dp = abs(c.pokok - toUnits(r.debit_pokok));
            const lain = abs(c.jasa - toUnits(r.debit_bunga)) + abs(c.adm - toUnits(r.rp_adm)) + abs(c.provisi - toUnits(r.rp_provisi));
            // Pokok boleh beda sampai Rp 0,5: desktop kadang memakai nilai jadwal yang dibulatkan, kadang pecahan.
            if (dp > 5000n || lain > 0n || (r.ke === t.lama && dp > 5000n)) {
                ok = false;
                selisih.push(`${p.no_pinjaman} ke-${r.ke}: mesin ${fromUnits(c.pokok)}/${fromUnits(c.jasa)}/${fromUnits(c.adm)}/${fromUnits(c.provisi)} produksi ${r.debit_pokok}/${r.debit_bunga}/${r.rp_adm}/${r.rp_provisi}`);
                break;
            }
        }
        if (ok) cocok++;
    }
    console.log(`angsuran cocok ${cocok}, selisih ${selisih.length}`);
    for (const s of selisih.slice(0, 15)) console.log('  ', s);
    assert.ok(cocok > 0);
    // Sisa selisih = jasa atau adm yang diubah kasir secara manual di desktop (mis. adm dibebaskan); harus kecil.
    assert.ok(selisih.length / (cocok + selisih.length) < 0.06, `${selisih.length} selisih`);
});

test('paritas: jadwal (tagih) dan tanggal jatuh tempo = produksi', async () => {
    let cocok = 0, selisih: string[] = [];
    for (const p of await loans()) {
        const rows = (await pool.query(`SELECT angsuran_ke ke, debit_pokok, debit_bunga, rp_adm, rp_provisi, tanggal_angsuran FROM pinjaman_tunai_rincian_tagih
            WHERE pinjaman_tunai_id = $1 ORDER BY angsuran_ke, id`, [p.id])).rows;
        if (rows.length === 0) continue;
        const t = termsOf(p);
        const j = jadwal(t);
        let ok = rows.length === j.length;
        for (const r of rows) {
            const c = j[r.ke - 1];
            if (!c || fromUnits(c.pokok) !== r.debit_pokok || fromUnits(c.jasa) !== r.debit_bunga 
                || jatuhTempo(p.tgl_pinjaman, p.jatuh_tempo, r.ke) !== r.tanggal_angsuran) { ok = false; selisih.push(`${p.no_pinjaman} ke-${r.ke}`); break; }
        }
        if (ok) cocok++;
    }
    console.log(`jadwal cocok ${cocok}, selisih ${selisih.length}`);
    for (const s of selisih.slice(0, 15)) console.log('  ', s);
    assert.ok(cocok > 0);
    assert.equal(selisih.length, 0);
});
