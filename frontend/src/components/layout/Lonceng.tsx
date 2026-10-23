"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { jumlahBadgeAction } from "@/app/actions/pesan"
import { MENU } from "@/config/akses"
import { useSidebar } from "./SidebarContext"

const JEDA_MS = 10_000

function Ikon({ href, ikon, judul, jumlah }: { href: string; ikon: string; judul: string; jumlah: number }) {
    const label = jumlah ? `${judul}: ${jumlah} belum dibaca` : judul
    return (
        <Link href={href} title={label} aria-label={label}
            className="relative flex h-9 w-9 items-center justify-center rounded-full text-on-surface-variant hover:bg-surface-variant hover:text-on-surface transition-colors print:hidden">
            <span className="material-symbols-outlined text-[1.35rem]">{ikon}</span>
            {jumlah > 0 && (
                <span className="absolute -right-0.5 -top-0.5 min-w-4 rounded-full bg-red-600 px-1 py-0.5 text-center text-[10px] font-bold leading-none text-white">
                    {jumlah > 99 ? "99+" : jumlah}
                </span>
            )}
        </Link>
    )
}

/**
 * Dua ikon di navbar: pesan (chat dengan anggota, hanya bila berizin) dan lonceng (pengumuman himbauan/promo untuk
 * operator ini). Angka awal dari layout, lalu diperbarui tiap 10 detik saat tab terlihat dan saat tab dibuka kembali.
 */
export function Lonceng() {
    const { lencana, izin } = useSidebar()
    const [angka, setAngka] = useState({ pesan: lencana["/dashboard/pesan"] ?? 0, pengumuman: lencana["/dashboard/pengumuman"] ?? 0 })

    useEffect(() => setAngka({ pesan: lencana["/dashboard/pesan"] ?? 0, pengumuman: lencana["/dashboard/pengumuman"] ?? 0 }), [lencana])

    useEffect(() => {
        let batal = false
        const segarkan = async () => {
            if (document.visibilityState !== "visible") return
            const n = await jumlahBadgeAction().catch(() => null)
            if (!batal && n) setAngka(n)
        }
        const t = setInterval(segarkan, JEDA_MS)
        document.addEventListener("visibilitychange", segarkan)
        return () => { batal = true; clearInterval(t); document.removeEventListener("visibilitychange", segarkan) }
    }, [])

    return (
        <>
            {izin.includes(MENU.pesanAnggota) && <Ikon href="/dashboard/pesan" ikon="chat" judul="Pesan anggota" jumlah={angka.pesan} />}
            <Ikon href="/dashboard/pengumuman" ikon="notifications" judul="Pengumuman" jumlah={angka.pengumuman} />
        </>
    )
}
