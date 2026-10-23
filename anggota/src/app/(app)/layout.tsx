import { kunciPublikPush } from "@kopkar/backend/src/anggota/push.ts"
import { AppBar } from "@/components/AppBar"
import { Navigasi } from "@/components/Navigasi"
import { NotifikasiOtomatis } from "@/components/NotifikasiOtomatis"
import { wajibMasuk } from "@/lib/anggota"
import { infoFoto } from "@/lib/foto"
import { statusAppBar } from "@/lib/status-appbar"

export default async function AplikasiLayout({ children }: Readonly<{ children: React.ReactNode }>) {
    const a = await wajibMasuk()
    const [foto, status] = await Promise.all([infoFoto(a.userId), a.anggotaId !== null ? statusAppBar(a.anggotaId) : null])
    const inisial = a.nama.split(/\s+/).filter(Boolean).slice(0, 2).map((s) => s[0]).join("").toUpperCase()
    return (
        <>
            <div className="mx-auto min-h-dvh w-full max-w-md pb-[calc(5.5rem+env(safe-area-inset-bottom))]">
                <AppBar awal={status} nama={a.nama} inisial={inisial} fotoVersi={foto.versi} />
                {children}
            </div>
            <Navigasi />
            {a.anggotaId !== null && <NotifikasiOtomatis kunciPublik={kunciPublikPush()} />}
        </>
    )
}
