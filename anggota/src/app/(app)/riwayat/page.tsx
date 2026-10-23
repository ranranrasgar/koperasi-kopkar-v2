import type { Metadata } from "next"
import { BarisRiwayat } from "@/components/BarisRiwayat"
import { batasBaris, Kartu, Kepala, Kosong, MuatLagi } from "@/components/ui"
import { wajibAnggota } from "@/lib/anggota"
import { riwayat } from "@/lib/data"

export const metadata: Metadata = { title: "Riwayat" }

const LANGKAH = 25
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
                        {baris.map((r, i) => <BarisRiwayat key={`${r.ref}-${i}`} r={r} />)}
                    </Kartu>
                )}
                <MuatLagi href={`/riwayat?n=${batas + LANGKAH}`} sisa={semua.length - baris.length} />
            </div>
        </main>
    )
}
