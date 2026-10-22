import { KprForm } from "@/components/transaksi/KprForm"
import { jenisKredit } from "@/lib/queries/pinjaman"
import { akunKas } from "@/lib/queries/akuntansi"
import { hariIni } from "@/lib/format"

export default async function Page() {
    const [jenis, kas] = await Promise.all([jenisKredit("KPR"), akunKas()])
    return <KprForm jenis={jenis} akunKas={kas} hariIni={hariIni()} />
}
