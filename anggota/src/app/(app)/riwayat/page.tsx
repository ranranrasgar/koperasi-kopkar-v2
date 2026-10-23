import type { Metadata } from "next"
import { Coins, FileText, HandCoins, Landmark, PiggyBank, type LucideIcon } from "lucide-react"
import { Arus, batasBaris, Kartu, Kepala, Kosong, MuatLagi } from "@/components/ui"
import { wajibAnggota } from "@/lib/anggota"
import { riwayat, type Riwayat } from "@/lib/data"
import { rupiah, tanggal } from "@/lib/format"

export const metadata: Metadata = { title: "Riwayat" }

const LANGKAH = 25
const IKON: Record<string, LucideIcon> = { SIMPANAN: PiggyBank, PINJAMAN: HandCoins, KPR: Landmark, PENGAJUAN: FileText, SHU: Coins }

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

export default async function RiwayatPage(props: PageProps<"/riwayat">) {
    const a = await wajibAnggota()
    const batas = batasBaris((await props.searchParams).n, LANGKAH)
    // Satu baris lebih dari batas untuk tahu apakah masih ada data berikutnya.
    const semua = await riwayat(a.anggotaId, batas + 1)
    const baris = semua.slice(0, batas)

    return (
        <main>
            <Kepala judul="Riwayat transaksi" kembali="/beranda" />
            <div className="px-5">
                {baris.length === 0 ? <Kartu><Kosong judul="Belum ada transaksi" /></Kartu> : (
                    <Kartu className="divide-y divide-garis">
                        {baris.map((r, i) => {
                            const Ikon = IKON[r.category] ?? FileText
                            return (
                                <div key={`${r.ref}-${i}`} className="flex items-center gap-3 px-4 py-3">
                                    <span className="grid size-10 shrink-0 place-items-center rounded-full bg-latar text-redup">
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
                        })}
                    </Kartu>
                )}
                <MuatLagi href={`/riwayat?n=${batas + LANGKAH}`} sisa={semua.length - baris.length} />
            </div>
        </main>
    )
}
