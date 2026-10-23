import type { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"
import { redirect } from "next/navigation"
import { anggotaSesi } from "@/lib/anggota"
import { namaKoperasi } from "@/lib/koperasi"
import { TombolGoogle } from "@/components/TombolGoogle"
import { FormMasuk } from "./FormMasuk"

export const metadata: Metadata = { title: "Masuk" }

const GALAT: Record<string, string> = {
    google: "Masuk dengan Google gagal atau dibatalkan. Coba lagi.",
    nonaktif: "Akun Anda tidak aktif. Hubungi pengurus koperasi.",
}

export default async function MasukPage({ searchParams }: { searchParams: Promise<{ galat?: string }> }) {
    if (await anggotaSesi()) redirect("/beranda")
    const galat = GALAT[(await searchParams).galat ?? ""]
    const nama = await namaKoperasi()
    return (
        <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-6 pb-8 pt-[max(3rem,env(safe-area-inset-top))]">
            <div className="flex items-center gap-3">
                <Image src="/logo.png" alt="" width={44} height={44} priority />
                <div className="leading-tight">
                    <p className="text-sm font-semibold">{nama}</p>
                    <p className="text-xs text-redup">Aplikasi Anggota</p>
                </div>
            </div>

            <div className="mt-14">
                <h1 className="text-[1.75rem] font-bold tracking-tight">Masuk</h1>
                <p className="mt-2 text-[0.9375rem] leading-relaxed text-redup">
                    Pakai username dan password yang sama dengan aplikasi anggota sebelumnya.
                </p>
            </div>

            {galat && <p role="alert" className="mt-6 rounded-xl bg-keluar-lembut px-4 py-3 text-sm font-medium text-keluar">{galat}</p>}

            <FormMasuk />
            <TombolGoogle />

            <p className="mt-auto pt-10 text-center text-sm text-redup">
                Belum punya akun? <Link href="/daftar" className="font-semibold text-utama">Daftar</Link>
            </p>
            <p className="mt-3 text-center text-xs text-redup">
                <Link href="/terms" className="underline">Syarat dan Ketentuan</Link> · <Link href="/policy" className="underline">Kebijakan Privasi</Link>
            </p>
        </main>
    )
}
