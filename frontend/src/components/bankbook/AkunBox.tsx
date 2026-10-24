"use client"

import { useMemo, useState } from "react"
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
            <input data-f={dataF} role="combobox" aria-expanded={buka} aria-label={label} autoComplete="off" placeholder="Cari kode atau nama akun..." value={tampil}
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
            {buka && (
                <ul role="listbox" className="absolute left-0 z-50 mt-1 max-h-60 w-[28rem] max-w-[80vw] overflow-auto rounded-md border bg-popover text-popover-foreground shadow-md">
                    {hasil.length === 0 && <li className="px-3 py-2 text-sm text-muted-foreground">Akun tidak ditemukan</li>}
                    {hasil.map((a, i) => (
                        <li key={a.id} role="option" aria-selected={i === aktif}
                            onMouseDown={(e) => { e.preventDefault(); pilih(a); onSelesai?.() }} onMouseEnter={() => setAktif(i)}
                            className={cn("cursor-pointer px-3 py-1.5 text-sm", i === aktif && "bg-blue-600 text-white")}>
                            <span className="font-mono text-xs">{a.kode_perkiraan}</span> {a.nama_perkiraan}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    )
}
