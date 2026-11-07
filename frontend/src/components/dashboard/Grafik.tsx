import { formatRupiah } from "@/lib/format"
import type { BulanArus } from "@/lib/queries/dashboard"
import { cn } from "@/lib/utils"

const BULAN = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"]

/** Nominal ringkas untuk kartu dan sumbu: Rp 23,3 M, Rp 450 jt. */
export function rupiahRingkas(n: number) {
    const a = Math.abs(n), f = (x: number, s: string) => `${n < 0 ? "-" : ""}Rp ${x.toLocaleString("id-ID", { maximumFractionDigits: 1 })} ${s}`
    return a >= 1e9 ? f(a / 1e9, "M") : a >= 1e6 ? f(a / 1e6, "jt") : a >= 1e3 ? f(a / 1e3, "rb") : formatRupiah(n)
}

/** Garis tren kecil di kartu angka. */
export function GarisMini({ nilai, className }: { nilai: number[]; className?: string }) {
    if (nilai.length < 2) return null
    const min = Math.min(...nilai), rentang = Math.max(...nilai) - min || 1
    const titik = nilai.map((v, i) => `${(i / (nilai.length - 1)) * 100},${27 - ((v - min) / rentang) * 24}`)
    return (
        <svg viewBox="0 0 100 30" preserveAspectRatio="none" aria-hidden="true" className={cn("h-9 w-full", className)}>
            <polygon points={`0,30 ${titik.join(" ")} 100,30`} className="fill-primary/10" />
            <polyline points={titik.join(" ")} fill="none" vectorEffect="non-scaling-stroke" className="stroke-primary" strokeWidth="2" strokeLinejoin="round" />
        </svg>
    )
}

const SERI = [
    { k: "setor", label: "Setoran", warna: "fill-emerald-500", tanda: "bg-emerald-500" },
    { k: "ambil", label: "Pengambilan", warna: "fill-rose-500", tanda: "bg-rose-500" },
    { k: "angsuran", label: "Angsuran masuk", warna: "fill-sky-500", tanda: "bg-sky-500" },
] as const

/** Batang arus per bulan. Arahkan kursor ke batang untuk melihat nilainya. */
export function GrafikArus({ data }: { data: BulanArus[] }) {
    const L = 760, T = 240, kiri = 62, atas = 10, bawah = 24
    const maks = Math.max(1, ...data.flatMap((b) => SERI.map((s) => b[s.k])))
    const skala = 10 ** Math.floor(Math.log10(maks)), langkah = [0.25, 0.5, 1, 2, 2.5].map((x) => x * skala).find((x) => maks / x <= 4) ?? skala
    const puncak = Math.ceil(maks / langkah) * langkah
    const tinggi = T - atas - bawah, y = (v: number) => atas + tinggi - (v / puncak) * tinggi
    const lebarBulan = (L - kiri) / data.length, lebarBatang = Math.min(14, (lebarBulan - 10) / 3)
    const garis = Array.from({ length: Math.round(puncak / langkah) + 1 }, (_, i) => i * langkah)
    return (
        <div>
            <div className="mb-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                {SERI.map((s) => <span key={s.k} className="inline-flex items-center gap-1.5"><i className={cn("h-2.5 w-2.5 rounded-sm", s.tanda)} />{s.label}</span>)}
            </div>
            <svg viewBox={`0 0 ${L} ${T}`} role="img" aria-label="Arus setoran, pengambilan, dan angsuran 12 bulan terakhir" className="w-full">
                {garis.map((v) => (
                    <g key={v}>
                        <line x1={kiri} x2={L} y1={y(v)} y2={y(v)} className="stroke-border" strokeWidth="1" strokeDasharray={v ? "3 4" : undefined} />
                        <text x={kiri - 8} y={y(v) + 4} textAnchor="end" className="fill-muted-foreground text-[11px]">{v ? rupiahRingkas(v).replace("Rp ", "") : "0"}</text>
                    </g>
                ))}
                {data.map((b, i) => {
                    const m = Number(b.bln.slice(5)), awal = kiri + i * lebarBulan + (lebarBulan - lebarBatang * 3 - 2) / 2
                    return (
                        <g key={b.bln}>
                            {SERI.map((s, n) => {
                                const v = b[s.k]
                                return <rect key={s.k} x={awal + n * (lebarBatang + 1)} y={y(v)} width={lebarBatang} height={Math.max(y(0) - y(v), v > 0 ? 1 : 0)} rx="2" className={s.warna}>
                                    <title>{`${BULAN[m - 1]} ${b.bln.slice(0, 4)}, ${s.label}: ${formatRupiah(v)}`}</title>
                                </rect>
                            })}
                            <text x={kiri + i * lebarBulan + lebarBulan / 2} y={T - 7} textAnchor="middle" className="fill-muted-foreground text-[11px]">{BULAN[m - 1]}</text>
                        </g>
                    )
                })}
            </svg>
        </div>
    )
}

const WARNA_DONAT = ["stroke-primary", "stroke-amber-500", "stroke-sky-500"], TANDA_DONAT = ["bg-primary", "bg-amber-500", "bg-sky-500"]

/** Donat komposisi; `bagian` berurutan sesuai warna. */
export function Donat({ bagian, tengah }: { bagian: { label: string; nilai: number; ket: string }[]; tengah: string }) {
    const total = bagian.reduce((n, b) => n + b.nilai, 0) || 1
    const K = 2 * Math.PI * 40
    let lewat = 0
    return (
        <div className="flex flex-col items-center gap-4 sm:flex-row lg:flex-col xl:flex-row">
            <div className="relative h-36 w-36 shrink-0">
                <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90" role="img" aria-label="Komposisi sisa pokok pinjaman">
                    <circle cx="50" cy="50" r="40" fill="none" strokeWidth="12" className="stroke-muted" />
                    {bagian.map((b, i) => {
                        const pjg = (b.nilai / total) * K, awal = lewat
                        lewat += pjg
                        return <circle key={b.label} cx="50" cy="50" r="40" fill="none" strokeWidth="12" strokeDasharray={`${pjg} ${K - pjg}`} strokeDashoffset={-awal} className={WARNA_DONAT[i]}>
                            <title>{`${b.label}: ${formatRupiah(b.nilai)}`}</title>
                        </circle>
                    })}
                </svg>
                <span className="absolute inset-0 grid place-items-center text-center text-sm font-bold tabular-nums">{tengah}</span>
            </div>
            <ul className="w-full min-w-0 space-y-2 text-sm">
                {bagian.map((b, i) => (
                    <li key={b.label} className="flex items-start gap-2">
                        <i className={cn("mt-1.5 h-2.5 w-2.5 shrink-0 rounded-sm", TANDA_DONAT[i])} />
                        <span className="min-w-0">
                            <span className="block font-medium">{b.label} <span className="text-muted-foreground">{Math.round((b.nilai / total) * 100)}%</span></span>
                            <span className="block text-xs text-muted-foreground">{b.ket}</span>
                        </span>
                    </li>
                ))}
            </ul>
        </div>
    )
}
