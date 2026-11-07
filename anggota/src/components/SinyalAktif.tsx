"use client"

import { useEffect } from "react"
import { usePathname } from "next/navigation"

/** Kirim sinyal online saat halaman berganti dan tiap menit, hanya selagi aplikasi terlihat. Saat halaman berganti sinyalnya bertanda `baru` (masuk riwayat Buka halaman). */
export function SinyalAktif() {
    const path = usePathname()
    useEffect(() => {
        const kirim = (baru = false) => {
            if (document.visibilityState !== "visible") return
            fetch("/api/sinyal", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ h: path, baru }), keepalive: true }).catch(() => {})
        }
        kirim(true)
        const berkala = () => kirim()
        const t = setInterval(berkala, 60_000)
        document.addEventListener("visibilitychange", berkala)
        return () => { clearInterval(t); document.removeEventListener("visibilitychange", berkala) }
    }, [path])
    return null
}
