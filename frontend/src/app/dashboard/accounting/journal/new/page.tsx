import { JurnalForm } from "@/components/transaksi/JurnalForm"
import { semuaAkun } from "@/lib/queries/akuntansi"
import { hariIni } from "@/lib/format"
import { wajibIzin } from "@/lib/operator"

export default async function Page() {
    await wajibIzin("/dashboard/accounting/journal/new") // layout tidak dijalankan ulang pada navigasi antarhalaman
    return <JurnalForm akun={await semuaAkun()} hariIni={hariIni()} />
}
