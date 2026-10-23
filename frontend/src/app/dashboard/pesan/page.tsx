import Link from "next/link"
import { percakapanAdmin } from "@kopkar/backend/src/anggota/pesan.ts"
import { kunciPublikPush } from "@kopkar/backend/src/anggota/push.ts"
import { AktifkanNotifikasiAdmin } from "@/components/notifikasi/AktifkanNotifikasiAdmin"
import { FormCard } from "@/components/transaksi/common"
import { pool } from "@/lib/db"
import { wajibIzin } from "@/lib/operator"
import { cn } from "@/lib/utils"

export default async function PesanAnggotaPage(props: { searchParams: Promise<{ status?: string }> }) {
    await wajibIzin("/dashboard/pesan") // layout tidak dijalankan ulang pada navigasi antarhalaman
    const status = (await props.searchParams).status === "selesai" ? "selesai" : "buka"
    const daftar = await percakapanAdmin(pool, status).catch((e) => {
        if ((e as { code?: string }).code === "42P01") return null // tabel belum dipasang
        throw e
    })
    const tab = (aktif: boolean) => cn("rounded-md px-3 py-1.5 text-sm font-semibold", aktif ? "bg-muted" : "text-muted-foreground hover:bg-muted/60")
    return (
        <div className="max-w-3xl space-y-6">
            <FormCard title="Pesan Anggota" description="Pesan dari aplikasi anggota. Balasan Anda diterima anggota sebagai notifikasi di HP.">
                <div className="space-y-4">
                    <AktifkanNotifikasiAdmin kunciPublik={kunciPublikPush()} />
                    <nav className="flex gap-1">
                        <Link href="/dashboard/pesan" className={tab(status === "buka")}>Terbuka</Link>
                        <Link href="/dashboard/pesan?status=selesai" className={tab(status === "selesai")}>Selesai</Link>
                    </nav>
                    {daftar === null ? (
                        <p className="text-sm text-muted-foreground">Fitur pesan belum dipasang (jalankan <code className="font-mono">npm run anggota:pasang</code>).</p>
                    ) : daftar.length === 0 ? (
                        <p className="text-sm text-muted-foreground">{status === "buka" ? "Tidak ada pesan terbuka." : "Belum ada percakapan yang selesai."}</p>
                    ) : (
                        <ul className="divide-y rounded-lg border">
                            {daftar.map((p) => (
                                <li key={p.id}>
                                    <Link href={`/dashboard/pesan/${p.id}`} className="block px-4 py-3 hover:bg-muted/50">
                                        <div className="flex items-baseline justify-between gap-3">
                                            <span className="flex items-center gap-2 text-sm">
                                                {p.belum_dibaca && <span aria-label="Belum dibaca" className="inline-block h-2 w-2 shrink-0 rounded-full bg-blue-600" />}
                                                <span className={p.belum_dibaca ? "font-bold" : "font-semibold"}>{p.nama}</span>
                                                <span className="font-mono text-xs text-muted-foreground">{p.kode_agt}</span>
                                            </span>
                                            <span className="shrink-0 text-xs text-muted-foreground">{p.pesan_terakhir_pada}</span>
                                        </div>
                                        <p className="mt-0.5 text-sm font-medium">{p.subjek}</p>
                                        <p className="line-clamp-1 text-sm text-muted-foreground">{p.pengirim_terakhir === "admin" ? "Anda: " : ""}{p.cuplikan}</p>
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </FormCard>
        </div>
    )
}
