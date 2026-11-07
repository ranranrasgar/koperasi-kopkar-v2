"use server"

import { revalidatePath } from "next/cache"
import { absenQr, GalatAbsen, hapusAbsen, ubahAbsen } from "@kopkar/backend/src/absensi.ts"
import type { HasilSimpan } from "@/app/actions/master"
import { MENU, type AksiIzin } from "@/config/akses"
import { catatAksi } from "@/lib/aktivitas"
import type { Db } from "@kopkar/backend/src/db.ts"
import { modeUji, tx } from "@/lib/db"
import { GalatSesi, operatorAktif, wajibAksi } from "@/lib/operator"
import type { AnggotaRingkas } from "@/lib/queries/anggota"

const MENU_ABSEN = [MENU.absensi]
const tanda = async (pesan: string) => await modeUji() ? `MODE UJI, tidak tersimpan: ${pesan}` : pesan
const galat = (e: unknown) => {
    if (e instanceof GalatAbsen || e instanceof GalatSesi) return e.message
    console.error("absensi gagal:", e)
    return "Absensi gagal disimpan"
}

/** Catat absensi dari QR saya. Bentuk hasilnya sama dengan bacaQrAction supaya bisa dipakai PindaiQr. */
export async function absenQrAction(teks: string): Promise<{ ok: true; anggota: AnggotaRingkas; pesan: string; sudah: boolean } | { ok: false; error: string }> {
    try {
        const o = await operatorAktif(MENU_ABSEN)
        wajibAksi(o, MENU_ABSEN, "tambah")
        const r = await tx((db) => absenQr(db, teks))
        if (!r.ok) return r
        const anggota = { kode_agt: r.kode_agt, nik: r.nik, nama: r.nama, aktif: true }
        if (r.sudah) return { ok: true, anggota, pesan: r.pesan, sudah: true }
        await catatAksi(MENU.absensi, r.pesan, o)
        revalidatePath("/dashboard/attendance")
        return { ok: true, anggota, pesan: await tanda(r.pesan), sudah: false }
    } catch (e) {
        return { ok: false, error: galat(e) }
    }
}

async function koreksi(aksi: AksiIzin, fn: (db: Db) => Promise<string>): Promise<HasilSimpan> {
    try {
        const o = await operatorAktif(MENU_ABSEN)
        wajibAksi(o, MENU_ABSEN, aksi)
        const pesan = await tx(fn)
        await catatAksi(MENU.absensi, pesan, o)
        revalidatePath("/dashboard/attendance")
        return { ok: true, pesan: await tanda(pesan) }
    } catch (e) {
        return { ok: false, error: galat(e) }
    }
}

export async function ubahAbsenAction(_: HasilSimpan, f: FormData) {
    return koreksi("ubah", (db) => ubahAbsen(db, Number(f.get("id")), String(f.get("masuk") ?? ""), String(f.get("pulang") ?? "")))
}

export async function hapusAbsenAction(id: number) {
    return koreksi("hapus", (db) => hapusAbsen(db, id))
}
