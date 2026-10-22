import { JurnalForm } from "@/components/transaksi/JurnalForm"
import { semuaAkun } from "@/lib/queries/akuntansi"
import { hariIni } from "@/lib/format"
import { wajibLogin } from "@/lib/operator"

export default async function Page() {
    await wajibLogin() // layout tidak dijalankan ulang pada navigasi antarhalaman
    return <JurnalForm akun={await semuaAkun()} hariIni={hariIni()} />
}
