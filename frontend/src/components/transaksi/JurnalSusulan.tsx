"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { FilePlus2, Loader2 } from "lucide-react"
import { jurnalSusulanAction, pratinjauSusulanAction } from "@/app/actions/transaksi"
import { ModalForm } from "@/components/ui/Modal"
import { formatAngka, formatTanggal } from "@/lib/format"

/** Ikon baris temuan Audit Data: pratinjau jurnal yang hilang, lalu simpan dengan alasan. */
export function TombolJurnalSusulan({ no }: { no: string }) {
    const [buka, setBuka] = useState(false)
    const [data, setData] = useState<Awaited<ReturnType<typeof pratinjauSusulanAction>> | null>(null)
    const [alasan, setAlasan] = useState("")
    const [pesan, setPesan] = useState<string | null>(null)
    const [selesai, setSelesai] = useState(false)
    const [sibuk, mulai] = useTransition()
    const router = useRouter()
    const lihat = () => {
        setBuka(true); setData(null); setPesan(null); setSelesai(false); setAlasan("")
        pratinjauSusulanAction(no).then(setData)
    }
    const simpan = () => {
        if (!confirm(`Buat jurnal susulan untuk ${no}? Pastikan sudah dicocokkan dengan mutasi bank.`)) return
        mulai(async () => {
            const h = await jurnalSusulanAction(no, alasan)
            setPesan(h?.ok ? h.pesan : h?.error ?? "Gagal menyimpan")
            if (h?.ok) { setSelesai(!h.pesan.startsWith("MODE UJI")); router.refresh() }
        })
    }
    const r = data && "baris" in data ? data : null
    return (
        <>
            <button type="button" onClick={lihat} title="Buat jurnal susulan" aria-label={`Buat jurnal susulan ${no}`} className="rounded p-1.5 text-blue-600 hover:bg-muted"><FilePlus2 className="h-4 w-4" /></button>
            <ModalForm open={buka} onOpenChange={setBuka} kunci={false} lebar="sm:max-w-[44rem]" judul={`Jurnal susulan ${no}`}
                keterangan="Pakai hanya bila transaksinya benar terjadi. Bila uangnya tidak pernah ada, batalkan transaksinya.">
                {!data && <p className="flex items-center gap-2 py-6 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Memuat…</p>}
                {data && "error" in data && <div role="alert" className="rounded-md border border-red-300 bg-red-50 p-2.5 text-sm text-red-700">{data.error}</div>}
                {r && (
                    <div className="space-y-3 text-sm">
                        <p>{formatTanggal(r.tanggal)} · {r.deskripsi}</p>
                        <div className="overflow-x-auto rounded-md border">
                            <table className="w-full">
                                <thead className="bg-muted text-xs text-muted-foreground">
                                    <tr><th className="px-3 py-1.5 text-left">Akun</th><th className="px-3 py-1.5 text-right">Debit</th><th className="px-3 py-1.5 text-right">Kredit</th></tr>
                                </thead>
                                <tbody>
                                    {r.baris.map((b) => (
                                        <tr key={b.kodePerkiraan} className="border-t">
                                            <td className="px-3 py-1.5"><span className="font-mono text-xs">{b.kodePerkiraan}</span> {b.namaPerkiraan ?? "(akun tidak ada di COA)"}</td>
                                            <td className="px-3 py-1.5 text-right tabular-nums">{Number(b.debit) ? formatAngka(Number(b.debit)) : ""}</td>
                                            <td className="px-3 py-1.5 text-right tabular-nums">{Number(b.kredit) ? formatAngka(Number(b.kredit)) : ""}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        {!selesai && <label className="block"><span className="mb-1 block text-xs font-semibold text-muted-foreground">Alasan (minimal 10 karakter), mis. hasil cocok mutasi bank</span>
                            <textarea value={alasan} onChange={(e) => setAlasan(e.target.value)} maxLength={255} rows={2} className="w-full rounded-md border bg-background px-3 py-2" /></label>}
                        {pesan && <p role="alert">{pesan}</p>}
                        {!selesai && <div className="flex justify-end">
                            <button type="button" onClick={simpan} disabled={sibuk || alasan.trim().length < 10}
                                className="inline-flex h-9 items-center gap-1.5 rounded-md bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">
                                {sibuk ? <Loader2 className="h-4 w-4 animate-spin" /> : <FilePlus2 className="h-4 w-4" />} Simpan Jurnal</button>
                        </div>}
                    </div>
                )}
            </ModalForm>
        </>
    )
}
