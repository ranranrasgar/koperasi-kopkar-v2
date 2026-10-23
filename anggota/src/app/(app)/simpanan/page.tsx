import type { Metadata } from "next"
import { BarisTautan, Blok, Kartu, Kosong } from "@/components/ui"
import { wajibAnggota } from "@/lib/anggota"
import { saldoSimpanan } from "@/lib/data"
import { rupiah } from "@/lib/format"

export const metadata: Metadata = { title: "Simpanan" }

export default async function SimpananPage() {
    const a = await wajibAnggota()
    const daftar = await saldoSimpanan(a.anggotaId)
    const total = daftar.reduce((t, s) => t + s.saldo, 0)

    return (
        <main>
            <div className="px-5 pt-2">
                <Blok>
                    <p className="text-sm text-redup">Total semua simpanan</p>
                    <p className="angka mt-1 text-[1.75rem] font-bold leading-tight tracking-tight">{rupiah(total)}</p>
                </Blok>

                <h2 className="mb-1 mt-8 text-[0.9375rem] font-semibold">Per jenis simpanan</h2>
                {daftar.length === 0 ? (
                    <Kartu><Kosong judul="Belum ada simpanan" isi="Setoran simpanan Anda akan tampil di sini." /></Kartu>
                ) : (
                    <Kartu className="divide-y divide-garis overflow-hidden">
                        {daftar.map((s) => (
                            <BarisTautan key={s.kode} href={`/simpanan/${s.kode}`} judul={s.nama} sub="Lihat mutasi" nilai={rupiah(s.saldo)} />
                        ))}
                    </Kartu>
                )}
            </div>
        </main>
    )
}
