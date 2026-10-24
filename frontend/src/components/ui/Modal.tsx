"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

export const tombolModal = "inline-flex items-center justify-center gap-1.5 h-9 px-4 rounded-md text-sm font-semibold shadow-sm"
export const tombolModalUtama = `${tombolModal} bg-blue-600 hover:bg-blue-700 text-white`

/**
 * Form entri di modal (pengganti form yang terbuka di bawah daftar). Dibuka/ditutup oleh pemanggil; isi hanya
 * dirender saat terbuka, sehingga form selalu mulai bersih. Galat tampil di dalam modal dan isian tidak hilang.
 */
// Lebar eksplisit: tema mendefinisikan --spacing-lg (24px) dan --spacing-xl, yang membuat max-w-lg / max-w-xl menjadi selebar itu.
export function ModalForm({ open, onOpenChange, judul, keterangan, lebar = "sm:max-w-[32rem]", children }: {
    open: boolean; onOpenChange: (buka: boolean) => void; judul: string; keterangan?: string; lebar?: string; children: React.ReactNode
}) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className={cn("max-h-[90vh] overflow-y-auto", lebar)}>
                <DialogHeader>
                    <DialogTitle>{judul}</DialogTitle>
                    {keterangan && <DialogDescription>{keterangan}</DialogDescription>}
                </DialogHeader>
                {open && children}
            </DialogContent>
        </Dialog>
    )
}

/** Tombol yang membuka form di modal; form menutup modal lewat selesai(). */
export function TombolModal({ label, judul, keterangan, lebar, className, children }: {
    label: React.ReactNode; judul: string; keterangan?: string; lebar?: string; className?: string
    children: (selesai: () => void) => React.ReactNode
}) {
    const [buka, setBuka] = useState(false)
    return (
        <>
            <button type="button" onClick={() => setBuka(true)} className={className ?? tombolModalUtama}>{label}</button>
            <ModalForm open={buka} onOpenChange={setBuka} judul={judul} keterangan={keterangan} lebar={lebar}>
                {children(() => setBuka(false))}
            </ModalForm>
        </>
    )
}

/** Setelah aksi berhasil: muat ulang data halaman, lalu tutup modal (pesan berhasil sempat terlihat sebentar). */
export function useTutupSetelahBerhasil(ok: boolean | undefined, tutup: () => void, jeda = 1200) {
    const router = useRouter()
    const fn = useRef(tutup)
    fn.current = tutup
    useEffect(() => {
        if (!ok) return
        router.refresh()
        const t = setTimeout(() => fn.current(), jeda)
        return () => clearTimeout(t)
    }, [ok, router, jeda])
}
