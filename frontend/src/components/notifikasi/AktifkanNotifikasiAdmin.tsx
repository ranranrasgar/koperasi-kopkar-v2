"use client"

import { useEffect, useState, useTransition } from "react"
import { BellRing } from "lucide-react"
import { aktifkanPushOprAction, matikanPushOprAction, statusPushOprAction } from "@/app/actions/pesan"

type Keadaan = "memeriksa" | "takdidukung" | "ditolak" | "mati" | "aktif"

function kunciKeBytes(b64: string) {
    const pad = "=".repeat((4 - (b64.length % 4)) % 4)
    const bin = atob((b64 + pad).replace(/-/g, "+").replace(/_/g, "/"))
    return Uint8Array.from(bin, (c) => c.charCodeAt(0))
}

/** Izin Web Push untuk browser operator ini: pesan anggota dan pengumuman muncul sebagai notifikasi walau tab admin tidak aktif. */
export function AktifkanNotifikasiAdmin({ kunciPublik }: { kunciPublik: string | null }) {
    const [keadaan, setKeadaan] = useState<Keadaan>("memeriksa")
    const [pesan, setPesan] = useState<string | null>(null)
    const [sibuk, mulai] = useTransition()

    useEffect(() => {
        let batal = false
        ;(async () => {
            if (!kunciPublik || !("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) return !batal && setKeadaan("takdidukung")
            if (Notification.permission === "denied") return !batal && setKeadaan("ditolak")
            const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" })
            const sub = await reg.pushManager.getSubscription()
            const terdaftar = sub ? await statusPushOprAction(sub.endpoint) : false
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
            const h = await aktifkanPushOprAction(sub.toJSON())
            if (h?.ok) setKeadaan("aktif"); else setPesan(h && !h.ok ? h.error : "Gagal")
        } catch {
            setPesan("Notifikasi tidak bisa diaktifkan di browser ini.")
        }
    })
    const matikan = () => mulai(async () => {
        const sub = await (await navigator.serviceWorker.ready).pushManager.getSubscription()
        if (sub) { await matikanPushOprAction(sub.endpoint); await sub.unsubscribe() }
        setKeadaan("mati")
    })

    return (
        <div className="flex flex-wrap items-center gap-3 rounded-md border bg-muted/30 px-3 py-2.5 text-sm">
            <BellRing className="h-4 w-4 shrink-0 text-muted-foreground" />
            <div className="min-w-0 flex-1">
                {keadaan === "takdidukung" && <span className="text-muted-foreground">Browser ini belum mendukung notifikasi.</span>}
                {keadaan === "ditolak" && <span className="text-muted-foreground">Notifikasi diblokir di browser ini. Izinkan lewat pengaturan situs, lalu muat ulang halaman.</span>}
                {keadaan === "mati" && <span>Aktifkan notifikasi agar pesan dan pengumuman muncul walau tab ini tidak sedang dibuka.</span>}
                {keadaan === "aktif" && <span>Notifikasi aktif di browser ini (pesan anggota dan pengumuman).</span>}
                {pesan && <span role="status" className="ml-2 text-muted-foreground">{pesan}</span>}
            </div>
            {keadaan === "mati" && <button type="button" onClick={aktifkan} disabled={sibuk} className="h-8 rounded-md bg-blue-600 px-3 font-semibold text-white hover:bg-blue-700 disabled:opacity-60">Aktifkan</button>}
            {keadaan === "aktif" && <button type="button" onClick={matikan} disabled={sibuk} className="h-8 rounded-md px-3 text-muted-foreground hover:bg-muted disabled:opacity-60">Matikan</button>}
        </div>
    )
}
