import { ModuleTable } from "@/components/ui/ModuleTable"
import { coaConfig } from "@/config/modules"
import { daftarCoa } from "@/lib/queries/akuntansi"

export default async function CoaPage(props: PageProps<"/dashboard/accounting/coa">) {
    const data = await daftarCoa(await props.searchParams)
    return <ModuleTable config={coaConfig} data={data} />
}
