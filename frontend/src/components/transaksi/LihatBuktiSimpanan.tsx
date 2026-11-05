"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { FileSearch, Loader2 } from "lucide-react"
import { detailBuktiSimpananAction, type HasilDetailBukti } from "@/app/actions/kwitansi"
import { FormBatal } from "@/components/transaksi/BatalBukti"
import { ModalForm } from "@/components/ui/Modal"
import { formatAngka, formatTanggal } from "@/lib/format"

/** Ikon baris: rincian satu bukti simpanan beserta jurnalnya, dan pembatalan bagi operator yang berizin. */
export function LihatBuktiSimpanan({ no }: { no: string }) {
    const [buka, setBuka] = useState(false)
    const [data, setData] = useState<HasilDetailBukti | null>(null)
    const router = useRouter()
    const lihat = () => {
        setBuka(true)
        setData(null)
        detailBuktiSimpananAction(no).then(setData)
    }
    const s = data && "bukti" in data ? data.bukti : null
    return (
        <>
            <button type="button" onClick={lihat} title="Lihat bukti dan jurnal" aria-label={`Lihat bukti ${no}`} className="rounded p-1.5 hover:bg-muted"><FileSearch className="h-4 w-4" /></button>
            <ModalForm open={buka} onOpenChange={setBuka} kunci={false} lebar="sm:max-w-[44rem]" judul={`Bukti ${no}`}>
                {!data && <p className="flex items-center gap-2 py-6 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Memuat…</p>}
                {data && "error" in data && <div role="alert" className="rounded-md border border-red-300 bg-red-50 p-2.5 text-sm text-red-700">{data.error}</div>}
                {s && data && "bukti" in data && (
                    <div className="space-y-4 text-sm">
                        <dl className="grid gap-x-4 gap-y-2 sm:grid-cols-2">
                            {([["Tanggal", formatTanggal(s.tgl_transaksi)], ["Jenis", s.nama_simpanan ?? s.jenis_simpanan], ["Anggota", `${s.nama} (${s.kode_agt})`], ["KPK", s.nik ?? "-"],
                                ["Setoran", formatAngka(s.rp_setoran)], ["Pengambilan", formatAngka(s.rp_pengambilan)], ["Keterangan", s.deskripsi || "-"], ["Operator", s.opr || "-"]] as const).map(([k, v]) => (
                                <div key={k}><dt className="text-xs text-muted-foreground">{k}</dt><dd className="font-medium">{v}</dd></div>
                            ))}
                        </dl>
                        <div>
                            <h3 className="mb-1 font-semibold">Jurnal</h3>
                            {data.jurnal.length === 0 ? <p className="rounded-md border border-amber-300 bg-amber-50 p-2.5 text-amber-900">Bukti ini tidak punya jurnal.</p> : (
                                <div className="overflow-x-auto rounded-md border">
                                    <table className="w-full">
                                        <thead className="bg-muted text-xs text-muted-foreground">
                                            <tr><th className="px-3 py-1.5 text-left">Akun</th><th className="px-3 py-1.5 text-right">Debit</th><th className="px-3 py-1.5 text-right">Kredit</th></tr>
                                        </thead>
                                        <tbody>
                                            {data.jurnal.map((j, i) => (
                                                <tr key={i} className="border-t">
                                                    <td className="px-3 py-1.5"><span className="font-mono text-xs">{j.kode_perkiraan}</span> {j.nama_perkiraan ?? "(akun tidak ada di COA)"}</td>
                                                    <td className="px-3 py-1.5 text-right tabular-nums">{j.debit ? formatAngka(j.debit) : ""}</td>
                                                    <td className="px-3 py-1.5 text-right tabular-nums">{j.kredit ? formatAngka(j.kredit) : ""}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                        {data.koreksi && (
                            <p className="rounded-md border border-red-300 bg-red-50 p-2.5 text-red-800">
                                {data.koreksi.no_bukti === no ? `Dibatalkan oleh pembalik ${data.koreksi.no_bukti_pembalik}` : `Pembalik dari ${data.koreksi.no_bukti}`}, oleh {data.koreksi.opr}: {data.koreksi.alasan}
                            </p>
                        )}
                        {data.bolehBatal && !data.koreksi && !no.startsWith("SHU/") && <FormBatal no={no} onSelesai={() => { detailBuktiSimpananAction(no).then(setData); router.refresh() }} />}
                    </div>
                )}
            </ModalForm>
        </>
    )
}
