"use client"

import { useActionState } from "react"
import { emailAction } from "@/app/actions/akun"
import { Kolom, PesanGalat, tanpaReset, Tombol } from "@/components/form"

/** Isi atau ganti email akun. Dengan tujuan, setelah tersimpan langsung pindah (dipakai Lengkapi Email). */
export function FormEmail({ awal, tujuan, tombol = "Simpan email" }: { awal?: string | null; tujuan?: string; tombol?: string }) {
    const [hasil, kirim, proses] = useActionState(emailAction, null)
    return (
        <form onSubmit={tanpaReset(kirim)} className="space-y-5">
            {tujuan && <input type="hidden" name="tujuan" value={tujuan} />}
            <Kolom label="Email" name="email" type="email" autoComplete="email" inputMode="email" defaultValue={awal ?? ""} maxLength={100} required
                catatan="Dipakai untuk mengatur ulang password bila Anda lupa." />
            <PesanGalat pesan={hasil && !hasil.ok ? hasil.error : null} />
            {hasil?.ok && <p role="status" className="rounded-xl bg-masuk/15 px-4 py-3 text-sm font-medium text-masuk">{hasil.pesan}</p>}
            <Tombol proses={proses} label="Menyimpan…">{tombol}</Tombol>
        </form>
    )
}
