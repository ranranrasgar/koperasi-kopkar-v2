"use client"

import { useEffect } from "react"
import { usePathname } from "next/navigation"

/** Kirim sinyal online saat halaman berganti dan tiap menit, hanya selagi tab terlihat, supaya tab yang ditinggal tidak terhitung online. */
export function SinyalAktif() {
    const path = usePathname()
    useEffect(() => {
        const kirim = () => {
            if (document.visibilityState !== "visible") return
            fetch("/api/sinyal", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ h: path }), keepalive: true }).catch(() => {})
        }
        kirim()
        const t = setInterval(kirim, 60_000)
        document.addEventListener("visibilitychange", kirim)
        return () => { clearInterval(t); document.removeEventListener("visibilitychange", kirim) }
    }, [path])
    return null
}
