"use server"

import { adaLangganan, hapusLangganan, kirimNotifikasi, langgananValid, simpanLangganan } from "@kopkar/backend/src/anggota/push.ts"
import { anggotaSesi } from "@/lib/anggota"
import { pool } from "@/lib/db"

export type HasilPush = { ok: true } | { ok: false; error: string }

const SESI_HABIS: HasilPush = { ok: false, error: "Sesi berakhir. Silakan masuk kembali." }

/** Simpan langganan Web Push perangkat ini untuk akun yang login (izin sudah diberikan pengguna di browser). */
export async function aktifkanPushAction(langganan: unknown): Promise<HasilPush> {
    const a = await anggotaSesi()
    if (!a) return SESI_HABIS
    if (!langgananValid(langganan)) return { ok: false, error: "Data langganan perangkat tidak valid" }
    await simpanLangganan(pool, a.userId, langganan)
    return { ok: true }
}

export async function matikanPushAction(endpoint: string): Promise<HasilPush> {
    const a = await anggotaSesi()
    if (!a) return SESI_HABIS
    await hapusLangganan(pool, a.userId, String(endpoint))
    return { ok: true }
}

/** Apakah perangkat ini (endpoint) sudah terdaftar untuk akun yang login. */
export async function statusPushAction(endpoint: string): Promise<boolean> {
    const a = await anggotaSesi()
    return a ? adaLangganan(pool, a.userId, String(endpoint)) : false
}

/** Kirim satu notifikasi percobaan ke perangkat milik sendiri; tidak masuk riwayat. Hanya untuk pengembangan. */
export async function kirimUjiPushAction(): Promise<HasilPush> {
    if (process.env.NODE_ENV === "production") return { ok: false, error: "Tidak tersedia" }
    const a = await anggotaSesi()
    if (!a) return SESI_HABIS
    if (a.anggotaId === null) return { ok: false, error: "Notifikasi hanya untuk anggota" }
    const h = await kirimNotifikasi(pool, a.anggotaId, { judul: "Notifikasi percobaan", isi: "Notifikasi dari koperasi akan tampil seperti ini.", catat: false })
    return h.dikirim > 0 ? { ok: true } : { ok: false, error: "Tidak ada perangkat yang menerima. Aktifkan notifikasi lebih dulu." }
}
