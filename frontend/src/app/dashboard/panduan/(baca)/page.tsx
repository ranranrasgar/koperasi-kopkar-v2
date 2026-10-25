import Link from "next/link"
import { redirect } from "next/navigation"
import { cariPanduan, panduanUntukHalaman, pohonPanduan } from "@/lib/queries/panduan"
import { sp } from "@/lib/list"
import { adminPanduan, wajibIzin } from "@/lib/operator"

function KotakCari({ nilai }: { nilai?: string }) {
    return (
        <form method="get" action="/dashboard/panduan" role="search" className="relative w-full max-w-[36rem] print:hidden">
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" aria-hidden>search</span>
            <input name="q" defaultValue={nilai} placeholder="Cari panduan, misalnya: pengambilan simpanan" aria-label="Cari panduan"
                className="h-12 w-full rounded-full border bg-background pl-12 pr-4 text-[15px] shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </form>
    )
}

export default async function PusatPanduanPage(props: PageProps<"/dashboard/panduan">) {
    const o = await wajibIzin("/dashboard/panduan") // semua operator yang login boleh membaca
    const admin = adminPanduan(o)
    const s = await props.searchParams
    const untuk = sp(s, "untuk")
    let tanpaPanduan = false
    if (untuk.startsWith("/dashboard")) {
        const slug = await panduanUntukHalaman(untuk, admin)
        if (slug) redirect(`/dashboard/panduan/${slug}`)
        tanpaPanduan = true
    }

    const q = sp(s, "q").trim().slice(0, 100)
    if (q) {
        const hasil = await cariPanduan(q, admin)
        return (
            <div className="max-w-3xl">
                <KotakCari nilai={q} />
                <h1 className="mt-8 text-sm text-muted-foreground">{hasil.length ? `${hasil.length} hasil untuk` : "Tidak ada hasil untuk"} <span className="font-semibold text-foreground">&quot;{q}&quot;</span></h1>
                <ol className="mt-4 space-y-6">
                    {hasil.map((h) => (
                        <li key={h.slug}>
                            <div className="text-xs uppercase tracking-wider text-muted-foreground">{h.kategori_nama}</div>
                            <Link href={`/dashboard/panduan/${h.slug}`} className="text-lg font-medium text-blue-700 dark:text-blue-400 hover:underline">{h.judul}</Link>
                            <p className="mt-1 text-sm text-muted-foreground leading-6">{h.cuplikan ?? h.ringkasan}</p>
                        </li>
                    ))}
                </ol>
                {!hasil.length && <p className="mt-4 text-sm text-muted-foreground">Coba kata lain, atau telusuri kategori di menu kiri.</p>}
            </div>
        )
    }

    const { kategori } = await pohonPanduan(false, admin)
    const jumlah = kategori.reduce((t, k) => t + k.artikel.length, 0)
    return (
        <div>
            {tanpaPanduan && (
                <div role="status" className="mb-6 rounded-lg border bg-muted/40 px-4 py-3 text-sm">
                    Belum ada panduan khusus untuk halaman yang Anda buka. Silakan cari atau telusuri panduan di bawah.
                </div>
            )}
            <section className="text-center py-10">
                <div className="flex items-center justify-center gap-3 text-blue-600 dark:text-blue-400" aria-hidden>
                    <span className="material-symbols-outlined text-[40px]">savings</span>
                    <span className="material-symbols-outlined text-[56px]">menu_book</span>
                    <span className="material-symbols-outlined text-[40px]">account_balance</span>
                </div>
                <div className="mt-6 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Pusat Panduan</div>
                <h1 className="mx-auto mt-3 max-w-2xl text-3xl font-semibold leading-tight">Aturan dan cara kerja aplikasi koperasi, di satu tempat.</h1>
                <p className="mx-auto mt-3 max-w-[36rem] text-muted-foreground">
                    {jumlah} panduan dari data master, transaksi simpanan dan pinjaman, sampai laporan keuangan dan tutup buku.
                </p>
                <div className="mt-8 w-full flex justify-center"><KotakCari /></div>
            </section>

            <section aria-label="Kategori panduan" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {kategori.filter((k) => k.artikel.length > 0).map((k) => (
                    <div key={k.slug} className="rounded-xl border bg-background p-5">
                        <div className="flex items-center gap-3">
                            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300">
                                <span className="material-symbols-outlined text-[22px]" aria-hidden>{k.ikon ?? "article"}</span>
                            </span>
                            <h2 className="font-semibold">{k.nama}</h2>
                        </div>
                        {k.keterangan && <p className="mt-3 text-sm text-muted-foreground leading-6">{k.keterangan}</p>}
                        <ul className="mt-4 space-y-2 text-sm">
                            {k.artikel.map((a) => (
                                <li key={a.slug}>
                                    <Link href={`/dashboard/panduan/${a.slug}`} className="text-blue-700 dark:text-blue-400 hover:underline">{a.judul}</Link>
                                </li>
                            ))}
                        </ul>
                    </div>
                ))}
            </section>
        </div>
    )
}
