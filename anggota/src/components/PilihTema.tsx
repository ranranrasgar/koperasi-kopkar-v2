"use client"

import { useEffect, useState } from "react"
import { Moon, Smartphone, Sun, type LucideIcon } from "lucide-react"

type Tema = "otomatis" | "terang" | "gelap"
const KUNCI = "kopkar-tema"

declare global {
    interface Window { kopkarTema?: (t: string) => void }
}

const PILIHAN: { nilai: Tema; label: string; ikon: LucideIcon }[] = [
    { nilai: "otomatis", label: "Otomatis", ikon: Smartphone },
    { nilai: "terang", label: "Terang", ikon: Sun },
    { nilai: "gelap", label: "Gelap", ikon: Moon },
]

/** Pilih tampilan terang/gelap, atau ikuti pengaturan HP. Disimpan per perangkat; langsung berlaku tanpa muat ulang. */
export function PilihTema() {
    const [tema, setTema] = useState<Tema>("otomatis")

    useEffect(() => {
        try {
            const t = localStorage.getItem(KUNCI)
            if (t === "terang" || t === "gelap") setTema(t)
        } catch { /* penyimpanan tidak tersedia: tetap otomatis */ }
    }, [])

    const pilih = (t: Tema) => {
        setTema(t)
        try {
            if (t === "otomatis") localStorage.removeItem(KUNCI)
            else localStorage.setItem(KUNCI, t)
        } catch { /* tema tetap berlaku untuk sesi ini */ }
        window.kopkarTema?.(t === "otomatis" ? "" : t)
    }

    return (
        <div role="radiogroup" aria-label="Tampilan" className="grid grid-cols-3 gap-1 rounded-xl bg-garis/60 p-1">
            {PILIHAN.map(({ nilai, label, ikon: Ikon }) => (
                <button key={nilai} type="button" role="radio" aria-checked={tema === nilai} onClick={() => pilih(nilai)}
                    className={`flex h-11 items-center justify-center gap-2 rounded-lg text-sm font-semibold transition-colors ${tema === nilai ? "bg-permukaan text-teks shadow-sm" : "text-redup"}`}>
                    <Ikon size={16} strokeWidth={1.9} />{label}
                </button>
            ))}
        </div>
    )
}
