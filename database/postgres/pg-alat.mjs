// Alat bersama skrip database: PG_URL dari env/.env.local, nama database, dan pencarian pg_dump/pg_restore yang versi
// mayornya sama dengan server (uji-reset, backup, restore).
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const EXE = process.platform === 'win32' ? '.exe' : '';

/** PG_URL dari env, atau dari frontend/.env.local lalu anggota/.env.local. */
export function pgUrl() {
    if (process.env.PG_URL) return process.env.PG_URL;
    for (const f of ['../../frontend/.env.local', '../../anggota/.env.local']) {
        try {
            const v = fs.readFileSync(path.join(here, f), 'utf8').match(/^PG_URL=(.*)$/m)?.[1]?.trim();
            if (v) return v;
        } catch { /* berkas tidak ada */ }
    }
    return undefined;
}

export const namaDb = (url) => decodeURIComponent(new URL(url).pathname.replace(/^\//, ''));

/** URL ke database `postgres` di server yang sama (untuk DROP/CREATE DATABASE). */
export function urlAdmin(url) {
    const u = new URL(url);
    u.pathname = '/postgres';
    return u.toString();
}

const versiMayor = (program) => {
    const v = spawnSync(program, ['--version'], { encoding: 'utf8' });
    const m = v.stdout?.match(/(\d+)\.\d+/);
    return v.status === 0 && m ? Number(m[1]) : null;
};

/**
 * Folder bin PostgreSQL yang punya pg_dump dan pg_restore. `cocok(mayor)` menentukan versi yang diterima:
 * pg_dump harus sama dengan server (uji-reset/backup), pg_restore boleh sama atau lebih baru dari pembuat cadangan.
 * KOPKAR_PG_BIN dicoba lebih dulu, lalu Laragon, Program Files, dan PATH.
 */
export function cariBin(cocok, keterangan) {
    const calon = [];
    if (process.env.KOPKAR_PG_BIN) calon.push(process.env.KOPKAR_PG_BIN);
    for (const akar of ['C:/laragon/bin/postgresql', 'C:/Program Files/PostgreSQL', '/usr/lib/postgresql']) {
        try {
            for (const d of fs.readdirSync(akar).sort().reverse()) calon.push(path.join(akar, d, 'bin'), path.join(akar, d));
        } catch { /* folder tidak ada */ }
    }
    calon.push(''); // PATH
    for (const bin of calon) {
        const dump = bin ? path.join(bin, `pg_dump${EXE}`) : 'pg_dump';
        if (bin && !fs.existsSync(dump)) continue;
        const mayor = versiMayor(dump);
        if (mayor !== null && cocok(mayor)) return { bin, mayor };
    }
    throw new Error(`pg_dump/pg_restore ${keterangan} tidak ditemukan. Set KOPKAR_PG_BIN ke folder bin PostgreSQL yang sesuai.`);
}

export const program = (bin, nama) => (bin ? path.join(bin, nama + EXE) : nama);

/** Jalankan program PostgreSQL dan tunggu; melempar galat bila kode keluar bukan 0. */
export function jalan(bin, nama, args, opsi = {}) {
    const r = spawnSync(program(bin, nama), args, { stdio: 'inherit', ...opsi });
    if (r.status !== 0) throw new Error(`${nama} keluar dengan kode ${r.status}`);
}

/** Ruang kosong (byte) di disk tempat folder berada; null bila tidak bisa dibaca. */
export function ruangKosong(folder) {
    try {
        const s = fs.statfsSync(folder);
        return Number(s.bavail) * Number(s.bsize);
    } catch {
        return null;
    }
}

export const ukuranBaca = (b) => (b >= 1 << 30 ? `${(b / (1 << 30)).toFixed(2)} GB` : b >= 1 << 20 ? `${(b / (1 << 20)).toFixed(1)} MB` : `${Math.round(b / 1024)} kB`);
