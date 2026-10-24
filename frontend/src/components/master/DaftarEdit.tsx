"use client"

import { useCallback, useState } from "react"
import { useRouter } from "next/navigation"
import { Pencil, Plus } from "lucide-react"
import { FormCard } from "@/components/transaksi/common"
import { ModalForm } from "@/components/ui/Modal"
import type { HasilSimpan } from "@/app/actions/master"
import { FormEdit, type FieldSpec } from "./FormEdit"

type Nilai = Record<string, string | number | boolean | null>

/** Tabel data master dengan form ubah (dan tambah) di modal. */
export function DaftarEdit({ title, description, kolom, baris, fields, fieldsBaru, aksi, kunci = "id" }: {
    title: string
    description: string
    kolom: { key: string; label: string; align?: "right" | "center"; format?: "persen" | "rupiah" | "ya" }[]
    baris: Nilai[]
    fields: FieldSpec[]
    /** Isian tambahan saat menambah data baru (mis. kode). Tanpa ini tombol tambah tidak muncul. */
    fieldsBaru?: FieldSpec[]
    aksi: (prev: HasilSimpan, f: FormData) => Promise<HasilSimpan>
    kunci?: string
}) {
    const router = useRouter()
    const [edit, setEdit] = useState<Nilai | "baru" | null>(null)
    // Tersimpan: muat ulang tabel, lalu tutup modal setelah pesan berhasil sempat terlihat.
    const selesai = useCallback(() => { router.refresh(); setTimeout(() => setEdit(null), 1200) }, [router])
    const tampil = (v: Nilai[string], f?: string) => {
        if (v === null || v === undefined || v === "") return "-"
        if (f === "persen") return `${Number(v).toLocaleString("id-ID", { maximumFractionDigits: 4 })}%`
        if (f === "rupiah") return Number(v).toLocaleString("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 })
        if (f === "ya") return v ? "Ya" : "-"
        return String(v)
    }
    return (
        <div className="space-y-6">
            <FormCard title={title} description={description}>
                <div className="space-y-3">
                    {fieldsBaru && (
                        <div className="flex justify-end">
                            <button type="button" onClick={() => setEdit("baru")}
                                className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold">
                                <Plus className="h-4 w-4" /> Tambah
                            </button>
                        </div>
                    )}
                    <div className="overflow-x-auto rounded-md border">
                        <table className="w-full text-sm">
                            <thead className="bg-muted text-muted-foreground text-xs">
                                <tr>
                                    {kolom.map((k) => <th key={k.key} className={`px-3 py-2 whitespace-nowrap ${k.align === "right" ? "text-right" : k.align === "center" ? "text-center" : "text-left"}`}>{k.label}</th>)}
                                    <th className="px-3 py-2 w-16"></th>
                                </tr>
                            </thead>
                            <tbody>
                                {baris.map((b) => (
                                    <tr key={String(b[kunci])} className="border-t hover:bg-muted/30">
                                        {kolom.map((k) => (
                                            <td key={k.key} className={`px-3 py-2 ${k.align === "right" ? "text-right tabular-nums" : k.align === "center" ? "text-center" : ""}`}>
                                                {tampil(b[k.key], k.format)}
                                            </td>
                                        ))}
                                        <td className="px-3 py-2 text-right">
                                            <button type="button" title="Ubah" onClick={() => setEdit(b)} className="p-1.5 rounded hover:bg-muted">
                                                <Pencil className="h-4 w-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </FormCard>
            <ModalForm open={edit !== null} onOpenChange={(buka) => { if (!buka) setEdit(null) }} lebar="sm:max-w-3xl"
                judul={edit === "baru" ? `Tambah ${title}` : `Ubah ${title}`} keterangan="Perubahan berlaku untuk transaksi berikutnya.">
                {edit && <FormEdit key={edit === "baru" ? "baru" : String(edit[kunci])}
                    fields={edit === "baru" ? [...(fieldsBaru ?? []), ...fields] : [{ name: kunci, label: "", hidden: true } as FieldSpec, ...fields]}
                    nilai={edit === "baru" ? {} : edit} aksi={aksi} onSelesai={selesai} kolom={2} />}
            </ModalForm>
        </div>
    )
}
