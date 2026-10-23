import Link from "next/link"
import { notFound } from "next/navigation"
import { ChevronLeft } from "lucide-react"
import { detailPercakapan, MAKS_PESAN, tandaiDibaca } from "@kopkar/backend/src/anggota/pesan.ts"
import { BalasPesan } from "@/components/notifikasi/BalasPesan"
import { PercakapanLangsung } from "@/components/notifikasi/PercakapanLangsung"
import { FormCard } from "@/components/transaksi/common"
import { pool } from "@/lib/db"
import { wajibIzin } from "@/lib/operator"

export default async function PercakapanAdminPage(props: { params: Promise<{ id: string }> }) {
    await wajibIzin("/dashboard/pesan") // layout tidak dijalankan ulang pada navigasi antarhalaman
    const { id } = await props.params
    if (!/^\d{1,12}$/.test(id)) notFound()
    const p = await detailPercakapan(pool, Number(id), null)
    if (!p) notFound()
    await tandaiDibaca(pool, p.id, "admin") // dibuka operator = dianggap terbaca
    return (
        <div className="max-w-3xl space-y-4">
            <Link href="/dashboard/pesan" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
                <ChevronLeft className="h-4 w-4" /> Semua pesan
            </Link>
            <FormCard title={p.subjek} description={`${p.nama} · ${p.kode_agt}${p.status === "selesai" ? " · Selesai" : ""}`}>
                <div className="mb-6">
                    <PercakapanLangsung id={p.id} namaAnggota={p.nama} awal={p.isi} />
                </div>
                <BalasPesan id={p.id} selesai={p.status === "selesai"} maks={MAKS_PESAN} />
            </FormCard>
        </div>
    )
}
