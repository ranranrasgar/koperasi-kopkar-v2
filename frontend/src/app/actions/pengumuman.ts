"use server"

import { revalidatePath } from "next/cache"
import { kirimKeSemuaAnggota } from "@kopkar/backend/src/anggota/push.ts"
import { MENU } from "@/config/akses"
import { modeUji, pool, tx } from "@/lib/db"
import { GalatSesi, operatorAktif } from "@/lib/operator"
import type { Hasil } from "./transaksi"

// Himbauan (satu yang aktif tampil di Beranda anggota) dan Promo (semua yang aktif). Tabel lama bersama aplikasi
// Android; gambar (kolom image) belum dikelola dari web. Kolom teks di database maksimal 255 karakter.
const MAKS = 255
const TABEL = {
    himbauan: { nama: "Himbauan", judul: "judul_himbauan", isi: "isi_himbauan" },
    promo: { nama: "Promo", judul: "judul", isi: "isi" },
} as const
export type JenisPengumuman = keyof typeof TABEL

class Salah extends Error {}
const jenisDari = (v: unknown): JenisPengumuman => {
    if (v === "himbauan" || v === "promo") return v
    throw new Salah("Jenis tidak dikenal")
}
const idValid = (v: unknown) => {
    const n = Number(v)
    if (!Number.isInteger(n) || n <= 0) throw new Salah("Data tidak valid")
    return n
}

async function jalankan(fn: () => Promise<{ pesan: string; kabar?: () => Promise<string> }>): Promise<Hasil> {
    try {
        await operatorAktif([MENU.kelolaPengumuman])
        const r = await fn()
        if (await modeUji()) return { ok: true, pesan: `MODE UJI, tidak tersimpan: ${r.pesan}` }
        revalidatePath("/dashboard/himbauan")
        const tambahan = r.kabar ? await r.kabar() : ""
        return { ok: true, pesan: r.pesan + tambahan }
    } catch (e) {
        if (!(e instanceof Salah) && !(e instanceof GalatSesi)) console.error("kelola pengumuman gagal:", e)
        return { ok: false, error: e instanceof Error ? e.message : "Gagal menyimpan" }
    }
}

/** Tambah (tanpa id) atau ubah (dengan id). Opsi "kirim notifikasi" mengirim ke semua anggota setelah tersimpan. */
export async function simpanPengumumanAction(_: Hasil, f: FormData): Promise<Hasil> {
    return jalankan(async () => {
        const jenis = jenisDari(f.get("jenis"))
        const t = TABEL[jenis]
        const judul = String(f.get("judul") ?? "").trim()
        const isi = String(f.get("isi") ?? "").trim()
        if (!judul) throw new Salah("Judul wajib diisi")
        if (judul.length > MAKS) throw new Salah(`Judul maksimal ${MAKS} karakter`)
        if (!isi) throw new Salah("Isi wajib diisi")
        if (isi.length > MAKS) throw new Salah(`Isi maksimal ${MAKS} karakter`)
        const aktif = f.get("aktif") === "on"
        const id = f.get("id") ? idValid(f.get("id")) : null
        await tx(async (db) => {
            if (id) {
                const r = await db.query(`UPDATE ${jenis} SET ${t.judul} = $1, ${t.isi} = $2, status = $3 WHERE id = $4`, [judul, isi, aktif, id])
                if (r.rowCount === 0) throw new Salah(`${t.nama} tidak ada`)
            } else {
                await db.query(`INSERT INTO ${jenis} (${t.judul}, ${t.isi}, status) VALUES ($1, $2, $3)`, [judul, isi, aktif])
            }
        })
        const kirim = f.get("kirim") === "on" && aktif
        return {
            pesan: `${t.nama} ${id ? "disimpan" : "ditambahkan"}`,
            kabar: kirim ? async () => {
                const h = await kirimKeSemuaAnggota(pool, { judul: judul.slice(0, 50), isi, url: "/beranda" })
                return `; notifikasi tercatat untuk ${h.penerima} anggota (push terkirim ${h.dikirim} perangkat)`
            } : undefined,
        }
    })
}

export async function aturStatusPengumumanAction(jenisMentah: string, id: number, aktif: boolean): Promise<Hasil> {
    return jalankan(async () => {
        const jenis = jenisDari(jenisMentah)
        const r = await tx((db) => db.query(`UPDATE ${jenis} SET status = $1 WHERE id = $2`, [aktif, idValid(id)]))
        if (r.rowCount === 0) throw new Salah(`${TABEL[jenis].nama} tidak ada`)
        return { pesan: `${TABEL[jenis].nama} ${aktif ? "diaktifkan" : "dinonaktifkan"}` }
    })
}

export async function hapusPengumumanAction(jenisMentah: string, id: number): Promise<Hasil> {
    return jalankan(async () => {
        const jenis = jenisDari(jenisMentah)
        const r = await tx((db) => db.query(`DELETE FROM ${jenis} WHERE id = $1`, [idValid(id)]))
        if (r.rowCount === 0) throw new Salah(`${TABEL[jenis].nama} tidak ada`)
        return { pesan: `${TABEL[jenis].nama} dihapus` }
    })
}
