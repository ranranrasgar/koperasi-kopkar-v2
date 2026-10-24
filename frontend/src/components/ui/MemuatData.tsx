import { Loader2 } from "lucide-react"

/**
 * Penanda sedang memuat data untuk tabel: bilah progres di tepi atas dan keterangan di tengah, di atas tabel yang
 * diredupkan (isi lama tetap terlihat supaya tampilan tidak melompat). Letakkan di dalam wadah ber-`relative`.
 */
export function MemuatData({ aktif, pesan = "Memuat data..." }: { aktif: boolean; pesan?: string }) {
    if (!aktif) return null
    return (
        <div role="status" aria-live="polite" className="absolute inset-0 z-20 bg-background/60 backdrop-blur-[1px]">
            <div className="absolute inset-x-0 top-0 h-1 overflow-hidden bg-primary/15">
                <div className="h-full w-1/3 animate-[memuat_1.1s_ease-in-out_infinite] rounded-full bg-primary" />
            </div>
            <div className="sticky top-1/3 flex justify-center pt-16">
                <span className="inline-flex items-center gap-2 rounded-full border bg-background px-4 py-2 text-sm font-medium shadow-sm">
                    <Loader2 className="h-4 w-4 animate-spin text-primary" /> {pesan}
                </span>
            </div>
        </div>
    )
}
