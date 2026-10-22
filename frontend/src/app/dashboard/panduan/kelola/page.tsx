import { FormCard } from "@/components/transaksi/common"
import { KelolaPanduan } from "@/components/panduan/KelolaPanduan"
import { PanduanBelumDipasang as BelumDipasang } from "@/components/panduan/BelumDipasang"
import { PanduanBelumDipasang, pohonPanduan } from "@/lib/queries/panduan"
import { namaHalaman } from "@/lib/panduan-menu"
import { wajibIzin } from "@/lib/operator"

export default async function KelolaPanduanPage() {
    await wajibIzin("/dashboard/panduan/kelola") // layout tidak dijalankan ulang pada navigasi antarhalaman
    let pohon
    try {
        pohon = await pohonPanduan(true)
    } catch (e) {
        if (e instanceof PanduanBelumDipasang) return <BelumDipasang />
        throw e
    }
    const jumlah = pohon.kategori.reduce((t, k) => t + k.artikel.length, 0)
    const draf = pohon.kategori.reduce((t, k) => t + k.artikel.filter((a) => !a.terbit).length, 0)
    return (
        <FormCard title="Kelola Panduan"
            description={`${pohon.kategori.length} kategori, ${jumlah} artikel${draf ? ` (${draf} draf)` : ""}. Artikel draf tidak terlihat oleh pembaca.`}>
            <KelolaPanduan kategori={pohon.kategori} namaMenu={namaHalaman()} />
        </FormCard>
    )
}
