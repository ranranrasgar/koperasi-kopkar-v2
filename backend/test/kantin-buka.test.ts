import test from 'node:test';
import assert from 'node:assert/strict';
import { createPool, withTx, type Db } from '../src/db.ts';
import { simpanUnit, sqlBuka, sqlKetBuka, type UnitInput } from '../src/unit-usaha/kantin.ts';

const pool = createPool();
const ROLLBACK = new Error('rollback-uji');
const inTx = async (fn: (db: Db) => Promise<void>) => {
    await assert.rejects(withTx(pool, async (db) => { await fn(db); throw ROLLBACK; }), (e) => e === ROLLBACK);
};
test.after(() => pool.end());

const dasar: UnitInput = { kode: 'UJIBK', nama: 'Kantin Uji Buka', aktif: true, tampilAnggota: true, model: 'milik', terimaTunai: true, terimaSukarela: true, operator: [], jamBuka: '08:00', jamTutup: '17:00' };
const SEKARANG = "(now() AT TIME ZONE 'Asia/Jakarta')::time";
// Jam relatif terhadap sekarang (WIB), supaya uji tidak bergantung pada jam dijalankan.
const geser = (jam: number) => `to_char(${SEKARANG} + interval '${jam} hour', 'HH24:MI')`;
const status = async (db: Db, id: number) => (await db.query<{ buka: boolean; ket: string }>(`SELECT ${sqlBuka('u')} buka, ${sqlKetBuka('u')} ket FROM unit_usaha u WHERE id = $1`, [id])).rows[0];
const jamRelatif = async (db: Db, a: number, b: number) =>
    (await db.query<{ a: string; b: string }>(`SELECT ${geser(a)} a, ${geser(b)} b`)).rows[0];

test('status buka kantin: jadwal (termasuk lewat tengah malam), 24 jam, tutup sementara', async () => {
    await inTx(async (db) => {
        const { id } = await simpanUnit(db, dasar, 'uji');
        const simpan = (p: Partial<UnitInput>) => simpanUnit(db, { ...dasar, id, ...p }, 'uji');

        let j = await jamRelatif(db, -1, 1);
        await simpan({ jamBuka: j.a, jamTutup: j.b });
        assert.equal((await status(db, id)).buka, true);
        j = await jamRelatif(db, 1, 2);
        await simpan({ jamBuka: j.a, jamTutup: j.b });
        assert.equal((await status(db, id)).buka, false);
        // Jam tutup lebih kecil dari jam buka = jadwal lewat tengah malam (mis. 20:00-08:00).
        j = await jamRelatif(db, 2, 1); // buka 2 jam lagi, tutup 1 jam lagi: sekarang masih buka dari kemarin
        await simpan({ jamBuka: j.a, jamTutup: j.b });
        assert.equal((await status(db, id)).buka, true);
        j = await jamRelatif(db, -1, -2); // buka 1 jam lalu, tutup 2 jam lalu (tutup < buka): sekarang buka
        await simpan({ jamBuka: j.a, jamTutup: j.b });
        assert.equal((await status(db, id)).buka, true);
        j = await jamRelatif(db, 1, -1); // buka 1 jam lagi, tutup 1 jam lalu: sekarang tutup
        await simpan({ jamBuka: j.a, jamTutup: j.b });
        assert.equal((await status(db, id)).buka, false);

        await simpan({ statusBuka: '24jam' });
        assert.deepEqual(await status(db, id), { buka: true, ket: 'buka 24 jam' });

        await simpan({ statusBuka: 'tutup', pesanTutup: 'Libur Lebaran' });
        assert.deepEqual(await status(db, id), { buka: false, ket: 'tutup sementara' });
        const besok = (await db.query<{ t: string }>(`SELECT to_char((now() AT TIME ZONE 'Asia/Jakarta')::date + 1, 'YYYY-MM-DD') t`)).rows[0].t;
        await simpan({ statusBuka: 'tutup', tutupSampai: besok });
        assert.equal((await status(db, id)).buka, false);
        // Tanggal tutup sementara sudah lewat: kembali ke jadwal (diatur langsung, form menolak tanggal lampau).
        await db.query(`UPDATE unit_usaha SET tutup_sampai = (now() AT TIME ZONE 'Asia/Jakarta')::date - 1, jam_buka = NULL, jam_tutup = NULL WHERE id = $1`, [id]);
        assert.deepEqual(await status(db, id), { buka: true, ket: 'buka 24 jam' });

        await assert.rejects(simpan({ statusBuka: 'jadwal', jamBuka: '', jamTutup: '17:00' }), /Isi jam buka dan jam tutup/);
        await assert.rejects(simpan({ statusBuka: 'jadwal', jamBuka: '08:00', jamTutup: '08:00' }), /sama/);
        await assert.rejects(simpan({ statusBuka: 'tutup', tutupSampai: '2000-01-01' }), /sudah lewat/);
    });
});
