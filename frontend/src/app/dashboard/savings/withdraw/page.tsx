import { SimpananForm } from "@/components/transaksi/SimpananForm"
import { jenisSimpanan } from "@/lib/queries/simpanan"
import { akunKas } from "@/lib/queries/akuntansi"
import { hariIni } from "@/lib/format"
import { wajibIzin } from "@/lib/operator"

export default async function Page(props: PageProps<"/dashboard/savings/withdraw">) {
    await wajibIzin("/dashboard/savings/withdraw") // layout tidak dijalankan ulang pada navigasi antarhalaman
    const [jenis, kas] = await Promise.all([jenisSimpanan(), akunKas()])
    return <SimpananForm tipe="ambil" jenis={jenis} akunKas={kas} hariIni={hariIni()} jenisAwal={(await props.searchParams).jenis as string | undefined} />
}
