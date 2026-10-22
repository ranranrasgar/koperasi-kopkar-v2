"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { AlertCircle, CheckCircle2, FlaskConical, Loader2, Radio } from "lucide-react"
import { aturModeAction, type HasilMode } from "@/app/actions/mode"
import { cn } from "@/lib/utils"

/** Saklar geser dua posisi: Uji (setiap simpan di-rollback) atau Live (tersimpan permanen). */
export function SaklarMode({ uji, terkunci }: { uji: boolean; terkunci: boolean }) {
    const router = useRouter()
    const [hasil, setHasil] = useState<HasilMode | null>(null)
    const [pending, startTransition] = useTransition()

    const pilih = (keUji: boolean) => {
        if (keUji === uji || terkunci || pending) return
        const tanya = keUji
            ? "Pindah ke mode UJI?\n\nSemua transaksi berikutnya (oleh semua operator) akan dibatalkan dan TIDAK tersimpan."
            : "Pindah ke mode LIVE?\n\nSemua transaksi berikutnya (oleh semua operator) akan TERSIMPAN PERMANEN ke data koperasi dan membentuk jurnal."
        if (!confirm(tanya)) return
        startTransition(async () => {
            setHasil(await aturModeAction(keUji))
            router.refresh()
        })
    }

    const tombol = (keUji: boolean, Ikon: typeof Radio, judul: string, ket: string) => {
        const aktif = uji === keUji
        return (
            <button type="button" role="radio" aria-checked={aktif} disabled={terkunci || pending} onClick={() => pilih(keUji)}
                className={cn("relative z-10 flex flex-1 items-center gap-3 rounded-lg px-4 py-3 text-left transition-colors disabled:cursor-not-allowed",
                    aktif ? (keUji ? "text-amber-950 dark:text-amber-100" : "text-green-950 dark:text-green-100") : "text-muted-foreground hover:text-foreground")}>
                <Ikon className="h-5 w-5 shrink-0" />
                <span>
                    <span className="block font-semibold">{judul}</span>
                    <span className="block text-xs opacity-80">{ket}</span>
                </span>
            </button>
        )
    }

    return (
        <div className="space-y-4">
            <div role="radiogroup" aria-label="Mode aplikasi" className={cn("relative flex rounded-xl border bg-muted/40 p-1", terkunci && "opacity-70")}>
                {/* Penanda posisi saklar yang bergeser. */}
                <span aria-hidden className={cn("absolute inset-y-1 w-[calc(50%-0.25rem)] rounded-lg shadow-sm transition-all duration-300",
                    uji ? "left-1 bg-amber-100 dark:bg-amber-500/25" : "left-[calc(50%+0rem)] bg-green-100 dark:bg-green-500/25")} />
                {tombol(true, FlaskConical, "Uji", "Simpan dicoba lalu dibatalkan")}
                {tombol(false, Radio, "Live", "Simpan tersimpan permanen")}
            </div>
            {pending && <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Mengubah mode...</p>}
            {hasil && (hasil.ok ? (
                <div role="status" className="flex items-center gap-2 rounded-md border border-green-300 bg-green-50 dark:bg-green-500/10 p-2.5 text-sm text-green-700 dark:text-green-400">
                    <CheckCircle2 className="h-4 w-4 shrink-0" /> {hasil.pesan}
                </div>
            ) : (
                <div role="alert" className="flex items-start gap-2 rounded-md border border-red-300 bg-red-50 dark:bg-red-500/10 p-2.5 text-sm text-red-700 dark:text-red-400">
                    <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" /> {hasil.error}
                </div>
            ))}
        </div>
    )
}
