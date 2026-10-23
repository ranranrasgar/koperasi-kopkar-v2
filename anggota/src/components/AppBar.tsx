"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Bell, MessageSquare } from "lucide-react"
import { statusAppBarAction } from "@/app/actions/appbar"
import type { StatusAppBar } from "@/lib/status-appbar"

const JUDUL: Record<string, string> = {
    "/beranda": "Beranda", "/simpanan": "Simpanan", "/pinjaman": "Pinjaman", "/ajukan": "Ajukan pinjaman", "/akun": "Akun",
}
const KUNCI_DILIHAT = "kopkar-notif-dilihat"
const JEDA_MS = 30_000

function Penanda({ href, label, ada, children }: { href: string; label: string; ada: boolean; children: React.ReactNode }) {
    return (
        <Link href={href} aria-label={ada ? `${label} (ada yang baru)` : label}
            className="relative grid size-11 place-items-center rounded-full text-redup transition-colors hover:bg-garis/60 hover:text-teks">
            {children}
            {ada && <span className="absolute right-2.5 top-2.5 size-2.5 rounded-full border-2 border-latar bg-keluar" />}
        </Link>
    )
}

/**
 * Header tetap di lima halaman utama: logo koperasi dengan nama halaman, pesan, lonceng notifikasi, dan avatar (ke Akun).
 * Titik merah lonceng = ada notifikasi yang lebih baru dari yang terakhir dibuka; titik pesan = balasan belum dibaca.
 * Disegarkan tiap 30 detik saat tab terlihat. Halaman rincian memakai tombol kembali sendiri, jadi header ini tersembunyi.
 */
export function AppBar({ awal, nama, inisial, fotoVersi }: { awal: StatusAppBar | null; nama: string; inisial: string; fotoVersi: string | null }) {
    const path = usePathname()
    const [status, setStatus] = useState<StatusAppBar | null>(awal)
    const [dilihat, setDilihat] = useState<string | null>(null)
    const judul = JUDUL[path]

    useEffect(() => {
        let batal = false
        const segarkan = async () => {
            if (document.visibilityState !== "visible") return
            const s = await statusAppBarAction().catch(() => null)
            if (!batal && s) setStatus(s)
        }
        const t = setInterval(segarkan, JEDA_MS)
        document.addEventListener("visibilitychange", segarkan)
        return () => { batal = true; clearInterval(t); document.removeEventListener("visibilitychange", segarkan) }
    }, [])

    // Membuka halaman Notifikasi = semua yang ada sudah dilihat. Pertama kali (belum ada catatan): anggap sudah dilihat,
    // supaya notifikasi lama tidak langsung memunculkan titik merah.
    useEffect(() => {
        const terbaru = status?.notifTerbaru
        if (!terbaru) return
        try {
            const tersimpan = localStorage.getItem(KUNCI_DILIHAT)
            if (path.startsWith("/notifikasi") || tersimpan === null) localStorage.setItem(KUNCI_DILIHAT, terbaru)
            setDilihat(path.startsWith("/notifikasi") || tersimpan === null ? terbaru : tersimpan)
        } catch { setDilihat(terbaru) }
    }, [path, status?.notifTerbaru])

    if (!judul) return null
    const notifBaru = !!status?.notifTerbaru && !!dilihat && status.notifTerbaru > dilihat

    return (
        <header className="sticky top-0 z-10 flex items-center gap-3 bg-latar/90 px-5 pb-2 pt-[max(0.75rem,env(safe-area-inset-top))] backdrop-blur">
            <Link href="/beranda" className="flex min-w-0 flex-1 items-center gap-3">
                <img src="/logo.png" alt="" className="size-10 shrink-0 rounded-xl border border-garis bg-permukaan object-contain p-0.5" />
                <div className="min-w-0 leading-tight">
                    <p className="truncate text-[1.0625rem] font-bold tracking-tight">Kopkar MJS</p>
                    <p className="truncate text-xs text-redup">{judul}</p>
                </div>
            </Link>
            <Penanda href="/pesan" label="Pesan ke koperasi" ada={(status?.pesanBaru ?? 0) > 0}><MessageSquare size={21} strokeWidth={1.75} /></Penanda>
            <Penanda href="/notifikasi" label="Notifikasi" ada={notifBaru}><Bell size={21} strokeWidth={1.75} /></Penanda>
            <Link href="/akun" aria-label={`Akun ${nama}`} className="-mr-1 shrink-0">
                {fotoVersi
                    ? <img src={`/akun/foto?v=${fotoVersi}`} alt="" className="size-10 rounded-full border border-garis object-cover" />
                    : <span className="grid size-10 place-items-center rounded-full bg-utama-lembut text-sm font-bold text-utama">{inisial}</span>}
            </Link>
        </header>
    )
}
