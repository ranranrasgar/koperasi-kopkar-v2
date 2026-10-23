"use server"

import { revalidatePath } from "next/cache"
import { aturSelesai, balasPesanAdmin, hitungBelumDibaca, kabariAnggotaBalasan, pesanSetelah, PesanSalah } from "@kopkar/backend/src/anggota/pesan.ts"
import { hitungPengumumanBaru } from "@kopkar/backend/src/anggota/sasaran.ts"
import { adaLanggananOpr, hapusLanggananOpr, langgananValid, simpanLanggananOpr } from "@kopkar/backend/src/anggota/push.ts"
import { MENU } from "@/config/akses"
import { modeUji, pool, tx } from "@/lib/db"
import { GalatSesi, operatorAktif } from "@/lib/operator"
import type { Hasil } from "./transaksi"

const gagal = (e: unknown): Hasil => {
    if (e instanceof PesanSalah || e instanceof GalatSesi) return { ok: false, error: e.message }
    console.error("pesan anggota gagal:", e)
    return { ok: false, error: "Gagal memproses" }
}

/** Balas anggota: tersimpan di percakapan, lalu anggota menerima notifikasi (riwayat + Web Push). Mode uji: tidak tersimpan. */
export async function balasPesanAction(_: Hasil, f: FormData): Promise<Hasil> {
    try {
        const o = await operatorAktif([MENU.pesanAnggota])
        const id = Number(f.get("id"))
        if (!Number.isInteger(id) || id <= 0) return { ok: false, error: "Percakapan tidak valid" }
        const r = await tx((db) => balasPesanAdmin(db, { percakapanId: id, oprNama: o.nama, isi: String(f.get("isi") ?? "") }))
        if (await modeUji()) return { ok: true, pesan: "MODE UJI, balasan tidak tersimpan dan tidak dikirim" }
        await kabariAnggotaBalasan(pool, r).catch((e) => console.error("kabari anggota gagal:", e))
        revalidatePath("/dashboard/pesan", "layout")
        return { ok: true, pesan: "Balasan terkirim" }
    } catch (e) {
        return gagal(e)
    }
}

export async function aturSelesaiAction(id: number, selesai: boolean): Promise<Hasil> {
    try {
        await operatorAktif([MENU.pesanAnggota])
        await tx((db) => aturSelesai(db, id, selesai))
        if (await modeUji()) return { ok: true, pesan: "MODE UJI, tidak tersimpan" }
        revalidatePath("/dashboard/pesan", "layout")
        return { ok: true, pesan: selesai ? "Ditandai selesai" : "Dibuka kembali" }
    } catch (e) {
        return gagal(e)
    }
}

// Langganan Web Push browser operator ini (izin sudah diberikan di browser). Bukan transaksi uang: tidak ikut mode uji.

export async function aktifkanPushOprAction(langganan: unknown): Promise<Hasil> {
    try {
        const o = await operatorAktif()
        if (!langgananValid(langganan)) return { ok: false, error: "Data langganan browser tidak valid" }
        await simpanLanggananOpr(pool, o.id, langganan)
        return { ok: true, pesan: "Notifikasi aktif" }
    } catch (e) {
        return gagal(e)
    }
}

export async function matikanPushOprAction(endpoint: string): Promise<Hasil> {
    try {
        const o = await operatorAktif()
        await hapusLanggananOpr(pool, o.id, String(endpoint))
        return { ok: true, pesan: "Notifikasi dimatikan" }
    } catch (e) {
        return gagal(e)
    }
}

export async function statusPushOprAction(endpoint: string): Promise<boolean> {
    try {
        const o = await operatorAktif()
        return await adaLanggananOpr(pool, o.id, String(endpoint))
    } catch {
        return false
    }
}

/** Angka merah navbar: percakapan menunggu operator (ikon pesan, hanya bila berizin) dan pengumuman internal belum dibuka (lonceng). */
export async function jumlahBadgeAction(): Promise<{ pesan: number; pengumuman: number }> {
    try {
        const o = await operatorAktif()
        const [pesan, pengumuman] = await Promise.all([
            o.izin.includes(MENU.pesanAnggota) ? hitungBelumDibaca(pool, "admin") : 0,
            hitungPengumumanBaru(pool, o.id),
        ])
        return { pesan, pengumuman }
    } catch {
        return { pesan: 0, pengumuman: 0 }
    }
}

/** Pesan baru di satu percakapan setelah id tertentu (pembaruan langsung); membukanya menandai pesan anggota terbaca. */
export async function pesanBaruAdminAction(id: number, setelahId: number) {
    try {
        await operatorAktif([MENU.pesanAnggota])
        if (!Number.isInteger(id) || !Number.isInteger(setelahId) || id <= 0 || setelahId < 0) return null
        const r = await pesanSetelah(pool, id, null, setelahId, "admin")
        return r ? r.map(({ id, pengirim, opr_nama, isi, dibuat_pada }) => ({ id, pengirim, opr_nama, isi, dibuat_pada })) : null
    } catch {
        return null
    }
}
