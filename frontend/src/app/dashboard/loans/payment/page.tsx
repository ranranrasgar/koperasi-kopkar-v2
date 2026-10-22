import { AngsuranForm } from "@/components/transaksi/AngsuranForm"
import { akunKas } from "@/lib/queries/akuntansi"
import { hariIni } from "@/lib/format"
import { wajibIzin } from "@/lib/operator"
import { MENU, punyaIzin } from "@/config/akses"

export default async function Page() {
    const o = await wajibIzin("/dashboard/loans/payment") // layout tidak dijalankan ulang pada navigasi antarhalaman
    const izin = { tunai: punyaIzin(o.izin, [MENU.angsurKoperasi, MENU.angsurBank]), kpr: punyaIzin(o.izin, [MENU.angsurKpr]) }
    return <AngsuranForm akunKas={await akunKas()} hariIni={hariIni()} izin={izin} />
}
