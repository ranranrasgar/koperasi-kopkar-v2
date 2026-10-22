import { ModuleTable } from "@/components/ui/ModuleTable"
import { coaConfig } from "@/config/modules"
import { daftarCoa } from "@/lib/queries/akuntansi"
import { wajibIzin } from "@/lib/operator"

export default async function CoaPage(props: PageProps<"/dashboard/accounting/coa">) {
    await wajibIzin("/dashboard/accounting/coa") // layout tidak dijalankan ulang pada navigasi antarhalaman
    const data = await daftarCoa(await props.searchParams)
    return <ModuleTable config={coaConfig} data={data} />
}
