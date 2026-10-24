import type http from 'node:http';
import { cariAkun } from '@kopkar/backend/src/anggota/akun.ts';
import { bacaToken, buatToken, LAMA_SESI_DETIK, sidikPassword } from '@kopkar/backend/src/anggota/token.ts';
import type { Pool } from './db.js';

// Token login aplikasi Android: dikirim di header "Authorization: Bearer <api_token>" pada setiap permintaan. Rahasia dan
// masa berlaku (30 hari) sama dengan cookie sesi PWA anggota; awalan "api" memisahkannya dari cookie, tautan reset, dan
// token verifikasi. Memuat sidik password, jadi otomatis tidak berlaku setelah password diganti di perangkat mana pun.

export class Ditolak extends Error {
    constructor(public status: 401 | 403, message: string) { super(message); }
}

export const SESI_HABIS = 'Sesi berakhir. Silakan masuk kembali.';

export const buatTokenApi = (userId: number, passwordHash: string) =>
    buatToken('api', { u: String(userId), pv: sidikPassword(passwordHash) }, LAMA_SESI_DETIK);

export interface Pemakai {
    userId: number; username: string; anggotaId: number; kodeAgt: string; nama: string; email: string | null; passwordHash: string;
}

/**
 * Anggota pemilik token, diperiksa ulang ke database setiap permintaan (sama dengan anggotaSesi PWA): akun aktif, password
 * belum diganti, dan terdaftar sebagai anggota aktif. Semua data dibaca dari anggotaId ini, tidak pernah dari parameter.
 */
export async function pemakai(db: Pool, req: http.IncomingMessage): Promise<Pemakai> {
    const t = /^Bearer\s+(\S+)$/i.exec(req.headers.authorization ?? '')?.[1];
    const isi = bacaToken('api', t);
    if (!isi || !/^\d+$/.test(isi.u ?? '')) throw new Ditolak(401, SESI_HABIS);
    const a = await cariAkun(db, { id: Number(isi.u) });
    if (!a || !a.akun_aktif || !a.password_hash || sidikPassword(a.password_hash) !== isi.pv || !a.anggota_id || !a.anggota_aktif) {
        throw new Ditolak(401, SESI_HABIS);
    }
    return {
        userId: Number(a.user_id), username: a.username, anggotaId: Number(a.anggota_id), kodeAgt: a.kode_agt,
        nama: a.nama?.trim() || a.username, email: a.email, passwordHash: a.password_hash,
    };
}

/** Aplikasi lama mengirim kdAnggota di setiap permintaan; harus milik pemegang token. */
export function cocokKode(p: Pemakai, kdAnggota: string | null) {
    if (kdAnggota && kdAnggota.trim().toLowerCase() !== p.kodeAgt.trim().toLowerCase()) throw new Ditolak(403, 'Akses ditolak.');
}
