import Link from "next/link"
import { redirect } from "next/navigation"
import { Search } from "lucide-react"
import { MENU_DETAIL_PINJAMAN_GRUP } from "@/config/akses"
import { formatAngka, formatTanggal } from "@/lib/format"
import { wajibIzin } from "@/lib/operator"
import { cariPinjaman } from "@/lib/queries/pinjaman-detail"

export const dynamic = "force-dynamic"

// Pintu masuk ke detail pinjaman tanpa melewati Daftar Pinjaman (yang punya izin sendiri): ketik nomor pinjaman lalu Enter.
// Nomor yang cocok persis langsung dibuka; selain itu (potongan nomor, nama, KPK, kode anggota) tampil daftar pilihan.
export default async function CariPinjamanPage(props: { searchParams: Promise<{ q?: string }> }) {
    const o = await wajibIzin("/dashboard/loans/cari")
    const kata = ((await props.searchParams).q ?? "").trim().slice(0, 40)
    const grupBoleh = Object.entries(MENU_DETAIL_PINJAMAN_GRUP).filter(([, menu]) => menu.some((m) => o.izin.includes(m))).map(([g]) => g)
    const hasil = await cariPinjaman(kata, grupBoleh)
    const tepat = hasil.find((h) => h.no_pinjaman.toLowerCase() === kata.toLowerCase())
    if (tepat) redirect(`/dashboard/loans/${encodeURIComponent(tepat.no_pinjaman)}`)

    return (
        <div className="max-w-3xl space-y-4">
            <div className="flex flex-col gap-1">
                <h1 className="text-2xl font-semibold tracking-tight">Cari Pinjaman</h1>
                <p className="text-sm text-muted-foreground">Masukkan nomor pinjaman untuk melihat jadwal angsuran dan riwayat pembayarannya. Bisa juga memakai nama, KPK, atau kode anggota.</p>
            </div>

            <form method="get" className="flex gap-2">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <input name="q" defaultValue={kata} autoFocus autoComplete="off" placeholder="Nomor pinjaman, mis. CR-1026-23338"
                        className="h-10 w-full rounded-md border border-input bg-background pl-9 pr-3 font-mono text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" />
                </div>
                <button type="submit" className="h-10 rounded-md bg-blue-600 px-5 text-sm font-semibold text-white hover:bg-blue-700">Lihat</button>
            </form>

            {grupBoleh.length === 0 && <p className="text-sm text-muted-foreground">Grup Anda tidak punya akses ke data pinjaman.</p>}

            {kata.length > 0 && kata.length < 2 && <p className="text-sm text-muted-foreground">Ketik minimal 2 karakter.</p>}

            {kata.length >= 2 && (
                hasil.length === 0 ? (
                    <p className="rounded-md border p-6 text-center text-sm text-muted-foreground">Pinjaman &quot;{kata}&quot; tidak ditemukan.</p>
                ) : (
                    <div className="overflow-hidden rounded-lg border bg-background shadow-sm">
                        <p className="border-b bg-muted/40 px-3 py-2 text-xs text-muted-foreground">{hasil.length} hasil{hasil.length === 20 ? " (maksimal 20, persempit pencarian)" : ""}</p>
                        <ul className="divide-y">
                            {hasil.map((h) => (
                                <li key={h.no_pinjaman}>
                                    <Link href={`/dashboard/loans/${encodeURIComponent(h.no_pinjaman)}`} className="flex flex-wrap items-center justify-between gap-x-6 gap-y-1 px-3 py-2.5 hover:bg-muted/50">
                                        <span className="min-w-0">
                                            <span className="block font-mono text-sm font-semibold text-primary">{h.no_pinjaman}</span>
                                            <span className="block truncate text-sm">{h.nama}{!h.aktif && <span className="ml-2 text-xs text-muted-foreground">(non-aktif)</span>}</span>
                                        </span>
                                        <span className="text-right text-xs text-muted-foreground">
                                            <span className="block">{formatTanggal(h.tgl_pinjaman)} · {h.grup ?? "-"}</span>
                                            <span className="block tabular-nums">Rp {formatAngka(h.rp_pinjaman_pokok)} · {h.jml_cicilan}/{h.lama_angsuran} bln</span>
                                        </span>
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>
                )
            )}
        </div>
    )
}
