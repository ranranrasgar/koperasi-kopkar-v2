import Link from "next/link"
import { ListTree, Table2 } from "lucide-react"
import { ModuleTable } from "@/components/ui/ModuleTable"
import { PohonCoa } from "@/components/akuntansi/PohonCoa"
import { FormPeriode } from "@/components/laporan/Periode"
import { coaConfig } from "@/config/modules"
import { daftarCoa, pohonCoa } from "@/lib/queries/akuntansi"
import { saldoPerAkun } from "@/lib/queries/laporan"
import { formatTanggal, hariIni } from "@/lib/format"
import { isTanggal, sp } from "@/lib/list"
import { wajibIzin } from "@/lib/operator"
import { cn } from "@/lib/utils"

export default async function CoaPage(props: PageProps<"/dashboard/accounting/coa">) {
    await wajibIzin("/dashboard/accounting/coa") // layout tidak dijalankan ulang pada navigasi antarhalaman
    const s = await props.searchParams
    const tabel = sp(s, "tampilan") === "tabel"
    const pilih = (aktif: boolean, href: string, Ikon: typeof ListTree, label: string) => (
        <Link href={href} aria-current={aktif ? "page" : undefined}
            className={cn("inline-flex items-center gap-1.5 px-3 h-8 rounded-md text-sm", aktif ? "bg-primary text-primary-foreground" : "hover:bg-muted text-muted-foreground")}>
            <Ikon className="h-4 w-4" /> {label}
        </Link>
    )
    const tombolTampilan = (
        <div className="inline-flex gap-1 rounded-lg border p-1 print:hidden">
            {pilih(!tabel, "?", ListTree, "Pohon")}
            {pilih(tabel, "?tampilan=tabel", Table2, "Tabel")}
        </div>
    )

    if (tabel) {
        return (
            <div className="space-y-3">
                {tombolTampilan}
                <ModuleTable config={coaConfig} data={await daftarCoa(s)} />
            </div>
        )
    }

    // Saldo per tanggal: saldo pembuka TBT tahun berjalan + jurnal sampai tanggal itu (model laporan.ts).
    const per = isTanggal(sp(s, "sampai")) ? sp(s, "sampai") : hariIni()
    const dari = `${per.slice(0, 4)}-01-01`
    const [akun, saldo] = await Promise.all([pohonCoa(), saldoPerAkun(dari, per)])
    const saldoKode = new Map(saldo.map((a) => [a.kode_perkiraan, a.akhir]))
    const baris = akun.map((a) => ({ ...a, saldo: saldoKode.get(a.kode_perkiraan) ?? 0 }))

    return (
        <div className="space-y-4">
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                <div className="flex flex-col gap-1">
                    <h1 className="text-2xl font-semibold tracking-tight text-foreground">{coaConfig.title}</h1>
                    <p className="text-sm text-muted-foreground">
                        Bagan akun bertingkat. Klik induk untuk membuka atau menutup; klik akun detail untuk melihat buku besarnya.
                    </p>
                </div>
                {tombolTampilan}
            </div>
            <FormPeriode sampai={per} satuTanggal />
            <p className="text-xs text-muted-foreground">
                Saldo per {formatTanggal(per, "long")}, di sisi normal akun (D = debit, C = kredit). Saldo induk = jumlah akun di bawahnya; merah berarti saldo berlawanan dengan sisi normal.
            </p>
            <PohonCoa baris={baris} per={per} dari={dari} />
        </div>
    )
}
