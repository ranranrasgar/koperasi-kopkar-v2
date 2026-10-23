import type { Metadata } from "next"
import { Pengantar } from "@/components/Pengantar"
import { wajibMasuk } from "@/lib/anggota"

export const metadata: Metadata = { title: "Selamat datang" }

// Pengantar aplikasi. Muncul otomatis sekali saat anggota pertama kali membuka Beranda (lihat beranda/page.tsx),
// dan bisa dibuka lagi dari menu Akun > Panduan penggunaan.
export default async function SelamatDatangPage() {
    await wajibMasuk()
    return <main><Pengantar /></main>
}
