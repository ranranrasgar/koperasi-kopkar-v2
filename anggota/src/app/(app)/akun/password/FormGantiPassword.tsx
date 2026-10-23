"use client"

import Link from "next/link"
import { useActionState } from "react"
import { gantiPasswordAction } from "@/app/actions/akun"
import { ATURAN_PASSWORD, KolomPassword, PesanBerhasil, PesanGalat, tanpaReset, Tombol } from "@/components/form"

export function FormGantiPassword() {
    const [hasil, kirim, proses] = useActionState(gantiPasswordAction, null)
    if (hasil?.ok) {
        return (
            <PesanBerhasil judul="Password diganti" pesan={hasil.pesan}>
                <Link href="/akun" className="inline-flex h-11 items-center rounded-xl border border-garis px-5 text-sm font-semibold">Kembali ke Akun</Link>
            </PesanBerhasil>
        )
    }
    return (
        <form onSubmit={tanpaReset(kirim)} className="space-y-5">
            <KolomPassword label="Password lama" name="lama" autoComplete="current-password" required />
            <KolomPassword label="Password baru" name="password" autoComplete="new-password" required catatan={ATURAN_PASSWORD} />
            <KolomPassword label="Ulangi password baru" name="ulangi" autoComplete="new-password" required />
            <PesanGalat pesan={hasil && !hasil.ok ? hasil.error : null} />
            <Tombol proses={proses} label="Menyimpan…">Simpan password</Tombol>
        </form>
    )
}
