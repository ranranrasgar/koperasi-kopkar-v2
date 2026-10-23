import { ringkasRupiah } from "@/lib/format"
import type { TitikTren } from "@/lib/data"

const BULAN = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"]

/**
 * Grafik batang saldo akhir bulan (maks. 6 bulan). Batang terakhir (bulan ini) disorot dengan nilainya; sumbu mulai dari 0
 * supaya tinggi batang jujur. Penanda pertumbuhan membandingkan bulan pertama dan terakhir.
 */
export function GrafikTren({ data }: { data: TitikTren[] }) {
    if (data.length < 2 || data.every((d) => d.saldo <= 0)) return null
    const maks = Math.max(...data.map((d) => d.saldo))
    const pertama = data[0].saldo, terakhir = data[data.length - 1].saldo
    const tumbuh = pertama > 0 ? ((terakhir - pertama) / pertama) * 100 : null

    return (
        <figure aria-label="Pertumbuhan saldo simpanan 6 bulan terakhir">
            <div className="flex items-baseline justify-between gap-3">
                <figcaption>
                    <p className="text-[0.9375rem] font-semibold">Tren pertumbuhan</p>
                    <p className="text-xs text-redup">{data.length} bulan terakhir</p>
                </figcaption>
                {tumbuh !== null && (
                    <span className={`angka rounded-full px-2.5 py-1 text-xs font-semibold ${tumbuh >= 0 ? "bg-masuk/15 text-masuk" : "bg-keluar/15 text-keluar"}`}>
                        {tumbuh >= 0 ? "+" : "−"}{Math.abs(tumbuh).toLocaleString("id-ID", { maximumFractionDigits: 1 })}%
                    </span>
                )}
            </div>
            <div className="mt-4 flex h-36 items-end gap-2.5">
                {data.map((d, i) => {
                    const sorot = i === data.length - 1
                    const tinggi = Math.max(6, Math.round((d.saldo / maks) * 100))
                    return (
                        <div key={d.bulan} className="flex h-full flex-1 flex-col items-center justify-end gap-1.5">
                            {sorot && <span className="angka rounded-md bg-teks px-1.5 py-0.5 text-[0.6875rem] font-semibold text-latar">{ringkasRupiah(d.saldo)}</span>}
                            <div className={`w-full rounded-t-lg ${sorot ? "bg-utama" : "bg-utama-lembut"}`} style={{ height: `${tinggi}%` }}
                                title={`${BULAN[Number(d.bulan.slice(5)) - 1]} ${d.bulan.slice(0, 4)}: ${ringkasRupiah(d.saldo)}`} />
                        </div>
                    )
                })}
            </div>
            <div className="mt-2 flex gap-2.5 text-center text-[0.6875rem] text-redup" aria-hidden="true">
                {data.map((d) => <span key={d.bulan} className="flex-1">{BULAN[Number(d.bulan.slice(5)) - 1]}</span>)}
            </div>
        </figure>
    )
}
