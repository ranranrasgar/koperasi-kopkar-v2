"use server"

import { revalidatePath } from "next/cache"
import { beritahuAdmin, MENU_PENGAJUAN } from "@kopkar/backend/src/anggota/notif-admin.ts"
import { ajukanPinjaman } from "@kopkar/backend/src/anggota/pengajuan.ts"
import { anggotaSesi } from "@/lib/anggota"
import { modeUji, pool, tx } from "@/lib/db"
import { hariIni } from "@/lib/format"

export type HasilAjukan = { ok: true; pesan: string; uji: boolean } | { ok: false; error: string } | null

// Pembatasan sederhana per akun (memori proses): mencegah kiriman beruntun dari tombol yang ditekan berkali-kali.
const terakhir = new Map<number, number>()
const JEDA_MS = 5000

export async function ajukanAction(_: HasilAjukan, f: FormData): Promise<HasilAjukan> {
    const a = await anggotaSesi()
    if (!a) return { ok: false, error: "Sesi berakhir. Silakan masuk kembali." }
    if (a.anggotaId === null) return { ok: false, error: "Akun Anda belum terdaftar sebagai anggota." }
    if (Date.now() - (terakhir.get(a.userId) ?? 0) < JEDA_MS) return { ok: false, error: "Tunggu sebentar sebelum mengirim lagi." }
    terakhir.set(a.userId, Date.now())

    const angka = (k: string) => Number(String(f.get(k) ?? "").replace(/\D/g, "") || "0")
    try {
        const id = a.anggotaId
        // Hanya isian anggota yang dibaca; persen bunga dan biaya diambil dari jenis kredit di server.
        const hasil = await tx((db) => ajukanPinjaman(db, id, {
            kodeKredit: String(f.get("jenis") ?? ""),
            lama: angka("lama"),
            besar: angka("besar"),
            tglRealisasi: String(f.get("tanggal") ?? ""),
            keterangan: String(f.get("keterangan") ?? ""),
        }, hariIni()))
        if (!hasil.ok) return hasil
        revalidatePath("/ajukan")
        const uji = await modeUji()
        if (!uji) {
            // Kabari pengurus: lonceng navbar admin + Web Push ke browser operator berizin. Gagal kirim tidak membatalkan pengajuan.
            try {
                const { rows: [j] } = await pool.query(
                    "SELECT jk.nama_kredit FROM pengajuan_pinjaman pp LEFT JOIN jenis_kredit jk ON jk.id = pp.jenis_kredit_id WHERE pp.id = $1", [hasil.id])
                await beritahuAdmin(pool, {
                    menu: MENU_PENGAJUAN, judul: "Pengajuan kredit baru", url: "/dashboard/loans/apply",
                    isi: `${a.nama} mengajukan ${j?.nama_kredit ?? "pinjaman"} Rp ${angka("besar").toLocaleString("id-ID")} untuk ${angka("lama")} bulan.`,
                })
            } catch (e) {
                console.error("kabari admin pengajuan gagal:", e)
            }
        }
        return { ok: true, uji, pesan: uji ? "Mode uji: pengajuan diperiksa tetapi tidak disimpan." : "Pengajuan terkirim. Pengurus koperasi akan memprosesnya." }
    } catch (e) {
        console.error("pengajuan anggota gagal:", e)
        return { ok: false, error: "Pengajuan gagal dikirim. Coba lagi beberapa saat lagi." }
    }
}
