"use server"

import { revalidatePath } from "next/cache"
import { query } from "@/lib/db"
import { GalatSesi, operatorAktif } from "@/lib/operator"
import { hashPassword, passwordAcak } from "@/lib/password"
import { GRUP_SUPERADMIN, MENU } from "@/config/akses"

export type HasilKelola = { ok: true; pesan: string; passwordSementara?: string } | { ok: false; error: string }

/** Semua aksi di sini hanya untuk grup superadmin. */
async function superadmin() {
    const o = await operatorAktif([MENU.kelolaAkses])
    if (!o.superadmin) throw new GalatSesi("Hanya superadmin yang boleh mengelola akses")
    return o
}

async function jalankan(fn: () => Promise<HasilKelola>): Promise<HasilKelola> {
    try {
        const r = await fn()
        revalidatePath("/dashboard", "layout")
        return r
    } catch (e) {
        if (!(e instanceof GalatSesi) && !(e instanceof Salah)) console.error("kelola akses gagal:", e)
        return { ok: false, error: e instanceof Error ? e.message : "Gagal" }
    }
}
class Salah extends Error {}

const grup = async (id: number) => {
    const [g] = await query<{ id: number; urut: number; nama_grup: string }>("SELECT id, urut, nama_grup FROM opr_grup WHERE id = $1", [id])
    if (!g) throw new Salah("Grup tidak ada")
    return g
}

/** Jumlah superadmin aktif selain operator `kecuali`; minimal satu harus tetap ada. */
const superadminLain = async (kecuali: number) =>
    (await query<{ n: number }>(`SELECT COUNT(*) AS n FROM opr o JOIN opr_grup g ON g.id = o.grup_id
        WHERE g.nama_grup = $1 AND upper(trim(o.status_aktif)) <> 'NON AKTIF' AND o.id <> $2`, [GRUP_SUPERADMIN, kecuali]))[0].n

// ---------- matriks hak akses ----------

export async function setAksesAction(grupId: number, menu: string, boleh: boolean): Promise<HasilKelola> {
    return jalankan(async () => {
        await superadmin()
        const g = await grup(grupId)
        if (g.nama_grup === GRUP_SUPERADMIN) throw new Salah("Grup superadmin selalu punya semua akses")
        if (menu === MENU.kelolaAkses || !menu.trim()) throw new Salah("Menu ini tidak bisa diberikan ke grup lain")
        // id_opr di opr_hak_akses = opr_grup.urut (data desktop); urut baris dari sequence.
        await query(
            `INSERT INTO opr_hak_akses (urut, id_opr, menu, akses, grup_id) VALUES (nextval('seq_opr_hak_akses_urut'), $1, $2, $3, $4)
             ON CONFLICT (grup_id, menu) DO UPDATE SET akses = EXCLUDED.akses`, [g.urut, menu, boleh ? "T" : "F", g.id])
        return { ok: true, pesan: `${menu}: ${boleh ? "diizinkan" : "ditutup"} untuk grup ${g.nama_grup}` }
    })
}

// ---------- operator ----------

export async function tambahOperatorAction(_: HasilKelola | null, f: FormData): Promise<HasilKelola> {
    return jalankan(async () => {
        await superadmin()
        const nama = String(f.get("nama") ?? "").trim().toLowerCase()
        const namaLengkap = String(f.get("namaLengkap") ?? "").trim()
        if (!/^[a-z0-9._-]{3,30}$/.test(nama)) throw new Salah("Nama login: 3-30 huruf kecil, angka, titik, garis bawah, atau strip")
        if (!namaLengkap) throw new Salah("Nama lengkap wajib diisi")
        const g = await grup(Number(f.get("grupId")))
        const [ada] = await query("SELECT 1 FROM opr WHERE lower(nama) = $1", [nama])
        if (ada) throw new Salah(`Operator ${nama} sudah ada`)
        const password = passwordAcak()
        await query(`INSERT INTO opr (nama, nama_lengkap, status, status_aktif, grup_id, password_hash, wajib_ganti_password)
            VALUES ($1, $2, 'operator', '', $3, $4, true)`, [nama, namaLengkap, g.id, await hashPassword(password)])
        return { ok: true, pesan: `Operator ${nama} dibuat di grup ${g.nama_grup}`, passwordSementara: password }
    })
}

export async function ubahGrupOperatorAction(id: number, grupId: number): Promise<HasilKelola> {
    return jalankan(async () => {
        const saya = await superadmin()
        const g = await grup(grupId)
        if (id === saya.id && g.nama_grup !== GRUP_SUPERADMIN) throw new Salah("Tidak bisa mengeluarkan diri sendiri dari grup superadmin")
        const [lama] = await query<{ nama_grup: string | null }>(
            "SELECT g.nama_grup FROM opr o LEFT JOIN opr_grup g ON g.id = o.grup_id WHERE o.id = $1", [id])
        if (!lama) throw new Salah("Operator tidak ada")
        if (lama.nama_grup === GRUP_SUPERADMIN && g.nama_grup !== GRUP_SUPERADMIN && (await superadminLain(id)) === 0)
            throw new Salah("Minimal satu superadmin harus tetap aktif")
        await query("UPDATE opr SET grup_id = $1 WHERE id = $2", [g.id, id])
        return { ok: true, pesan: `Grup diubah ke ${g.nama_grup}` }
    })
}

export async function ubahAktifOperatorAction(id: number, aktif: boolean): Promise<HasilKelola> {
    return jalankan(async () => {
        const saya = await superadmin()
        if (id === saya.id && !aktif) throw new Salah("Tidak bisa menonaktifkan diri sendiri")
        const [o] = await query<{ nama_grup: string | null }>(
            "SELECT g.nama_grup FROM opr o LEFT JOIN opr_grup g ON g.id = o.grup_id WHERE o.id = $1", [id])
        if (!o) throw new Salah("Operator tidak ada")
        if (!aktif && o.nama_grup === GRUP_SUPERADMIN && (await superadminLain(id)) === 0)
            throw new Salah("Minimal satu superadmin harus tetap aktif")
        await query("UPDATE opr SET status_aktif = $1 WHERE id = $2", [aktif ? "" : "NON AKTIF", id])
        return { ok: true, pesan: aktif ? "Operator diaktifkan" : "Operator dinonaktifkan" }
    })
}

/** Password sementara baru (ditampilkan sekali ke superadmin); operator wajib menggantinya saat login. */
export async function resetPasswordAction(id: number): Promise<HasilKelola> {
    return jalankan(async () => {
        const saya = await superadmin()
        if (id === saya.id) throw new Salah("Untuk akun sendiri pakai menu Ganti Password")
        const password = passwordAcak()
        const [o] = await query<{ nama: string }>(
            "UPDATE opr SET password_hash = $1, wajib_ganti_password = true WHERE id = $2 RETURNING nama", [await hashPassword(password), id])
        if (!o) throw new Salah("Operator tidak ada")
        return { ok: true, pesan: `Password sementara ${o.nama} dibuat`, passwordSementara: password }
    })
}
