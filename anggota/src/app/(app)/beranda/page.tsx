import type { Metadata } from "next"
import { LogOut } from "lucide-react"
import { keluarAction } from "@/app/actions/auth"
import { wajibMasuk } from "@/lib/anggota"

export const metadata: Metadata = { title: "Beranda" }

function salam() {
    const jam = Number(new Intl.DateTimeFormat("id-ID", { hour: "numeric", hour12: false, timeZone: "Asia/Jakarta" }).format(new Date()))
    return jam < 11 ? "Selamat pagi" : jam < 15 ? "Selamat siang" : jam < 19 ? "Selamat sore" : "Selamat malam"
}

// Tahap 1: kerangka beranda setelah masuk. Kartu saldo, menu, dan navigasi bawah diisi di Tahap 2.
export default async function BerandaPage() {
    const a = await wajibMasuk()
    return (
        <main className="px-5 pt-[max(1.5rem,env(safe-area-inset-top))]">
            <header className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                    <p className="text-sm text-redup">{salam()},</p>
                    <h1 className="truncate text-xl font-bold tracking-tight">{a.nama}</h1>
                    <p className="angka mt-0.5 text-xs text-redup">{a.anggotaId ? `No. anggota ${a.kodeAgt}` : `NIK ${a.kodeAgt} · belum terdaftar anggota`}</p>
                </div>
                <form action={keluarAction}>
                    <button className="grid size-11 place-items-center rounded-full border border-garis bg-permukaan text-redup hover:text-teks"
                        aria-label="Keluar">
                        <LogOut size={19} strokeWidth={1.75} />
                    </button>
                </form>
            </header>
        </main>
    )
}
