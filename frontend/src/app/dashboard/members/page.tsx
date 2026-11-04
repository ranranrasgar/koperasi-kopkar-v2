import { ModuleTable } from "@/components/ui/ModuleTable"
import { membersConfig } from "@/config/modules"
import { daftarAnggota } from "@/lib/queries/anggota"
import { wajibIzin } from "@/lib/operator"
import { MENU } from "@/config/akses"
import { AksiAnggota } from "@/components/master/AksiAnggota"
import { TombolTambahAnggota } from "@/components/master/TombolTambahAnggota"

export default async function MembersPage(props: PageProps<"/dashboard/members">) {
    const operator = await wajibIzin("/dashboard/members") // layout tidak dijalankan ulang pada navigasi antarhalaman
    const data = await daftarAnggota(await props.searchParams)
    const bolehUbah = operator.izin.includes(MENU.daftarAnggota)
    return <ModuleTable config={membersConfig} data={data} aksiBaris={bolehUbah ? AksiAnggota : undefined}
        actions={operator.izin.includes(MENU.inputAnggota) ? <TombolTambahAnggota /> : undefined} />
}
