import { MatriksAkses } from "@/components/akses/KelolaAkses"
import { matriksAkses } from "@/lib/queries/akses"
import { wajibIzin } from "@/lib/operator"

export default async function KelolaAksesPage() {
    await wajibIzin("/dashboard/settings/akses") // hanya grup superadmin
    const { grup, menu } = await matriksAkses()
    return <MatriksAkses grup={grup} menu={menu} />
}
