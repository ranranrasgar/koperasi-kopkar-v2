import { PengajuanList } from "@/components/transaksi/PengajuanList"
import { daftarPengajuan, jenisKreditPengajuan } from "@/lib/queries/keanggotaan"
import { bolehHalaman } from "@/config/akses"
import { wajibIzin } from "@/lib/operator"

export default async function PengajuanPage(props: PageProps<"/dashboard/loans/apply">) {
    const o = await wajibIzin("/dashboard/loans/apply") // layout tidak dijalankan ulang pada navigasi antarhalaman
    const [data, jenis] = await Promise.all([daftarPengajuan(await props.searchParams), jenisKreditPengajuan()])
    return <PengajuanList data={data} jenis={jenis} bolehCair={bolehHalaman("/dashboard/loans/create-cash", o.izin)} />
}
