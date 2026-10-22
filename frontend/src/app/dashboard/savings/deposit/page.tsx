import { SimpananForm } from "@/components/transaksi/SimpananForm"
import { jenisSimpanan } from "@/lib/queries/simpanan"
import { akunKas } from "@/lib/queries/akuntansi"
import { hariIni } from "@/lib/format"

export default async function Page() {
    const [jenis, kas] = await Promise.all([jenisSimpanan(), akunKas()])
    return <SimpananForm tipe="setor" jenis={jenis} akunKas={kas} hariIni={hariIni()} />
}
