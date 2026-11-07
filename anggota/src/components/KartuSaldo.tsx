"use client"

import Link from "next/link"
import { ChevronRight, Eye, EyeOff, TrendingDown, TrendingUp } from "lucide-react"
import { rupiah } from "@/lib/format"
import type { TitikTren } from "@/lib/data"
import { TombolQr } from "./TombolQr"
import { useSembunyiSaldo } from "./useSembunyiSaldo"

const BULAN = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"]
const LEBAR = 300, TINGGI = 56, TEPI = 6

/** Garis saldo akhir bulan. Skalanya dari nilai terendah sampai tertinggi supaya kenaikan kecil tetap terlihat. */
function GarisTren({ tren }: { tren: TitikTren[] }) {
    const nilai = tren.map((t) => t.saldo)
    const rendah = Math.min(...nilai), rentang = Math.max(...nilai) - rendah
    const titik = nilai.map((v, i) => [
        TEPI + (i * (LEBAR - TEPI * 2)) / (nilai.length - 1),
        rentang === 0 ? TINGGI / 2 : TINGGI - TEPI - ((v - rendah) / rentang) * (TINGGI - TEPI * 2),
    ])
    const [ax, ay] = titik[titik.length - 1]
    const naik = nilai[nilai.length - 1] - nilai[nilai.length - 2]
    return (
        <figure aria-label={`Grafik saldo simpanan ${tren.length} bulan terakhir`} className="relative mt-3">
            <p className="flex items-center gap-1 text-xs opacity-85">
                {naik < 0 ? <TrendingDown size={14} /> : <TrendingUp size={14} />}
                {naik === 0 ? "Tidak berubah bulan ini" : `${naik > 0 ? "Naik" : "Turun"} ${rupiah(Math.abs(naik))} bulan ini`}
            </p>
            <svg viewBox={`0 0 ${LEBAR} ${TINGGI}`} className="mt-1 h-14 w-full" aria-hidden="true">
                <polyline points={titik.map((p) => p.join(",")).join(" ")} fill="none" stroke="currentColor" strokeOpacity="0.75" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx={ax} cy={ay} r="4.5" fill="currentColor" />
            </svg>
            <div className="flex justify-between text-[0.6875rem] opacity-70">
                {tren.map((t) => <span key={t.bulan}>{BULAN[Number(t.bulan.slice(5)) - 1]}</span>)}
            </div>
        </figure>
    )
}

/** Kartu utama beranda. Nominal dan grafik tersembunyi sampai dibuka (mis. saat HP dilihat orang lain); pilihan diingat di perangkat ini. */
export function KartuSaldo({ simpanan, pinjaman, plafon, tren, nama }: { simpanan: string; pinjaman: string; plafon: string; tren: TitikTren[]; nama: string }) {
    const { sembunyi, ubah, tampil } = useSembunyiSaldo()

    return (
        <section className="hero relative overflow-hidden rounded-[var(--radius-kartu)] p-5">
            <div className="relative flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] opacity-80">Total simpanan</p>
                <div className="-m-2 flex">
                    <TombolQr nama={nama} />
                    <button type="button" onClick={ubah} className="grid size-10 place-items-center rounded-full opacity-80 hover:opacity-100"
                        aria-label={sembunyi ? "Tampilkan nominal" : "Sembunyikan nominal"} aria-pressed={sembunyi}>
                        {sembunyi ? <EyeOff size={19} strokeWidth={1.75} /> : <Eye size={19} strokeWidth={1.75} />}
                    </button>
                </div>
            </div>
            <p className="angka relative mt-2 text-[2rem] font-bold leading-tight tracking-tight">{tampil(simpanan)}</p>
            <p className="relative mt-0.5 text-xs opacity-75">Wajib, sukarela, dan lainnya, tanpa simpanan pokok</p>
            {!sembunyi && tren.length >= 2 && tren.some((t) => t.saldo > 0) && <GarisTren tren={tren} />}
            <div className="relative mt-5 grid grid-cols-2 gap-2">
                {[{ label: "Sisa pinjaman", nilai: pinjaman, href: "/pinjaman" }, { label: "Plafon kredit", nilai: plafon, href: "/ajukan" }].map((k) => (
                    <Link key={k.label} href={k.href} className="min-w-0 rounded-2xl bg-white/10 px-3.5 py-3 transition-colors active:bg-white/20">
                        <span className="flex items-center justify-between text-xs opacity-75">{k.label}<ChevronRight size={14} /></span>
                        <span className="angka mt-0.5 block truncate font-semibold">{tampil(k.nilai)}</span>
                    </Link>
                ))}
            </div>
        </section>
    )
}
