import { NavPanduan } from "@/components/panduan/NavPanduan"
import { PanduanBelumDipasang as BelumDipasang } from "@/components/panduan/BelumDipasang"
import { PanduanBelumDipasang, pohonPanduan } from "@/lib/queries/panduan"
import { adminPanduan, wajibLogin } from "@/lib/operator"
import { MENU } from "@/config/akses"

// Kerangka Pusat Panduan: navigasi kategori/artikel di kiri, isi di kanan (gaya pusat bantuan).
export default async function PanduanLayout({ children }: { children: React.ReactNode }) {
    const o = await wajibLogin()
    let pohon
    try {
        pohon = await pohonPanduan(false, adminPanduan(o))
    } catch (e) {
        if (e instanceof PanduanBelumDipasang) return <BelumDipasang />
        throw e
    }
    const kategori = pohon.kategori.filter((k) => k.artikel.length > 0)
        .map((k) => ({ slug: k.slug, nama: k.nama, ikon: k.ikon, artikel: k.artikel.map((a) => ({ slug: a.slug, judul: a.judul })) }))
    return (
        <div className="xl:flex xl:gap-10 -mt-2">
            <NavPanduan kategori={kategori} bolehKelola={o.izin.includes(MENU.kelolaPanduan)} />
            <div className="min-w-0 flex-1">{children}</div>
        </div>
    )
}
