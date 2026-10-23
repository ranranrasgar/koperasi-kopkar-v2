import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { IsiPanduan } from "@/components/panduan/IsiPanduan"
import { TombolCetak } from "@/components/ui/TombolCetak"
import { artikelPanduan, pohonPanduan } from "@/lib/queries/panduan"
import { daftarIsi } from "@/lib/panduan-teks"
import { formatTanggal } from "@/lib/format"
import { wajibIzin } from "@/lib/operator"
import { allGroups } from "@/config/menu"
import { MENU } from "@/config/akses"

const namaMenu = (href: string) => allGroups.flatMap((g) => g.items).find((i) => i.href === href)?.label

export async function generateMetadata(props: PageProps<"/dashboard/panduan/[slug]">): Promise<Metadata> {
    const a = await artikelPanduan((await props.params).slug)
    return { title: a ? `${a.judul} · Pusat Panduan` : "Pusat Panduan" }
}

export default async function ArtikelPanduanPage(props: PageProps<"/dashboard/panduan/[slug]">) {
    const o = await wajibIzin("/dashboard/panduan") // semua operator yang login boleh membaca
    const { slug } = await props.params
    const [a, { kategori }] = await Promise.all([artikelPanduan(slug), pohonPanduan()])
    if (!a) notFound()

    const urut = kategori.flatMap((k) => k.artikel)
    const i = urut.findIndex((x) => x.slug === a.slug)
    const sebelum = urut[i - 1], sesudah = urut[i + 1]
    const isi = daftarIsi(a.isi)
    const menu = a.href_menu ? namaMenu(a.href_menu) : undefined

    return (
        <div className="xl:flex xl:gap-10">
            <article className="min-w-0 max-w-3xl flex-1">
                <nav aria-label="Lokasi" className="text-xs text-muted-foreground print:hidden">
                    <Link href="/dashboard/panduan" className="hover:underline">Pusat Panduan</Link>
                    <span className="mx-1.5">/</span>{a.kategori_nama}
                </nav>
                <div className="mt-6 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">{a.kategori_nama}</div>
                <h1 className="mt-3 text-3xl font-semibold leading-tight">{a.judul}</h1>
                {a.ringkasan && <p className="mt-4 text-lg leading-8 text-muted-foreground">{a.ringkasan}</p>}

                <div className="mt-6 flex flex-wrap items-center gap-3 border-y py-3 text-sm">
                    <span className="text-muted-foreground">
                        Diperbarui {formatTanggal(a.diubah_pada, "long")}{a.diubah_oleh ? ` oleh ${a.diubah_oleh}` : ""}
                    </span>
                    <span className="flex-1" />
                    {a.href_menu && (
                        <Link href={a.href_menu} className="h-9 px-3 inline-flex items-center gap-1.5 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium print:hidden">
                            <span className="material-symbols-outlined text-[18px]" aria-hidden>open_in_new</span> Buka {menu ?? "halaman terkait"}
                        </Link>
                    )}
                    {o.izin.includes(MENU.kelolaPanduan) && (
                        <Link href={`/dashboard/panduan/kelola/artikel/${a.id}`} className="h-9 px-3 inline-flex items-center gap-1.5 rounded-md border text-sm font-medium hover:bg-muted print:hidden">
                            <span className="material-symbols-outlined text-[18px]" aria-hidden>edit</span> Ubah
                        </Link>
                    )}
                    <TombolCetak orientasi="potret" />
                </div>

                <div data-area-cetak data-judul-cetak={a.judul} data-subjudul-cetak={a.kategori_nama}>
                    <IsiPanduan isi={a.isi} className="mt-4" />
                </div>

                <nav aria-label="Artikel lain" className="mt-12 grid gap-3 sm:grid-cols-2 border-t pt-6 print:hidden">
                    {sebelum ? (
                        <Link href={`/dashboard/panduan/${sebelum.slug}`} className="rounded-lg border p-4 hover:bg-muted/50">
                            <div className="text-xs text-muted-foreground">Sebelumnya</div>
                            <div className="mt-1 font-medium text-blue-700 dark:text-blue-400">{sebelum.judul}</div>
                        </Link>
                    ) : <span />}
                    {sesudah && (
                        <Link href={`/dashboard/panduan/${sesudah.slug}`} className="rounded-lg border p-4 text-right hover:bg-muted/50">
                            <div className="text-xs text-muted-foreground">Berikutnya</div>
                            <div className="mt-1 font-medium text-blue-700 dark:text-blue-400">{sesudah.judul}</div>
                        </Link>
                    )}
                </nav>
            </article>

            {isi.length > 1 && (
                <aside className="hidden xl:block w-56 shrink-0 print:hidden">
                    <div className="sticky top-20">
                        <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Di halaman ini</div>
                        <ul className="mt-3 space-y-2 border-l text-sm">
                            {isi.map((h) => (
                                <li key={h.id}><a href={`#${h.id}`} className="-ml-px block border-l border-transparent pl-3 text-muted-foreground hover:border-foreground hover:text-foreground">{h.judul}</a></li>
                            ))}
                        </ul>
                    </div>
                </aside>
            )}
        </div>
    )
}
