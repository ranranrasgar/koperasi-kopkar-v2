import Link from "next/link"
import { Plus } from "lucide-react"
import { AksiBuktiPinjaman } from "@/components/transaksi/TombolKwitansi"
import { Button } from "@/components/ui/button"
import { ModuleTable } from "@/components/ui/ModuleTable"
import { grupPinjamanBoleh, MENU, punyaIzin } from "@/config/akses"
import { loanLedgerConfig } from "@/config/modules"
import { formatRupiah } from "@/lib/format"
import { wajibIzin } from "@/lib/operator"
import { jenisKredit } from "@/lib/queries/pinjaman"
import { bukuPinjaman, totalBukuPinjaman } from "@/lib/queries/pinjaman-buku"

export default async function BukuPinjamanPage(props: PageProps<"/dashboard/loans/ledger">) {
    const o = await wajibIzin("/dashboard/loans/ledger") // layout tidak dijalankan ulang pada navigasi antarhalaman
    const s = await props.searchParams
    const grupBoleh = grupPinjamanBoleh(o.izin)
    const [data, total, jenis] = await Promise.all([bukuPinjaman(s, grupBoleh), totalBukuPinjaman(s, grupBoleh), jenisKredit()])
    const config = {
        ...loanLedgerConfig,
        filters: loanLedgerConfig.filters?.map((f) => f.key === "grup" ? { ...f, options: grupBoleh.map((g) => ({ label: g, value: g })) }
            : f.key === "kredit" ? { ...f, options: jenis.filter((j) => grupBoleh.includes(j.group_pinjaman)).map((j) => ({ label: j.nama_kredit, value: j.kode_kredit })) }
            : f),
    }
    return (
        <ModuleTable config={config} data={data} aksiBaris={AksiBuktiPinjaman}
            keterangan={grupBoleh.length === 0 ? "Grup Anda tidak punya akses ke data pinjaman."
                : <>Total hasil saringan: <b className="tabular-nums">{formatRupiah(total.total)}</b> (pokok {formatRupiah(total.pokok)}, jasa {formatRupiah(total.jasa)}).</>}
            actions={punyaIzin(o.izin, [MENU.angsurKoperasi, MENU.angsurBank, MENU.angsurKpr]) && (
                <Button asChild size="sm" className="h-9 bg-blue-600 hover:bg-blue-700 text-white">
                    <Link href="/dashboard/loans/payment"><Plus className="mr-1.5 h-4 w-4" /> Setoran Angsuran</Link>
                </Button>
            )} />
    )
}
