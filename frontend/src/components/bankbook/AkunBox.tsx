"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { cn } from "@/lib/utils"
import type { Akun } from "@/components/transaksi/common"

/**
 * Pilihan akun yang bisa dicari menurut kode atau nama (semua kata harus cocok). Panah atas/bawah memilih, Enter atau Tab
 * memasang pilihan; `onSelesai` dipanggil setelah Enter supaya fokus pindah ke isian berikutnya. Nilai dikirim lewat input tersembunyi.
 */
export function AkunBox({ akun, nilai, onUbah, onSelesai, dataF, name, label }: {
    akun: Akun[]; nilai: string; onUbah: (kode: string) => void; onSelesai?: () => void; dataF: string; name: string; label: string
}) {
    const [buka, setBuka] = useState(false)
    const [q, setQ] = useState("")
    const [aktif, setAktif] = useState(0)
    const inputRef = useRef<HTMLInputElement>(null)
    // Daftar dirender di luar modal (portal) dengan posisi tetap, supaya tidak terpotong tinggi/lebar modal.
    const [pos, setPos] = useState<{ top?: number; bottom?: number; left: number; width: number } | null>(null)
    useEffect(() => {
        if (!buka) return
        const hitung = () => {
            const r = inputRef.current?.getBoundingClientRect()
            if (!r) return
            const lebar = Math.min(Math.max(r.width, 420), window.innerWidth - 16)
            const left = Math.max(8, Math.min(r.left, window.innerWidth - lebar - 8))
            const ruangBawah = window.innerHeight - r.bottom
            const baru = ruangBawah < 260 && r.top > ruangBawah ? { bottom: window.innerHeight - r.top + 4, left, width: lebar } : { top: r.bottom + 4, left, width: lebar }
            // Nilai sama dipertahankan: scroll di dalam daftar sendiri ikut memicu hitung, jangan sampai merender berulang.
            setPos((lama) => (lama && lama.top === baru.top && lama.bottom === (baru as { bottom?: number }).bottom && lama.left === baru.left && lama.width === baru.width ? lama : baru))
        }
        hitung()
        window.addEventListener("scroll", hitung, true)
        window.addEventListener("resize", hitung)
        return () => { window.removeEventListener("scroll", hitung, true); window.removeEventListener("resize", hitung) }
    }, [buka])
    useEffect(() => { document.querySelector('[role="listbox"] [data-aktif]')?.scrollIntoView({ block: "nearest" }) }, [aktif, buka, pos])
    const terpilih = akun.find((a) => a.kode_perkiraan === nilai)
    const hasil = useMemo(() => {
        const kata = q.toLowerCase().split(/\s+/).filter(Boolean)
        const cocok = kata.length ? akun.filter((a) => kata.every((k) => `${a.kode_perkiraan} ${a.nama_perkiraan}`.toLowerCase().includes(k))) : akun
        return cocok.slice(0, 50)
    }, [akun, q])

    const pilih = (a: Akun | undefined) => {
        if (a) onUbah(a.kode_perkiraan)
        setBuka(false); setQ("")
    }
    const tampil = buka ? q : terpilih ? `${terpilih.kode_perkiraan} ${terpilih.nama_perkiraan}` : q

    return (
        <div className="relative">
            <input type="hidden" name={name} value={nilai} />
            <input ref={inputRef} data-f={dataF} role="combobox" aria-expanded={buka} aria-label={label} autoComplete="off" placeholder="Cari kode atau nama akun..." value={tampil}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                onFocus={(e) => { setBuka(true); setQ(""); setAktif(0); e.currentTarget.select() }}
                onBlur={() => { setBuka(false); setQ("") }}
                onChange={(e) => { setQ(e.target.value); setBuka(true); setAktif(0); if (nilai) onUbah("") }}
                onKeyDown={(e) => {
                    if (e.key === "ArrowDown") { e.preventDefault(); setBuka(true); setAktif((i) => Math.min(i + 1, hasil.length - 1)) }
                    else if (e.key === "ArrowUp") { e.preventDefault(); setAktif((i) => Math.max(i - 1, 0)) }
                    else if (e.key === "Escape" && buka) { e.stopPropagation(); setBuka(false) }
                    else if (e.key === "Enter") {
                        e.preventDefault(); e.stopPropagation()
                        if (buka && hasil[aktif]) pilih(hasil[aktif])
                        if (buka ? hasil[aktif] : terpilih) onSelesai?.()
                    } else if (e.key === "Tab" && buka && q && hasil[aktif]) pilih(hasil[aktif])
                }} />
            {buka && pos && createPortal(
                <ul role="listbox" style={{ ...pos, position: "fixed", pointerEvents: "auto" }} onPointerDown={(e) => e.stopPropagation()}
                    className="z-[100] max-h-72 overflow-auto rounded-md border bg-popover text-popover-foreground shadow-lg">
                    {hasil.length === 0 && <li className="px-3 py-2 text-sm text-muted-foreground">Akun tidak ditemukan</li>}
                    {hasil.map((a, i) => (
                        <li key={a.id} role="option" aria-selected={i === aktif}
                            data-aktif={i === aktif ? "" : undefined}
                            onMouseDown={(e) => { e.preventDefault(); pilih(a); onSelesai?.() }} onMouseEnter={() => setAktif(i)}
                            className={cn("cursor-pointer px-3 py-1.5 text-sm", i === aktif && "bg-blue-600 text-white")}>
                            <span className="font-mono text-xs">{a.kode_perkiraan}</span> {a.nama_perkiraan}
                        </li>
                    ))}
                </ul>, document.body)}
        </div>
    )
}
