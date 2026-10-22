import { Input } from "@/components/ui/input"
import { TombolCetak } from "@/components/ui/TombolCetak"

/** Form GET periode laporan (dari/sampai) beserta isian tambahan. */
export function FormPeriode({ dari, sampai, satuTanggal, children }: {
    dari?: string; sampai: string; satuTanggal?: boolean; children?: React.ReactNode
}) {
    return (
        <form method="get" className="flex flex-wrap items-end gap-3 print:hidden">
            {children}
            {!satuTanggal && (
                <label className="text-xs text-muted-foreground space-y-1">
                    <span className="block font-semibold">Dari</span>
                    <Input type="date" name="dari" defaultValue={dari} required />
                </label>
            )}
            <label className="text-xs text-muted-foreground space-y-1">
                <span className="block font-semibold">{satuTanggal ? "Per Tanggal" : "Sampai"}</span>
                <Input type="date" name="sampai" defaultValue={sampai} required />
            </label>
            <button type="submit" className="h-9 px-4 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold">Tampilkan</button>
            <TombolCetak />
        </form>
    )
}

export function KopLaporan({ judul, periode }: { judul: string; periode: string }) {
    return (
        <div className="text-center mb-4">
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Koperasi Karyawan Mattel MJS 2000</div>
            <h2 className="text-lg font-bold">{judul}</h2>
            <div className="text-sm text-muted-foreground">{periode}</div>
        </div>
    )
}
