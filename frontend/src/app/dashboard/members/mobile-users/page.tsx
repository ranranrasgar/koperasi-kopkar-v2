import { ModuleTable } from "@/components/ui/ModuleTable"
import { AksiUserMobile } from "@/components/master/AksiUserMobile"
import { userMobileConfig } from "@/config/modules"
import { daftarUserMobile } from "@/lib/queries/keanggotaan"
import { wajibIzin } from "@/lib/operator"

export const dynamic = "force-dynamic"

export default async function UserMobilePage(props: PageProps<"/dashboard/members/mobile-users">) {
    await wajibIzin("/dashboard/members/mobile-users") // layout tidak dijalankan ulang pada navigasi antarhalaman
    return <ModuleTable config={userMobileConfig} data={await daftarUserMobile(await props.searchParams)} aksiBaris={AksiUserMobile} />
}
