import Link from "next/link"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ModuleTable } from "@/components/ui/ModuleTable"
import { journalConfig } from "@/config/modules"
import { daftarJurnal } from "@/lib/queries/akuntansi"
import { wajibIzin } from "@/lib/operator"

export default async function JournalPage(props: PageProps<"/dashboard/accounting/journal">) {
    await wajibIzin("/dashboard/accounting/journal") // layout tidak dijalankan ulang pada navigasi antarhalaman
    const data = await daftarJurnal(await props.searchParams)
    return (
        <ModuleTable config={journalConfig} data={data} actions={
            <Button asChild size="sm" className="h-9 bg-blue-600 hover:bg-blue-700 text-white">
                <Link href="/dashboard/accounting/journal/new"><Plus className="mr-1.5 h-4 w-4" /> Jurnal Baru</Link>
            </Button>
        } />
    )
}
