import { ModuleTable } from "@/components/ui/ModuleTable"
import { karyawanMattelConfig } from "@/config/modules"
import { daftarKaryawanMattel } from "@/lib/queries/keanggotaan"
import { wajibIzin } from "@/lib/operator"
import { MENU } from "@/config/akses"
import { AksiKaryawanMattel } from "@/components/master/AksiKaryawanMattel"

export default async function KaryawanMattelPage(props: PageProps<"/dashboard/members/karyawan-mattel">) {
    const operator = await wajibIzin("/dashboard/members/karyawan-mattel") // layout tidak dijalankan ulang pada navigasi antarhalaman
    const bolehUbah = operator.izin.includes(MENU.karyawanMattel) || operator.izin.includes(MENU.daftarKaryawan)
    return <ModuleTable config={karyawanMattelConfig} data={await daftarKaryawanMattel(await props.searchParams)}
        aksiBaris={bolehUbah ? AksiKaryawanMattel : undefined} />
}
