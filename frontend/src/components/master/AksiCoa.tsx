"use client"

import { useCallback, useState } from "react"
import { useRouter } from "next/navigation"
import { Pencil, Trash2 } from "lucide-react"
import { hapusCoaAction, simpanCoaAction } from "@/app/actions/master-aksi"
import { FormEdit, type FieldSpec } from "@/components/master/FormEdit"
import { ModalForm } from "@/components/ui/Modal"

interface CoaActionItem {
    id?: unknown
    kode_perkiraan?: unknown
    _bisa_hapus?: unknown
    nama_perkiraan?: unknown
    d_k?: unknown
    keterangan?: unknown
    rp_budget?: unknown
}

export function AksiCoa({ item }: { item: CoaActionItem }) {
    const router = useRouter()
    const [modal, setModal] = useState<"ubah" | "hapus" | null>(null)
    const kode = String(item.kode_perkiraan ?? "")
    const bisaHapus = item._bisa_hapus === true
    const selesai = useCallback(() => {
        router.refresh()
        setTimeout(() => setModal(null), 1200)
    }, [router])
    const fields: FieldSpec[] = [
        { name: "id", label: "", hidden: true },
        { name: "nama_perkiraan", label: "Nama akun", required: true, wide: true },
        { name: "d_k", label: "Posisi normal", type: "select", required: true, options: [
            { value: "D", label: "Debet (D)" }, { value: "C", label: "Kredit (K)" },
        ] },
        { name: "keterangan", label: "Keterangan (mis. BANK/GC)" },
        { name: "rp_budget", label: "Anggaran", type: "number", step: "0.01" },
    ]
    const fieldsHapus: FieldSpec[] = [
        { name: "id", label: "", hidden: true },
        { name: "konfirmasi", label: "Ketik kode akun untuk mengonfirmasi", required: true, hint: kode },
    ]
    const nilai = Object.fromEntries(Object.entries(item).map(([k, v]) => [k, v as string | number | boolean | null]))

    return (
        <>
            <button type="button" title="Ubah akun COA" aria-label="Ubah akun COA" onClick={() => setModal("ubah")}
                className="inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-muted">
                <Pencil className="h-4 w-4" />
            </button>
            <button type="button" title={bisaHapus ? "Hapus akun COA" : "Akun masih dipakai, tidak bisa dihapus"}
                aria-label={bisaHapus ? "Hapus akun COA" : "Akun masih digunakan"} disabled={!bisaHapus}
                onClick={() => setModal("hapus")} className="inline-flex h-8 w-8 items-center justify-center rounded-md text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-30">
                <Trash2 className="h-4 w-4" />
            </button>
            <ModalForm open={modal === "ubah"} onOpenChange={(buka) => { if (!buka) setModal(null) }}
                judul={`Ubah COA ${kode}`} keterangan="Kode akun tidak dapat diubah karena sudah dipakai jurnal.">
                {modal === "ubah" && <FormEdit fields={fields} nilai={nilai} aksi={simpanCoaAction} onSelesai={selesai} kolom={2} />}
            </ModalForm>
            <ModalForm open={modal === "hapus"} onOpenChange={(buka) => { if (!buka) setModal(null) }}
                judul={`Hapus COA ${kode}`} keterangan="Hanya akun yang tidak dipakai jurnal, sub-akun, saldo, atau pengaturan yang dapat dihapus.">
                {modal === "hapus" && <FormEdit fields={fieldsHapus} nilai={{ id: String(item.id ?? "") }} aksi={hapusCoaAction}
                    tombol="Hapus permanen" onSelesai={selesai} kolom={1} />}
            </ModalForm>
        </>
    )
}
