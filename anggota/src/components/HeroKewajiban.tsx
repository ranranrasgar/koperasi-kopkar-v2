"use client"

import Link from "next/link"
import { Eye, EyeOff, Plus } from "lucide-react"
import { useSembunyiSaldo } from "./useSembunyiSaldo"

/** Kartu hero halaman Pinjaman: total kewajiban (sisa pinjaman tunai, dan KPR bila ada), jumlah kontrak, serta plafon dengan tombol ajukan. */
export function HeroKewajiban({ judul, sisa, sisaKpr, kontrak, plafon }: { judul: string; sisa: string; sisaKpr: string | null; kontrak: number; plafon: string }) {
    const { sembunyi, ubah, tampil } = useSembunyiSaldo()
    return (
        <section className="hero rounded-[var(--radius-kartu)] p-5">
            <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] opacity-80">Kewajiban anggota</p>
                <button type="button" onClick={ubah} className="-m-2 grid size-10 place-items-center rounded-full opacity-80 hover:opacity-100"
                    aria-label={sembunyi ? "Tampilkan nominal" : "Sembunyikan nominal"} aria-pressed={sembunyi}>
                    {sembunyi ? <EyeOff size={19} strokeWidth={1.75} /> : <Eye size={19} strokeWidth={1.75} />}
                </button>
            </div>
            <p className="mt-3 text-xs opacity-75">{judul}</p>
            <p className="angka mt-0.5 text-[2rem] font-bold leading-tight tracking-tight">{tampil(sisa)}</p>
            <p className="mt-1 text-xs opacity-80">
                {kontrak > 0 ? `${kontrak} kontrak aktif` : "Tidak ada kontrak aktif"}
                {sisaKpr !== null && <> · Sisa KPR <span className="angka font-semibold">{tampil(sisaKpr)}</span></>}
            </p>
            <Link href="/ajukan" className="mt-5 flex items-center gap-3 rounded-2xl bg-white/10 px-4 py-3 transition-colors active:bg-white/20">
                <div className="min-w-0 flex-1">
                    <p className="text-xs opacity-75">Plafon kredit (grade)</p>
                    <p className="angka font-semibold">{tampil(plafon)}</p>
                </div>
                <span className="flex items-center gap-1 text-sm font-semibold"><Plus size={16} />Ajukan</span>
            </Link>
        </section>
    )
}
