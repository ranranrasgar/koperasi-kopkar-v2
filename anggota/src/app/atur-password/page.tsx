import type { Metadata } from "next"
import Link from "next/link"
import { HalamanAuth } from "@/components/HalamanAuth"
import { bacaTokenReset } from "@/lib/sesi"
import { FormAturPassword } from "./FormAturPassword"

export const metadata: Metadata = { title: "Atur Password" }

/** Halaman dari tautan email lupa password. Token dicek ulang saat disimpan (sekali pakai, 30 menit). */
export default async function AturPasswordPage(props: PageProps<"/atur-password">) {
    const token = String((await props.searchParams).token ?? "")
    const sah = !!bacaTokenReset(token)
    return (
        <HalamanAuth judul="Password baru" kembali="/masuk" sub={sah ? "Buat password baru untuk akun Anda." : undefined}>
            {sah ? <FormAturPassword token={token} /> : (
                <div className="space-y-5">
                    <p className="rounded-xl bg-keluar-lembut px-4 py-3 text-sm font-medium text-keluar">
                        Tautan tidak berlaku atau sudah kedaluwarsa (berlaku 30 menit).
                    </p>
                    <Link href="/lupa-password" className="flex h-13 items-center justify-center rounded-xl bg-utama font-semibold text-pada-utama">
                        Minta tautan baru
                    </Link>
                </div>
            )}
        </HalamanAuth>
    )
}
