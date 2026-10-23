"use client"

import { useEffect, useRef, useState } from "react"
import { ImagePlus, X } from "lucide-react"
import { kompresGambar } from "@/lib/kompres-gambar"

/**
 * Pilih gambar (opsional), dikecilkan di browser, lalu dikirim sebagai isian form bernama `gambar`.
 * Gambar yang sudah ada (ubah pengumuman) tampil dengan pilihan "hapus gambar" (isian `hapusGambar`).
 */
export function PilihGambar({ gambarAda }: { gambarAda?: string | null }) {
    const tujuan = useRef<HTMLInputElement>(null)
    const [pratinjau, setPratinjau] = useState<string | null>(null)
    const [info, setInfo] = useState<string | null>(null)
    const [galat, setGalat] = useState<string | null>(null)
    const [hapus, setHapus] = useState(false)

    useEffect(() => () => { if (pratinjau) URL.revokeObjectURL(pratinjau) }, [pratinjau])

    const kosongkan = () => {
        if (tujuan.current) tujuan.current.value = ""
        setPratinjau(null); setInfo(null)
    }
    const pilih = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const asli = e.target.files?.[0]
        e.target.value = "" // pilihan asli tidak ikut terkirim; yang terkirim hanya hasil kompres di input tujuan
        setGalat(null)
        if (!asli) return
        try {
            const kecil = await kompresGambar(asli)
            const dt = new DataTransfer()
            dt.items.add(kecil)
            if (tujuan.current) tujuan.current.files = dt.files
            setPratinjau(URL.createObjectURL(kecil))
            setInfo(`${Math.round(kecil.size / 1024)} KB (dikecilkan dari ${Math.round(asli.size / 1024)} KB)`)
        } catch (err) {
            kosongkan()
            setGalat(err instanceof Error ? err.message : "Gambar tidak bisa dipakai")
        }
    }

    const tampil = pratinjau ?? (gambarAda && !hapus ? `/dashboard/gambar/${gambarAda}` : null)
    return (
        <div className="space-y-2">
            <input ref={tujuan} type="file" name="gambar" className="hidden" tabIndex={-1} />
            {tampil && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={tampil} alt="Pratinjau gambar" className="max-h-40 rounded-md border object-contain" />
            )}
            <div className="flex flex-wrap items-center gap-3 text-sm">
                <label className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-md border px-3 font-semibold hover:bg-muted">
                    <ImagePlus className="h-4 w-4" /> {tampil ? "Ganti gambar" : "Pilih gambar"}
                    <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={pilih} />
                </label>
                {pratinjau && (
                    <button type="button" onClick={kosongkan} className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground">
                        <X className="h-4 w-4" /> Batalkan pilihan
                    </button>
                )}
                {gambarAda && !pratinjau && (
                    <label className="flex items-center gap-2 text-muted-foreground">
                        <input type="checkbox" name="hapusGambar" checked={hapus} onChange={(e) => setHapus(e.target.checked)} /> Hapus gambar ini
                    </label>
                )}
            </div>
            {info && <p className="text-[11px] text-muted-foreground">{info}</p>}
            {galat && <p role="alert" className="text-xs text-red-600">{galat}</p>}
        </div>
    )
}
