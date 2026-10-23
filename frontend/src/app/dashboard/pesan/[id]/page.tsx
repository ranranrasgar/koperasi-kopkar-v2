import Link from "next/link"
import { notFound } from "next/navigation"
import { ChevronLeft } from "lucide-react"
import { detailPercakapan, MAKS_PESAN, tandaiDibaca } from "@kopkar/backend/src/anggota/pesan.ts"
import { BalasPesan } from "@/components/notifikasi/BalasPesan"
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
                <ol className="mb-6 space-y-3">
                    {p.isi.map((m) => {
                        const admin = m.pengirim === "admin"
                        return (
                            <li key={m.id} className={`flex ${admin ? "justify-end" : "justify-start"}`}>
                                <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${admin ? "rounded-br-md bg-blue-600 text-white" : "rounded-bl-md border bg-muted/40"}`}>
                                    <p className={`mb-0.5 text-xs font-semibold ${admin ? "text-white/80" : "text-muted-foreground"}`}>{admin ? (m.opr_nama || "Koperasi") : p.nama}</p>
                                    <p className="whitespace-pre-line leading-relaxed">{m.isi}</p>
                                    <p className={`mt-1 text-[11px] ${admin ? "text-white/70" : "text-muted-foreground"}`}>{m.dibuat_pada}</p>
                                </div>
                            </li>
                        )
                    })}
                </ol>
                <BalasPesan id={p.id} selesai={p.status === "selesai"} maks={MAKS_PESAN} />
            </FormCard>
        </div>
    )
}
