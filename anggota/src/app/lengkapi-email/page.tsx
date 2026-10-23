import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { keluarAction } from "@/app/actions/auth"
import { FormEmail } from "@/components/FormEmail"
import { HalamanAuth } from "@/components/HalamanAuth"
import { punyaEmail, wajibMasuk } from "@/lib/anggota"

export const metadata: Metadata = { title: "Lengkapi Email" }

/** Wajib isi email setelah masuk, bila akun belum punya email (aturan aplikasi lama). */
export default async function LengkapiEmailPage() {
    const a = await wajibMasuk({ bolehTanpaEmail: true })
    if (punyaEmail(a)) redirect("/beranda")
    return (
        <HalamanAuth judul="Lengkapi email" sub={`Halo ${a.nama}. Tambahkan email aktif Anda sebelum melanjutkan; email dipakai bila Anda lupa password.`}
            kaki={<form action={keluarAction}><button className="font-semibold text-utama">Keluar</button></form>}>
            <FormEmail tujuan="/beranda" tombol="Simpan dan lanjutkan" />
        </HalamanAuth>
    )
}
