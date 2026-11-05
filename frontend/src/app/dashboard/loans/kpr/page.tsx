import { DaftarKpr } from "@/components/ui/DaftarKpr"
import { daftarKpr, jenisKpr, tahunKpr } from "@/lib/queries/kpr"
import { sp } from "@/lib/list"
import { wajibIzin } from "@/lib/operator"

export const dynamic = "force-dynamic"

/** Daftar KPR: titipan angsuran ke bank, dari tabel kpr. */
export default async function DaftarKprPage(props: PageProps<"/dashboard/loans/kpr">) {
    await wajibIzin("/dashboard/loans/kpr") // layout tidak dijalankan ulang pada navigasi antarhalaman
    const s = await props.searchParams
    const filter = {
        keyword: sp(s, "keyword").trim().slice(0, 60), kredit: sp(s, "kredit"), status: sp(s, "status"), aktif: sp(s, "aktif") || "Y",
        bulan: sp(s, "bulan"), tahun: sp(s, "tahun"),
    }
    const [data, jenis, tahun] = await Promise.all([
        daftarKpr({ ...filter, bulan: parseInt(filter.bulan, 10) || 0, tahun: parseInt(filter.tahun, 10) || 0 }), jenisKpr(), tahunKpr(),
    ])
    return <DaftarKpr data={data} filter={filter} jenis={jenis} daftarTahun={tahun.map((t) => t.tahun)} />
}
