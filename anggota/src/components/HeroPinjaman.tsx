"use client"

import { Eye, EyeOff, Hourglass } from "lucide-react"
import { useSembunyiSaldo } from "./useSembunyiSaldo"

/**
 * Kartu hero detail pinjaman: status, nama dan nomor kontrak, sisa pokok, pokok awal, jasa, angsuran rutin, dan kemajuan angsuran
 * dalam satu kartu; nominal bisa disembunyikan.
 */
export function HeroPinjaman({ lunas, nama, info, sisa, pokok, jasa, angsuran, selesai, dari, sisaTenor, targetLunas }: {
    lunas: boolean; nama: string; info: string; sisa: string; pokok: string; jasa: string; angsuran: string | null
    selesai: number; dari: number; sisaTenor: number; targetLunas: string
}) {
    const { sembunyi, ubah, tampil } = useSembunyiSaldo()
    const persen = dari > 0 ? Math.min(100, Math.round((selesai / dari) * 100)) : 0
    return (
        <section className="hero rounded-[var(--radius-kartu)] p-5">
            <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-[0.6875rem] font-semibold uppercase tracking-wide">
                    <span className={`size-1.5 rounded-full ${lunas ? "bg-white/60" : "bg-white"}`} />{lunas ? "Lunas" : "Aktif"}
                </span>
                <button type="button" onClick={ubah} className="-m-2 grid size-10 place-items-center rounded-full opacity-80 hover:opacity-100"
                    aria-label={sembunyi ? "Tampilkan nominal" : "Sembunyikan nominal"} aria-pressed={sembunyi}>
                    {sembunyi ? <EyeOff size={19} strokeWidth={1.75} /> : <Eye size={19} strokeWidth={1.75} />}
                </button>
            </div>
            <h2 className="mt-3 text-[1.25rem] font-bold leading-tight tracking-tight">{nama}</h2>
            <p className="mt-0.5 text-xs opacity-75">{info}</p>

            <p className="mt-5 text-xs font-semibold uppercase tracking-[0.12em] opacity-80">{lunas ? "Pinjaman lunas" : "Sisa pokok pinjaman"}</p>
            <p className="angka mt-1 text-[2rem] font-bold leading-tight tracking-tight">{tampil(sisa)}</p>

            <dl className="mt-4 grid grid-cols-2 divide-x divide-white/15 rounded-2xl bg-white/10 py-3">
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

            <div className="mt-4 border-t border-white/15 pt-4">
                <div className="flex items-baseline justify-between gap-3 text-sm">
                    <span className="font-medium">{selesai} dari {dari} angsuran selesai</span>
                    <span className="angka font-bold">{persen}%</span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/20" role="progressbar" aria-valuenow={persen} aria-valuemin={0} aria-valuemax={100}>
                    <div className="h-full rounded-full bg-white" style={{ width: `${persen}%` }} />
                </div>
                <div className="mt-2.5 flex items-center justify-between gap-3 text-[0.6875rem] opacity-80">
                    <span className="flex items-center gap-1"><Hourglass size={12} />{lunas ? "Semua angsuran selesai" : `Sisa tenor: ${sisaTenor} bulan lagi`}</span>
                    <span>Target lunas: <span className="font-semibold">{targetLunas}</span></span>
                </div>
            </div>
        </section>
    )
}
