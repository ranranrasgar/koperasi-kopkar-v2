"use server"

import { revalidatePath } from "next/cache"
import { putuskanPendaftaran } from "@kopkar/backend/src/anggota/akun.ts"
import { antreEmail } from "@kopkar/backend/src/email/antrean.ts"
import { modeUji, tx } from "@/lib/db"
import { GalatSesi, operatorAktif } from "@/lib/operator"
import { MENU } from "@/config/akses"

export type HasilPendaftaran = { ok: true; pesan: string } | { ok: false; error: string }

/**
 * Setujui atau tolak pendaftaran akun baru dari aplikasi anggota. Lewat tx() supaya ikut di-rollback di mode uji.
 * Pendaftar diberi tahu lewat email (ke email yang sudah terverifikasi); gagal kirim tidak membatalkan keputusan.
 */
export async function putuskanPendaftaranAction(id: number, setuju: boolean): Promise<HasilPendaftaran> {
    try {
        await operatorAktif([MENU.user, MENU.requestUser])
        const r = await tx((db) => putuskanPendaftaran(db as never, id, setuju))
        if (!r.ok) return r
        if (await modeUji()) return { ok: true, pesan: `MODE UJI, tidak tersimpan: ${r.pesan}` }
        revalidatePath("/dashboard/members/pendaftaran")
        if (r.email) {
            const dasar = (process.env.ANGGOTA_URL ?? "").replace(/\/+$/, "")
            await tx((db) => antreEmail(db, setuju
                ? {
                    jenis: "pendaftaran", ke: r.email!, judul: "Akun aplikasi anggota Anda sudah aktif",
                    teks: `Halo ${r.username},\n\nPendaftaran Anda di aplikasi anggota Kopkar MJS sudah diverifikasi dan akun Anda sekarang aktif. Silakan masuk dengan username Anda atau lewat Google.`,
                    tautan: dasar ? `${dasar}/masuk` : null,
                }
                : {
                    jenis: "pendaftaran", ke: r.email!, judul: "Pendaftaran aplikasi anggota tidak disetujui",
                    teks: `Halo ${r.username},\n\nMohon maaf, pendaftaran Anda di aplikasi anggota Kopkar MJS belum dapat kami setujui. Silakan hubungi pengurus koperasi untuk keterangan lebih lanjut.`,
                })).catch((e) => console.error("antre email keputusan pendaftaran gagal:", e))
        }
        return { ok: true, pesan: r.pesan }
    } catch (e) {
        if (!(e instanceof GalatSesi)) console.error("putuskan pendaftaran gagal:", e)
        return { ok: false, error: e instanceof Error ? e.message : "Gagal" }
    }
}
