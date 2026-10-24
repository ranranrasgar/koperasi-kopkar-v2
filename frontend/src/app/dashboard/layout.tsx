import Link from "next/link"
import { Suspense } from "react"
import { hitungBelumDibaca } from "@kopkar/backend/src/anggota/pesan.ts"
import { hitungNotifAdminBaru } from "@kopkar/backend/src/anggota/notif-admin.ts"
import { hitungPengumumanBaru } from "@kopkar/backend/src/anggota/sasaran.ts"
import { BilahProgres } from "@/components/layout/BilahProgres"
import { DashboardShell } from "@/components/layout/DashboardShell"
import { modeAplikasi, pool, serverUji } from "@/lib/db"
import { identitasKoperasi } from "@/lib/koperasi"
import { wajibLogin } from "@/lib/operator"
import { MENU } from "@/config/akses"

export default async function Layout({ children }: { children: React.ReactNode }) {
    const o = await wajibLogin()
    const [k, mode, pesanBaru, pengumumanBaru] = await Promise.all([
        identitasKoperasi(), modeAplikasi(),
        o.izin.includes(MENU.pesanAnggota) ? hitungBelumDibaca(pool, "admin") : 0,
        Promise.all([hitungPengumumanBaru(pool, o.id), hitungNotifAdminBaru(pool, o.id)]).then(([a, b]) => a + b),
    ])
    return (
        <DashboardShell operator={{ nama: o.nama, namaLengkap: o.namaLengkap, grup: o.grup, izin: o.izin }} koperasi={{ nama: k.nama, logo: k.logo }} lencana={{ "/dashboard/pesan": pesanBaru, "/dashboard/pengumuman": pengumumanBaru }}>
            <Suspense fallback={null}><BilahProgres /></Suspense>
            {serverUji && (
                <div role="status" className="mb-4 rounded-md border border-violet-400 bg-violet-50 dark:bg-violet-500/10 px-4 py-2 text-sm text-violet-800 dark:text-violet-300">
                    <span className="font-semibold">Server uji, database {serverUji}.</span> Transaksi benar-benar disimpan, tetapi di salinan database,
                    terpisah dari data asli. Kembalikan ke salinan baru dengan <code className="font-mono">npm run uji:reset</code>.
                </div>
            )}
            {mode.uji && (
                <div role="status" className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md border border-amber-400 bg-amber-50 dark:bg-amber-500/10 px-4 py-2 text-sm font-semibold text-amber-800 dark:text-amber-300">
                    <span>Mode uji aktif: semua transaksi dibatalkan setelah diproses dan tidak tersimpan.</span>
                    {o.izin.includes(MENU.modeAplikasi) && (
                        <Link href="/dashboard/settings/mode" className="underline underline-offset-2 font-medium print:hidden">Ubah ke Live</Link>
                    )}
                </div>
            )}
            {children}
        </DashboardShell>
    )
}
