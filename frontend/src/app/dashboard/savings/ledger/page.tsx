import { AksiBuktiSimpanan } from "@/components/transaksi/TombolKwitansi"
import Link from "next/link"
import { Plus, Minus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ModuleTable } from "@/components/ui/ModuleTable"
import { savingsLedgerConfig } from "@/config/modules"
import { RingkasanBukuSimpanan } from "@/components/simpanan/RingkasanBukuSimpanan"
import { bukuSimpanan, jenisSimpanan, ringkasanBukuSimpanan } from "@/lib/queries/simpanan"
import { isTanggal, sp } from "@/lib/list"
import { wajibIzin } from "@/lib/operator"
import { MENU } from "@/config/akses"

export default async function SavingsLedgerPage(props: PageProps<"/dashboard/savings/ledger">) {
    const o = await wajibIzin("/dashboard/savings/ledger") // layout tidak dijalankan ulang pada navigasi antarhalaman
    const s = await props.searchParams
    const [data, jenis, ringkasan] = await Promise.all([bukuSimpanan(s), jenisSimpanan(), ringkasanBukuSimpanan(s)])
    const config = {
        ...savingsLedgerConfig,
        filters: savingsLedgerConfig.filters?.map((f) => f.key === "jenis"
            ? { ...f, options: jenis.map((j) => ({ label: j.nama_simpanan, value: j.kode_simpanan })) }
            : f),
    }
    return (
        // key: kotak cari mengikuti alamat saat anggota dipilih dari ringkasan.
        <ModuleTable key={sp(s, "search")} config={config} data={data} aksiBaris={AksiBuktiSimpanan} ringkasan={ringkasan && (
            <RingkasanBukuSimpanan data={ringkasan} s={s} jenisAktif={sp(s, "jenis")} bolehKartu={o.izin.includes(MENU.kartuSimpanan)}
                sampai={isTanggal(sp(s, "sampai")) ? sp(s, "sampai") : ""} />
        )} actions={
            <>
                {o.izin.includes(MENU.pencairanSimpanan) && (
                    <Button asChild size="sm" variant="outline" className="h-9">
                        <Link href="/dashboard/savings/withdraw"><Minus className="mr-1.5 h-4 w-4" /> Pengambilan</Link>
                    </Button>
                )}
                {o.izin.includes(MENU.setoranSimpanan) && (
                    <Button asChild size="sm" className="h-9 bg-blue-600 hover:bg-blue-700 text-white">
                        <Link href="/dashboard/savings/deposit"><Plus className="mr-1.5 h-4 w-4" /> Setoran</Link>
                    </Button>
                )}
            </>
        } />
    )
}
