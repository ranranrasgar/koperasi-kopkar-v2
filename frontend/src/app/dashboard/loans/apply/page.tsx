import { PengajuanList } from "@/components/transaksi/PengajuanList"
import { daftarPengajuan } from "@/lib/queries/keanggotaan"
import { sp } from "@/lib/list"
import { bolehHalaman } from "@/config/akses"
import { wajibIzin } from "@/lib/operator"

export default async function PengajuanPage(props: PageProps<"/dashboard/loans/apply">) {
    const o = await wajibIzin("/dashboard/loans/apply") // layout tidak dijalankan ulang pada navigasi antarhalaman
    const s = await props.searchParams
    const status = s.status === undefined ? "P" : sp(s, "status")
    const data = await daftarPengajuan(["P", "Y", "N", ""].includes(status) ? status : "P")
    return <PengajuanList data={data} bolehCair={bolehHalaman("/dashboard/loans/create-cash", o.izin)} />
}
