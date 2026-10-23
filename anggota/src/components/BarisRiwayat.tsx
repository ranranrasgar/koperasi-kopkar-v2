import { Coins, FileText, HandCoins, Landmark, WalletCards, type LucideIcon } from "lucide-react"
import { Arus } from "@/components/ui"
import type { Riwayat } from "@/lib/data"
import { rupiah, tanggal } from "@/lib/format"

const IKON: Record<string, LucideIcon> = { SIMPANAN: WalletCards, PINJAMAN: HandCoins, KPR: Landmark, PENGAJUAN: FileText, SHU: Coins }

/** Jenis aksi singkat; nama produk sudah di baris atas. */
function aksi(r: Riwayat) {
    switch (r.category) {
        case "SIMPANAN": return r.amount < 0 ? "Penarikan" : "Setoran"
        case "PINJAMAN": return "Angsuran"
        case "KPR": return "Angsuran KPR"
        case "PENGAJUAN": return "Pengajuan pinjaman"
        default: return r.sub
    }
}

/** Satu baris riwayat transaksi (dipakai halaman Riwayat dan aktivitas terakhir di Beranda). */
export function BarisRiwayat({ r }: { r: Riwayat }) {
    const Ikon = IKON[r.category] ?? FileText
    const masuk = r.category !== "PENGAJUAN" && r.amount > 0
    return (
        <div className="flex items-center gap-3 px-5 py-3">
            <span className={`grid size-10 shrink-0 place-items-center rounded-full ${masuk ? "bg-utama-lembut text-utama" : "bg-garis/50 text-redup"}`}>
                <Ikon size={19} strokeWidth={1.75} />
            </span>
            <div className="min-w-0 flex-1">
                <p className="truncate text-[0.9375rem] font-medium">{r.title}</p>
                <p className="truncate text-xs text-redup">{aksi(r)} · {tanggal(r.tgl)}</p>
            </div>
            {/* Pengajuan bukan uang masuk; tampil tanpa tanda. */}
            {r.category === "PENGAJUAN"
                ? <span className="angka shrink-0 whitespace-nowrap text-[0.9375rem] font-semibold">{rupiah(r.amount)}</span>
                : <span className="shrink-0 whitespace-nowrap text-[0.9375rem]"><Arus n={r.amount} /></span>}
        </div>
    )
}
