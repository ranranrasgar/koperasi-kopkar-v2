"use client"

import { Eye, EyeOff } from "lucide-react"
import { useSembunyiSaldo } from "./useSembunyiSaldo"

/** Kartu hero detail pinjaman: sisa pokok, pokok awal, jasa, dan angsuran rutin; nominal bisa disembunyikan. */
export function HeroPinjaman({ lunas, sisa, pokok, jasa, angsuran }: { lunas: boolean; sisa: string; pokok: string; jasa: string; angsuran: string | null }) {
    const { sembunyi, ubah, tampil } = useSembunyiSaldo()
    return (
        <section className="hero rounded-[var(--radius-kartu)] p-5">
            <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] opacity-80">{lunas ? "Pinjaman lunas" : "Sisa pokok pinjaman"}</p>
                <button type="button" onClick={ubah} className="-m-2 grid size-10 place-items-center rounded-full opacity-80 hover:opacity-100"
                    aria-label={sembunyi ? "Tampilkan nominal" : "Sembunyikan nominal"} aria-pressed={sembunyi}>
                    {sembunyi ? <EyeOff size={19} strokeWidth={1.75} /> : <Eye size={19} strokeWidth={1.75} />}
                </button>
            </div>
            <p className="angka mt-2 text-[2rem] font-bold leading-tight tracking-tight">{tampil(sisa)}</p>
            <dl className="mt-5 grid grid-cols-2 divide-x divide-white/15 rounded-2xl bg-white/10 py-3">
                <div className="px-4">
                    <dt className="text-xs opacity-75">Pokok pinjaman awal</dt>
                    <dd className="angka mt-0.5 font-semibold">{tampil(pokok)}</dd>
                </div>
                <div className="px-4">
                    <dt className="text-xs opacity-75">Jasa</dt>
                    <dd className="mt-0.5 font-semibold">{jasa}</dd>
                </div>
            </dl>
            {angsuran && (
                <p className="mt-4 flex items-baseline justify-between gap-3 text-sm">
                    <span className="opacity-80">Angsuran rutin bulanan</span>
                    <span className="angka font-bold">{tampil(angsuran)}</span>
                </p>
            )}
        </section>
    )
}
