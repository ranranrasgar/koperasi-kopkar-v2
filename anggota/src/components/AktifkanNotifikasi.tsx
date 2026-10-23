"use client"

import { useEffect, useState, useTransition } from "react"
import { BellRing } from "lucide-react"
import { aktifkanPushAction, kirimUjiPushAction, matikanPushAction, statusPushAction } from "@/app/actions/push"

type Keadaan = "memeriksa" | "takdidukung" | "ditolak" | "mati" | "aktif"

function kunciKeBytes(b64: string) {
    const pad = "=".repeat((4 - (b64.length % 4)) % 4)
    const bin = atob((b64 + pad).replace(/-/g, "+").replace(/_/g, "/"))
    return Uint8Array.from(bin, (c) => c.charCodeAt(0))
}

/**
 * Izin dan langganan Web Push (PRD F13). Izin hanya diminta saat tombol diketuk, bukan otomatis, karena browser
 * menolak permintaan tanpa tindakan pengguna. iOS: hanya bila aplikasi sudah dipasang ke layar utama (iOS 16.4+).
 */
export function AktifkanNotifikasi({ kunciPublik }: { kunciPublik: string | null }) {
    const [keadaan, setKeadaan] = useState<Keadaan>("memeriksa")
    const [pesan, setPesan] = useState<string | null>(null)
    const [sibuk, mulai] = useTransition()

    useEffect(() => {
        let batal = false
        ;(async () => {
            if (!kunciPublik || !("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) return !batal && setKeadaan("takdidukung")
            if (Notification.permission === "denied") return !batal && setKeadaan("ditolak")
            const reg = await navigator.serviceWorker.getRegistration()
            const sub = await reg?.pushManager.getSubscription()
            const terdaftar = sub ? await statusPushAction(sub.endpoint) : false
            if (!batal) setKeadaan(terdaftar ? "aktif" : "mati")
        })().catch(() => !batal && setKeadaan("takdidukung"))
        return () => { batal = true }
    }, [kunciPublik])

    if (keadaan === "memeriksa") return null

    const aktifkan = () => mulai(async () => {
        setPesan(null)
        try {
            if ((await Notification.requestPermission()) !== "granted") { setKeadaan("ditolak"); return }
            const reg = await navigator.serviceWorker.ready
            const sub = (await reg.pushManager.getSubscription())
                ?? await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: kunciKeBytes(kunciPublik!) })
            const h = await aktifkanPushAction(sub.toJSON())
            if (h.ok) setKeadaan("aktif"); else setPesan(h.error)
        } catch {
            setPesan("Notifikasi tidak bisa diaktifkan di perangkat ini.")
        }
    })
    const matikan = () => mulai(async () => {
        setPesan(null)
        const sub = await (await navigator.serviceWorker.ready).pushManager.getSubscription()
        if (sub) { await matikanPushAction(sub.endpoint); await sub.unsubscribe() }
        setKeadaan("mati")
    })
    const coba = () => mulai(async () => {
        const h = await kirimUjiPushAction()
        setPesan(h.ok ? "Notifikasi percobaan dikirim." : h.error)
    })

    const tombol = "h-10 rounded-xl px-4 text-sm font-semibold disabled:opacity-60"
    return (
        <section className="mb-5 flex gap-3 rounded-[var(--radius-kartu)] border border-garis bg-permukaan p-4">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-utama-lembut text-utama">
                <BellRing size={20} strokeWidth={1.75} />
            </span>
            <div className="min-w-0 flex-1">
                <p className="font-semibold">Notifikasi di perangkat ini</p>
                {keadaan === "takdidukung" && (
                    <p className="mt-0.5 text-sm leading-relaxed text-redup">Perangkat atau browser ini belum mendukung notifikasi. Di iPhone, pasang aplikasi ke layar utama lebih dulu (iOS 16.4 ke atas).</p>
                )}
                {keadaan === "ditolak" && (
                    <p className="mt-0.5 text-sm leading-relaxed text-redup">Notifikasi diblokir. Izinkan lewat pengaturan situs di browser, lalu muat ulang halaman ini.</p>
                )}
                {keadaan === "mati" && (
                    <>
                        <p className="mt-0.5 text-sm leading-relaxed text-redup">Dapatkan kabar saat pengajuan kredit Anda diputuskan atau ada pengumuman koperasi.</p>
                        <button type="button" onClick={aktifkan} disabled={sibuk} className={`${tombol} mt-3 bg-utama text-pada-utama hover:bg-utama-tekan`}>Aktifkan notifikasi</button>
                    </>
                )}
                {keadaan === "aktif" && (
                    <>
                        <p className="mt-0.5 text-sm leading-relaxed text-redup">Aktif. Perangkat ini akan menerima kabar dari koperasi.</p>
                        <div className="mt-3 flex flex-wrap gap-2">
                            <button type="button" onClick={coba} disabled={sibuk} className={`${tombol} border border-garis hover:bg-latar`}>Kirim percobaan</button>
                            <button type="button" onClick={matikan} disabled={sibuk} className={`${tombol} text-redup hover:bg-latar`}>Matikan</button>
                        </div>
                    </>
                )}
                {pesan && <p role="status" className="mt-2 text-sm text-redup">{pesan}</p>}
            </div>
        </section>
    )
}
