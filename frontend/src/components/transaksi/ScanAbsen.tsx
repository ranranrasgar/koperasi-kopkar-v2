"use client"

import { useState } from "react"
import { QrCode } from "lucide-react"
import { absenQrAction } from "@/app/actions/absensi"
import { useBolehAksi } from "@/components/layout/SidebarContext"
import { cn } from "@/lib/utils"
import { MENU } from "@/config/akses"
import { PindaiQr } from "./PindaiQr"

/** Tombol Scan Absen di halaman Absensi: QR saya milik staff, daftar di halaman ikut diperbarui. */
export function ScanAbsen() {
    const boleh = useBolehAksi()
    const [buka, setBuka] = useState(false)
    const [hasil, setHasil] = useState<{ pesan: string; sudah: boolean } | null>(null)
    if (!boleh([MENU.absensi], "tambah")) return null

    const baca = async (teks: string) => {
        const r = await absenQrAction(teks)
        if (r.ok) setHasil(r)
        return r
    }
    return (
        <>
            <button type="button" onClick={() => { setHasil(null); setBuka(true) }}
                className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90">
                <QrCode className="h-4 w-4" /> Scan Absen
            </button>
            {hasil && <p role="status" className={cn("rounded-md border px-3 py-2 text-sm font-medium", hasil.sudah
                ? "border-amber-400 bg-amber-50 text-amber-800 dark:bg-amber-500/10 dark:text-amber-300"
                : "border-emerald-300 bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400")}>{hasil.pesan}</p>}
            <PindaiQr buka={buka} onTutup={() => setBuka(false)} onHasil={() => {}} baca={baca} />
        </>
    )
}
