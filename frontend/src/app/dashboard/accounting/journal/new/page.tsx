import { JurnalForm } from "@/components/transaksi/JurnalForm"
import { semuaAkun } from "@/lib/queries/akuntansi"
import { hariIni } from "@/lib/format"

export default async function Page() {
    return <JurnalForm akun={await semuaAkun()} hariIni={hariIni()} />
}
