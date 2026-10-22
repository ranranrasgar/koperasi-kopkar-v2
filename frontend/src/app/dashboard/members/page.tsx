import { ModuleTable } from "@/components/ui/ModuleTable"
import { membersConfig } from "@/config/modules"
import { daftarAnggota } from "@/lib/queries/anggota"
import { wajibIzin } from "@/lib/operator"

export default async function MembersPage(props: PageProps<"/dashboard/members">) {
    await wajibIzin("/dashboard/members") // layout tidak dijalankan ulang pada navigasi antarhalaman
    const data = await daftarAnggota(await props.searchParams)
    return <ModuleTable config={membersConfig} data={data} />
}
