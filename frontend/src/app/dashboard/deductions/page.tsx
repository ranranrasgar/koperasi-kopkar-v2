import { ModuleTable } from "@/components/ui/ModuleTable"
import { potonganConfig, type PageData } from "@/config/modules"
import { daftarPotongan } from "@/lib/queries/pinjaman-lap"
import { formatTanggal, hariIni } from "@/lib/format"
import { wajibIzin } from "@/lib/operator"

export default async function PotonganPage(props: PageProps<"/dashboard/deductions">) {
    await wajibIzin("/dashboard/deductions") // layout tidak dijalankan ulang pada navigasi antarhalaman
    const { jumlah, beda, ...data } = await daftarPotongan(await props.searchParams)
    return (
        <ModuleTable config={potonganConfig} data={data as unknown as PageData} jumlah={jumlah}
            keterangan={<>Proyeksi per {formatTanggal(hariIni(), "long")}. Kolom &quot;Generate Terakhir&quot; adalah total hasil generate terakhir aplikasi desktop
                (temp_potongan_all); {beda} anggota berbeda karena ada pembayaran atau pinjaman baru setelah generate itu.</>} />
    )
}
