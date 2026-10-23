import Link from "next/link"

export default function TidakDitemukan() {
    return (
        <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col items-center justify-center px-8 text-center">
            <p className="angka text-sm font-semibold text-utama">404</p>
            <h1 className="mt-2 text-xl font-bold tracking-tight">Halaman tidak ditemukan</h1>
            <p className="mt-2 text-sm leading-relaxed text-redup">Data yang Anda buka tidak ada atau bukan milik akun ini.</p>
            <Link href="/beranda" className="mt-6 flex h-12 items-center rounded-xl bg-utama px-6 font-semibold text-pada-utama hover:bg-utama-tekan">
                Kembali ke beranda
            </Link>
        </main>
    )
}
