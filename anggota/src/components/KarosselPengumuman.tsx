"use client"

import { useRef, useState } from "react"
import { Megaphone, Tag } from "lucide-react"
import type { Slide } from "@/lib/data"

/**
 * Himbauan dan promo sebagai slide yang digeser ke samping (scroll-snap, jalan dengan sentuhan tanpa pustaka).
 * Titik di bawah menunjukkan posisi dan bisa diketuk; bila hanya satu, tampil sebagai kartu biasa.
 */
export function KarosselPengumuman({ slide }: { slide: Slide[] }) {
    const jalur = useRef<HTMLDivElement>(null)
    const [aktif, setAktif] = useState(0)
    if (slide.length === 0) return null

    const geser = () => {
        const el = jalur.current
        if (el) setAktif(Math.round(el.scrollLeft / el.clientWidth))
    }
    const ke = (i: number) => jalur.current?.scrollTo({ left: i * jalur.current.clientWidth, behavior: "smooth" })

    return (
        <section aria-roledescription="carousel" aria-label="Pengumuman koperasi" className="mt-5">
            <div ref={jalur} onScroll={geser} tabIndex={0}
                className="flex snap-x snap-mandatory overflow-x-auto scroll-smooth rounded-[var(--radius-kartu)] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {slide.map((s, i) => {
                    const Ikon = s.jenis === "promo" ? Tag : Megaphone
                    return (
                        <article key={s.kunci} aria-roledescription="slide" aria-label={`${i + 1} dari ${slide.length}`}
                            className="w-full shrink-0 snap-center overflow-hidden rounded-[var(--radius-kartu)] border border-garis bg-permukaan">
                            {s.gambar && (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={`/gambar/${s.gambar}`} alt="" loading={i === 0 ? "eager" : "lazy"} className="aspect-[16/9] w-full object-cover" />
                            )}
                            <div className="flex gap-3 p-4">
                                <Ikon size={20} strokeWidth={1.75} className={`mt-0.5 shrink-0 ${s.jenis === "promo" ? "text-utama" : "text-tunggu"}`} />
                                <div className="min-w-0">
                                    <p className="text-xs font-semibold uppercase tracking-wide text-redup">{s.jenis === "promo" ? "Promo" : "Himbauan"}</p>
                                    <p className="font-semibold">{s.judul}</p>
                                    <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-redup">{s.isi}</p>
                                </div>
                            </div>
                        </article>
                    )
                })}
            </div>
            {slide.length > 1 && (
                <div className="mt-2.5 flex justify-center gap-1.5">
                    {slide.map((s, i) => (
                        <button key={s.kunci} type="button" onClick={() => ke(i)} aria-label={`Slide ${i + 1}`} aria-current={i === aktif}
                            className="grid size-5 place-items-center">
                            <span className={`block h-1.5 rounded-full transition-all ${i === aktif ? "w-5 bg-utama" : "w-1.5 bg-garis"}`} />
                        </button>
                    ))}
                </div>
            )}
        </section>
    )
}
