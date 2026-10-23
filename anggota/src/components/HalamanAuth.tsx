import Image from "next/image"
import Link from "next/link"
import { ChevronLeft } from "lucide-react"
import { namaKoperasi } from "@/lib/koperasi"

/** Kerangka halaman di luar aplikasi (masuk, daftar, lupa password): logo, judul, isi. */
export async function HalamanAuth({ judul, sub, kembali, children, kaki }: {
    judul: string; sub?: string; kembali?: string; children: React.ReactNode; kaki?: React.ReactNode
}) {
    const nama = await namaKoperasi()
    return (
        <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-6 pb-8 pt-[max(2rem,env(safe-area-inset-top))]">
            <div className="flex items-center gap-3">
                {kembali && (
                    <Link href={kembali} aria-label="Kembali" className="-ml-2.5 grid size-11 place-items-center rounded-full hover:bg-garis/60">
                        <ChevronLeft size={24} strokeWidth={1.9} />
                    </Link>
                )}
                <Image src="/logo.png" alt="" width={40} height={40} priority />
                <div className="leading-tight">
                    <p className="text-sm font-semibold">{nama}</p>
                    <p className="text-xs text-redup">Aplikasi Anggota</p>
                </div>
            </div>
            <div className="mt-10">
                <h1 className="text-[1.75rem] font-bold tracking-tight">{judul}</h1>
                {sub && <p className="mt-2 text-[0.9375rem] leading-relaxed text-redup">{sub}</p>}
            </div>
            <div className="mt-8">{children}</div>
            {kaki && <div className="mt-auto pt-10 text-center text-sm text-redup">{kaki}</div>}
        </main>
    )
}
