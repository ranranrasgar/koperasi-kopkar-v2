import { Card, CardContent } from "@/components/ui/card"
import { TombolCetak } from "@/components/ui/TombolCetak"
import { TombolEkspor } from "@/components/laporan/TombolEkspor"

/**
 * Kerangka halaman laporan, sama dengan halaman daftar (mis. Daftar Anggota): judul dan keterangan di kiri, tombol Cetak dan Ekspor
 * di kanan, lalu kartu berisi baris filter (`filter`) di atas isi laporan (`children`, memuat KopLaporan untuk dokumen cetak).
 */
export function HalamanLaporan({ title, description, filter, ekspor, children }: {
    title: string; description: string; filter: React.ReactNode; ekspor: { nama: string; baris: string[][] }; children: React.ReactNode
}) {
    return (
        <div className="space-y-4 relative">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                <div className="flex flex-col gap-1">
                    <h1 className="text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
                    <p className="text-sm text-muted-foreground">{description}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0 print:hidden">
                    <TombolCetak />
                    <TombolEkspor nama={ekspor.nama} baris={ekspor.baris} />
                </div>
            </div>
            <Card className="bg-background border border-outline-variant shadow-sm rounded-lg overflow-clip py-0 gap-0">
                <div className="p-3 border-b flex flex-wrap items-center gap-x-4 gap-y-2 bg-background print:hidden">{filter}</div>
                <CardContent className="p-4">{children}</CardContent>
            </Card>
        </div>
    )
}
