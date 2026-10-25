import { TombolJurnalBaru } from "@/components/transaksi/JurnalForm"
import { AksiJurnal } from "@/components/akuntansi/AksiJurnal"
import { ModuleTable } from "@/components/ui/ModuleTable"
import { adjustingConfig } from "@/config/modules"
import { daftarJurnal, semuaAkun } from "@/lib/queries/akuntansi"
import { hariIni } from "@/lib/format"
import { wajibIzin } from "@/lib/operator"

export default async function JurnalPenyesuaianPage(props: PageProps<"/dashboard/accounting/adjusting">) {
    await wajibIzin("/dashboard/accounting/adjusting") // layout tidak dijalankan ulang pada navigasi antarhalaman
    const data = await daftarJurnal(await props.searchParams, { penyesuaian: true })
    return (
        <ModuleTable config={adjustingConfig} data={data} actions={<TombolJurnalBaru akun={await semuaAkun()} hariIni={hariIni()} penyesuaian />} aksiBaris={AksiJurnal} />
    )
}
