import { KprForm } from "@/components/transaksi/KprForm"
import { jenisKredit } from "@/lib/queries/pinjaman"
import { akunKas } from "@/lib/queries/akuntansi"
import { hariIni } from "@/lib/format"
import { wajibIzin } from "@/lib/operator"

export default async function Page() {
    await wajibIzin("/dashboard/loans/create-kpr") // layout tidak dijalankan ulang pada navigasi antarhalaman
    const [jenis, kas] = await Promise.all([jenisKredit("KPR"), akunKas()])
    return <KprForm jenis={jenis} akunKas={kas} hariIni={hariIni()} />
}
