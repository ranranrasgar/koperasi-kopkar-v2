// Kontrak JSON API mobile (dipakai aplikasi Android KopkarMJS2000 v5.6).
//   BASE_URL=http://127.0.0.1:8099 KD_ANGGOTA=<kode anggota berpinjaman> node database/contract/capture.mjs --write   (tulis mobile-api-shapes.json)
//   BASE_URL=http://localhost:3000/KopkarMJS2000_2026 KD_ANGGOTA=<kode> node database/contract/capture.mjs                (bandingkan dengan file itu)
// Yang dicatat hanya BENTUK respons (nama kunci dan tipe), tanpa data anggota.
// Hanya endpoint baca yang dipanggil; endpoint tulis (createpinjaman, update*, login) tidak disentuh.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const FILE = path.join(here, 'mobile-api-shapes.json');
const BASE = (process.env.BASE_URL || '').replace(/\/$/, '');
const KD = process.env.KD_ANGGOTA;
if (!BASE || !KD) { console.error('Set BASE_URL dan KD_ANGGOTA'); process.exit(2); }

const shape = (v) => v === null ? 'null' : Array.isArray(v) ? (v.length ? [shape(v[0])] : []) : typeof v === 'object' ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, shape(x)])) : typeof v;
const get = async (p) => {
    const r = await fetch(BASE + p);
    const t = await r.text();
    try { return { code: r.status, json: JSON.parse(t) }; } catch { return { code: r.status, text: t.slice(0, 80) }; }
};

const pj = (await get(`/v1/Api.php?apicall=getpinjaman&kdAnggota=${KD}`)).json?.pinjaman;
if (!pj?.length) { console.error('KD_ANGGOTA harus punya pinjaman aktif'); process.exit(2); }
const no = pj[0].no_pinjaman;
const A = '/v1/Api.php?apicall=';
// nama persis seperti dipanggil Android (Api.java), termasuk huruf besar-kecilnya
const endpoints = {
    getanggota: `${A}getanggota`,
    getpertanyaan: `${A}getpertanyaan`,
    isuserexist: `${A}isuserexist&username=tidakada_xyz`,
    getsimpanan: `${A}getsimpanan&kdAnggota=${KD}`,
    getsimpananrincipaginated: `${A}getsimpananrincipaginated&kdAnggota=${KD}&jenisSimpanan=03&offset=0&limit=3`,
    getSaldoJenisPinjaman: `${A}getSaldoJenisPinjaman&kdAnggota=${KD}`,
    getpinjaman: `${A}getpinjaman&kdAnggota=${KD}`,
    getpinjamanrincipaginated: `${A}getpinjamanrincipaginated&noPinjaman=${no}&offset=0&limit=3`,
    getjadwalangsuran: `${A}getjadwalangsuran&noPinjaman=${no}`,
    getjeniskreditv1: `${A}getjeniskreditv1&statusStaff=Staff`,
    getpotonganbulanan: `${A}getpotonganbulanan&kdAnggota=${KD}`,
    isterdebet: `${A}isterdebet&kdAnggota=${KD}`,
    getshu: `${A}getshu&kdAnggota=${KD}&tahun=2025`,
    gettahunshu: `${A}gettahunshu`,
    getlognotifikasi: `${A}getlognotifikasi&kdAnggota=${KD}&offset=0&limit=3`,
    gethistory: `${A}gethistory&kdAnggota=${KD}&offset=0&limit=3`,
    'dashboard.php': `/v1/dashboard.php?kdAnggota=${KD}`,
};

const result = {};
for (const [name, p] of Object.entries(endpoints)) {
    const r = await get(p);
    result[name] = r.json ? shape(r.json) : `bukan JSON (HTTP ${r.code})`;
}

if (process.argv.includes('--write')) {
    fs.writeFileSync(FILE, JSON.stringify(result, null, 2) + '\n');
    console.log(`Ditulis ${FILE}`);
} else {
    const expected = JSON.parse(fs.readFileSync(FILE, 'utf8'));
    let bad = 0;
    for (const name of Object.keys(expected).filter((k) => !k.startsWith('_'))) {
        const a = JSON.stringify(expected[name]), b = JSON.stringify(result[name]);
        if (a !== b) { bad++; console.log(`BEDA ${name}\n  diharapkan ${a.slice(0, 300)}\n  didapat    ${b.slice(0, 300)}`); }
    }
    console.log(bad === 0 ? `KONTRAK OK: ${Object.keys(expected).filter((k) => !k.startsWith('_')).length} endpoint sama bentuknya.` : `${bad} endpoint berbeda bentuk.`);
    process.exitCode = bad === 0 ? 0 : 1;
}
