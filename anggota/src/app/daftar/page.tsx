import type { Metadata } from "next"
import Link from "next/link"
import { redirect } from "next/navigation"
import { HalamanAuth } from "@/components/HalamanAuth"
import { anggotaSesi } from "@/lib/anggota"
import { query } from "@/lib/db"
import { TombolGoogle } from "@/components/TombolGoogle"
import { FormDaftar } from "./FormDaftar"

export const metadata: Metadata = { title: "Daftar Akun" }

export default async function DaftarPage() {
    if (await anggotaSesi()) redirect("/beranda")
    const pertanyaan = await query<{ id: number; pertanyaan: string }>("SELECT id, pertanyaan FROM pertanyaan ORDER BY urut")
    return (
        <HalamanAuth judul="Daftar akun" kembali="/masuk"
            sub="Untuk anggota koperasi dan karyawan Mattel. Daftar dengan NIK karyawan Anda dan email aktif; akun aktif setelah email diverifikasi."
            kaki={<>Sudah punya akun? <Link href="/masuk" className="font-semibold text-utama">Masuk</Link></>}>
            <FormDaftar pertanyaan={pertanyaan} />
            <TombolGoogle />
        </HalamanAuth>
    )
}
