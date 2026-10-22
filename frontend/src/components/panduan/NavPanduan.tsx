"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"

export interface NavKategori { slug: string; nama: string; ikon: string | null; artikel: { slug: string; judul: string }[] }

/** Navigasi kiri Pusat Panduan: ikhtisar, lalu kategori beserta artikelnya. Di layar kecil menjadi daftar lipat. */
export function NavPanduan({ kategori, bolehKelola }: { kategori: NavKategori[]; bolehKelola: boolean }) {
    const pathname = usePathname()
    const [buka, setBuka] = useState(false)
    const aktif = (href: string) => pathname === href

    const isi = (
        <nav aria-label="Daftar panduan" className="text-sm">
            <Link href="/dashboard/panduan" onClick={() => setBuka(false)}
                className={cn("block rounded-r-full px-4 py-2 font-medium", aktif("/dashboard/panduan")
                    ? "bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300" : "hover:bg-muted")}>
                Ikhtisar
            </Link>
            {kategori.map((k) => (
                <div key={k.slug} className="mt-4">
                    <div className="flex items-center gap-2 px-4 pb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                        {k.ikon && <span className="material-symbols-outlined text-[16px]" aria-hidden>{k.ikon}</span>}
                        {k.nama}
                    </div>
                    {k.artikel.map((a) => {
                        const href = `/dashboard/panduan/${a.slug}`
                        return (
                            <Link key={a.slug} href={href} onClick={() => setBuka(false)} aria-current={aktif(href) ? "page" : undefined}
                                className={cn("block rounded-r-full py-1.5 pl-10 pr-4 leading-snug", aktif(href)
                                    ? "bg-blue-50 font-semibold text-blue-700 dark:bg-blue-500/15 dark:text-blue-300"
                                    : "text-foreground/80 hover:bg-muted hover:text-foreground")}>
                                {a.judul}
                            </Link>
                        )
                    })}
                </div>
            ))}
            {bolehKelola && (
                <div className="mt-6 border-t pt-4">
                    <Link href="/dashboard/panduan/kelola" className="flex items-center gap-2 px-4 py-2 rounded-r-full text-muted-foreground hover:bg-muted hover:text-foreground">
                        <span className="material-symbols-outlined text-[18px]" aria-hidden>edit_note</span> Kelola panduan
                    </Link>
                </div>
            )}
        </nav>
    )

    return (
        <>
            <div className="xl:hidden mb-4 print:hidden">
                <button type="button" onClick={() => setBuka(!buka)} aria-expanded={buka}
                    className="flex w-full items-center justify-between rounded-lg border bg-background px-4 py-2.5 text-sm font-medium">
                    Daftar panduan
                    <span className={cn("material-symbols-outlined text-[20px] transition-transform", buka && "rotate-180")} aria-hidden>expand_more</span>
                </button>
                {buka && <div className="mt-2 rounded-lg border bg-background py-2">{isi}</div>}
            </div>
            <aside className="hidden xl:block w-72 shrink-0 border-r print:hidden">
                <div className="sticky top-20 max-h-[calc(100vh-6rem)] overflow-y-auto py-2 pr-2">{isi}</div>
            </aside>
        </>
    )
}
