import { FormCard } from "@/components/transaksi/common"
import { EditorArtikel } from "@/components/panduan/EditorArtikel"
import { PanduanBelumDipasang as BelumDipasang } from "@/components/panduan/BelumDipasang"
import { PanduanBelumDipasang, pohonPanduan } from "@/lib/queries/panduan"
import { pilihanHalaman } from "@/lib/panduan-menu"
import { sp } from "@/lib/list"
import { wajibIzin } from "@/lib/operator"

export default async function ArtikelBaruPage(props: PageProps<"/dashboard/panduan/kelola/artikel/baru">) {
    await wajibIzin("/dashboard/panduan/kelola") // layout tidak dijalankan ulang pada navigasi antarhalaman
    let pohon
    try {
        pohon = await pohonPanduan(true)
    } catch (e) {
        if (e instanceof PanduanBelumDipasang) return <BelumDipasang />
        throw e
    }
    const kategoriId = Number(sp(await props.searchParams, "kategori")) || pohon.kategori[0]?.id || null
    return (
        <FormCard title="Artikel Baru" description="Tulis panduan baru. Simpan dulu sebagai draf (hapus centang Terbit) bila belum siap dibaca operator.">
            <EditorArtikel kategori={pohon.kategori.map((k) => ({ id: k.id, nama: k.nama }))} menu={pilihanHalaman()}
                awal={{ id: null, kategori_id: kategoriId, slug: "", judul: "", ringkasan: "", isi: "", href_menu: "", urutan: 0, terbit: true }} />
        </FormCard>
    )
}
