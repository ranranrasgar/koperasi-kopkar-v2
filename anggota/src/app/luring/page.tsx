import type { Metadata } from "next"
import { WifiOff } from "lucide-react"

export const metadata: Metadata = { title: "Tidak ada koneksi" }

// Ditampilkan service worker (public/sw.js) saat halaman tidak bisa diambil karena HP tidak tersambung internet.
// Tanpa data anggota dan tanpa JavaScript, karena halaman ini disimpan di HP.
export default function LuringPage() {
    return (
        <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col items-center justify-center px-8 text-center">
            <span className="grid size-16 place-items-center rounded-full bg-utama-lembut text-utama">
                <WifiOff size={28} strokeWidth={1.75} />
            </span>
            <h1 className="mt-5 text-xl font-bold tracking-tight">Tidak ada koneksi</h1>
            <p className="mt-2 text-sm leading-relaxed text-redup">
                Periksa data seluler atau Wi-Fi Anda. Saldo dan transaksi selalu diambil langsung dari koperasi, jadi perlu internet.
            </p>
            <a href="/beranda" className="mt-6 flex h-12 items-center rounded-xl bg-utama px-6 font-semibold text-pada-utama hover:bg-utama-tekan">
                Coba lagi
            </a>
        </main>
    )
}
