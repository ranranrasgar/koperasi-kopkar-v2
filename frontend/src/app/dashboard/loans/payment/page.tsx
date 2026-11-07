import { AngsuranForm } from "@/components/transaksi/AngsuranForm"
import { akunKas } from "@/lib/queries/akuntansi"
import { anggotaDariAlamat } from "@/lib/queries/anggota"
import { hariIni } from "@/lib/format"
import { wajibIzin } from "@/lib/operator"
import { MENU, punyaIzin } from "@/config/akses"

export default async function Page(props: PageProps<"/dashboard/loans/payment">) {
    const o = await wajibIzin("/dashboard/loans/payment") // layout tidak dijalankan ulang pada navigasi antarhalaman
    const izin = { tunai: punyaIzin(o.izin, [MENU.angsurKoperasi, MENU.angsurBank]), kpr: punyaIzin(o.izin, [MENU.angsurKpr]) }
    const anggota = await anggotaDariAlamat(await props.searchParams)
    return <AngsuranForm key={`${anggota?.kode_agt}-${anggota?.no_pinjaman}`} anggotaAwal={anggota} akunKas={await akunKas()} hariIni={hariIni()} izin={izin} />
}
