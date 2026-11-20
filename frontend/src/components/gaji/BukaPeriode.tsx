"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { CalendarPlus, Loader2 } from "lucide-react"
import { bukaPeriodeAction } from "@/app/actions/gaji"
import { useBolehAksi } from "@/components/layout/SidebarContext"
import { MENU } from "@/config/akses"

/** Periode gaji yang belum ada: tombol untuk membukanya (rentang tanggal dari Pengaturan Gaji). */
export function BukaPeriode({ periode, dari, sampai }: { periode: string; dari: string; sampai: string }) {
    const boleh = useBolehAksi()
    const router = useRouter()
    const [galat, setGalat] = useState<string | null>(null)
    const [sibuk, mulai] = useTransition()
    const buka = () => mulai(async () => {
        const r = await bukaPeriodeAction(periode)
        if (r && !r.ok) setGalat(r.error)
        else router.refresh()
    })
    return (
        <div className="rounded-md border border-dashed p-6 text-center text-sm">
            <p className="text-muted-foreground">Periode gaji {periode} ({dari} s/d {sampai}) belum dibuka.</p>
            {boleh([MENU.absensi], "tambah") && (
                <button type="button" onClick={buka} disabled={sibuk}
                    className="mt-3 inline-flex h-9 items-center gap-2 rounded-md bg-primary px-4 font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
                    {sibuk ? <Loader2 className="h-4 w-4 animate-spin" /> : <CalendarPlus className="h-4 w-4" />} Buka periode
                </button>
            )}
            {galat && <p role="alert" className="mt-2 text-red-700">{galat}</p>}
        </div>
    )
}
