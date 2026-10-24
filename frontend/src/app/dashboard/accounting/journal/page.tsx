import { TombolJurnalBaru } from "@/components/transaksi/JurnalForm"
import { semuaAkun } from "@/lib/queries/akuntansi"
import { AksiJurnal } from "@/components/akuntansi/AksiJurnal"
import { hariIni } from "@/lib/format"
import { ModuleTable } from "@/components/ui/ModuleTable"
import { journalConfig } from "@/config/modules"
import { daftarJurnal } from "@/lib/queries/akuntansi"
import { wajibIzin } from "@/lib/operator"

export default async function JournalPage(props: PageProps<"/dashboard/accounting/journal">) {
    await wajibIzin("/dashboard/accounting/journal") // layout tidak dijalankan ulang pada navigasi antarhalaman
    const data = await daftarJurnal(await props.searchParams)
    return (
        <ModuleTable config={journalConfig} data={data} actions={<TombolJurnalBaru akun={await semuaAkun()} hariIni={hariIni()} />} aksiBaris={AksiJurnal} />
    )
}
