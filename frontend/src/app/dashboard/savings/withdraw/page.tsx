import { SimpananForm } from "@/components/transaksi/SimpananForm"
import { anggotaDariAlamat } from "@/lib/queries/anggota"
import { jenisSimpanan } from "@/lib/queries/simpanan"
import { akunKas } from "@/lib/queries/akuntansi"
import { hariIni } from "@/lib/format"
import { wajibIzin } from "@/lib/operator"

export default async function Page(props: PageProps<"/dashboard/savings/withdraw">) {
    await wajibIzin("/dashboard/savings/withdraw") // layout tidak dijalankan ulang pada navigasi antarhalaman
    const s = await props.searchParams
    const [jenis, kas, anggota] = await Promise.all([jenisSimpanan(), akunKas(), anggotaDariAlamat(s)])
    return <SimpananForm key={anggota?.kode_agt} anggotaAwal={anggota} tipe="ambil" jenis={jenis} akunKas={kas} hariIni={hariIni()} jenisAwal={s.jenis as string | undefined} />
}
