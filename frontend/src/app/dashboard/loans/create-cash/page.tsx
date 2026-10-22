import { PinjamanForm } from "@/components/transaksi/PinjamanForm"
import { jenisKredit } from "@/lib/queries/pinjaman"
import { akunKas } from "@/lib/queries/akuntansi"
import { hariIni } from "@/lib/format"

export default async function Page() {
    const [jenis, kas] = await Promise.all([jenisKredit(), akunKas()])
    // KPR punya form sendiri (titipan tanpa bunga).
    return <PinjamanForm jenis={jenis.filter((j) => j.group_pinjaman !== "KPR")} akunKas={kas} hariIni={hariIni()} />
}
