import { KelolaOperator } from "@/components/akses/KelolaAkses"
import { daftarOperator, semuaGrup } from "@/lib/queries/akses"
import { wajibIzin } from "@/lib/operator"

export default async function OperatorPage() {
    const o = await wajibIzin("/dashboard/settings/operator") // hanya grup superadmin
    const [operator, grup] = await Promise.all([daftarOperator(), semuaGrup()])
    return <KelolaOperator operator={operator} grup={grup} sayaId={o.id} />
}
