import type { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"
import { redirect } from "next/navigation"
import { anggotaSesi } from "@/lib/anggota"
import { namaKoperasi } from "@/lib/koperasi"
import { FormMasuk } from "./FormMasuk"

export const metadata: Metadata = { title: "Masuk" }

export default async function MasukPage() {
    if (await anggotaSesi()) redirect("/beranda")
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

            <FormMasuk />

            <p className="mt-auto pt-10 text-center text-sm text-redup">
                Belum punya akun? <Link href="/daftar" className="font-semibold text-utama">Daftar</Link>
            </p>
        </main>
    )
}
