import { TitipanForm } from "@/components/transaksi/TitipanForm"
import { akunKas } from "@/lib/queries/akuntansi"
import { anggotaDariAlamat } from "@/lib/queries/anggota"
import { hariIni } from "@/lib/format"
import { wajibIzin } from "@/lib/operator"
import { MENU, punyaIzin } from "@/config/akses"

export default async function Page(props: PageProps<"/dashboard/loans/titipan">) {
    const o = await wajibIzin("/dashboard/loans/titipan") // layout tidak dijalankan ulang pada navigasi antarhalaman
    const anggota = await anggotaDariAlamat(await props.searchParams)
    return <TitipanForm key={anggota?.kode_agt} anggotaAwal={anggota} akunKas={await akunKas()} hariIni={hariIni()} bolehAngsur={punyaIzin(o.izin, [MENU.angsurKoperasi, MENU.angsurBank])} />
}
