"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { jumlahPesanBaruAction } from "@/app/actions/pesan"
import { useSidebar } from "./SidebarContext"

const JEDA_MS = 30_000

/**
 * Lonceng di navbar: angka merah = pesan anggota yang belum dibaca/dibalas. Angka awal dari layout, lalu diperbarui
 * tiap 30 detik (hanya saat tab terlihat) dan saat tab kembali dibuka, supaya tidak perlu memuat ulang halaman.
 */
export function Lonceng() {
    const { lencana } = useSidebar()
    const [jumlah, setJumlah] = useState(lencana["/dashboard/pesan"] ?? 0)

    useEffect(() => setJumlah(lencana["/dashboard/pesan"] ?? 0), [lencana])

    useEffect(() => {
        let batal = false
        const segarkan = async () => {
            if (document.visibilityState !== "visible") return
            const n = await jumlahPesanBaruAction().catch(() => null)
            if (!batal && n !== null) setJumlah(n)
        }
        const t = setInterval(segarkan, JEDA_MS)
        document.addEventListener("visibilitychange", segarkan)
        return () => { batal = true; clearInterval(t); document.removeEventListener("visibilitychange", segarkan) }
    }, [])

    return (
        <Link href="/dashboard/pesan" title={jumlah ? `${jumlah} pesan anggota belum dibaca` : "Pesan anggota"} aria-label={jumlah ? `${jumlah} pesan anggota belum dibaca` : "Pesan anggota"}
            className="relative flex h-9 w-9 items-center justify-center rounded-full text-on-surface-variant hover:bg-surface-variant hover:text-on-surface transition-colors print:hidden">
            <span className="material-symbols-outlined text-[1.35rem]">notifications</span>
            {jumlah > 0 && (
                <span className="absolute -right-0.5 -top-0.5 min-w-4 rounded-full bg-red-600 px-1 py-0.5 text-center text-[10px] font-bold leading-none text-white">
                    {jumlah > 99 ? "99+" : jumlah}
                </span>
            )}
        </Link>
    )
}
