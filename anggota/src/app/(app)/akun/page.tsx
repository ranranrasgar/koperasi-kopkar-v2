import type { Metadata } from "next"
import { BookOpen, KeyRound, Mail, MessageSquare } from "lucide-react"
import { hitungBelumDibaca } from "@kopkar/backend/src/anggota/pesan.ts"
import { FotoProfil } from "@/components/FotoProfil"
import { PilihTema } from "@/components/PilihTema"
import { TombolKeluar } from "@/components/TombolKeluar"
import { Baris, BarisTautan, Blok, Kartu } from "@/components/ui"
import { wajibMasuk } from "@/lib/anggota"
import { pool } from "@/lib/db"
import { infoFoto } from "@/lib/foto"

export const metadata: Metadata = { title: "Akun" }

// Hanya hal yang menyangkut akun (foto, username, email, password, tampilan, keluar). Data diri, keanggotaan,
// pekerjaan, dan rekening sengaja tidak ditampilkan di sini (privasi, mis. HP yang dipinjam); dikelola pengurus di admin.
export default async function AkunPage() {
    const a = await wajibMasuk()
    const [foto, balasanBaru] = await Promise.all([
        infoFoto(a.userId),
        a.anggotaId !== null ? hitungBelumDibaca(pool, "anggota", a.anggotaId) : 0,
    ])
    const inisial = a.nama.split(/\s+/).filter(Boolean).slice(0, 2).map((s) => s[0]).join("").toUpperCase()

    return (
        <main>
            <div className="px-5 pt-2">
                <Blok className="flex items-center gap-4 pb-1 pt-1">
                    <FotoProfil inisial={inisial} versi={foto.versi} bisaUnggah={foto.terpasang} />
                    <div className="min-w-0">
                        <p className="truncate text-lg font-bold">{a.nama}</p>
                        <p className="truncate text-sm text-redup">{a.username}</p>
                    </div>
                </Blok>

                {a.anggotaId !== null && (
                    <Kartu className="mt-5 overflow-hidden">
                        <BarisTautan href="/pesan" judul={<span className="flex items-center gap-2"><MessageSquare size={18} strokeWidth={1.75} className="text-utama" /> Pesan ke koperasi</span>}
                            sub="Tanya atau sampaikan sesuatu ke pengurus" nilai={balasanBaru > 0 ? `${balasanBaru} baru` : undefined} />
                    </Kartu>
                )}

                <h2 className="mb-1 mt-8 text-[0.9375rem] font-semibold">Akun</h2>
                <Kartu className="divide-y divide-garis overflow-hidden">
                    <div className="px-5"><Baris label="Username" nilai={a.username} /></div>
                    <BarisTautan href="/akun/email" judul={<span className="flex items-center gap-3"><Mail size={19} strokeWidth={1.75} className="text-redup" />Email</span>}
                        nilaiSub={a.email ?? "Belum diisi"} />
                    <BarisTautan href="/akun/password" judul={<span className="flex items-center gap-3"><KeyRound size={19} strokeWidth={1.75} className="text-redup" />Ganti password</span>} />
                </Kartu>

                <h2 className="mb-1 mt-8 text-[0.9375rem] font-semibold">Tampilan</h2>
                <PilihTema />

                <Kartu className="mt-6 overflow-hidden">
                    <BarisTautan href="/selamat-datang" judul={<span className="flex items-center gap-3"><BookOpen size={19} strokeWidth={1.75} className="text-redup" />Panduan penggunaan</span>}
                        sub="Kenali isi dan fitur aplikasi" />
                </Kartu>

                <p className="mt-6 px-1 text-xs leading-relaxed text-redup">
                    Data diri, keanggotaan, dan rekening Anda tidak ditampilkan di aplikasi ini demi privasi. Hubungi pengurus koperasi bila perlu melihat atau memperbaikinya.
                </p>

                <TombolKeluar />
            </div>
        </main>
    )
}
