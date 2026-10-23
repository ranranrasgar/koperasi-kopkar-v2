"use client"

import Link from "next/link"
import { useActionState } from "react"
import { ChevronDown } from "lucide-react"
import { daftarAction } from "@/app/actions/akun"
import { ATURAN_PASSWORD, kelasKolom, Kolom, KolomPassword, PesanBerhasil, PesanGalat, tanpaReset, Tombol } from "@/components/form"

export function FormDaftar({ pertanyaan }: { pertanyaan: { id: number; pertanyaan: string }[] }) {
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
            <div className="space-y-2">
                <label htmlFor="pertanyaan" className="text-sm font-medium">Pertanyaan keamanan</label>
                <div className="relative">
                    <select id="pertanyaan" name="pertanyaan" className={`${kelasKolom} appearance-none pr-11`} defaultValue={pertanyaan[0]?.id}>
                        {pertanyaan.map((p) => <option key={p.id} value={p.id}>{p.pertanyaan}</option>)}
                    </select>
                    <ChevronDown size={18} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-redup" />
                </div>
                <p className="text-xs text-redup">Dipakai bila Anda lupa password.</p>
            </div>
            <Kolom label="Jawaban" name="jawaban" autoComplete="off" maxLength={100} required catatan="Huruf besar/kecil tidak dibedakan." />
            <PesanGalat pesan={hasil && !hasil.ok ? hasil.error : null} />
            <Tombol proses={proses} label="Mendaftarkan…">Daftar</Tombol>
        </form>
    )
}
