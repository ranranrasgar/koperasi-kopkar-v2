import { redirect } from "next/navigation"
import { anggotaSesi } from "@/lib/anggota"

// Sementara: akar langsung ke aplikasi. Landing page kopkarmjsmattel.com menyusul (PRD bagian 5.1).
export default async function Akar() {
    redirect((await anggotaSesi()) ? "/beranda" : "/masuk")
}
