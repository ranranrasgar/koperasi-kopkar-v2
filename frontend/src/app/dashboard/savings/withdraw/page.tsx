import { SimpananForm } from "@/components/transaksi/SimpananForm"
import { jenisSimpanan } from "@/lib/queries/simpanan"
import { akunKas } from "@/lib/queries/akuntansi"
import { hariIni } from "@/lib/format"
import { wajibLogin } from "@/lib/operator"

export default async function Page() {
    await wajibLogin() // layout tidak dijalankan ulang pada navigasi antarhalaman
    const [jenis, kas] = await Promise.all([jenisSimpanan(), akunKas()])
    return <SimpananForm tipe="ambil" jenis={jenis} akunKas={kas} hariIni={hariIni()} />
}
