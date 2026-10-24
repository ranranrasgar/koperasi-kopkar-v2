"use client"

import { useEffect, useState } from "react"
import { usePathname, useSearchParams } from "next/navigation"

/**
 * Bilah tipis di tepi atas layar selama pindah halaman: mulai saat tautan internal diklik atau formulir GET dikirim,
 * selesai saat alamat (path atau query) berubah. Batas aman 15 detik bila navigasi batal.
 */
export function BilahProgres() {
    const pathname = usePathname()
    const cari = useSearchParams()
    const [aktif, setAktif] = useState(false)

    useEffect(() => { setAktif(false) }, [pathname, cari])

    useEffect(() => {
        let batas: ReturnType<typeof setTimeout> | undefined
        const mulai = () => { setAktif(true); clearTimeout(batas); batas = setTimeout(() => setAktif(false), 15000) }
        const klik = (e: MouseEvent) => {
            if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
            const a = (e.target as Element | null)?.closest?.("a")
            if (!a || !a.href || a.target && a.target !== "_self" || a.hasAttribute("download")) return
            const u = new URL(a.href, location.href)
            if (u.origin !== location.origin) return
            if (u.pathname === location.pathname && u.search === location.search) return
            mulai()
        }
        const kirim = (e: SubmitEvent) => {
            const f = e.target as HTMLFormElement
            if (!e.defaultPrevented && (f.method || "get").toLowerCase() === "get" && !f.target) mulai()
        }
        document.addEventListener("click", klik)
        document.addEventListener("submit", kirim)
        return () => { document.removeEventListener("click", klik); document.removeEventListener("submit", kirim); clearTimeout(batas) }
    }, [])

    if (!aktif) return null
    return (
        <div role="progressbar" aria-label="Memuat halaman" className="fixed inset-x-0 top-0 z-[100] h-1 overflow-hidden bg-primary/15 print:hidden">
            <div className="h-full w-1/3 animate-[memuat_1.1s_ease-in-out_infinite] rounded-full bg-primary" />
        </div>
    )
}
