import type { Metadata } from "next"
import { Baris, Kartu, Kepala, Kosong } from "@/components/ui"
import { wajibAnggota } from "@/lib/anggota"
import { potonganBulanIni } from "@/lib/data"
import { bulanIni, rupiah } from "@/lib/format"

export const metadata: Metadata = { title: "Potongan Gaji" }

export default async function PotonganPage() {
    const a = await wajibAnggota()
    const p = await potonganBulanIni(a.anggotaId)
    if (!p) return <main><Kepala judul="Potongan gaji" kembali="/beranda" /><Kosong judul="Data tidak ditemukan" /></main>

    const rincian: [string, number][] = [
        ["Simpanan wajib", p.wajib], ["Simpanan sukarela", p.sukarela], ["Angsuran pinjaman koperasi", p.koperasi],
        ["Angsuran pinjaman bank", p.bank], ["Angsuran KPR", p.kpr], ["Biaya administrasi bank", p.adm],
    ]

    return (
        <main>
            <Kepala judul="Potongan gaji" sub={bulanIni()} kembali="/beranda" />
            <div className="px-5">
                <Kartu className="p-5">
                    <p className="text-sm text-redup">Perkiraan total potongan</p>
                    <p className="angka mt-1 text-[1.75rem] font-bold leading-tight tracking-tight">{rupiah(p.total)}</p>
                    <p className="mt-2 text-xs leading-relaxed text-redup">
                        Dihitung dari angsuran berikutnya dan simpanan bulanan Anda. Jumlah akhir mengikuti daftar potongan yang dikirim koperasi.
                    </p>
                </Kartu>

                <h2 className="mb-2.5 mt-7 px-1 text-[0.9375rem] font-semibold">Rincian</h2>
                <Kartu className="px-4">
                    <dl className="divide-y divide-garis">
                        {rincian.filter(([, n]) => n > 0).map(([l, n]) => <Baris key={l} label={l} nilai={rupiah(n)} />)}
                        <Baris label="Total" nilai={rupiah(p.total)} tegas />
                    </dl>
                </Kartu>

                <h2 className="mb-2.5 mt-7 px-1 text-[0.9375rem] font-semibold">Rekening pemotongan</h2>
                <Kartu className="px-4">
                    <dl className="divide-y divide-garis">
                        <Baris label="Bank" nilai={p.bank_nama || "-"} />
                        <Baris label="Nomor rekening" nilai={p.bank_no_rek || "-"} />
                        <Baris label="Atas nama" nilai={p.bank_atas_nama || "-"} />
                        <Baris label="Status" nilai={p.terdebet ? "Masuk daftar potongan" : "Belum masuk daftar potongan"}
                            warna={p.terdebet ? "text-masuk" : "text-tunggu"} />
                    </dl>
                </Kartu>
            </div>
        </main>
    )
}
