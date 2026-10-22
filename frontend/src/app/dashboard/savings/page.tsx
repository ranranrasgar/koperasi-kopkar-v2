import { SavingsSummary } from "@/components/ui/SavingsSummary"
import { rekapSimpanan } from "@/lib/queries/simpanan"
import { hariIni } from "@/lib/format"
import { isTanggal, sp } from "@/lib/list"

export default async function SavingsSummaryPage(props: PageProps<"/dashboard/savings">) {
    const s = await props.searchParams
    // Bawaan: saldo s/d hari ini.
    const endDate = isTanggal(sp(s, "endDate")) ? sp(s, "endDate") : hariIni()
    const { grandTotal, ...data } = await rekapSimpanan({ ...s, endDate })
    return <SavingsSummary data={data} grandTotal={grandTotal} endDate={endDate} />
}
