import { notFound } from "next/navigation"
import { FormCard } from "@/components/transaksi/common"
import { EditorArtikel } from "@/components/panduan/EditorArtikel"
import { PanduanBelumDipasang as BelumDipasang } from "@/components/panduan/BelumDipasang"
import { artikelPanduanId, PanduanBelumDipasang, pohonPanduan } from "@/lib/queries/panduan"
import { pilihanHalaman } from "@/lib/panduan-menu"
import { formatTanggal } from "@/lib/format"
import { sp } from "@/lib/list"
import { wajibIzin } from "@/lib/operator"

export default async function UbahArtikelPage(props: PageProps<"/dashboard/panduan/kelola/artikel/[id]">) {
    await wajibIzin("/dashboard/panduan/kelola") // layout tidak dijalankan ulang pada navigasi antarhalaman
    const id = Number((await props.params).id)
    if (!Number.isInteger(id) || id < 1) notFound()
    let data
    try {
        data = await Promise.all([artikelPanduanId(id), pohonPanduan(true)])
    } catch (e) {
        if (e instanceof PanduanBelumDipasang) return <BelumDipasang />
        throw e
    }
    const [a, pohon] = data
    if (!a) notFound()
    return (
        <FormCard title={`Ubah: ${a.judul}`} description={`Terakhir diubah ${formatTanggal(a.diubah_pada, "long")}${a.diubah_oleh ? ` oleh ${a.diubah_oleh}` : ""}.`}>
            {sp(await props.searchParams, "disimpan") && (
                <div role="status" className="mb-4 rounded-md border border-green-300 bg-green-50 dark:bg-green-500/10 p-2.5 text-sm text-green-700 dark:text-green-400">
                    Artikel ditambahkan. Lanjutkan menyunting atau kembali ke daftar panduan.
                </div>
            )}
            {/* key: muat ulang editor bila artikel berganti (mis. setelah artikel baru disimpan dan dialihkan ke sini). */}
            <EditorArtikel key={a.id} kategori={pohon.kategori.map((k) => ({ id: k.id, nama: k.nama }))} menu={pilihanHalaman()}
                awal={{ id: a.id, kategori_id: a.kategori_id, slug: a.slug, judul: a.judul, ringkasan: a.ringkasan ?? "", isi: a.isi,
                    href_menu: a.href_menu ?? "", urutan: a.urutan, terbit: a.terbit }} />
        </FormCard>
    )
}
