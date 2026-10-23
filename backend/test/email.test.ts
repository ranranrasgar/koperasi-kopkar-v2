import test from 'node:test';
import assert from 'node:assert/strict';
import { createPool, withTx, type Db } from '../src/db.ts';
import { antreEmail, antreEmailBanyak, prosesAntrean, ringkasAntrean, smtpSiap } from '../src/email/antrean.ts';
import { htmlEmail, teksEmail } from '../src/email/templat.ts';
import {
    buatKodeVerifikasi, kirimKodeVerifikasi, MAKS_SALAH, penerimaEmailAnggota, periksaKodeVerifikasi, statusEmail,
} from '../src/anggota/verifikasi-email.ts';
import { masukAnggota } from '../src/anggota/akun.ts';
import { kabariAnggotaBalasan } from '../src/anggota/pesan.ts';
import { beritahuAdmin, MENU_PENGAJUAN } from '../src/anggota/notif-admin.ts';
import { kirimKeSemuaAnggota, kirimNotifikasi } from '../src/anggota/push.ts';
import { hashPasswordAnggota } from '../src/anggota/akun.ts';

const pool = createPool();
const ROLLBACK = new Error('rollback-uji');
const inTx = async (fn: (db: Db) => Promise<void>) => {
    await assert.rejects(withTx(pool, async (db) => { await fn(db); throw ROLLBACK; }), (e) => e === ROLLBACK);
};
test.after(() => pool.end());

// Uji tidak pernah mengirim email sungguhan: transport JSON nodemailer.
process.env.EMAIL_UJI_JSON = '1';

/** Antrean di database bisa berisi baris lama; uji hanya memproses baris miliknya lewat alamat unik. */
async function bersihkan(db: Db) { await db.query(`UPDATE email_antrean SET status = 'dicatat' WHERE status = 'menunggu'`); }

test('templat: HTML dilepas dari karakter berbahaya, tombol hanya untuk tautan http(s)', () => {
    const h = htmlEmail({ judul: '<b>Judul</b>', teks: 'Halo <script>x</script>\n\nBaris dua', tautan: 'javascript:alert(1)' });
    assert.ok(!h.includes('<script>') && !h.includes('<b>Judul'));
    assert.ok(!h.includes('javascript:'));
    assert.ok(htmlEmail({ judul: 'a', teks: 'b', tautan: 'https://anggota.contoh.id/x' }).includes('href="https://anggota.contoh.id/x"'));
    assert.match(teksEmail({ judul: 'a', teks: 'isi', tautan: 'https://x.id' }), /Buka: https:\/\/x\.id/);
});

test('antrean: alamat tidak sah diabaikan, kirim, tercatat terkirim, siaran banyak', async () => {
    assert.equal(smtpSiap(), true);
    await inTx(async (db) => {
        await bersihkan(db);
        assert.equal(await antreEmail(db, { jenis: 'uji', ke: 'bukan-alamat', judul: 'x', teks: 'y' }), false);
        assert.equal(await antreEmail(db, { jenis: 'uji', ke: 'a@contoh.id', judul: 'Satu', teks: 'Isi satu', tautan: 'https://x.id' }), true);
        assert.equal(await antreEmailBanyak(db, [
            { jenis: 'uji', ke: 'b@contoh.id', judul: 'Dua', teks: 'Isi dua' }, { jenis: 'uji', ke: 'salah', judul: 'x', teks: 'y' }, { jenis: 'uji', ke: 'c@contoh.id', judul: 'Tiga', teks: 'Isi tiga' },
        ]), 2);
        const h = await prosesAntrean(db, { batas: 10 });
        assert.equal(h.terkirim, 3);
        assert.equal(h.gagal, 0);
        assert.deepEqual((await db.query(`SELECT status FROM email_antrean WHERE jenis = 'uji' ORDER BY id`)).rows.map((x) => x.status), ['terkirim', 'terkirim', 'terkirim']);
        assert.equal((await ringkasAntrean(db)).terkirim >= 3, true);
        assert.equal((await prosesAntrean(db, { batas: 10 })).terkirim, 0); // tidak dikirim dua kali
    });
});

test('antrean: SMTP belum diatur -> dicatat, tidak dikirim', async () => {
    const asal = process.env.EMAIL_UJI_JSON;
    delete process.env.EMAIL_UJI_JSON;
    const host = process.env.SMTP_HOST; delete process.env.SMTP_HOST;
    try {
        await inTx(async (db) => {
            await bersihkan(db);
            await antreEmail(db, { jenis: 'uji', ke: 'd@contoh.id', judul: 'Tanpa SMTP', teks: 'x' });
            const h = await prosesAntrean(db, { batas: 10 });
            assert.equal(h.dicatat, 1);
            assert.equal((await db.query(`SELECT status FROM email_antrean WHERE ke = 'd@contoh.id'`)).rows[0].status, 'dicatat');
        });
    } finally {
        process.env.EMAIL_UJI_JSON = asal;
        if (host) process.env.SMTP_HOST = host;
    }
});

async function akunUji(db: Db) {
    const a = (await db.query(`SELECT id, nama FROM anggota a WHERE aktif AND NOT EXISTS (SELECT 1 FROM app_user u WHERE u.anggota_id = a.id) ORDER BY id LIMIT 1`)).rows[0];
    const r = await db.query(
        `INSERT INTO app_user (username, password_hash, kode_agt, nikk, status, created_at, updated_at, anggota_id, email)
         VALUES ('uji_verif_pwa', $1, 'UJI-VERIF', '000000', false, now(), now(), $2, 'uji.verif@contoh.id') RETURNING id`,
        [await hashPasswordAnggota('Rahasia123'), a.id]);
    return { userId: Number(r.rows[0].id), anggotaId: Number(a.id) };
}
const kodeDariAntrean = async (db: Db, ke: string) =>
    ((await db.query(`SELECT teks FROM email_antrean WHERE jenis = 'verifikasi' AND ke = $1 ORDER BY id DESC LIMIT 1`, [ke])).rows[0].teks as string).match(/Kode verifikasi Anda: (\d{6})/)![1];

test('verifikasi email: kode benar mengaktifkan akun pendaftaran; salah, kedaluwarsa, dan jeda ditolak', async () => {
    await inTx(async (db) => {
        const { userId } = await akunUji(db);
        const pakai = db as unknown as Parameters<typeof masukAnggota>[0];

        assert.equal((await kirimKodeVerifikasi(db, userId, 'Uji.Verif@Contoh.id', 'Uji', { aktivasi: true, abaikanJeda: true })).ok, true);
        let st = await statusEmail(db, userId);
        assert.deepEqual([st.terverifikasi, st.menungguAktivasi], [false, true]);

        // Belum aktif: tidak bisa masuk, dan hasilnya memuat userId supaya halaman bisa mengarahkan ke verifikasi.
        const masuk = await masukAnggota(pakai, 'uji_verif_pwa', 'Rahasia123');
        assert.deepEqual([masuk.ok, !masuk.ok && masuk.alasan, !masuk.ok && masuk.userId], [false, 'akun_nonaktif', userId]);

        // Permintaan ulang terlalu cepat ditolak; format kode dicek.
        const cepat = await kirimKodeVerifikasi(db, userId, 'uji.verif@contoh.id', 'Uji');
        assert.equal(cepat.ok, false);
        assert.match((await periksaKodeVerifikasi(db, userId, '12ab')) as { error: string } & object ? ((await periksaKodeVerifikasi(db, userId, '12ab')) as { error: string }).error : '', /6 angka/);

        const benar = await kodeDariAntrean(db, 'uji.verif@contoh.id');
        const salah = benar === '000000' ? '111111' : '000000';
        const g1 = await periksaKodeVerifikasi(db, userId, salah);
        assert.equal(g1.ok, false);
        assert.match((g1 as { error: string }).error, new RegExp(`Sisa percobaan: ${MAKS_SALAH - 1}`));

        // Kedaluwarsa
        await db.query(`UPDATE app_user_email_verif SET kedaluwarsa = now() - interval '1 minute' WHERE app_user_id = $1`, [userId]);
        assert.match(((await periksaKodeVerifikasi(db, userId, benar)) as { error: string }).error, /kedaluwarsa/);
        await db.query(`UPDATE app_user_email_verif SET kedaluwarsa = now() + interval '10 minutes' WHERE app_user_id = $1`, [userId]);

        // Terlalu banyak salah mengunci kode, termasuk kode yang benar.
        for (let i = 0; i < MAKS_SALAH; i++) await periksaKodeVerifikasi(db, userId, salah);
        assert.match(((await periksaKodeVerifikasi(db, userId, benar)) as { error: string }).error, /Terlalu banyak/);

        // Kode baru (setelah jeda): kode lama tidak berlaku lagi, kode baru mengaktifkan akun.
        await db.query(`UPDATE app_user_email_verif SET terakhir_kirim = now() - interval '2 minutes' WHERE app_user_id = $1`, [userId]);
        const baru = await buatKodeVerifikasi(db, userId, 'uji.verif@contoh.id');
        assert.equal(baru.ok, true);
        if (!baru.ok) return;
        assert.equal((await periksaKodeVerifikasi(db, userId, baru.kode === benar ? salah : benar)).ok, false);
        const ok = await periksaKodeVerifikasi(db, userId, baru.kode);
        assert.deepEqual(ok, { ok: true, aktivasi: true, menungguAdmin: false });
        st = await statusEmail(db, userId);
        assert.deepEqual([st.terverifikasi, st.menungguAktivasi], [true, false]);
        assert.equal((await masukAnggota(pakai, 'uji_verif_pwa', 'Rahasia123')).ok, true);
        assert.equal((await kirimKodeVerifikasi(db, userId, 'uji.verif@contoh.id', 'Uji')).ok, false); // sudah terverifikasi
    });
});

test('penerima email notifikasi: hanya email terverifikasi yang masih sama dengan email akun', async () => {
    await inTx(async (db) => {
        const { userId, anggotaId } = await akunUji(db);
        await db.query(`UPDATE app_user SET status = true WHERE id = $1`, [userId]);
        assert.deepEqual(await penerimaEmailAnggota(db, [anggotaId]).then((x) => x.filter((r) => r.email === 'uji.verif@contoh.id')), []); // belum verifikasi
        await kirimKodeVerifikasi(db, userId, 'uji.verif@contoh.id', 'Uji', { abaikanJeda: true });
        const kode = await kodeDariAntrean(db, 'uji.verif@contoh.id');
        assert.equal((await periksaKodeVerifikasi(db, userId, kode)).ok, true);
        assert.equal((await penerimaEmailAnggota(db, [anggotaId])).some((r) => r.email === 'uji.verif@contoh.id'), true);
        // Email diganti: penerima berhenti sampai email baru diverifikasi.
        await db.query(`UPDATE app_user SET email = 'baru.verif@contoh.id' WHERE id = $1`, [userId]);
        assert.equal((await penerimaEmailAnggota(db, [anggotaId])).some((r) => r.email === 'uji.verif@contoh.id'), false);
        assert.equal((await statusEmail(db, userId)).terverifikasi, false);
    });
});

/** Akun uji aktif dengan email terverifikasi. */
async function akunTerverifikasi(db: Db) {
    const { userId, anggotaId } = await akunUji(db);
    await db.query(`UPDATE app_user SET status = true WHERE id = $1`, [userId]);
    await kirimKodeVerifikasi(db, userId, 'uji.verif@contoh.id', 'Uji', { abaikanJeda: true });
    assert.equal((await periksaKodeVerifikasi(db, userId, await kodeDariAntrean(db, 'uji.verif@contoh.id'))).ok, true);
    return { userId, anggotaId };
}
const emailKe = async (db: Db, ke: string) =>
    (await db.query(`SELECT jenis, judul, teks, tautan FROM email_antrean WHERE ke = $1 AND jenis <> 'verifikasi' ORDER BY id`, [ke])).rows;

test('notifikasi anggota ikut dikirim lewat email (terverifikasi saja); chat dan percobaan tidak', async () => {
    delete process.env.VAPID_PUBLIC_KEY;
    process.env.ANGGOTA_URL = 'https://anggota.contoh.id';
    await inTx(async (db) => {
        const { anggotaId } = await akunTerverifikasi(db);

        const h = await kirimNotifikasi(db, anggotaId, { judul: 'Pengajuan kredit disetujui', isi: 'Pengajuan Rp 5.000.000 disetujui.', url: '/ajukan', jenisEmail: 'status_pengajuan' });
        assert.equal(h.email, 1);
        const [e] = await emailKe(db, 'uji.verif@contoh.id');
        assert.equal(e.jenis, 'status_pengajuan');
        assert.equal(e.judul, 'Pengajuan kredit disetujui');
        assert.match(e.teks, /^Yth\. .+,\n\nPengajuan Rp 5\.000\.000 disetujui\./);
        assert.equal(e.tautan, 'https://anggota.contoh.id/ajukan');

        // Pesan chat (balasan admin) dan notifikasi percobaan tidak lewat email.
        await kabariAnggotaBalasan(db, { percakapanId: 1, anggotaId, subjek: 'Tanya', isi: 'Besok ya' });
        await kirimNotifikasi(db, anggotaId, { judul: 'Percobaan', isi: 'x', catat: false });
        assert.equal((await emailKe(db, 'uji.verif@contoh.id')).length, 1);

        // Siaran (himbauan/promo): email terverifikasi ikut, tepat satu per alamat.
        const s = await kirimKeSemuaAnggota(db, { judul: 'Promo akhir tahun', isi: 'Diskon', jenisEmail: 'promo' });
        assert.ok(s.email >= 1);
        assert.equal((await emailKe(db, 'uji.verif@contoh.id')).filter((x) => x.jenis === 'promo').length, 1);

        // Email dimatikan per panggilan.
        await kirimNotifikasi(db, anggotaId, { judul: 'Tanpa email', isi: 'x', email: false });
        assert.equal((await emailKe(db, 'uji.verif@contoh.id')).length, 2);
    });
    delete process.env.ANGGOTA_URL;
});

test('pengajuan baru: email ke alamat pengurus dari env EMAIL_NOTIF_ADMIN', async () => {
    delete process.env.VAPID_PUBLIC_KEY;
    process.env.EMAIL_NOTIF_ADMIN = 'pengurus1@contoh.id, pengurus2@contoh.id';
    process.env.ADMIN_URL = 'https://admin.contoh.id';
    try {
        await inTx(async (db) => {
            await beritahuAdmin(db, { menu: MENU_PENGAJUAN, judul: 'Pengajuan kredit baru', isi: 'Uji mengajukan pinjaman.', url: '/dashboard/loans/apply' });
            for (const ke of ['pengurus1@contoh.id', 'pengurus2@contoh.id']) {
                const [e] = await emailKe(db, ke);
                assert.equal(e.jenis, 'pengajuan_admin');
                assert.equal(e.tautan, 'https://admin.contoh.id/dashboard/loans/apply');
            }
        });
        delete process.env.EMAIL_NOTIF_ADMIN;
        await inTx(async (db) => {
            await beritahuAdmin(db, { menu: MENU_PENGAJUAN, judul: 'Pengajuan kredit baru', isi: 'Tanpa env.', url: '/dashboard/loans/apply' });
            assert.equal((await db.query(`SELECT count(*)::int n FROM email_antrean WHERE jenis = 'pengajuan_admin' AND teks = 'Tanpa env.'`)).rows[0].n, 0);
        });
    } finally {
        delete process.env.EMAIL_NOTIF_ADMIN;
        delete process.env.ADMIN_URL;
    }
});

test('kuota kirim per jam: email biasa dibatasi, verifikasi tidak', async () => {
    process.env.EMAIL_MAKS_PER_JAM = '2';
    try {
        await inTx(async (db) => {
            await bersihkan(db);
            await antreEmailBanyak(db, ['e1', 'e2', 'e3', 'e4'].map((x) => ({ jenis: 'uji', ke: `${x}@contoh.id`, judul: x, teks: 'isi' })));
            await antreEmail(db, { jenis: 'verifikasi', ke: 'otp@contoh.id', judul: 'Kode', teks: 'Kode verifikasi Anda: 123456' });
            const h1 = await prosesAntrean(db, { batas: 20 });
            assert.equal(h1.terkirim, 3); // 1 verifikasi + 2 sesuai kuota
            assert.equal((await db.query(`SELECT status FROM email_antrean WHERE ke = 'otp@contoh.id'`)).rows[0].status, 'terkirim');
            const h2 = await prosesAntrean(db, { batas: 20 });
            assert.equal(h2.terkirim, 0); // kuota jam habis
            assert.equal(h2.sisa, 2);
            await antreEmail(db, { jenis: 'verifikasi', ke: 'otp2@contoh.id', judul: 'Kode', teks: 'Kode verifikasi Anda: 654321' });
            assert.equal((await prosesAntrean(db, { batas: 20 })).terkirim, 1); // verifikasi tetap lolos walau kuota habis
        });
    } finally {
        delete process.env.EMAIL_MAKS_PER_JAM;
    }
});
