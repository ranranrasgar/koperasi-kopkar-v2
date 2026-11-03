import { TitipanForm } from "@/components/transaksi/TitipanForm"
import { akunKas } from "@/lib/queries/akuntansi"
import { hariIni } from "@/lib/format"
import { wajibIzin } from "@/lib/operator"
import { MENU, punyaIzin } from "@/config/akses"

export default async function Page() {
    const o = await wajibIzin("/dashboard/loans/titipan") // layout tidak dijalankan ulang pada navigasi antarhalaman
    return <TitipanForm akunKas={await akunKas()} hariIni={hariIni()} bolehAngsur={punyaIzin(o.izin, [MENU.angsurKoperasi, MENU.angsurBank])} />
}
