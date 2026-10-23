import Image from "next/image"
import Link from "next/link"
import { namaKoperasi } from "@/lib/koperasi"

export const EMAIL_KONTAK = "support@kopkarmjsmattel.com"

/** Kerangka halaman dokumen hukum (kebijakan privasi, syarat layanan): terbuka tanpa login, nyaman dibaca. */
export async function HalamanHukum({ judul, diperbarui, children }: { judul: string; diperbarui: string; children: React.ReactNode }) {
    const nama = await namaKoperasi()
    return (
        <main className="mx-auto w-full max-w-2xl px-6 pb-16 pt-[max(2rem,env(safe-area-inset-top))]">
            <header className="flex items-center gap-3">
                <Image src="/logo.png" alt="" width={40} height={40} priority />
                <div className="leading-tight">
                    <p className="text-sm font-semibold">{nama}</p>
                    <p className="text-xs text-redup">Aplikasi Anggota</p>
                </div>
            </header>
            <h1 className="mt-10 text-[1.75rem] font-bold tracking-tight">{judul}</h1>
            <p className="mt-1 text-sm text-redup">Terakhir diperbarui: {diperbarui}</p>
            <div className="mt-8 space-y-8 text-[0.9375rem] leading-relaxed [&_h2]:mb-2 [&_h2]:text-lg [&_h2]:font-bold [&_li]:mt-1.5 [&_p+p]:mt-3 [&_ul]:mt-2 [&_ul]:list-disc [&_ul]:pl-5">
                {children}
            </div>
            <footer className="mt-12 flex flex-wrap gap-x-5 gap-y-2 border-t border-garis pt-6 text-sm">
                <Link href="/policy" className="font-semibold text-utama">Kebijakan Privasi</Link>
                <Link href="/terms" className="font-semibold text-utama">Syarat dan Ketentuan</Link>
                <Link href="/masuk" className="text-redup">Kembali ke aplikasi</Link>
            </footer>
        </main>
    )
}
