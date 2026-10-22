import { AngsuranForm } from "@/components/transaksi/AngsuranForm"
import { akunKas } from "@/lib/queries/akuntansi"
import { hariIni } from "@/lib/format"

export default async function Page() {
    return <AngsuranForm akunKas={await akunKas()} hariIni={hariIni()} />
}
