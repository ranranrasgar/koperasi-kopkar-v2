import type { Metadata } from "next"
import { BadgeCheck, MailWarning } from "lucide-react"
import { statusEmail } from "@kopkar/backend/src/anggota/verifikasi-email.ts"
import { mintaVerifikasiEmailAction } from "@/app/actions/akun"
import { FormEmail } from "@/components/FormEmail"
import { Kepala } from "@/components/ui"
import { wajibMasuk } from "@/lib/anggota"
import { pool } from "@/lib/db"

export const metadata: Metadata = { title: "Email" }

export default async function EmailPage() {
    const a = await wajibMasuk()
    const st = await statusEmail(pool, a.userId)
    return (
        <main>
            <Kepala judul="Email" sub="Satu email hanya untuk satu akun" kembali="/akun" />
            <div className="px-5">
                {st.email && (
                    st.terverifikasi ? (
                        <p className="mb-5 flex items-center gap-2 rounded-xl bg-masuk/15 px-4 py-3 text-sm font-medium text-masuk"><BadgeCheck size={18} />Email terverifikasi. Notifikasi juga dikirim ke email ini.</p>
                    ) : (
                        <div className="mb-5 rounded-xl bg-tunggu/15 px-4 py-3">
                            <p className="flex items-center gap-2 text-sm font-medium"><MailWarning size={18} />Email belum diverifikasi</p>
                            <p className="mt-1 text-xs leading-relaxed text-redup">Notifikasi lewat email baru dikirim setelah email ini diverifikasi dengan kode 6 angka.</p>
                            <form action={mintaVerifikasiEmailAction} className="mt-3"><button className="h-10 rounded-xl bg-utama px-4 text-sm font-semibold text-pada-utama">Kirim kode verifikasi</button></form>
                        </div>
                    )
                )}
                <FormEmail awal={a.email} />
            </div>
        </main>
    )
}
