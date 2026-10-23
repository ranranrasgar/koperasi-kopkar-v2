import type { Metadata } from "next"
import Link from "next/link"
import { HalamanAuth } from "@/components/HalamanAuth"
import { emailSiap } from "@/lib/email"
import { FormLupa } from "./FormLupa"

export const metadata: Metadata = { title: "Lupa Password" }

export default function LupaPasswordPage() {
    return (
        <HalamanAuth judul="Lupa password" kembali="/masuk" sub="Buat password baru lewat pertanyaan keamanan atau email yang terdaftar."
            kaki={<>Ingat password? <Link href="/masuk" className="font-semibold text-utama">Masuk</Link></>}>
            <FormLupa emailAktif={emailSiap()} />
        </HalamanAuth>
    )
}
