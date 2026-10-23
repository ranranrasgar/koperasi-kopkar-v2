"use client"

import { useEffect } from "react"

/** Event beforeinstallprompt (Chrome/Android), disimpan supaya tombol Pasang bisa memakainya nanti. */
export interface AjakanPasangEvent extends Event {
    prompt: () => Promise<void>
    userChoice: Promise<{ outcome: "accepted" | "dismissed" }>
}

declare global {
    interface Window { __ajakanPasang?: AjakanPasangEvent | null }
}

/**
 * Daftarkan service worker (public/sw.js) dan tangkap ajakan pasang dari browser sedini mungkin, karena event itu
 * bisa muncul sebelum kartu "Pasang aplikasi" dirender.
 */
export function PekerjaLatar() {
    useEffect(() => {
        const tangkap = (e: Event) => {
            e.preventDefault()
            window.__ajakanPasang = e as AjakanPasangEvent
            window.dispatchEvent(new Event("kopkar:bisa-pasang"))
        }
        const terpasang = () => {
            window.__ajakanPasang = null
            window.dispatchEvent(new Event("kopkar:bisa-pasang"))
        }
        window.addEventListener("beforeinstallprompt", tangkap)
        window.addEventListener("appinstalled", terpasang)

        if ("serviceWorker" in navigator) {
            const dev = process.env.NODE_ENV !== "production" ? "?dev=1" : ""
            navigator.serviceWorker.register(`/sw.js${dev}`, { scope: "/", updateViaCache: "none" }).catch(() => undefined)
        }
        return () => {
            window.removeEventListener("beforeinstallprompt", tangkap)
            window.removeEventListener("appinstalled", terpasang)
        }
    }, [])
    return null
}
