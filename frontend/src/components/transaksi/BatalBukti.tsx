"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Loader2, Undo2 } from "lucide-react"
import { batalBuktiAction } from "@/app/actions/transaksi"
import { ModalForm } from "@/components/ui/Modal"

/** Form alasan pembatalan. Transaksi asal tetap ada; pembalik dibuat oleh backend/src/posting/koreksi.ts. */
export function FormBatal({ no, onSelesai }: { no: string; onSelesai: () => void }) {
    const [alasan, setAlasan] = useState("")
    const [pesan, setPesan] = useState<string | null>(null)
    const [sibuk, mulai] = useTransition()
    const kirim = () => {
        if (!confirm(`Batalkan ${no}? Transaksi pembalik bertanggal hari ini akan dibuat, dan ini tidak bisa diurungkan.`)) return
        mulai(async () => {
            const h = await batalBuktiAction(no, alasan)
            setPesan(h?.ok ? h.pesan : h?.error ?? "Gagal membatalkan")
            if (h?.ok) onSelesai()
        })
    }
    return (
        <div className="space-y-2 rounded-md border p-3 text-sm">
            <h3 className="font-semibold">Batalkan transaksi</h3>
            <p className="text-muted-foreground">Transaksi ini tetap tersimpan. Sistem membuat pembalik bertanggal hari ini beserta jurnal kebalikannya. Bila nilainya salah, input ulang transaksi yang benar setelah ini.</p>
            <label className="block"><span className="mb-1 block text-xs font-semibold text-muted-foreground">Alasan (minimal 10 karakter)</span>
                <textarea value={alasan} onChange={(e) => setAlasan(e.target.value)} maxLength={255} rows={2} className="w-full rounded-md border bg-background px-3 py-2" /></label>
            {pesan && <p role="alert">{pesan}</p>}
            <div className="flex justify-end">
                <button type="button" onClick={kirim} disabled={sibuk || alasan.trim().length < 10}
                    className="inline-flex h-9 items-center gap-1.5 rounded-md bg-red-600 px-4 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50">
                    {sibuk ? <Loader2 className="h-4 w-4 animate-spin" /> : <Undo2 className="h-4 w-4" />} Batalkan Transaksi</button>
            </div>
        </div>
    )
}

/** Tombol pembatalan satu bukti, untuk detail pinjaman. `ikon`: tombol kecil tanpa teks untuk baris tabel. */
export function TombolBatalBukti({ no, label, ikon = false }: { no: string; label: string; ikon?: boolean }) {
    const [buka, setBuka] = useState(false)
    const router = useRouter()
    return (
        <>
            {ikon
                ? <button type="button" onClick={() => setBuka(true)} title={label} aria-label={`${label} ${no}`} className="rounded p-1.5 text-red-600 hover:bg-muted"><Undo2 className="h-4 w-4" /></button>
                : <button type="button" onClick={() => setBuka(true)} className="inline-flex h-9 items-center gap-1.5 rounded-md border border-red-300 bg-background px-3 text-sm font-medium text-red-700 shadow-sm hover:bg-red-50"><Undo2 className="h-4 w-4" /> {label}</button>}
            <ModalForm open={buka} onOpenChange={setBuka} kunci={false} judul={`${label}: ${no}`}>
                <FormBatal no={no} onSelesai={() => { setBuka(false); router.refresh() }} />
            </ModalForm>
        </>
    )
}

/** Pembatalan lewat nomor bukti di Audit Data, untuk transaksi yang tidak punya halaman detail (mis. KPR). */
export function BatalLewatNomor() {
    const [no, setNo] = useState("")
    const [buka, setBuka] = useState(false)
    const router = useRouter()
    return (
        <section className="rounded-md border p-3 text-sm print:hidden">
            <h2 className="font-semibold">Batalkan transaksi lewat nomor bukti</h2>
            <p className="mt-1 text-muted-foreground">Untuk simpanan, angsuran (hanya yang terakhir), serta pencairan pinjaman dan KPR yang belum punya angsuran.</p>
            <form className="mt-2 flex flex-wrap gap-2" onSubmit={(e) => { e.preventDefault(); if (no.trim()) setBuka(true) }}>
                <input value={no} onChange={(e) => setNo(e.target.value)} placeholder="Nomor bukti atau nomor pinjaman" aria-label="Nomor bukti" className="h-9 w-72 rounded-md border bg-background px-3 font-mono text-xs" />
                <button type="submit" disabled={!no.trim()} className="h-9 rounded-md border border-red-300 px-3 font-medium text-red-700 hover:bg-red-50 disabled:opacity-50">Lanjut</button>
            </form>
            <ModalForm open={buka} onOpenChange={setBuka} kunci={false} judul={`Batalkan ${no.trim()}`}>
                <FormBatal no={no.trim()} onSelesai={() => { setBuka(false); setNo(""); router.refresh() }} />
            </ModalForm>
        </section>
    )
}
