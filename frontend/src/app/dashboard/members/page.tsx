import { ModuleTable } from "@/components/ui/ModuleTable"
import { membersConfig } from "@/config/modules"
import { daftarAnggota } from "@/lib/queries/anggota"

export default async function MembersPage(props: PageProps<"/dashboard/members">) {
    const data = await daftarAnggota(await props.searchParams)
    return <ModuleTable config={membersConfig} data={data} />
}
