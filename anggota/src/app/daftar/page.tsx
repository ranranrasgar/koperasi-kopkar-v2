import type { Metadata } from "next"
import Link from "next/link"
import { redirect } from "next/navigation"
import { HalamanAuth } from "@/components/HalamanAuth"
import { anggotaSesi } from "@/lib/anggota"
import { TombolGoogle } from "@/components/TombolGoogle"
import { FormDaftar } from "./FormDaftar"

export const metadata: Metadata = { title: "Daftar Akun" }

export default async function DaftarPage() {
    if (await anggotaSesi()) redirect("/beranda")
    return (
        <HalamanAuth judul="Daftar akun" kembali="/masuk"
            sub="Untuk anggota koperasi dan karyawan Mattel. Daftar dengan NIK karyawan Anda dan email aktif; akun aktif setelah email diverifikasi dan disetujui pengurus koperasi."
            kaki={<>
                <p>Sudah punya akun? <Link href="/masuk" className="font-semibold text-utama">Masuk</Link></p>
                <p className="mt-3 text-xs">Dengan mendaftar Anda menyetujui <Link href="/terms" className="font-semibold text-utama">Syarat dan Ketentuan</Link> serta <Link href="/policy" className="font-semibold text-utama">Kebijakan Privasi</Link>.</p>
            </>}>
            <FormDaftar />
            <TombolGoogle />
        </HalamanAuth>
    )
}
