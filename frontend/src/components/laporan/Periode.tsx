import { identitasKoperasi } from "@/lib/koperasi"
import { Input } from "@/components/ui/input"
import { TombolCetak } from "@/components/ui/TombolCetak"

/** Form GET periode laporan (dari/sampai) beserta isian tambahan, satu baris seperti filter di daftar. `tanpaCetak`: tombol Cetak sudah ada di judul halaman. */
export function FormPeriode({ dari, sampai, satuTanggal, tanpaCetak, children }: {
    dari?: string; sampai: string; satuTanggal?: boolean; tanpaCetak?: boolean; children?: React.ReactNode
}) {
    const label = "text-xs font-medium text-muted-foreground whitespace-nowrap"
    return (
        <form method="get" className="flex flex-wrap items-center gap-2 print:hidden">
            {children}
            {!satuTanggal && (
                <label className="flex items-center gap-1.5">
                    <span className={label}>Dari</span>
                    <Input type="date" name="dari" defaultValue={dari} required className="h-9 w-auto" />
                </label>
            )}
            <label className="flex items-center gap-1.5">
                <span className={label}>{satuTanggal ? "Per tanggal" : "Sampai"}</span>
                <Input type="date" name="sampai" defaultValue={sampai} required className="h-9 w-auto" />
            </label>
            <button type="submit" className="h-9 px-4 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold">Tampilkan</button>
            {!tanpaCetak && <TombolCetak />}
        </form>
    )
}

/** Judul laporan di layar (penanda untuk cetak: judul dan periode dipakai dokumen cetak, blok ini sendiri tidak ikut tercetak). */
export async function KopLaporan({ judul, periode }: { judul: string; periode: string }) {
    const { nama } = await identitasKoperasi()
    return (
        <div className="text-center mb-4" data-kop-laporan data-judul={judul} data-periode={periode} data-tanpa-cetak>
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{nama}</div>
            <h2 className="text-lg font-bold">{judul}</h2>
            <div className="text-sm text-muted-foreground">{periode}</div>
        </div>
    )
}
