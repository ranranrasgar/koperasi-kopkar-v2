"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

/** Muat ulang data halaman server secara berkala selagi tab terlihat. */
export function SegarkanOtomatis({ detik }: { detik: number }) {
    const router = useRouter()
    useEffect(() => {
        const t = setInterval(() => { if (document.visibilityState === "visible") router.refresh() }, detik * 1000)
        return () => clearInterval(t)
    }, [router, detik])
    return null
}
