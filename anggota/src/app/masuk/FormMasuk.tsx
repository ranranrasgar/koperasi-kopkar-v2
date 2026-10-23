"use client"

import Link from "next/link"
import { useActionState, useState } from "react"
import { Eye, EyeOff, LoaderCircle } from "lucide-react"
import { masukAction } from "@/app/actions/auth"

const kolom =
    "h-13 w-full rounded-xl border border-garis bg-permukaan px-4 text-base outline-none transition " +
    "placeholder:text-redup/70 focus:border-utama focus:ring-4 focus:ring-utama/15"

export function FormMasuk() {
    const [hasil, kirim, proses] = useActionState(masukAction, null)
    const [lihat, setLihat] = useState(false)

    return (
        <form action={kirim} className="mt-8 space-y-5" noValidate>
            <div className="space-y-2">
                <label htmlFor="username" className="text-sm font-medium">Username</label>
                <input id="username" name="username" className={kolom} autoComplete="username" autoCapitalize="none"
                    autoCorrect="off" spellCheck={false} required defaultValue={hasil?.username} />
            </div>

            <div className="space-y-2">
                <div className="flex items-baseline justify-between">
                    <label htmlFor="password" className="text-sm font-medium">Password</label>
                    <Link href="/lupa-password" className="text-sm font-medium text-utama">Lupa password?</Link>
                </div>
                <div className="relative">
                    <input id="password" name="password" type={lihat ? "text" : "password"} className={`${kolom} pr-13`}
                        autoComplete="current-password" required />
                    <button type="button" onClick={() => setLihat(!lihat)}
                        className="absolute inset-y-0 right-0 grid w-13 place-items-center text-redup hover:text-teks"
                        aria-label={lihat ? "Sembunyikan password" : "Tampilkan password"}>
                        {lihat ? <EyeOff size={20} strokeWidth={1.75} /> : <Eye size={20} strokeWidth={1.75} />}
                    </button>
                </div>
            </div>

            {hasil?.error && (
                <div role="alert" className="rounded-xl bg-keluar-lembut px-4 py-3 text-sm font-medium text-keluar">
                    <p>{hasil.error}</p>
                    {hasil.verifikasi && <Link href={`/verifikasi-email?u=${hasil.verifikasi}`} className="mt-2 inline-block font-semibold underline">Verifikasi email sekarang</Link>}
                </div>
            )}

            <button type="submit" disabled={proses}
                className="flex h-13 w-full items-center justify-center gap-2 rounded-xl bg-utama text-base font-semibold
                    text-pada-utama transition hover:bg-utama-tekan active:scale-[0.99] disabled:opacity-70">
                {proses && <LoaderCircle size={18} className="animate-spin" />}
                {proses ? "Memeriksa…" : "Masuk"}
            </button>
        </form>
    )
}
