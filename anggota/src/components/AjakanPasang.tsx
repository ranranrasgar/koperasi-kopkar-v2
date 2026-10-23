"use client"

import { useEffect, useState } from "react"
import { Share, Smartphone, SquarePlus, X } from "lucide-react"

const KUNCI = "kopkar-tutup-ajakan-pasang"
const JEDA_MS = 14 * 24 * 60 * 60 * 1000 // ditutup: tidak muncul lagi selama 14 hari

type Mode = "tidak" | "android" | "ios"

/**
 * Ajakan memasang aplikasi ke layar utama (PRD F14). Android/Chrome: tombol Pasang memakai ajakan bawaan browser.
 * iOS Safari tidak punya ajakan bawaan, jadi tampil petunjuk Bagikan → Tambah ke Layar Utama. Tidak tampil bila
 * aplikasi sudah dibuka dari layar utama atau baru saja ditutup.
 */
export function AjakanPasang() {
    const [mode, setMode] = useState<Mode>("tidak")

    useEffect(() => {
        const standalone = window.matchMedia("(display-mode: standalone)").matches
            || (navigator as Navigator & { standalone?: boolean }).standalone === true
        let ditutup = false
        try { ditutup = Date.now() - Number(localStorage.getItem(KUNCI) ?? 0) < JEDA_MS } catch { /* abaikan */ }
        if (standalone || ditutup) return

        const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
        const periksa = () => setMode(window.__ajakanPasang ? "android" : ios ? "ios" : "tidak")
        periksa()
        window.addEventListener("kopkar:bisa-pasang", periksa)
        return () => window.removeEventListener("kopkar:bisa-pasang", periksa)
    }, [])

    if (mode === "tidak") return null

    const tutup = () => {
        try { localStorage.setItem(KUNCI, String(Date.now())) } catch { /* abaikan */ }
        setMode("tidak")
    }
    const pasang = async () => {
        const e = window.__ajakanPasang
        if (!e) return
        await e.prompt()
        const { outcome } = await e.userChoice
        window.__ajakanPasang = null
        if (outcome === "accepted") setMode("tidak")
        else tutup()
    }

    return (
        <section className="relative mt-5 flex gap-3 rounded-[var(--radius-kartu)] border border-garis bg-permukaan p-4 pr-11">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-utama-lembut text-utama">
                <Smartphone size={20} strokeWidth={1.75} />
            </span>
            <div className="min-w-0">
                <p className="font-semibold">Pasang di layar utama</p>
                {mode === "android" ? (
                    <>
                        <p className="mt-0.5 text-sm leading-relaxed text-redup">Buka aplikasi anggota langsung dari layar utama HP, tanpa membuka browser.</p>
                        <button type="button" onClick={pasang}
                            className="mt-3 h-10 rounded-xl bg-utama px-4 text-sm font-semibold text-pada-utama hover:bg-utama-tekan">
                            Pasang aplikasi
                        </button>
                    </>
                ) : (
                    <p className="mt-0.5 text-sm leading-relaxed text-redup">
                        Di Safari, ketuk <Share size={15} strokeWidth={2} className="inline -mt-0.5" aria-label="Bagikan" /> lalu pilih{" "}
                        <span className="whitespace-nowrap font-medium text-teks">
                            <SquarePlus size={15} strokeWidth={2} className="inline -mt-0.5" /> Tambah ke Layar Utama
                        </span>.
                    </p>
                )}
            </div>
            <button type="button" onClick={tutup} aria-label="Tutup ajakan"
                className="absolute right-2 top-2 grid size-9 place-items-center rounded-full text-redup hover:bg-latar hover:text-teks">
                <X size={18} strokeWidth={1.75} />
            </button>
        </section>
    )
}
