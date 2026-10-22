import Link from "next/link"
import { Plus, Minus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ModuleTable } from "@/components/ui/ModuleTable"
import { savingsLedgerConfig } from "@/config/modules"
import { bukuSimpanan, jenisSimpanan } from "@/lib/queries/simpanan"

export default async function SavingsLedgerPage(props: PageProps<"/dashboard/savings/ledger">) {
    const [data, jenis] = await Promise.all([bukuSimpanan(await props.searchParams), jenisSimpanan()])
    const config = {
        ...savingsLedgerConfig,
        filters: savingsLedgerConfig.filters?.map((f) => f.key === "jenis"
            ? { ...f, options: jenis.map((j) => ({ label: j.nama_simpanan, value: j.kode_simpanan })) }
            : f),
    }
    return (
        <ModuleTable config={config} data={data} actions={
            <>
                <Button asChild size="sm" variant="outline" className="h-9">
                    <Link href="/dashboard/savings/withdraw"><Minus className="mr-1.5 h-4 w-4" /> Pengambilan</Link>
                </Button>
                <Button asChild size="sm" className="h-9 bg-blue-600 hover:bg-blue-700 text-white">
                    <Link href="/dashboard/savings/deposit"><Plus className="mr-1.5 h-4 w-4" /> Setoran</Link>
                </Button>
            </>
        } />
    )
}
