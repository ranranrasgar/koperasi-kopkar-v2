import http from 'node:http';
import { createPool, type Pool } from './db.js';
import * as q from './queries.js';

// Kontrak: URL dan bentuk JSON sama dengan server PHP lama (v1/Api.php?apicall=...), supaya aplikasi
// Android v5.6 tetap jalan. Nama apicall tidak peka huruf besar-kecil (getSaldoJenisPinjaman dan
// getsaldojenispinjaman sama; server lama hanya mengenali versi huruf kecil).

type Query = URLSearchParams;
type Result = Record<string, unknown>;
type Handler = (db: Pool, p: Query) => Promise<Result>;

class BadRequest extends Error {}

const need = (p: Query, ...names: string[]) => {
    const missing = names.filter((n) => !(p.get(n) ?? '').trim());
    if (missing.length) throw new BadRequest(`Parameter ${missing.join(', ')} tidak valid/tidak ditemukan`);
};
const int = (p: Query, name: string, def: number) => {
    const v = parseInt(p.get(name) ?? '', 10);
    return Number.isFinite(v) && v >= 0 ? v : def;
};
const ok = (message: string, extra: Result = {}): Result => ({ error: false, message, ...extra });

const handlers: Record<string, Handler> = {
    // kdAnggota opsional (tambahan): membatasi ke satu anggota; tanpa itu bentuknya sama dengan server lama.
    getanggota: async (db, p) => ok('Request successfully completed', { anggota: await q.getAnggota(db, p.get('kdAnggota')?.trim() || undefined) }),
    getsimpanan: async (db, p) => { need(p, 'kdAnggota'); return ok('Simpanan berhasil diquery', { simpanan: await q.getSimpanan(db, p.get('kdAnggota')!) }); },
    getsimpananrincipaginated: async (db, p) => {
        need(p, 'kdAnggota', 'jenisSimpanan', 'offset', 'limit');
        return ok('Simpanan rinci (paginated) berhasil diquery', {
            simpanan_rinci: await q.getSimpananRinciPaginated(db, p.get('kdAnggota')!, p.get('jenisSimpanan')!, int(p, 'offset', 0), int(p, 'limit', 5)),
        });
    },
    getsaldojenispinjaman: async (db, p) => { need(p, 'kdAnggota'); return ok('Saldo pinjaman berhasil diquery', { saldo_pinjaman: await q.getSaldoJenisPinjaman(db, p.get('kdAnggota')!) }); },
    getpinjaman: async (db, p) => { need(p, 'kdAnggota'); return ok('Pinjaman berhasil diquery', { pinjaman: await q.getPinjaman(db, p.get('kdAnggota')!) }); },
    getpinjamanrincipaginated: async (db, p) => {
        need(p, 'noPinjaman');
        return ok('Pinjaman rinci (paginated) berhasil diquery', { pinjaman_rinci: await q.getPinjamanRinciPaginated(db, p.get('noPinjaman')!, int(p, 'offset', 0), int(p, 'limit', 5)) });
    },
    getjadwalangsuran: async (db, p) => { need(p, 'noPinjaman'); return ok('Jadwal angsuran berhasil diquery', { jadwal: await q.getJadwalAngsuran(db, p.get('noPinjaman')!) }); },
    getjeniskreditv1: async (db, p) => { need(p, 'statusStaff'); return ok('Jenis kredit berhasil diquery', { jenis_kredit: await q.getJenisKreditV1(db, p.get('statusStaff')!) }); },
    getpertanyaan: async (db) => ok('Daftar pertanyaan berhasil diquery', { pertanyaan: await q.getPertanyaan(db) }),
    isuserexist: async (db, p) => {
        need(p, 'username');
        const u = await q.isUserExist(db, p.get('username')!);
        // jawaban tidak pernah dikirim ke aplikasi; pencocokan lewat verifyjawaban (endpoint tulis, belum dibuat)
        return u ? ok('Username ada di database.', { username_exist: true, pertanyaan: u.pertanyaan }) : { error: true, message: 'Username tidak ada di database.' };
    },
    isterdebet: async (db, p) => { need(p, 'kdAnggota'); return ok('Status terdebet berhasil diquery.', { terdebet: await q.isTerdebet(db, p.get('kdAnggota')!) }); },
    getpotonganbulanan: async (db, p) => { need(p, 'kdAnggota'); return ok('Potongan bulanan berhasil diquery.', { potongan: await q.getPotonganBulanan(db, p.get('kdAnggota')!) }); },
    getshu: async (db, p) => { need(p, 'kdAnggota', 'tahun'); return ok('SHU berhasil diquery.', { shu: await q.getShu(db, p.get('kdAnggota')!, p.get('tahun')!) }); },
    gettahunshu: async (db) => ok('Tahun SHU berhasil diquery.', { tahun: await q.getTahunShu(db) }),
    getlognotifikasi: async (db, p) => {
        need(p, 'kdAnggota');
        return ok('Log notifikasi berhasil diquery.', { log: await q.getLogNotifikasi(db, p.get('kdAnggota')!, int(p, 'offset', 0), int(p, 'limit', 5)) });
    },
    gethistory: async (db, p) => {
        need(p, 'kdAnggota');
        return ok('History berhasil diquery.', { history: await q.getHistory(db, p.get('kdAnggota')!, int(p, 'offset', 0), int(p, 'limit', 5)) });
    },
};

/** dashboard.php: ringkasan untuk layar utama. */
async function dashboard(db: Pool, p: Query): Promise<Result> {
    if (!(p.get('kdAnggota') ?? '').trim()) return { error: true, message: 'kdAnggota is required' };
    const kd = p.get('kdAnggota')!;
    const simpanan = await q.getSimpanan(db, kd);
    const pinjaman = await q.getPinjaman(db, kd);
    const potongan = await q.getPotonganBulanan(db, kd);
    const shu = await q.getShu(db, kd, String(new Date().getFullYear() - 1));
    return {
        error: false,
        total_simpanan: simpanan.filter((s) => s.jenis_simpanan !== '01').reduce((t, s) => t + s.total, 0),
        sisa_pinjaman: pinjaman.reduce((t, x) => t + x.saldo, 0),
        total_potongan: potongan[0]?.total_potongan ?? 0,
        total_shu: shu.total_shu,
        himbauan: await q.getHimbauan(db),
        promos: await q.getPromos(db),
    };
}

export function createServer(db: Pool) {
    return http.createServer(async (req, res) => {
        const send = (status: number, body: unknown) => {
            res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify(body));
        };
        try {
            const url = new URL(req.url ?? '/', 'http://localhost');
            const path = url.pathname.toLowerCase();
            if (path.endsWith('/dashboard.php')) return send(200, await dashboard(db, url.searchParams));
            if (!path.endsWith('/api.php')) return send(404, { error: true, message: 'Tidak ditemukan' });
            const call = url.searchParams.get('apicall');
            if (!call) return send(200, { error: true, message: 'Invalid API Call' });
            const h = handlers[call.toLowerCase()];
            if (!h) return send(200, { error: true, message: `API call '${call}' tidak dikenali` });
            return send(200, await h(db, url.searchParams));
        } catch (e) {
            // server lama juga membalas HTTP 200 dengan error=true
            const msg = e instanceof BadRequest ? e.message : 'Internal Server Error';
            if (!(e instanceof BadRequest)) console.error(e);
            return send(200, { error: true, message: msg });
        }
    });
}

if (import.meta.url === `file://${process.argv[1].replace(/\\/g, '/')}` || process.argv[1]?.endsWith('server.ts')) {
    const port = Number(process.env.PORT || 8099);
    createServer(createPool()).listen(port, () => console.log(`mobile-api di http://127.0.0.1:${port}/v1/Api.php`));
}
