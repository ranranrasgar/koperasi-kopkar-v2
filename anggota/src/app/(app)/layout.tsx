import { wajibMasuk } from "@/lib/anggota"

export default async function AplikasiLayout({ children }: Readonly<{ children: React.ReactNode }>) {
    await wajibMasuk()
    return <div className="mx-auto min-h-dvh w-full max-w-md pb-[env(safe-area-inset-bottom)]">{children}</div>
}
