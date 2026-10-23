"use client"

import { useEffect, useState } from "react"
import { Eye, EyeOff } from "lucide-react"

const KUNCI = "kopkar-sembunyi-saldo"

/** Kartu utama beranda. Nominal bisa disembunyikan (mis. saat HP dilihat orang lain); pilihan diingat di perangkat ini. */
export function KartuSaldo({ simpanan, pinjaman, plafon }: { simpanan: string; pinjaman: string; plafon: string }) {
    const [sembunyi, setSembunyi] = useState(false)
    useEffect(() => {
        try { setSembunyi(localStorage.getItem(KUNCI) === "1") } catch { /* penyimpanan diblokir: tampilkan */ }
    }, [])
    const ubah = () => {
        setSembunyi(!sembunyi)
        try { localStorage.setItem(KUNCI, sembunyi ? "0" : "1") } catch { /* abaikan */ }
    }
    const tampil = (v: string) => (sembunyi ? "Rp ••••••" : v)

    return (
        <section className="rounded-[var(--radius-kartu)] bg-utama p-5 text-pada-utama">
            <div className="flex items-center justify-between">
                <p className="text-sm font-medium opacity-85">Total simpanan</p>
                <button type="button" onClick={ubah} className="-m-2 grid size-10 place-items-center rounded-full opacity-85 hover:opacity-100"
                    aria-label={sembunyi ? "Tampilkan nominal" : "Sembunyikan nominal"} aria-pressed={sembunyi}>
                    {sembunyi ? <EyeOff size={19} strokeWidth={1.75} /> : <Eye size={19} strokeWidth={1.75} />}
                </button>
            </div>
            <p className="angka mt-1 text-[2rem] font-bold leading-tight tracking-tight">{tampil(simpanan)}</p>
            <p className="mt-0.5 text-xs opacity-75">Tidak termasuk simpanan pokok</p>
            <dl className="mt-5 grid grid-cols-2 gap-4 border-t border-pada-utama/20 pt-4">
                <div>
                    <dt className="text-xs opacity-75">Sisa pinjaman</dt>
                    <dd className="angka mt-0.5 font-semibold">{tampil(pinjaman)}</dd>
                </div>
                <div>
                    <dt className="text-xs opacity-75">Plafon kredit</dt>
                    <dd className="angka mt-0.5 font-semibold">{tampil(plafon)}</dd>
                </div>
            </dl>
        </section>
    )
}
