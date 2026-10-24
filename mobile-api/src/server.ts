import http from 'node:http';
import { Readable } from 'node:stream';
import { cocokKode, Ditolak, pemakai, type Pemakai } from './auth.js';
import { createPool, type Pool } from './db.js';
import { bacaGambar, denganGambar, namaFoto } from './gambar.js';
import * as q from './queries.js';
import * as t from './tulis.js';

// API aplikasi Android anggota, pengganti server PHP lama (v1/Api.php?apicall=..., v1/login.php, v1/dashboard.php,
// images/...). URL, parameter, dan bentuk JSON sama dengan server lama, supaya aplikasi cukup mengganti alamat server dan
// mengirim token login. Nama apicall tidak peka huruf besar-kecil (getSaldoJenisPinjaman = getsaldojenispinjaman).
//
// Keamanan (beda dari server lama, docs/analisis-aplikasi-mobile-lama.md bagian 6): semua data anggota wajib header
// "Authorization: Bearer <api_token>" dari login.php. Data selalu milik pemegang token; kdAnggota/noPinjaman dari
// aplikasi hanya dicocokkan (milik orang lain -> 403). Token tidak sah -> HTTP 401 (aplikasi kembali ke layar login).

type Konteks = t.Konteks;
type Handler = (k: Konteks) => Promise<t.Result>;

class BadRequest extends Error {}

const need = (p: t.Param, ...names: string[]) => {
    const missing = names.filter((n) => !(p.get(n) ?? '').trim());
    if (missing.length) throw new BadRequest(`Parameter ${missing.join(', ')} tidak valid/tidak ditemukan`);
};
const int = (p: t.Param, name: string, def: number) => {
    const v = parseInt(p.get(name) ?? '', 10);
    return Number.isFinite(v) && v >= 0 ? v : def;
};
const ok = (message: string, extra: t.Result = {}): t.Result => ({ error: false, message, ...extra });

/** Anggota pemegang token; kdAnggota kiriman aplikasi harus miliknya. */
const agt = async (k: Konteks) => {
    const a = await k.pemakai();
    cocokKode(a, k.p.get('kdAnggota'));
    return a.anggotaId;
};

/** Pinjaman (tunai atau KPR) menurut nomornya, hanya bila milik pemegang token. */
const pjm = async (k: Konteks) => {
    const a = await k.pemakai();
    const pj = await q.idPinjaman(k.db, k.p.get('noPinjaman')!);
    if (pj.tunaiId === null && pj.kprId === null) return pj;
    const r = await k.db.query(
        'SELECT anggota_id FROM pinjaman_tunai WHERE id = $1 UNION ALL SELECT anggota_id FROM kpr WHERE id = $2', [pj.tunaiId, pj.kprId]);
    if (!r.rows.some((x) => Number(x.anggota_id) === a.anggotaId)) throw new Ditolak(403, 'Akses ditolak.');
    return pj;
};

const handlers: Record<string, Handler> = {
    // Hanya data pemegang token (server lama tanpa token mengembalikan semua anggota).
    getanggota: async (k) => ok('Request successfully completed', { anggota: await q.getAnggota(k.db, await agt(k)) }),
    getsimpanan: async (k) => { need(k.p, 'kdAnggota'); return ok('Simpanan berhasil diquery', { simpanan: await q.getSimpanan(k.db, await agt(k)) }); },
    getsimpananrincipaginated: async (k) => {
        need(k.p, 'kdAnggota', 'jenisSimpanan', 'offset', 'limit');
        return ok('Simpanan rinci (paginated) berhasil diquery', {
            simpanan_rinci: await q.getSimpananRinciPaginated(k.db, await agt(k), k.p.get('jenisSimpanan')!, int(k.p, 'offset', 0), int(k.p, 'limit', 5)),
        });
    },
    getsaldojenispinjaman: async (k) => { need(k.p, 'kdAnggota'); return ok('Saldo pinjaman berhasil diquery', { saldo_pinjaman: await q.getSaldoJenisPinjaman(k.db, await agt(k)) }); },
    getpinjaman: async (k) => { need(k.p, 'kdAnggota'); return ok('Pinjaman berhasil diquery', { pinjaman: await q.getPinjaman(k.db, await agt(k)) }); },
    getpinjamanrincipaginated: async (k) => {
        need(k.p, 'noPinjaman');
        return ok('Pinjaman rinci (paginated) berhasil diquery', { pinjaman_rinci: await q.getPinjamanRinciPaginated(k.db, await pjm(k), int(k.p, 'offset', 0), int(k.p, 'limit', 5)) });
    },
    getjadwalangsuran: async (k) => { need(k.p, 'noPinjaman'); return ok('Jadwal angsuran berhasil diquery', { jadwal: await q.getJadwalAngsuran(k.db, (await pjm(k)).tunaiId) }); },
    // Produk menurut status staff anggota itu sendiri (seperti PWA), bukan statusStaff kiriman aplikasi.
    getjeniskreditv1: async (k) => {
        const id = await agt(k);
        const { rows: [a] } = await k.db.query('SELECT status_staff FROM anggota WHERE id = $1', [id]);
        return ok('Jenis kredit berhasil diquery', { jenis_kredit: await q.getJenisKreditV1(k.db, a?.status_staff ?? '') });
    },
    getpertanyaan: async (k) => ok('Daftar pertanyaan berhasil diquery', { pertanyaan: await q.getPertanyaan(k.db) }),
    isuserexist: t.isUserExist,
    verifyjawaban: t.verifyJawaban,
    updateuserpassword: t.updateUserPassword,
    isterdebet: async (k) => { need(k.p, 'kdAnggota'); return ok('Status terdebet berhasil diquery.', { terdebet: await q.isTerdebet(k.db, await agt(k)) }); },
    getpotonganbulanan: async (k) => { need(k.p, 'kdAnggota'); return ok('Potongan bulanan berhasil diquery.', { potongan: await q.getPotonganBulanan(k.db, await agt(k)) }); },
    getshu: async (k) => { need(k.p, 'kdAnggota', 'tahun'); return ok('SHU berhasil diquery.', { shu: await q.getShu(k.db, await agt(k), k.p.get('tahun')!) }); },
    gettahunshu: async (k) => ok('Tahun SHU berhasil diquery.', { tahun: await q.getTahunShu(k.db) }),
    getlognotifikasi: async (k) => {
        need(k.p, 'kdAnggota');
        return ok('Log notifikasi berhasil diquery.', { log: await q.getLogNotifikasi(k.db, await agt(k), int(k.p, 'offset', 0), int(k.p, 'limit', 5)) });
    },
    gethistory: async (k) => {
        need(k.p, 'kdAnggota');
        return ok('History berhasil diquery.', { history: await q.getHistory(k.db, await agt(k), int(k.p, 'offset', 0), int(k.p, 'limit', 5)) });
    },
    createpinjaman: t.createPinjaman,
    updateemail: t.updateEmail,
    updatefcmtoken: t.updateFcmToken,
    updateprofile: t.updateProfile,
};

/** dashboard.php: ringkasan untuk layar utama. */
async function dashboard(k: Konteks): Promise<t.Result> {
    if (!(k.p.get('kdAnggota') ?? '').trim()) return { error: true, message: 'kdAnggota is required' };
    const id = await agt(k);
    const a = await k.pemakai();
    const [simpanan, pinjaman, potongan, shu, himbauan, promos] = await Promise.all([
        q.getSimpanan(k.db, id), q.getPinjaman(k.db, id), q.getPotonganBulanan(k.db, id),
        q.getShu(k.db, id, String(new Date().getFullYear() - 1)), q.getHimbauan(k.db), q.getPromos(k.db),
    ]);
    return {
        error: false,
        total_simpanan: simpanan.filter((s) => s.jenis_simpanan !== '01').reduce((n, s) => n + s.total, 0),
        sisa_pinjaman: pinjaman.reduce((n, x) => n + x.saldo, 0),
        total_potongan: potongan[0]?.total_potongan ?? 0,
        total_shu: shu.total_shu,
        himbauan: himbauan ? (await denganGambar(k.db, 'himbauan', [himbauan]))[0] : null,
        promos: await denganGambar(k.db, 'promo', promos),
        foto: await namaFoto(k.db, a.userId),
    };
}

/** download_slip.php: seperti server lama, slip PDF belum ada (aplikasi menampilkan teks ini). */
async function downloadSlip(k: Konteks) {
    await agt(k);
    return `Fungsi Download PDF untuk Anggota: ${k.p.get('kdAnggota')}\nSlip potongan belum tersedia.`;
}

// Isian POST: application/x-www-form-urlencoded (StringRequest Volley) atau multipart/form-data (unggah foto).
const MAKS_BODY = 6 * 1024 * 1024;

async function bacaIsian(req: http.IncomingMessage, url: URL) {
    const p = new URLSearchParams(url.searchParams);
    const berkas = new Map<string, Uint8Array>();
    const jenis = req.headers['content-type'] ?? '';
    if (req.method !== 'POST' || !/^(multipart\/form-data|application\/x-www-form-urlencoded)/i.test(jenis)) return { p, berkas };
    if (Number(req.headers['content-length'] ?? 0) > MAKS_BODY) throw new BadRequest('Ukuran foto maksimal 5 MB.');
    const form = await new Request('http://mobile-api/', {
        method: 'POST', headers: { 'content-type': jenis }, body: Readable.toWeb(req) as ReadableStream, duplex: 'half',
    } as RequestInit).formData();
    for (const [k, v] of form) {
        if (typeof v === 'string') p.set(k, v);
        else berkas.set(k, new Uint8Array(await v.arrayBuffer()));
    }
    return { p, berkas };
}

const alamatIp = (req: http.IncomingMessage) =>
    (String(req.headers['x-forwarded-for'] ?? '').split(',')[0] || req.socket.remoteAddress || 'lokal').trim();

export function createServer(db: Pool) {
    return http.createServer(async (req, res) => {
        const send = (status: number, body: unknown) => {
            res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
            res.end(JSON.stringify(body));
        };
        try {
            const url = new URL(req.url ?? '/', 'http://localhost');
            const path = url.pathname.toLowerCase();

            const gambar = /\/images\/(.+)$/.exec(url.pathname)?.[1];
            if (gambar !== undefined) {
                const g = await bacaGambar(db, decodeURIComponent(gambar));
                if (!g) { res.writeHead(404); return res.end(); }
                res.writeHead(200, {
                    'Content-Type': g.jenis, 'X-Content-Type-Options': 'nosniff',
                    // Alamat berganti saat gambar diganti, jadi aman disimpan lama; foto profil hanya di cache perangkat.
                    'Cache-Control': `${g.publik ? 'public' : 'private'}, max-age=31536000, immutable`,
                });
                return res.end(g.isi);
            }

            const { p, berkas } = await bacaIsian(req, url);
            let a: Pemakai | undefined;
            const k: Konteks = { db, p, berkas, ip: alamatIp(req), pemakai: async () => (a ??= await pemakai(db, req)) };

            if (path.endsWith('/login.php')) return send(200, await t.login(k));
            if (path.endsWith('/dashboard.php')) return send(200, await dashboard(k));
            if (path.endsWith('/download_slip.php')) {
                const isi = await downloadSlip(k);
                res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' });
                return res.end(isi);
            }
            if (!path.endsWith('/api.php')) return send(404, { error: true, message: 'Tidak ditemukan' });
            const call = p.get('apicall');
            if (!call) return send(200, { error: true, message: 'Invalid API Call' });
            const h = handlers[call.toLowerCase()];
            if (!h) return send(200, { error: true, message: `API call '${call}' tidak dikenali` });
            return send(200, await h(k));
        } catch (e) {
            if (e instanceof Ditolak) return send(e.status, { error: true, success: false, message: e.message });
            // server lama membalas HTTP 200 dengan error=true
            const msg = e instanceof BadRequest ? e.message : 'Internal Server Error';
            if (!(e instanceof BadRequest)) console.error(e);
            return send(200, { error: true, message: msg });
        }
    });
}

if (import.meta.url === `file://${process.argv[1].replace(/\\/g, '/')}` || process.argv[1]?.endsWith('server.ts')) {
    const port = Number(process.env.PORT || 8099);
    const host = process.env.HOST || '127.0.0.1';
    createServer(createPool()).listen(port, host, () => console.log(`mobile-api di http://${host}:${port}/v1/Api.php`));
}
