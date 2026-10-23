import Link from "next/link"
import { ChevronLeft, ChevronRight, type LucideIcon } from "lucide-react"
import { rupiah } from "@/lib/format"

/** Judul halaman; dengan kembali, tampil tombol kembali di kiri. */
export function Kepala({ judul, sub, kembali, kanan }: { judul: string; sub?: string; kembali?: string; kanan?: React.ReactNode }) {
    return (
        <header className="flex items-center gap-2 px-5 pb-4 pt-[max(1.25rem,env(safe-area-inset-top))]">
            {kembali && (
                <Link href={kembali} aria-label="Kembali"
                    className="-ml-2.5 grid size-11 shrink-0 place-items-center rounded-full text-teks hover:bg-garis/60">
                    <ChevronLeft size={24} strokeWidth={1.9} />
                </Link>
            )}
            <div className="min-w-0 flex-1">
                <h1 className="truncate text-xl font-bold tracking-tight">{judul}</h1>
                {sub && <p className="truncate text-sm text-redup">{sub}</p>}
            </div>
            {kanan}
        </header>
    )
}

/**
 * Kelompok baris datar, tanpa kotak: garis tipis di atas dan bawah, penuh lebar layar (induk halaman memakai px-5, jadi
 * baris di dalamnya memakai px-5 supaya sejajar dengan judul). Sengaja bukan kartu berkotak supaya halaman tidak ramai.
 */
export function Kartu({ children, className = "" }: { children: React.ReactNode; className?: string }) {
    return <section className={`-mx-5 border-y border-garis ${className}`}>{children}</section>
}

/** Blok ringkasan (angka utama) tanpa kotak, sejajar dengan margin halaman. */
export function Blok({ children, className = "" }: { children: React.ReactNode; className?: string }) {
    return <section className={className}>{children}</section>
}

/** Judul kecil bagian, opsional dengan tautan "Lihat semua". */
export function JudulBagian({ children, href, tautan = "Lihat semua" }: { children: React.ReactNode; href?: string; tautan?: string }) {
    return (
        <div className="mb-2 mt-8 flex items-baseline justify-between">
            <h2 className="text-[0.9375rem] font-semibold">{children}</h2>
            {href && <Link href={href} className="text-sm font-medium text-utama">{tautan}</Link>}
        </div>
    )
}

/** Baris label-nilai di dalam kartu. */
export function Baris({ label, nilai, tegas, warna }: { label: React.ReactNode; nilai: React.ReactNode; tegas?: boolean; warna?: string }) {
    return (
        <div className="flex items-baseline justify-between gap-4 py-2.5">
            <dt className="text-sm text-redup">{label}</dt>
            <dd className={`angka text-right text-[0.9375rem] ${tegas ? "font-bold" : "font-medium"} ${warna ?? ""}`}>{nilai}</dd>
        </div>
    )
}

/** Baris daftar yang bisa diketuk (ke rincian). */
export function BarisTautan({ href, judul, sub, nilai, nilaiSub, ikon: Ikon, lencana }: {
    href: string; judul: React.ReactNode; sub?: React.ReactNode; nilai?: React.ReactNode; nilaiSub?: React.ReactNode
    /** Ikon dalam lingkaran berwarna di kiri baris; lencana = penanda kecil merah (mis. "2 baru"). */
    ikon?: LucideIcon; lencana?: string
}) {
    return (
        <Link href={href} className="flex min-h-16 items-center gap-3 px-5 py-3 transition-colors active:bg-garis/40">
            {Ikon && <span className="grid size-10 shrink-0 place-items-center rounded-full bg-utama-lembut text-utama"><Ikon size={19} strokeWidth={1.75} /></span>}
            <div className="min-w-0 flex-1">
                <p className="truncate text-[0.9375rem] font-medium">{judul}</p>
                {sub && <p className="truncate text-xs text-redup">{sub}</p>}
            </div>
            {(nilai || nilaiSub) && (
                <div className="text-right">
                    {nilai && <p className="angka text-[0.9375rem] font-semibold">{nilai}</p>}
                    {nilaiSub && <p className="text-xs text-redup">{nilaiSub}</p>}
                </div>
            )}
            {lencana && <span className="shrink-0 rounded-full bg-keluar px-2 py-0.5 text-[0.6875rem] font-bold leading-none text-white">{lencana}</span>}
            <ChevronRight size={18} className="shrink-0 text-redup" />
        </Link>
    )
}

export function Kosong({ judul, isi }: { judul: string; isi?: string }) {
    return (
        <div className="px-6 py-12 text-center">
            <p className="font-semibold">{judul}</p>
            {isi && <p className="mx-auto mt-1 max-w-64 text-sm leading-relaxed text-redup">{isi}</p>}
        </div>
    )
}

/** Tautan "Tampilkan lebih banyak": menambah batas baris lewat ?n= (halaman server, tanpa JavaScript tambahan). */
export function MuatLagi({ href, sisa }: { href: string; sisa: number }) {
    if (sisa <= 0) return null
    return (
        <Link href={href} scroll={false}
            className="mx-auto mt-4 flex h-11 w-fit items-center rounded-full border border-garis bg-permukaan px-5 text-sm font-medium hover:bg-latar">
            Tampilkan lebih banyak
        </Link>
    )
}

/** Nominal masuk (+, hijau) atau keluar (-, merah). */
export function Arus({ n }: { n: number }) {
    return <span className={`angka font-semibold ${n < 0 ? "text-keluar" : "text-masuk"}`}>{n < 0 ? "−" : "+"}{rupiah(Math.abs(n))}</span>
}

/** Bilah kemajuan cicilan. */
export function Kemajuan({ ke, dari }: { ke: number; dari: number }) {
    const persen = dari > 0 ? Math.min(100, Math.round((ke / dari) * 100)) : 0
    return (
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-garis" role="progressbar" aria-valuenow={ke} aria-valuemin={0} aria-valuemax={dari}
            aria-label={`Cicilan ${ke} dari ${dari}`}>
            <div className="h-full rounded-full bg-utama" style={{ width: `${persen}%` }} />
        </div>
    )
}

/** Batas baris dari ?n= (kelipatan langkah, maks. 500). */
export function batasBaris(n: string | string[] | undefined, langkah: number) {
    const v = parseInt(String(Array.isArray(n) ? n[0] : n ?? ""), 10)
    return Number.isFinite(v) && v > 0 ? Math.min(500, Math.ceil(v / langkah) * langkah) : langkah
}
