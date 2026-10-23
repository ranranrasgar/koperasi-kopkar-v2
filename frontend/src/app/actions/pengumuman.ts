"use server"

import { revalidatePath } from "next/cache"
import { bersihkanYatim, gambarIdUntuk, lepasGambar, simpanGambar, tautkanGambar } from "@kopkar/backend/src/anggota/gambar.ts"
import { kirimKeOperatorGrup, kirimKeSemuaAnggota } from "@kopkar/backend/src/anggota/push.ts"
import { hapusSasaran, periksaSasaran, SasaranSalah, simpanSasaran, type Sasaran } from "@kopkar/backend/src/anggota/sasaran.ts"
import { MENU } from "@/config/akses"
import { modeUji, pool, tx } from "@/lib/db"
import { GalatSesi, operatorAktif } from "@/lib/operator"
import type { Hasil } from "./transaksi"

// Himbauan dan Promo yang aktif tampil sebagai slide di Beranda anggota dan/atau di lonceng admin (internal kantor),
// menurut sasarannya (pengumuman_sasaran). Tabel lama bersama aplikasi Android; gambar lewat pengumuman_gambar.
// Kolom teks di database maksimal 255 karakter.
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
/** Sasaran dari form: anggota (semua / status tertentu) dan/atau internal (semua grup / grup tertentu). */
function sasaranDari(f: FormData): Sasaran {
    const pilih = <T,>(mode: unknown, nilai: T[]) => (mode === "pilih" ? nilai : null)
    try {
        return periksaSasaran({
            anggota: f.get("untukAnggota") === "on",
            statusStaff: pilih(f.get("staffMode"), f.getAll("statusStaff").map(String)),
            internal: f.get("untukInternal") === "on",
            grupIds: pilih(f.get("grupMode"), f.getAll("grupId").map(Number)),
        })
    } catch (e) {
        if (e instanceof SasaranSalah) throw new Salah(e.message)
        throw e
    }
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
        const sasaran = sasaranDari(f)
        const id = f.get("id") ? idValid(f.get("id")) : null
        const berkas = f.get("gambar")
        const adaGambarBaru = berkas instanceof File && berkas.size > 0
        const buangGambar = f.get("hapusGambar") === "on"
        const gambarId = await tx(async (db) => {
            let refId = id
            if (id) {
                const r = await db.query(`UPDATE ${jenis} SET ${t.judul} = $1, ${t.isi} = $2, status = $3 WHERE id = $4`, [judul, isi, aktif, id])
                if (r.rowCount === 0) throw new Salah(`${t.nama} tidak ada`)
            } else {
                const r = await db.query<{ id: string }>(`INSERT INTO ${jenis} (${t.judul}, ${t.isi}, status) VALUES ($1, $2, $3) RETURNING id`, [judul, isi, aktif])
                refId = Number(r.rows[0].id)
            }
            await simpanSasaran(db, jenis, refId!, sasaran)
            if (adaGambarBaru) {
                const g = await simpanGambar(db, new Uint8Array(await berkas.arrayBuffer()))
                await tautkanGambar(db, jenis, refId!, g.id)
                await bersihkanYatim(db) // gambar lama yang diganti
            } else if (buangGambar && id) {
                await lepasGambar(db, jenis, id)
            }
            return buangGambar && !adaGambarBaru ? null : await gambarIdUntuk(db, jenis, refId!).catch(() => null)
        })
        const kirim = f.get("kirim") === "on" && aktif
        return {
            pesan: `${t.nama} ${id ? "disimpan" : "ditambahkan"}`,
            kabar: kirim ? async () => {
                const bagian: string[] = []
                if (sasaran.anggota) {
                    const h = await kirimKeSemuaAnggota(pool, { judul: judul.slice(0, 50), isi, url: "/beranda", gambarId: gambarId ?? undefined }, { statusStaff: sasaran.statusStaff })
                    bagian.push(`${h.penerima} anggota (push ke ${h.dikirim} perangkat)`)
                }
                if (sasaran.internal) {
                    const h = await kirimKeOperatorGrup(pool, sasaran.grupIds, { judul: judul.slice(0, 60), isi: isi.slice(0, 140), url: "/dashboard/pengumuman" })
                    bagian.push(`internal kantor (push ke ${h.dikirim} browser)`)
                }
                return `; notifikasi dikirim ke ${bagian.join(" dan ")}`
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
        const r = await tx(async (db) => {
            const hapus = await db.query(`DELETE FROM ${jenis} WHERE id = $1`, [idValid(id)])
            if (hapus.rowCount) { await lepasGambar(db, jenis, id); await hapusSasaran(db, jenis, id) }
            return hapus
        })
        if (r.rowCount === 0) throw new Salah(`${TABEL[jenis].nama} tidak ada`)
        return { pesan: `${TABEL[jenis].nama} dihapus` }
    })
}
