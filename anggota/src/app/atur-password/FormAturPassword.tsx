"use client"

import Link from "next/link"
import { useActionState } from "react"
import { aturPasswordTokenAction } from "@/app/actions/akun"
import { ATURAN_PASSWORD, KolomPassword, PesanBerhasil, PesanGalat, tanpaReset, Tombol } from "@/components/form"

export function FormAturPassword({ token }: { token: string }) {
    const [hasil, kirim, proses] = useActionState(aturPasswordTokenAction, null)
    if (hasil?.ok) {
        return (
            <PesanBerhasil judul="Password diganti" pesan={hasil.pesan}>
                <Link href="/masuk" className="inline-flex h-12 items-center rounded-xl bg-utama px-6 font-semibold text-pada-utama">Masuk</Link>
            </PesanBerhasil>
        )
    }
    return (
        <form onSubmit={tanpaReset(kirim)} className="space-y-5">
            <input type="hidden" name="token" value={token} />
            <KolomPassword label="Password baru" name="password" autoComplete="new-password" required catatan={ATURAN_PASSWORD} />
            <KolomPassword label="Ulangi password baru" name="ulangi" autoComplete="new-password" required />
            <PesanGalat pesan={hasil && !hasil.ok ? hasil.error : null} />
            <Tombol proses={proses}>Simpan password baru</Tombol>
        </form>
    )
}
