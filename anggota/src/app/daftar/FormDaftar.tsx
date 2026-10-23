"use client"

import Link from "next/link"
import { useActionState } from "react"
import { daftarAction } from "@/app/actions/akun"
import { ATURAN_PASSWORD, Kolom, KolomPassword, PesanBerhasil, PesanGalat, tanpaReset, Tombol } from "@/components/form"

export function FormDaftar() {
    const [hasil, kirim, proses] = useActionState(daftarAction, null)
    if (hasil?.ok) {
        return (
            <PesanBerhasil judul="Akun dibuat" pesan={hasil.pesan}>
                <Link href="/masuk" className="inline-flex h-12 items-center rounded-xl bg-utama px-6 font-semibold text-pada-utama">Masuk</Link>
            </PesanBerhasil>
        )
    }
    return (
        <form onSubmit={tanpaReset(kirim)} className="space-y-5">
            <Kolom label="NIK karyawan" name="nik" inputMode="numeric" maxLength={6} autoComplete="off" required catatan="6 digit, sesuai data karyawan." />
            <Kolom label="Email" name="email" type="email" inputMode="email" autoComplete="email" autoCapitalize="none" maxLength={100} required
                catatan="Kode verifikasi dikirim ke email ini. Dipakai juga untuk notifikasi dan lupa password." />
            <Kolom label="Username" name="username" autoComplete="username" autoCapitalize="none" autoCorrect="off" spellCheck={false}
                maxLength={50} required catatan="Dipakai untuk masuk. 3 sampai 50 karakter." />
            <KolomPassword label="Password" name="password" autoComplete="new-password" required catatan={ATURAN_PASSWORD} />
            <KolomPassword label="Ulangi password" name="ulangi" autoComplete="new-password" required />
            <PesanGalat pesan={hasil && !hasil.ok ? hasil.error : null} />
            <Tombol proses={proses} label="Mendaftarkan…">Daftar</Tombol>
        </form>
    )
}
