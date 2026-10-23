"use client"

import { useEffect, useState, useTransition } from "react"
import { BellOff, BellRing } from "lucide-react"
import { kirimUjiPushAction } from "@/app/actions/push"
import { daftarkanPerangkat, mendukungPush } from "@/lib/push-klien"

type Keadaan = "memeriksa" | "aktif" | "belumDitanya" | "ditolak" | "pasangDulu" | "tidakTampil"

/**
 * Cadangan untuk NotifikasiOtomatis, tampil di halaman Notifikasi hanya bila perlu: izin masih belum diberikan
 * (satu tombol "Izinkan"), izin diblokir (petunjuk), atau iPhone yang belum memasang aplikasi ke layar utama.
 * Selain itu tidak tampil: notifikasi diaktifkan otomatis, tanpa tombol aktif/nonaktif.
 * percobaan: tombol "Kirim percobaan" khusus pengembangan; halaman memberi false di production.
 */
export function AktifkanNotifikasi({ kunciPublik, percobaan = false }: { kunciPublik: string | null; percobaan?: boolean }) {
    const [keadaan, setKeadaan] = useState<Keadaan>("memeriksa")
    const [pesan, setPesan] = useState<string | null>(null)
    const [sibuk, mulai] = useTransition()

    useEffect(() => {
        if (!kunciPublik) return setKeadaan("tidakTampil")
        if (!mendukungPush()) {
            const ios = /iphone|ipad|ipod/i.test(navigator.userAgent)
            const terpasang = window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true
            return setKeadaan(ios && !terpasang ? "pasangDulu" : "tidakTampil")
        }
        setKeadaan(Notification.permission === "granted" ? "aktif" : Notification.permission === "denied" ? "ditolak" : "belumDitanya")
    }, [kunciPublik])

    const izinkan = () => mulai(async () => {
        setPesan(null)
        try {
            const izin = await Notification.requestPermission()
            if (izin === "granted") {
                await daftarkanPerangkat(kunciPublik!, true)
                setKeadaan("aktif")
            } else if (izin === "denied") setKeadaan("ditolak")
        } catch {
            setPesan("Notifikasi tidak bisa diaktifkan di perangkat ini.")
        }
    })
    const coba = () => mulai(async () => {
        const h = await kirimUjiPushAction()
        setPesan(h.ok ? "Notifikasi percobaan dikirim." : h.error)
    })

    if (keadaan === "memeriksa" || keadaan === "tidakTampil") return null
    if (keadaan === "aktif") {
        if (!percobaan) return null
        return (
            <div className="mb-4 flex items-center gap-3 text-sm text-redup">
                <BellRing size={16} /> Notifikasi aktif (mode pengembangan).
                <button type="button" onClick={coba} disabled={sibuk} className="h-9 rounded-lg border border-garis px-3 font-semibold text-teks disabled:opacity-60">Kirim percobaan</button>
                {pesan && <span role="status">{pesan}</span>}
            </div>
        )
    }

    const Ikon = keadaan === "ditolak" ? BellOff : BellRing
    return (
        <section className="mb-5 flex gap-3 rounded-2xl bg-utama-lembut p-4">
            <span className="grid size-10 shrink-0 place-items-center rounded-full bg-permukaan text-utama"><Ikon size={20} strokeWidth={1.75} /></span>
            <div className="min-w-0 flex-1">
                {keadaan === "belumDitanya" && (
                    <>
                        <p className="font-semibold">Terima kabar dari koperasi</p>
                        <p className="mt-0.5 text-sm leading-relaxed text-redup">Izinkan notifikasi untuk keputusan pengajuan, balasan pesan, dan pengumuman, bahkan saat aplikasi ditutup.</p>
                        <button type="button" onClick={izinkan} disabled={sibuk} className="mt-3 h-10 rounded-xl bg-utama px-4 text-sm font-semibold text-pada-utama hover:bg-utama-tekan disabled:opacity-60">Izinkan notifikasi</button>
                    </>
                )}
                {keadaan === "ditolak" && (
                    <>
                        <p className="font-semibold">Notifikasi diblokir</p>
                        <p className="mt-0.5 text-sm leading-relaxed text-redup">Izinkan notifikasi untuk situs ini lewat pengaturan browser atau pengaturan aplikasi di HP, lalu buka ulang aplikasi.</p>
                    </>
                )}
                {keadaan === "pasangDulu" && (
                    <>
                        <p className="font-semibold">Pasang aplikasi untuk menerima notifikasi</p>
                        <p className="mt-0.5 text-sm leading-relaxed text-redup">Di iPhone, notifikasi hanya bisa diterima setelah aplikasi dipasang ke layar utama (Bagikan, lalu Tambah ke Layar Utama).</p>
                    </>
                )}
                {pesan && <p role="status" className="mt-2 text-sm text-redup">{pesan}</p>}
            </div>
        </section>
    )
}
