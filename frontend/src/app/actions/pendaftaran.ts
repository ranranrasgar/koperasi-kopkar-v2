"use server"

import { revalidatePath } from "next/cache"
import { hapusAkunAplikasi, jadikanAnggota, putuskanPendaftaran } from "@kopkar/backend/src/anggota/akun.ts"
import { antreEmail } from "@kopkar/backend/src/email/antrean.ts"
import { modeUji, query, tx } from "@/lib/db"
import { GalatSesi, operatorAktif, type Operator } from "@/lib/operator"
import { MENU } from "@/config/akses"

export type HasilPendaftaran = { ok: true; pesan: string } | { ok: false; error: string }

const MENU_USER = [MENU.user, MENU.requestUser] as const

/** Hapus akun yang sudah terhubung ke anggota hanya boleh oleh superadmin atau grup admin. */
const bolehHapusAkunAnggota = (o: Pick<Operator, "superadmin" | "grup">) => o.superadmin || (o.grup ?? "").trim().toLowerCase() === "admin"

/**
 * Setujui atau tolak pendaftaran akun baru dari aplikasi anggota. Lewat tx() supaya ikut di-rollback di mode uji.
 * Pendaftar diberi tahu lewat email (ke email yang sudah terverifikasi); gagal kirim tidak membatalkan keputusan.
 */
export async function putuskanPendaftaranAction(id: number, setuju: boolean): Promise<HasilPendaftaran> {
    try {
        const o = await operatorAktif(MENU_USER)
        const r = await tx((db) => putuskanPendaftaran(db as never, id, setuju, { id: o.id, nama: o.nama }))
        if (!r.ok) return r
        if (await modeUji()) return { ok: true, pesan: `MODE UJI, tidak tersimpan: ${r.pesan}` }
        revalidatePath("/dashboard/members", "layout")
        if (r.email) {
            const dasar = (process.env.ANGGOTA_URL ?? "").replace(/\/+$/, "")
            await tx((db) => antreEmail(db, setuju
                ? {
                    jenis: "pendaftaran", ke: r.email!, judul: "Akun aplikasi anggota Anda sudah aktif",
                    teks: `Halo ${r.username},\n\nPendaftaran Anda di aplikasi anggota Kopkar MJS sudah diverifikasi dan akun Anda sekarang aktif${r.kodeAnggota ? ` dan Anda tercatat sebagai anggota dengan kode ${r.kodeAnggota}` : ""}. Silakan masuk dengan username Anda atau lewat Google.`,
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

/**
 * Jadikan akun karyawan Mattel yang sudah aktif (disetujui sebelum ada fitur ini) sebagai anggota: dibuatkan data anggota
 * dengan kode anggota berformat lama, atau ditautkan ke data anggota yang sudah ada untuk NIK itu.
 */
export async function jadikanAnggotaAction(id: number): Promise<HasilPendaftaran> {
    try {
        const o = await operatorAktif(MENU_USER)
        const r = await tx((db) => jadikanAnggota(db as never, id, { id: o.id, nama: o.nama }))
        if (!r.ok) return r
        const pesan = r.dibuat ? `Akun dijadikan anggota, kode anggota ${r.kode}` : `Akun ditautkan ke anggota ${r.kode}`
        if (await modeUji()) return { ok: true, pesan: `MODE UJI, tidak tersimpan: ${pesan}` }
        revalidatePath("/dashboard/members", "layout")
        return { ok: true, pesan }
    } catch (e) {
        if (!(e instanceof GalatSesi)) console.error("jadikan anggota gagal:", e)
        return { ok: false, error: e instanceof Error ? e.message : "Gagal" }
    }
}

/**
 * Hapus akun aplikasi anggota beserta data aplikasinya. Akun yang sudah terhubung ke anggota hanya boleh dihapus
 * superadmin atau grup admin; data keuangan anggota tidak ikut terhapus.
 */
export async function hapusUserMobileAction(id: number): Promise<HasilPendaftaran> {
    try {
        const o = await operatorAktif(MENU_USER)
        const [u] = await query<{ anggota_id: string | null }>("SELECT anggota_id::text FROM app_user WHERE id = $1", [id])
        if (!u) return { ok: false, error: "Akun tidak ditemukan" }
        if (u.anggota_id && !bolehHapusAkunAnggota(o)) throw new GalatSesi("Akun yang sudah terhubung ke anggota hanya boleh dihapus oleh superadmin atau admin")
        const r = await tx((db) => hapusAkunAplikasi(db as never, id))
        if (!r.ok) return r
        if (await modeUji()) return { ok: true, pesan: `MODE UJI, tidak tersimpan: ${r.pesan}` }
        revalidatePath("/dashboard/members", "layout")
        return { ok: true, pesan: r.pesan }
    } catch (e) {
        if (!(e instanceof GalatSesi)) console.error("hapus user mobile gagal:", e)
        return { ok: false, error: e instanceof Error ? e.message : "Gagal" }
    }
}
