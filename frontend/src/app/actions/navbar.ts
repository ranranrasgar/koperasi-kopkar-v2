"use server"

import { percakapanAdmin } from "@kopkar/backend/src/anggota/pesan.ts"
import { MENU_REQUEST_USER, notifAdminUntukOperator, tandaiNotifAdminDibaca } from "@kopkar/backend/src/anggota/notif-admin.ts"
import { pengumumanUntukOperator } from "@kopkar/backend/src/anggota/sasaran.ts"
import { MENU } from "@/config/akses"
import { pool } from "@/lib/db"
import { operatorAktif } from "@/lib/operator"

export interface ItemNavbar { kunci: string; waktu: string; judul: string; isi: string; url: string; baru: boolean; idSistem?: number }
export interface GrupNavbar { kunci: string; label: string; ikon: string; baru: number; item: ItemNavbar[] }
export interface IsiNavbar { pesan: ItemNavbar[]; pesanBaru: number; notif: GrupNavbar[] }

const MAKS_PER_GRUP = 4

const JENIS: { kunci: string; label: string; ikon: string }[] = [
    { kunci: "pendaftaran", label: "Pendaftaran baru", ikon: "person_add" },
    { kunci: "pengajuan", label: "Pengajuan kredit", ikon: "request_quote" },
    { kunci: "himbauan", label: "Himbauan", ikon: "campaign" },
    { kunci: "promo", label: "Promo", ikon: "sell" },
    { kunci: "lainnya", label: "Lainnya", ikon: "notifications" },
]

/**
 * Isi dropdown navbar, dikelompokkan per jenis: pendaftaran baru, pengajuan kredit, himbauan, promo, lainnya (notifikasi
 * sistem) dan, untuk operator berizin, percakapan pesan anggota. Hanya yang terbaru per jenis; selengkapnya di halaman Notifikasi.
 */
export async function isiNavbarAction(): Promise<IsiNavbar | null> {
    try {
        const o = await operatorAktif()
        const [sistem, pengumuman, pesan] = await Promise.all([
            notifAdminUntukOperator(pool, o.id), pengumumanUntukOperator(pool, o.id),
            o.izin.includes(MENU.pesanAnggota) ? percakapanAdmin(pool, "buka").catch(() => []) : Promise.resolve([]),
        ])
        const per = new Map<string, ItemNavbar[]>(JENIS.map((j) => [j.kunci, []]))
        for (const n of sistem) {
            const jenis = n.menu === MENU_REQUEST_USER ? "pendaftaran" : n.menu === MENU.pengajuan ? "pengajuan" : "lainnya"
            per.get(jenis)!.push({ kunci: `s-${n.id}`, waktu: n.waktu, judul: n.judul, isi: n.isi, url: n.url, baru: n.baru, idSistem: n.id })
        }
        for (const d of pengumuman) {
            per.get(d.jenis === "promo" ? "promo" : "himbauan")!.push({ kunci: `p-${d.jenis}-${d.id}`, waktu: d.waktu, judul: d.judul, isi: d.isi, url: "/dashboard/pengumuman", baru: d.baru })
        }
        const notif = JENIS.map((j) => {
            const semua = (per.get(j.kunci) ?? []).sort((a, b) => b.waktu.localeCompare(a.waktu))
            return { ...j, baru: semua.filter((x) => x.baru).length, item: semua.slice(0, MAKS_PER_GRUP) }
        }).filter((g) => g.item.length > 0)
        const pesanItem = pesan.slice(0, 6).map((p) => ({
            kunci: `m-${p.id}`, waktu: p.pesan_terakhir_pada, judul: `${p.nama} · ${p.subjek}`, isi: p.cuplikan, url: `/dashboard/pesan/${p.id}`, baru: p.belum_dibaca,
        }))
        return { pesan: pesanItem, pesanBaru: pesan.filter((p) => p.belum_dibaca).length, notif }
    } catch {
        return null
    }
}

/** Tandai notifikasi sistem yang diketuk sebagai terbaca. */
export async function tandaiDibacaAction(ids: number[]) {
    try {
        const o = await operatorAktif()
        await tandaiNotifAdminDibaca(pool, o.id, ids.filter((x) => Number.isInteger(x)).slice(0, 50))
    } catch {
        /* tidak penting: angka merah menyusul pada penyegaran berikutnya */
    }
}
