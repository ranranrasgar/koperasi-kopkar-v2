import { DashboardShell } from "@/components/layout/DashboardShell"
import { modeUji, serverUji } from "@/lib/db"
import { identitasKoperasi } from "@/lib/koperasi"
import { wajibLogin } from "@/lib/operator"

export default async function Layout({ children }: { children: React.ReactNode }) {
    const o = await wajibLogin()
    const k = await identitasKoperasi()
    return (
        <DashboardShell operator={{ nama: o.nama, namaLengkap: o.namaLengkap, grup: o.grup, izin: o.izin }} koperasi={{ nama: k.nama, logo: k.logo }}>
            {serverUji && (
                <div role="status" className="mb-4 rounded-md border border-violet-400 bg-violet-50 dark:bg-violet-500/10 px-4 py-2 text-sm text-violet-800 dark:text-violet-300">
                    <span className="font-semibold">Server uji, database {serverUji}.</span> Transaksi benar-benar disimpan, tetapi di salinan database,
                    terpisah dari data asli. Kembalikan ke salinan baru dengan <code className="font-mono">npm run uji:reset</code>.
                </div>
            )}
            {modeUji && (
                <div role="status" className="mb-4 rounded-md border border-amber-400 bg-amber-50 dark:bg-amber-500/10 px-4 py-2 text-sm font-semibold text-amber-800 dark:text-amber-300">
                    Mode uji aktif (KOPKAR_UJI_ROLLBACK=1): semua transaksi dibatalkan setelah diproses dan tidak tersimpan.
                </div>
            )}
            {children}
        </DashboardShell>
    )
}
