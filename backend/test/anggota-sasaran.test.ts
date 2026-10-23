import test from 'node:test';
import assert from 'node:assert/strict';
import { createPool, withTx, type Db } from '../src/db.ts';
import {
    daftarGrupOperator, daftarStatusStaff, hapusSasaran, hitungPengumumanBaru, pengumumanUntukOperator, periksaSasaran, SASARAN_BAWAAN,
    SasaranSalah, sasaranUntuk, simpanSasaran, tandaiPengumumanDibaca,
} from '../src/anggota/sasaran.ts';
import { kirimKeSemuaAnggota } from '../src/anggota/push.ts';
import { getHimbauan, getPromos } from '../src/anggota/queries.ts';

const pool = createPool();
const ROLLBACK = new Error('rollback-uji');
const inTx = async (fn: (db: Db) => Promise<void>) => {
    await assert.rejects(withTx(pool, async (db) => { await fn(db); throw ROLLBACK; }), (e) => e === ROLLBACK);
};
test.after(() => pool.end());

delete process.env.VAPID_PUBLIC_KEY;
delete process.env.VAPID_PRIVATE_KEY;
delete process.env.VAPID_SUBJECT;

const kosong = { anggota: false, statusStaff: null, internal: false, grupIds: null };

test('periksaSasaran: wajib ada penerima, pilihan tidak boleh kosong, nilai dirapikan', () => {
    assert.throws(() => periksaSasaran(kosong), SasaranSalah);
    assert.throws(() => periksaSasaran({ ...SASARAN_BAWAAN, statusStaff: [] }), /status anggota/);
    assert.throws(() => periksaSasaran({ ...kosong, internal: true, grupIds: [] }), /grup internal/);
    assert.throws(() => periksaSasaran({ ...kosong, internal: true, grupIds: [NaN, -1] }), /grup internal/);
    assert.deepEqual(periksaSasaran({ anggota: true, statusStaff: [' Staff ', 'Staff', ''], internal: true, grupIds: [3, 3, 5] }),
        { anggota: true, statusStaff: ['Staff'], internal: true, grupIds: [3, 5] });
    // pilihan milik penerima yang tidak dicentang dibuang
    assert.deepEqual(periksaSasaran({ anggota: false, statusStaff: ['Staff'], internal: true, grupIds: null }),
        { anggota: false, statusStaff: null, internal: true, grupIds: null });
});

test('sasaran tersimpan, diperbarui, dan dihapus; tanpa baris = bawaan di pemanggil', async () => {
    await inTx(async (db) => {
        const h = await db.query(`INSERT INTO himbauan (judul_himbauan, isi_himbauan, status) VALUES ('J', 'I', true) RETURNING id`);
        const id = Number(h.rows[0].id);
        assert.equal((await sasaranUntuk(db, 'himbauan', [id])).size, 0);
        await simpanSasaran(db, 'himbauan', id, { anggota: true, statusStaff: ['Staff'], internal: true, grupIds: [3] });
        assert.deepEqual((await sasaranUntuk(db, 'himbauan', [id])).get(id), { anggota: true, statusStaff: ['Staff'], internal: true, grupIds: [3] });
        await simpanSasaran(db, 'himbauan', id, { anggota: false, statusStaff: null, internal: true, grupIds: null });
        assert.deepEqual((await sasaranUntuk(db, 'himbauan', [id])).get(id), { anggota: false, statusStaff: null, internal: true, grupIds: null });
        await hapusSasaran(db, 'himbauan', id);
        assert.equal((await sasaranUntuk(db, 'himbauan', [id])).size, 0);
    });
});

test('pengumuman internal: hanya untuk grup yang dipilih, tanda baru dan dibaca', async () => {
    await inTx(async (db) => {
        const o = await db.query(`SELECT id, grup_id FROM opr WHERE grup_id IS NOT NULL ORDER BY grup_id, id`);
        const a = o.rows[0];
        const b = o.rows.find((x) => x.grup_id !== a.grup_id);
        assert.ok(b, 'butuh dua operator di grup berbeda');
        const oa = Number(a.id), ob = Number(b.id);

        const ids: number[] = [];
        for (const [judul, status] of [['Untuk grup A', true], ['Untuk semua internal', true], ['Hanya anggota', true], ['Nonaktif', false]] as const) {
            const r = await db.query(`INSERT INTO promo (judul, isi, status) VALUES ($1, 'isi', $2) RETURNING id`, [judul, status]);
            ids.push(Number(r.rows[0].id));
        }
        await simpanSasaran(db, 'promo', ids[0], { anggota: false, statusStaff: null, internal: true, grupIds: [Number(a.grup_id)] });
        await simpanSasaran(db, 'promo', ids[1], { anggota: true, statusStaff: null, internal: true, grupIds: null });
        await simpanSasaran(db, 'promo', ids[2], SASARAN_BAWAAN);
        await simpanSasaran(db, 'promo', ids[3], { anggota: false, statusStaff: null, internal: true, grupIds: null });

        const judulA = (await pengumumanUntukOperator(db, oa)).map((x) => x.judul);
        const judulB = (await pengumumanUntukOperator(db, ob)).map((x) => x.judul);
        assert.ok(judulA.includes('Untuk grup A') && judulA.includes('Untuk semua internal'));
        assert.ok(!judulB.includes('Untuk grup A') && judulB.includes('Untuk semua internal'));
        for (const j of [judulA, judulB]) assert.ok(!j.includes('Hanya anggota') && !j.includes('Nonaktif'));

        const barusA = await hitungPengumumanBaru(db, oa);
        assert.ok(barusA >= 2);
        const daftar = await pengumumanUntukOperator(db, oa);
        assert.ok(daftar.every((x) => x.baru));
        await tandaiPengumumanDibaca(db, oa, daftar.filter((x) => x.baru));
        assert.equal(await hitungPengumumanBaru(db, oa), 0);
        assert.ok((await pengumumanUntukOperator(db, oa)).every((x) => !x.baru));
        assert.ok((await hitungPengumumanBaru(db, ob)) >= 1); // operator lain belum membukanya
    });
});

test('API lama (Android) tidak menerima pengumuman khusus internal atau khusus status tertentu', async () => {
    await inTx(async (db) => {
        const pakai = db as unknown as Parameters<typeof getHimbauan>[0];
        const h1 = await db.query(`INSERT INTO himbauan (judul_himbauan, isi_himbauan, status) VALUES ('Internal', 'x', true) RETURNING id`);
        await simpanSasaran(db, 'himbauan', Number(h1.rows[0].id), { anggota: false, statusStaff: null, internal: true, grupIds: null });
        assert.notEqual((await getHimbauan(pakai))?.judul_himbauan, 'Internal'); // paling baru, tapi internal
        const h2 = await db.query(`INSERT INTO himbauan (judul_himbauan, isi_himbauan, status) VALUES ('Semua anggota', 'x', true) RETURNING id`);
        assert.equal((await getHimbauan(pakai))?.judul_himbauan, 'Semua anggota'); // tanpa sasaran = semua anggota
        await simpanSasaran(db, 'himbauan', Number(h2.rows[0].id), { anggota: true, statusStaff: ['Staff'], internal: false, grupIds: null });
        assert.notEqual((await getHimbauan(pakai))?.judul_himbauan, 'Semua anggota'); // dibatasi status: tidak bisa dibedakan di API lama
        const p = await db.query(`INSERT INTO promo (judul, isi, status) VALUES ('Promo internal', 'x', true) RETURNING id`);
        await simpanSasaran(db, 'promo', Number(p.rows[0].id), { anggota: false, statusStaff: null, internal: true, grupIds: null });
        assert.ok(!(await getPromos(pakai)).some((x: { judul: string }) => x.judul === 'Promo internal'));
    });
});

test('siaran ke anggota berstatus tertentu dan daftar pilihan sasaran', async () => {
    await inTx(async (db) => {
        const status = await daftarStatusStaff(db);
        assert.ok(status.length >= 1);
        const pilih = status[status.length - 1]; // status paling sedikit anggotanya
        const h = await kirimKeSemuaAnggota(db, { judul: 'Khusus', isi: 'Siaran status uji' }, { statusStaff: [pilih.nama] });
        assert.equal(h.penerima, pilih.jumlah);
        const r = await db.query(
            `SELECT count(*)::int n, count(DISTINCT a.status_staff)::int s FROM log_notifikasi l JOIN anggota a ON a.id = l.anggota_id WHERE l.pesan = 'Siaran status uji'`);
        assert.equal(r.rows[0].n, pilih.jumlah);
        assert.equal(r.rows[0].s, 1);
        const grup = await daftarGrupOperator(db);
        assert.ok(grup.some((g) => g.nama === 'superadmin'));
    });
});
