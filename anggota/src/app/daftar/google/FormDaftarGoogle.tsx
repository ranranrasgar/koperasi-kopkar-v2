"use client"

import { useActionState } from "react"
import { daftarGoogleAction } from "@/app/actions/akun"
import { ATURAN_PASSWORD, Kolom, KolomPassword, PesanGalat, tanpaReset, Tombol } from "@/components/form"

export function FormDaftarGoogle({ usulanUsername }: { usulanUsername: string }) {
    const [hasil, kirim, proses] = useActionState(daftarGoogleAction, null)
    return (
        <form onSubmit={tanpaReset(kirim)} className="space-y-5">
            <Kolom label="NIK karyawan" name="nik" inputMode="numeric" maxLength={6} autoComplete="off" required catatan="6 digit, sesuai data karyawan." />
            <Kolom label="Username" name="username" autoComplete="username" autoCapitalize="none" autoCorrect="off" spellCheck={false}
                maxLength={50} required defaultValue={usulanUsername} catatan="Dipakai bila masuk tanpa Google. 3 sampai 50 karakter." />
            <KolomPassword label="Password" name="password" autoComplete="new-password" required catatan={ATURAN_PASSWORD} />
            <KolomPassword label="Ulangi password" name="ulangi" autoComplete="new-password" required />
            <PesanGalat pesan={hasil && !hasil.ok ? hasil.error : null} />
            <Tombol proses={proses} label="Mendaftarkan…">Selesaikan pendaftaran</Tombol>
        </form>
    )
}
