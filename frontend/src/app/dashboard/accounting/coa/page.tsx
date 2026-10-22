import { ModuleTable } from "@/components/ui/ModuleTable"
import { coaConfig } from "@/config/modules"
import { daftarCoa } from "@/lib/queries/akuntansi"
import { wajibLogin } from "@/lib/operator"

export default async function CoaPage(props: PageProps<"/dashboard/accounting/coa">) {
    await wajibLogin() // layout tidak dijalankan ulang pada navigasi antarhalaman
    const data = await daftarCoa(await props.searchParams)
    return <ModuleTable config={coaConfig} data={data} />
}
