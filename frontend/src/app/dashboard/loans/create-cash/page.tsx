import { PinjamanForm } from "@/components/transaksi/PinjamanForm"
import { jenisKredit } from "@/lib/queries/pinjaman"
import { akunKas } from "@/lib/queries/akuntansi"
import { hariIni } from "@/lib/format"
import { wajibIzin } from "@/lib/operator"
import { MENU_CAIR_GRUP } from "@/config/akses"

export default async function Page() {
    const o = await wajibIzin("/dashboard/loans/create-cash") // layout tidak dijalankan ulang pada navigasi antarhalaman
    const [jenis, kas] = await Promise.all([jenisKredit(), akunKas()])
    // KPR punya form sendiri (titipan tanpa bunga); grup lain hanya bila grup operator berizin mencairkannya.
    const boleh = jenis.filter((j) => MENU_CAIR_GRUP[j.group_pinjaman] && o.izin.includes(MENU_CAIR_GRUP[j.group_pinjaman]))
    return <PinjamanForm jenis={boleh} akunKas={kas} hariIni={hariIni()} />
}
