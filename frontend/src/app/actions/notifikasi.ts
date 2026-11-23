"use server"

import { revalidatePath } from "next/cache"
import { MAKS_GAMBAR, simpanGambar } from "@kopkar/backend/src/anggota/gambar.ts"
import { kirimKeSemuaAnggota, kirimNotifikasi, MAKS_ISI, MAKS_JUDUL, ringkasanPush } from "@kopkar/backend/src/anggota/push.ts"
import { MENU } from "@/config/akses"
import { modeUji, pool, query } from "@/lib/db"
import { GalatSesi, operatorAktif } from "@/lib/operator"
import type { Hasil } from "./transaksi"
import type { HasilSimpan } from "./master"
import { catatAksi } from "@/lib/aktivitas"

export interface TemplatNotifikasi { id: number; nama: string; judul: string; isi: string }

/** Simpan templat pesan (baru bila id kosong). {isian} boleh dipakai di judul dan isi; batasnya dihitung sebelum isian diganti. */
export async function simpanTemplatAction(_: HasilSimpan, f: FormData): Promise<HasilSimpan> {
    try {
        const o = await operatorAktif([MENU.kirimNotifikasi])
        const id = Number(f.get("id")) || null
        const nama = String(f.get("nama") ?? "").trim(), judul = String(f.get("judul") ?? "").trim(), isi = String(f.get("isi") ?? "").trim()
        if (!nama || nama.length > 60) return { ok: false, error: "Nama templat wajib, maksimal 60 karakter" }
        if (!judul || judul.length > MAKS_JUDUL) return { ok: false, error: `Judul wajib, maksimal ${MAKS_JUDUL} karakter` }
        if (!isi || isi.length > MAKS_ISI) return { ok: false, error: `Isi wajib, maksimal ${MAKS_ISI} karakter` }
        if (/[{}]/.test((judul + " " + isi).replace(/\{[^{}]*[^{}\s][^{}]*\}/g, ""))) return { ok: false, error: "Tanda kurung kurawal { } tidak berpasangan atau kosong" }
        if (id) await query("UPDATE notifikasi_templat SET nama = $1, judul = $2, isi = $3, diubah_oleh = $4, diubah_pada = now() WHERE id = $5", [nama, judul, isi, o.nama, id])
        else await query(`INSERT INTO notifikasi_templat (nama, judul, isi, urutan, diubah_oleh)
            SELECT $1, $2, $3, COALESCE(MAX(urutan), 0) + 1, $4 FROM notifikasi_templat`, [nama, judul, isi, o.nama])
        await catatAksi(MENU.kirimNotifikasi, `Templat notifikasi "${nama}" ${id ? "diubah" : "ditambahkan"}`, o)
        revalidatePath("/dashboard/notifikasi")
        return { ok: true, pesan: `Templat "${nama}" disimpan` }
    } catch (e) {
        if (!(e instanceof GalatSesi)) console.error("simpan templat gagal:", e)
        return { ok: false, error: e instanceof Error ? e.message : "Gagal" }
    }
}

export async function hapusTemplatAction(id: number): Promise<HasilSimpan> {
    try {
        const o = await operatorAktif([MENU.kirimNotifikasi])
        const [t] = await query<{ nama: string }>("DELETE FROM notifikasi_templat WHERE id = $1 RETURNING nama", [id])
        if (!t) return { ok: false, error: "Templat tidak ditemukan" }
        await catatAksi(MENU.kirimNotifikasi, `Templat notifikasi "${t.nama}" dihapus`, o)
        revalidatePath("/dashboard/notifikasi")
        return { ok: true, pesan: `Templat "${t.nama}" dihapus` }
    } catch (e) {
        if (!(e instanceof GalatSesi)) console.error("hapus templat gagal:", e)
        return { ok: false, error: e instanceof Error ? e.message : "Gagal" }
    }
}

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
        const sisa = /\{[^{}]+\}/.exec(judul + " " + isi)
        if (sisa) return { ok: false, error: `Isian templat ${sisa[0]} belum diganti` }

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
        const h = anggotaId ? await kirimNotifikasi(pool, anggotaId, { judul, isi, gambarId, jenisEmail: "pengumuman" }) : await kirimKeSemuaAnggota(pool, { judul, isi, gambarId, jenisEmail: "pengumuman" })
        revalidatePath("/dashboard/notifikasi")
        return {
            ok: true, pesan: `Pesan tercatat untuk ${h.penerima} anggota`,
            rincian: { "Perangkat terdaftar": String(h.perangkat), "Push terkirim": String(h.dikirim), "Push gagal": String(h.gagal), "Email diantrekan": String(h.email) },
        }
    } catch (e) {
        if (!(e instanceof GalatSesi)) console.error("kirim notifikasi gagal:", e)
        return { ok: false, error: e instanceof Error ? e.message : "Gagal" }
    }
}
