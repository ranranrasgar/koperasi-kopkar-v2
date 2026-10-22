import { ModuleTable } from "@/components/ui/ModuleTable"
import { membersConfig } from "@/config/modules"
import { daftarAnggota } from "@/lib/queries/anggota"
import { wajibLogin } from "@/lib/operator"

export default async function MembersPage(props: PageProps<"/dashboard/members">) {
    await wajibLogin() // layout tidak dijalankan ulang pada navigasi antarhalaman
    const data = await daftarAnggota(await props.searchParams)
    return <ModuleTable config={membersConfig} data={data} />
}
