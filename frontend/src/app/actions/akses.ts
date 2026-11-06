"use server"

import { catatAksi } from "@/lib/aktivitas"
import { revalidatePath } from "next/cache"
import { query } from "@/lib/db"
import { GalatSesi, operatorAktif } from "@/lib/operator"
import { hashPassword, passwordAcak } from "@/lib/password"
import { AKSI_IZIN, GABUNGAN_IZIN, GRUP_SUPERADMIN, LABEL_AKSI, MENU, type AksiIzin } from "@/config/akses"

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
        if (r?.ok) await catatAksi("Kelola Hak Akses", r.pesan) // pesan tidak pernah memuat password sementara
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

const KOLOM_AKSI = ["boleh_tambah", "boleh_ubah", "boleh_hapus"]

/** Buka izin untuk menu gabungan. Izin yang tadinya tertutup dibuka tanpa aksi lain, supaya centang R tidak diam-diam memberi C, U, atau D. */
async function bukaIzin(g: { id: number; urut: number }, menu: string, nyala?: string) {
    const kolom = KOLOM_AKSI.join(", "), nilai = KOLOM_AKSI.map((k) => String(k === nyala)).join(", ")
    const ubah = KOLOM_AKSI.map((k) => (k === nyala ? `${k} = true` : `${k} = CASE WHEN opr_hak_akses.akses = 'T' THEN opr_hak_akses.${k} ELSE false END`)).join(", ")
    await query(
        `INSERT INTO opr_hak_akses (urut, id_opr, menu, akses, grup_id, ${kolom}) VALUES (nextval('seq_opr_hak_akses_urut'), $1, $2, 'T', $3, ${nilai})
         ON CONFLICT (grup_id, menu) DO UPDATE SET akses = 'T', ${ubah}`, [g.urut, menu, g.id])
}

export async function setAksesAction(grupId: number, menu: string, boleh: boolean): Promise<HasilKelola> {
    return jalankan(async () => {
        await superadmin()
        const g = await grup(grupId)
        if (g.nama_grup === GRUP_SUPERADMIN) throw new Salah("Grup superadmin selalu punya semua akses")
        if (menu === MENU.kelolaAkses || !menu.trim()) throw new Salah("Menu ini tidak bisa diberikan ke grup lain")
        const gab = GABUNGAN_IZIN[menu]
        if (gab && !boleh) await query("UPDATE opr_hak_akses SET akses = 'F' WHERE grup_id = $1 AND menu = ANY($2)", [g.id, gab.semua])
        else if (gab) for (const m of gab.lihat) await bukaIzin(g, m)
        else {
            // id_opr di opr_hak_akses = opr_grup.urut (data desktop); urut baris dari sequence.
            await query(
                `INSERT INTO opr_hak_akses (urut, id_opr, menu, akses, grup_id) VALUES (nextval('seq_opr_hak_akses_urut'), $1, $2, $3, $4)
                 ON CONFLICT (grup_id, menu) DO UPDATE SET akses = EXCLUDED.akses`, [g.urut, menu, boleh ? "T" : "F", g.id])
        }
        return { ok: true, pesan: `${menu}: ${boleh ? "diizinkan" : "ditutup"} untuk grup ${g.nama_grup}` }
    })
}

/** Tambah, ubah, atau hapus pada menu yang sudah boleh dilihat grup itu. Kolomnya dari daftar tetap, bukan dari isian. */
export async function setAksiAction(grupId: number, menu: string, aksi: AksiIzin, boleh: boolean): Promise<HasilKelola> {
    return jalankan(async () => {
        await superadmin()
        const g = await grup(grupId)
        if (g.nama_grup === GRUP_SUPERADMIN) throw new Salah("Grup superadmin selalu punya semua akses")
        const kolom = { tambah: "boleh_tambah", ubah: "boleh_ubah", hapus: "boleh_hapus" }[aksi]
        const gab = GABUNGAN_IZIN[menu]
        if (gab) {
            const tujuan = gab.aksi[aksi]
            if (!tujuan) throw new Salah("Aksi ini tidak berlaku untuk menu tersebut")
            if (!boleh) await query(`UPDATE opr_hak_akses SET ${kolom} = false WHERE grup_id = $1 AND menu = ANY($2)`, [g.id, tujuan])
            else {
                for (const m of tujuan) await bukaIzin(g, m, kolom)
            }
            return { ok: true, pesan: `${LABEL_AKSI[aksi]} ${boleh ? "diizinkan" : "ditutup"} untuk grup ${g.nama_grup}` }
        }
        if (!AKSI_IZIN[menu]?.includes(aksi)) throw new Salah("Aksi ini tidak berlaku untuk menu tersebut")
        const r = await query<{ id: number }>(`UPDATE opr_hak_akses SET ${kolom} = $1 WHERE grup_id = $2 AND menu = $3 AND akses = 'T' RETURNING id`, [boleh, g.id, menu])
        if (!r.length) throw new Salah("Centang menunya dulu")
        return { ok: true, pesan: `${menu}: ${LABEL_AKSI[aksi]} ${boleh ? "diizinkan" : "ditutup"} untuk grup ${g.nama_grup}` }
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

/** Ubah data operator. Nama login tetap: namanya tersimpan sebagai teks di kolom opr pada transaksi, jadi mengubahnya memutus jejak. */
export async function ubahOperatorAction(_: HasilKelola | null, f: FormData): Promise<HasilKelola> {
    return jalankan(async () => {
        await superadmin()
        const namaLengkap = String(f.get("namaLengkap") ?? "").trim(), alamat = String(f.get("alamat") ?? "").trim(), telp = String(f.get("telp") ?? "").trim()
        if (!namaLengkap || namaLengkap.length > 50) throw new Salah("Nama lengkap wajib diisi, maksimal 50 karakter")
        if (alamat.length > 100) throw new Salah("Alamat maksimal 100 karakter")
        if (telp.length > 17) throw new Salah("Telepon maksimal 17 karakter")
        const r = await query<{ nama: string }>("UPDATE opr SET nama_lengkap = $1, alamat = $2, telp = $3 WHERE id = $4 RETURNING nama", [namaLengkap, alamat, telp, Number(f.get("id"))])
        if (!r.length) throw new Salah("Operator tidak ada")
        return { ok: true, pesan: `Data operator ${r[0].nama} diubah` }
    })
}

/** Kolom yang menyimpan nama operator sebagai teks, di tabel mana pun. Jejak ini tidak punya foreign key. */
const KOLOM_NAMA_OPERATOR = ["opr", "oleh", "dibuat_oleh", "diposting_oleh", "diubah_oleh", "dibatalkan_oleh"]

/** Tabel pertama yang masih mencatat operator ini, atau null bila belum pernah dipakai. */
async function jejakOperator(id: number, nama: string) {
    const kolom = await query<{ table_name: string; column_name: string }>(
        `SELECT c.table_name, c.column_name FROM information_schema.columns c JOIN information_schema.tables t USING (table_schema, table_name)
          WHERE c.table_schema = 'public' AND t.table_type = 'BASE TABLE' AND c.table_name <> 'opr_tampilan'
            AND (c.column_name = 'operator_id' OR c.column_name = ANY($1))`, [KOLOM_NAMA_OPERATOR])
    for (const k of kolom) {
        const [ada] = k.column_name === "operator_id"
            ? await query(`SELECT 1 FROM "${k.table_name}" WHERE operator_id = $1 LIMIT 1`, [id])
            : await query(`SELECT 1 FROM "${k.table_name}" WHERE lower("${k.column_name}") IN (lower($1), lower(left($1, 15))) LIMIT 1`, [nama])
        if (ada) return k.table_name
    }
    return null
}

/** Hapus permanen hanya untuk akun yang belum pernah dipakai, mis. salah buat. Akun yang punya riwayat dinonaktifkan supaya jejak pencatatnya tetap ada. */
export async function hapusOperatorAction(id: number): Promise<HasilKelola> {
    return jalankan(async () => {
        const saya = await superadmin()
        if (id === saya.id) throw new Salah("Tidak bisa menghapus diri sendiri")
        const [o] = await query<{ nama: string; nama_grup: string | null; aktif: boolean }>(
            `SELECT o.nama, g.nama_grup, upper(trim(o.status_aktif)) <> 'NON AKTIF' AS aktif FROM opr o LEFT JOIN opr_grup g ON g.id = o.grup_id WHERE o.id = $1`, [id])
        if (!o) throw new Salah("Operator tidak ada")
        if (o.nama_grup === GRUP_SUPERADMIN && o.aktif && (await superadminLain(id)) === 0) throw new Salah("Minimal satu superadmin harus tetap aktif")
        const jejak = await jejakOperator(id, o.nama)
        if (jejak) throw new Salah(`Operator ${o.nama} sudah punya riwayat di ${jejak}, jadi tidak bisa dihapus. Nonaktifkan saja.`)
        await query("DELETE FROM opr_tampilan WHERE operator_id = $1", [id])
        await query("DELETE FROM opr WHERE id = $1", [id])
        return { ok: true, pesan: `Operator ${o.nama} dihapus` }
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
