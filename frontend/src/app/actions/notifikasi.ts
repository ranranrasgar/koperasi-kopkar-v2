"use server"

import { revalidatePath } from "next/cache"
import { MAKS_GAMBAR, simpanGambar } from "@kopkar/backend/src/anggota/gambar.ts"
import { kirimKeSemuaAnggota, kirimNotifikasi, MAKS_ISI, MAKS_JUDUL, ringkasanPush } from "@kopkar/backend/src/anggota/push.ts"
import { MENU } from "@/config/akses"
import { modeUji, pool, query } from "@/lib/db"
import { GalatSesi, operatorAktif } from "@/lib/operator"
import type { Hasil } from "./transaksi"

/**
 * Kirim pesan (pengumuman, promo, kabar pribadi) ke HP anggota: tercatat di Notifikasi anggota dan dikirim sebagai
 * Web Push, jadi muncul di layar HP walau aplikasi ditutup. Di mode uji tidak ada yang dikirim atau dicatat.
 */
export async function kirimNotifikasiAction(_: Hasil, f: FormData): Promise<Hasil> {
    try {
        await operatorAktif([MENU.kirimNotifikasi])
        const judul = String(f.get("judul") ?? "").trim()
        const isi = String(f.get("isi") ?? "").trim()
        const sasaran = f.get("sasaran") === "satu" ? "satu" : "semua"
        if (!judul) return { ok: false, error: "Judul wajib diisi" }
        if (judul.length > MAKS_JUDUL) return { ok: false, error: `Judul maksimal ${MAKS_JUDUL} karakter` }
        if (!isi) return { ok: false, error: "Isi pesan wajib diisi" }
        if (isi.length > MAKS_ISI) return { ok: false, error: `Isi pesan maksimal ${MAKS_ISI} karakter` }

        let anggotaId: number | null = null
        if (sasaran === "satu") {
            const [a] = await query<{ id: number }>("SELECT id FROM anggota WHERE kode_agt = $1 AND aktif", [String(f.get("kodeAgt") ?? "")])
            if (!a) return { ok: false, error: "Pilih anggota penerima" }
            anggotaId = a.id
        }

        const berkas = f.get("gambar")
        const adaGambar = berkas instanceof File && berkas.size > 0
        if (adaGambar && berkas.size > MAKS_GAMBAR) return { ok: false, error: "Gambar terlalu besar setelah dikecilkan (maksimal 400 KB)" }

        if (await modeUji()) {
            const r = await ringkasanPush(pool)
            return { ok: true, pesan: `MODE UJI, tidak terkirim: pesan akan diterima ${sasaran === "satu" ? "1 anggota" : `${r.anggotaAktif} anggota`}` }
        }
        const gambarId = adaGambar ? (await simpanGambar(pool, new Uint8Array(await berkas.arrayBuffer()))).id : undefined
        const h = anggotaId ? await kirimNotifikasi(pool, anggotaId, { judul, isi, gambarId }) : await kirimKeSemuaAnggota(pool, { judul, isi, gambarId })
        revalidatePath("/dashboard/notifikasi")
        return {
            ok: true, pesan: `Pesan tercatat untuk ${h.penerima} anggota`,
            rincian: { "Perangkat terdaftar": String(h.perangkat), "Push terkirim": String(h.dikirim), "Push gagal": String(h.gagal) },
        }
    } catch (e) {
        if (!(e instanceof GalatSesi)) console.error("kirim notifikasi gagal:", e)
        return { ok: false, error: e instanceof Error ? e.message : "Gagal" }
    }
}
