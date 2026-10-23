import { Navigasi } from "@/components/Navigasi"
import { wajibMasuk } from "@/lib/anggota"

export default async function AplikasiLayout({ children }: Readonly<{ children: React.ReactNode }>) {
    await wajibMasuk()
    return (
        <>
            <div className="mx-auto min-h-dvh w-full max-w-md pb-[calc(5.5rem+env(safe-area-inset-bottom))]">{children}</div>
            <Navigasi />
        </>
    )
}
