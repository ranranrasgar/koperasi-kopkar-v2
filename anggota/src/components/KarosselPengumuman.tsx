"use client"

import { useEffect, useRef, useState } from "react"
import { Megaphone, Share2, Tag, X } from "lucide-react"
import type { Slide } from "@/lib/data"

const JEDA_MS = 6000

function Lencana({ promo }: { promo: boolean }) {
    const Ikon = promo ? Tag : Megaphone
    return (
        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[0.6875rem] font-semibold ${promo ? "bg-utama text-pada-utama" : "bg-tunggu text-black"}`}>
            <Ikon size={12} strokeWidth={2} /> {promo ? "Promo" : "Himbauan"}
        </span>
    )
}

/** Slide ringkas berbentuk landscape; judul menumpang di atas gambar, isi lengkap ada di detail. */
function KartuSlide({ s, urut, jumlah, onBuka }: { s: Slide; urut: number; jumlah: number; onBuka: () => void }) {
    return (
        <button type="button" onClick={onBuka} aria-label={`${s.judul}, slide ${urut + 1} dari ${jumlah}. Buka detail`}
            className={`relative block aspect-[2/1] shrink-0 snap-center overflow-hidden rounded-[var(--radius-kartu)] text-left ${s.gambar ? "bg-black" : "hero"} ${jumlah > 1 ? "w-[88%]" : "w-full"}`}>
            {s.gambar && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={`/gambar/${s.gambar}`} alt="" loading={urut === 0 ? "eager" : "lazy"} className="absolute inset-0 size-full object-cover" />
            )}
            <span className="absolute left-3 top-3"><Lencana promo={s.jenis === "promo"} /></span>
            <span className={`absolute inset-x-0 bottom-0 p-3.5 pt-9 text-white ${s.gambar ? "bg-gradient-to-t from-black/80 to-transparent" : ""}`}>
                <span className="line-clamp-2 block font-semibold leading-snug">{s.judul}</span>
            </span>
        </button>
    )
}

/** Detail himbauan atau promo, dengan bagikan lewat lembar berbagi HP ke aplikasi pilihan anggota. */
function DetailSlide({ s, onTutup }: { s: Slide; onTutup: () => void }) {
    const [pesan, setPesan] = useState("")
    const berkas = useRef<File | null>(null)

    // Gambar disiapkan saat detail dibuka: lembar berbagi harus dipanggil langsung dari ketukan, tanpa menunggu unduhan.
    useEffect(() => {
        if (!s.gambar) return
        let batal = false
        fetch(`/gambar/${s.gambar}`).then((r) => r.blob()).then((b) => {
            if (!batal) berkas.current = new File([b], `${s.jenis}.${(b.type.split("/")[1] ?? "jpg").replace("jpeg", "jpg")}`, { type: b.type })
        }).catch(() => { /* bagikan tanpa gambar */ })
        return () => { batal = true }
    }, [s.gambar, s.jenis])

    useEffect(() => {
        const tekan = (e: KeyboardEvent) => { if (e.key === "Escape") onTutup() }
        document.addEventListener("keydown", tekan)
        return () => document.removeEventListener("keydown", tekan)
    }, [onTutup])

    const bagikan = async () => {
        setPesan("")
        const teks = `${s.judul}\n\n${s.isi}`, url = window.location.origin
        try {
            if (navigator.share) {
                const f = berkas.current
                const denganGambar: ShareData = { title: s.judul, text: `${teks}\n\n${url}`, files: f ? [f] : [] }
                await navigator.share(f && navigator.canShare?.(denganGambar) ? denganGambar : { title: s.judul, text: teks, url })
                return
            }
            await navigator.clipboard.writeText(`${teks}\n\n${url}`)
            setPesan("Teks disalin. Tempel di aplikasi yang Anda pilih.")
        } catch (e) {
            if ((e as Error).name !== "AbortError") setPesan("Tidak bisa membagikan dari perangkat ini.")
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center" onClick={onTutup}>
            <div role="dialog" aria-modal="true" aria-label={s.judul} onClick={(e) => e.stopPropagation()}
                className="max-h-[88dvh] w-full max-w-md overflow-y-auto rounded-t-[var(--radius-kartu)] bg-permukaan pb-[env(safe-area-inset-bottom)] sm:rounded-b-[var(--radius-kartu)]">
                {s.gambar && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={`/gambar/${s.gambar}`} alt="" className="w-full" />
                )}
                <div className="p-5">
                    <div className="flex items-center justify-between gap-2">
                        <Lencana promo={s.jenis === "promo"} />
                        <div className="flex gap-1">
                            <button type="button" onClick={bagikan} aria-label="Bagikan" className="grid size-10 place-items-center rounded-full text-utama active:bg-garis/40"><Share2 size={19} /></button>
                            <button type="button" onClick={onTutup} aria-label="Tutup" className="grid size-10 place-items-center rounded-full active:bg-garis/40"><X size={20} /></button>
                        </div>
                    </div>
                    <h2 className="mt-2 text-lg font-bold leading-snug">{s.judul}</h2>
                    <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-redup">{s.isi}</p>
                    {pesan && <p role="status" className="mt-3 text-sm text-utama">{pesan}</p>}
                </div>
            </div>
        </div>
    )
}

/**
 * Himbauan dan promo sebagai slide yang digeser ke samping (scroll-snap, jalan dengan sentuhan tanpa pustaka). Slide berikutnya sedikit terlihat dan
 * bergeser sendiri sampai pengguna menyentuhnya. Ketuk slide untuk melihat detail. Bila hanya satu, tampil sebagai kartu biasa.
 */
export function KarosselPengumuman({ slide }: { slide: Slide[] }) {
    const jalur = useRef<HTMLDivElement>(null)
    const [aktif, setAktif] = useState(0)
    const [berhenti, setBerhenti] = useState(false)
    const [detail, setDetail] = useState<Slide | null>(null)
    const jumlah = slide.length

    const ke = (i: number) => {
        const w = jalur.current, k = w?.children[i] as HTMLElement | undefined
        if (w && k) w.scrollTo({ left: k.offsetLeft - (w.clientWidth - k.offsetWidth) / 2, behavior: "smooth" })
    }

    useEffect(() => {
        if (jumlah < 2 || berhenti || detail || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
        const t = setInterval(() => { if (document.visibilityState === "visible") ke((aktif + 1) % jumlah) }, JEDA_MS)
        return () => clearInterval(t)
    }, [aktif, jumlah, berhenti, detail])

    if (jumlah === 0) return null

    const geser = () => {
        const w = jalur.current
        if (!w) return
        const tengah = w.scrollLeft + w.clientWidth / 2
        let dekat = 0, jarak = Infinity
        Array.from(w.children).forEach((k, i) => {
            const e = k as HTMLElement, d = Math.abs(e.offsetLeft + e.offsetWidth / 2 - tengah)
            if (d < jarak) { jarak = d; dekat = i }
        })
        setAktif(dekat)
    }

    return (
        <section aria-roledescription="carousel" aria-label="Himbauan dan promo koperasi" className="mt-5">
            <div ref={jalur} onScroll={geser} onTouchStart={() => setBerhenti(true)} onPointerDown={() => setBerhenti(true)}
                className="relative -mx-5 flex snap-x snap-mandatory gap-3 overflow-x-auto px-5 [scroll-padding-inline:1.25rem] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {slide.map((s, i) => <KartuSlide key={s.kunci} s={s} urut={i} jumlah={jumlah} onBuka={() => setDetail(s)} />)}
            </div>
            {jumlah > 1 && (
                <div className="mt-1.5 flex justify-center gap-0.5">
                    {slide.map((s, i) => (
                        <button key={s.kunci} type="button" onClick={() => { setBerhenti(true); ke(i) }} aria-label={`Slide ${i + 1}`} aria-current={i === aktif}
                            className="grid size-5 place-items-center">
                            <span className={`block h-1.5 rounded-full transition-all ${i === aktif ? "w-5 bg-utama" : "w-1.5 bg-garis"}`} />
                        </button>
                    ))}
                </div>
            )}
            {detail && <DetailSlide s={detail} onTutup={() => setDetail(null)} />}
        </section>
    )
}
