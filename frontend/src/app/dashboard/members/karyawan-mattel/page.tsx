import { ModuleTable } from "@/components/ui/ModuleTable"
import { karyawanMattelConfig } from "@/config/modules"
import { daftarKaryawanMattel } from "@/lib/queries/keanggotaan"
import { wajibIzin } from "@/lib/operator"

export default async function KaryawanMattelPage(props: PageProps<"/dashboard/members/karyawan-mattel">) {
    await wajibIzin("/dashboard/members/karyawan-mattel") // layout tidak dijalankan ulang pada navigasi antarhalaman
    return <ModuleTable config={karyawanMattelConfig} data={await daftarKaryawanMattel(await props.searchParams)} />
}
