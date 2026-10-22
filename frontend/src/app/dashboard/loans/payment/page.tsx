import { AngsuranForm } from "@/components/transaksi/AngsuranForm"
import { akunKas } from "@/lib/queries/akuntansi"
import { hariIni } from "@/lib/format"
import { wajibLogin } from "@/lib/operator"

export default async function Page() {
    await wajibLogin() // layout tidak dijalankan ulang pada navigasi antarhalaman
    return <AngsuranForm akunKas={await akunKas()} hariIni={hariIni()} />
}
