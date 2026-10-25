"use client"

import { useCallback, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Loader2, Pencil, Plus, RefreshCw, Trash2 } from "lucide-react"
import { FormCard } from "@/components/transaksi/common"
import { ModalForm } from "@/components/ui/Modal"
import { hapusGradeAction, simpanGradeAction, terapkanGradeAction } from "@/app/actions/master"
import { FormEdit } from "./FormEdit"

export interface BarisGrade { id: number; nama: string; nominal: number; aktif: number | string; jumlah: number | string; beda: number | string }

const rp = (n: number) => `Rp ${n.toLocaleString("id-ID", { maximumFractionDigits: 0 })}`

/** Kelola tabel grade: nama dan nominal plafon, jumlah anggota, serta penerapan ke anggota yang nominalnya masih berbeda. */
export function KelolaGrade({ baris, belumTertaut }: { baris: BarisGrade[]; belumTertaut: number }) {
    const router = useRouter()
    const [edit, setEdit] = useState<BarisGrade | "baru" | null>(null)
    const [sibuk, mulai] = useTransition()
    const selesai = useCallback(() => { router.refresh(); setTimeout(() => setEdit(null), 1000) }, [router])
    const totalBeda = baris.reduce((t, b) => t + Number(b.beda), 0)

    const jalankan = (konfirmasi: string, fn: () => Promise<{ ok: boolean; pesan?: string; error?: string } | null>) => {
        if (!confirm(konfirmasi)) return
        mulai(async () => {
            const h = await fn()
            if (h) alert(h.ok ? h.pesan : h.error)
            router.refresh()
        })
    }

    return (
        <div className="max-w-4xl space-y-6">
            <FormCard title="Grade Anggota" description="Daftar grade dan nominal plafon. Anggota ditautkan ke grade; mengubah nominal di sini berlaku untuk semua anggota bergrade itu, dan memengaruhi batas pinjaman (kunci jika melebihi grade).">
                <div className="space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        {(totalBeda > 0 || belumTertaut > 0) ? (
                            <div className="flex items-center gap-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs text-amber-900">
                                {belumTertaut > 0 && <span>{belumTertaut} anggota belum tertaut ke grade.</span>}
                                {totalBeda > 0 && <span>{totalBeda} anggota nominalnya berbeda dari tabel.</span>}
                                <button type="button" disabled={sibuk} onClick={() => jalankan(
                                    `Tautkan anggota ke grade menurut namanya dan samakan nominal grade ${totalBeda} anggota dengan tabel? Plafon pinjaman anggota yang nilainya berbeda akan berubah.`, terapkanGradeAction)}
                                    className="inline-flex items-center gap-1 rounded bg-amber-600 px-2 py-1 font-semibold text-white hover:bg-amber-700 disabled:opacity-60">
                                    {sibuk ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />} Terapkan ke anggota
                                </button>
                            </div>
                        ) : <span className="text-xs text-muted-foreground">Semua anggota sudah sesuai dengan tabel grade.</span>}
                        <button type="button" onClick={() => setEdit("baru")}
                            className="inline-flex h-9 items-center gap-1.5 rounded-md bg-blue-600 px-3 text-sm font-semibold text-white hover:bg-blue-700">
                            <Plus className="h-4 w-4" /> Tambah grade
                        </button>
                    </div>
                    <div className="overflow-x-auto rounded-md border">
                        <table className="w-full text-sm">
                            <thead className="bg-muted text-xs text-muted-foreground">
                                <tr>
                                    <th className="px-3 py-2 text-left">Grade</th>
                                    <th className="px-3 py-2 text-right">Nominal</th>
                                    <th className="px-3 py-2 text-right">Anggota aktif</th>
                                    <th className="px-3 py-2 text-right">Semua anggota</th>
                                    <th className="px-3 py-2 text-right">Nominal beda</th>
                                    <th className="w-24 px-3 py-2" />
                                </tr>
                            </thead>
                            <tbody>
                                {baris.map((b) => (
                                    <tr key={b.id} className="border-t hover:bg-muted/30">
                                        <td className="px-3 py-1.5 font-mono font-semibold">{b.nama}</td>
                                        <td className="px-3 py-1.5 text-right tabular-nums">{b.nominal > 0 ? rp(b.nominal) : <span className="text-muted-foreground">belum diisi</span>}</td>
                                        <td className="px-3 py-1.5 text-right tabular-nums">{Number(b.aktif).toLocaleString("id-ID")}</td>
                                        <td className="px-3 py-1.5 text-right tabular-nums">{Number(b.jumlah).toLocaleString("id-ID")}</td>
                                        <td className="px-3 py-1.5 text-right tabular-nums">{Number(b.beda) > 0 ? <span className="font-semibold text-amber-700">{Number(b.beda).toLocaleString("id-ID")}</span> : "-"}</td>
                                        <td className="px-3 py-1.5 text-right">
                                            <button type="button" title="Ubah" onClick={() => setEdit(b)} className="rounded p-1.5 hover:bg-muted"><Pencil className="h-4 w-4" /></button>
                                            <button type="button" title={Number(b.jumlah) > 0 ? "Masih dipakai anggota" : "Hapus"} disabled={Number(b.jumlah) > 0 || sibuk}
                                                onClick={() => jalankan(`Hapus grade ${b.nama}?`, () => hapusGradeAction(b.id))}
                                                className="rounded p-1.5 text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-30"><Trash2 className="h-4 w-4" /></button>
                                        </td>
                                    </tr>
                                ))}
                                {baris.length === 0 && <tr><td colSpan={6} className="px-3 py-6 text-center text-muted-foreground">Belum ada grade. Jalankan pemasangan pengaturan atau tambahkan grade.</td></tr>}
                            </tbody>
                        </table>
                    </div>
                </div>
            </FormCard>
            <ModalForm open={edit !== null} onOpenChange={(buka) => { if (!buka) setEdit(null) }} judul={edit === "baru" ? "Tambah grade" : "Ubah grade"}
                keterangan="Nama tanpa spasi, mis. M06. Nominal ialah batas pinjaman per grade (Rp).">
                {edit && <FormEdit key={edit === "baru" ? "baru" : edit.id}
                    fields={[{ name: "id", label: "", hidden: true }, { name: "nama", label: "Nama grade", required: true }, { name: "nominal", label: "Nominal plafon (Rp)", type: "number", step: "1000" }]}
                    nilai={edit === "baru" ? { id: "" } : { id: edit.id, nama: edit.nama, nominal: edit.nominal }} aksi={simpanGradeAction} onSelesai={selesai} kolom={2} />}
            </ModalForm>
        </div>
    )
}
