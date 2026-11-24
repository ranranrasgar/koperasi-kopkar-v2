"use client"

import { useCallback, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Pencil, Plus, Trash2 } from "lucide-react"
import { hapusTemplatAction, simpanTemplatAction, type TemplatNotifikasi } from "@/app/actions/notifikasi"
import { FormEdit } from "@/components/master/FormEdit"
import { FormCard } from "@/components/transaksi/common"
import { ModalForm } from "@/components/ui/Modal"
import { isianTemplat } from "./KirimNotifikasi"
import { beriTahu, tanyaYa } from "@/components/ui/Tanya"

/** Daftar templat pesan Kirim Notifikasi: tambah, ubah, hapus. */
export function KelolaTemplat({ templat }: { templat: TemplatNotifikasi[] }) {
    const router = useRouter()
    const [edit, setEdit] = useState<TemplatNotifikasi | "baru" | null>(null)
    const [sibuk, mulai] = useTransition()
    const selesai = useCallback(() => { router.refresh(); setTimeout(() => setEdit(null), 800) }, [router])
    return (
        <FormCard title="Templat pesan" description="Pesan yang sering dikirim. Tulis {isian} untuk bagian yang berubah, mis. {tanggal}, {jam mulai}, {bulan}, {tempat}: saat templat dipakai, isian bernama tanggal/jam/bulan muncul sebagai pilihan tanggal, jam, atau bulan.">
            <div className="space-y-3">
                <div className="flex justify-end">
                    <button type="button" onClick={() => setEdit("baru")} className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary px-3 text-sm font-semibold text-primary-foreground hover:opacity-90">
                        <Plus className="h-4 w-4" /> Tambah templat
                    </button>
                </div>
                <ul className="divide-y rounded-md border text-sm">
                    {templat.map((t) => (
                        <li key={t.id} className="flex items-start gap-3 px-3 py-2.5">
                            <div className="min-w-0 flex-1">
                                <div className="font-semibold">{t.nama}</div>
                                <div className="text-xs text-muted-foreground">{t.judul}</div>
                                <div className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{t.isi}</div>
                                {isianTemplat(`${t.judul} ${t.isi}`).length > 0 && <div className="mt-1 flex flex-wrap gap-1">
                                    {isianTemplat(`${t.judul} ${t.isi}`).map((x) => <span key={x} className="rounded bg-muted px-1.5 py-0.5 text-[11px]">{x}</span>)}
                                </div>}
                            </div>
                            <button type="button" title="Ubah" onClick={() => setEdit(t)} className="rounded p-1.5 hover:bg-muted"><Pencil className="h-4 w-4" /></button>
                            <button type="button" title="Hapus" disabled={sibuk} onClick={async () => {
                                if (!(await tanyaYa(`Hapus templat "${t.nama}"?`))) return
                                mulai(async () => { const h = await hapusTemplatAction(t.id); if (h && !h.ok) void beriTahu(h.error, { ok: false }); router.refresh() })
                            }} className="rounded p-1.5 text-red-600 hover:bg-red-50"><Trash2 className="h-4 w-4" /></button>
                        </li>
                    ))}
                    {templat.length === 0 && <li className="px-3 py-5 text-center text-muted-foreground">Belum ada templat.</li>}
                </ul>
            </div>
            <ModalForm open={edit !== null} onOpenChange={(b) => { if (!b) setEdit(null) }} judul={edit === "baru" ? "Tambah templat" : "Ubah templat"} lebar="sm:max-w-2xl"
                keterangan="Judul maksimal 50 karakter dan isi 500 karakter setelah isian diganti. Contoh isian: {tanggal}, {jam mulai}, {jam selesai}, {bulan}, {tempat}, {keterangan}.">
                {edit && <FormEdit key={edit === "baru" ? "baru" : edit.id} kolom={1} aksi={simpanTemplatAction} onSelesai={selesai}
                    fields={[{ name: "id", label: "", hidden: true }, { name: "nama", label: "Nama templat", required: true },
                        { name: "judul", label: "Judul notifikasi", required: true }, { name: "isi", label: "Isi pesan", type: "textarea", required: true }]}
                    nilai={edit === "baru" ? { id: "" } : { id: edit.id, nama: edit.nama, judul: edit.judul, isi: edit.isi }} />}
            </ModalForm>
        </FormCard>
    )
}
