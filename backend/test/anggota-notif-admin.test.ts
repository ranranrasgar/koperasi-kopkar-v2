import test from 'node:test';
import assert from 'node:assert/strict';
import { createPool, withTx, type Db } from '../src/db.ts';
import { beritahuAdmin, hitungNotifAdminBaru, MENU_PENGAJUAN, notifAdminUntukOperator, tandaiNotifAdminDibaca } from '../src/anggota/notif-admin.ts';

const pool = createPool();
const ROLLBACK = new Error('rollback-uji');
const inTx = async (fn: (db: Db) => Promise<void>) => {
    await assert.rejects(withTx(pool, async (db) => { await fn(db); throw ROLLBACK; }), (e) => e === ROLLBACK);
};
test.after(() => pool.end());

delete process.env.VAPID_PUBLIC_KEY;
delete process.env.VAPID_PRIVATE_KEY;
delete process.env.VAPID_SUBJECT;

test('notifikasi admin: hanya untuk grup berizin menu (dan superadmin), penanda baca per operator', async () => {
    await inTx(async (db) => {
        const sup = (await db.query(`SELECT o.id FROM opr o JOIN opr_grup g ON g.id = o.grup_id WHERE g.nama_grup = 'superadmin' ORDER BY o.id LIMIT 1`)).rows[0];
        assert.ok(sup, 'butuh operator superadmin');
        const tanpaIzin = (await db.query(
            `SELECT o.id FROM opr o JOIN opr_grup g ON g.id = o.grup_id
              WHERE g.nama_grup <> 'superadmin' AND NOT EXISTS (SELECT 1 FROM opr_hak_akses h WHERE h.grup_id = g.id AND h.menu = $1 AND h.akses = 'T') ORDER BY o.id LIMIT 1`, [MENU_PENGAJUAN])).rows[0];
        const berizin = (await db.query(
            `SELECT o.id FROM opr o JOIN opr_grup g ON g.id = o.grup_id
              WHERE g.nama_grup <> 'superadmin' AND EXISTS (SELECT 1 FROM opr_hak_akses h WHERE h.grup_id = g.id AND h.menu = $1 AND h.akses = 'T') ORDER BY o.id LIMIT 1`, [MENU_PENGAJUAN])).rows[0];

        const idSup = Number(sup.id);
        const awal = await hitungNotifAdminBaru(db, idSup);
        const h = await beritahuAdmin(db, { menu: MENU_PENGAJUAN, judul: 'Pengajuan kredit baru', isi: 'Uji mengajukan pinjaman Rp 1.000.000 untuk 6 bulan.', url: '/dashboard/loans/apply' });
        assert.deepEqual(h, { perangkat: 0, dikirim: 0, gagal: 0 }); // tanpa VAPID

        assert.equal(await hitungNotifAdminBaru(db, idSup), awal + 1);
        const daftar = await notifAdminUntukOperator(db, idSup);
        const n = daftar.find((x) => x.isi.startsWith('Uji mengajukan'));
        assert.ok(n && n.baru && n.url === '/dashboard/loans/apply');

        if (berizin) assert.ok((await notifAdminUntukOperator(db, Number(berizin.id))).some((x) => x.id === n.id));
        if (tanpaIzin) {
            assert.ok(!(await notifAdminUntukOperator(db, Number(tanpaIzin.id))).some((x) => x.id === n.id));
            assert.equal(await hitungNotifAdminBaru(db, Number(tanpaIzin.id)), (await notifAdminUntukOperator(db, Number(tanpaIzin.id))).filter((x) => x.baru).length);
        }

        await tandaiNotifAdminDibaca(db, idSup, [n.id]);
        await tandaiNotifAdminDibaca(db, idSup, [n.id]); // aman diulang
        assert.equal(await hitungNotifAdminBaru(db, idSup), awal);
        assert.equal((await notifAdminUntukOperator(db, idSup)).find((x) => x.id === n.id)?.baru, false);
        if (berizin) assert.ok((await hitungNotifAdminBaru(db, Number(berizin.id))) >= 1); // operator lain belum membukanya
    });
});

test('judul dan isi dipotong sesuai batas kolom', async () => {
    await inTx(async (db) => {
        await beritahuAdmin(db, { menu: MENU_PENGAJUAN, judul: 'J'.repeat(200), isi: 'I'.repeat(900), url: '/dashboard/loans/apply' });
        const r = await db.query(`SELECT length(judul) j, length(isi) i FROM notif_admin ORDER BY id DESC LIMIT 1`);
        assert.deepEqual([r.rows[0].j, r.rows[0].i], [80, 300]);
    });
});
