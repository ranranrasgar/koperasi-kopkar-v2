"use client"

import { Eye, EyeOff } from "lucide-react"
import { useSembunyiSaldo } from "./useSembunyiSaldo"

/** Kartu utama beranda. Nominal bisa disembunyikan (mis. saat HP dilihat orang lain); pilihan diingat di perangkat ini. */
export function KartuSaldo({ simpanan, pinjaman, plafon }: { simpanan: string; pinjaman: string; plafon: string }) {
    const { sembunyi, ubah, tampil } = useSembunyiSaldo()

    return (
        <section className="hero rounded-[var(--radius-kartu)] p-5">
            <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] opacity-80">Total simpanan</p>
                <button type="button" onClick={ubah} className="-m-2 grid size-10 place-items-center rounded-full opacity-80 hover:opacity-100"
                    aria-label={sembunyi ? "Tampilkan nominal" : "Sembunyikan nominal"} aria-pressed={sembunyi}>
                    {sembunyi ? <EyeOff size={19} strokeWidth={1.75} /> : <Eye size={19} strokeWidth={1.75} />}
                </button>
            </div>
            <p className="angka mt-2 text-[2rem] font-bold leading-tight tracking-tight">{tampil(simpanan)}</p>
            <p className="mt-0.5 text-xs opacity-75">Akumulasi simpanan wajib, sukarela, dan lainnya (tanpa simpanan pokok)</p>
            <dl className="mt-5 grid grid-cols-2 divide-x divide-white/15 rounded-2xl bg-white/10 py-3">
                <div className="px-4">
                    <dt className="text-xs opacity-75">Sisa pinjaman</dt>
                    <dd className="angka mt-0.5 font-semibold">{tampil(pinjaman)}</dd>
                </div>
                <div className="px-4">
                    <dt className="text-xs opacity-75">Plafon kredit</dt>
                    <dd className="angka mt-0.5 font-semibold">{tampil(plafon)}</dd>
                </div>
            </dl>
        </section>
    )
}
