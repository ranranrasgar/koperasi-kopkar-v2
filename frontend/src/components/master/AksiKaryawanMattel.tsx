"use client"

import { useBolehAksi } from "@/components/layout/SidebarContext"
import { MENU } from "@/config/akses"
import { useCallback, useState } from "react"
import { useRouter } from "next/navigation"
import { Pencil, Trash2 } from "lucide-react"
import { hapusKaryawanMattelAction, simpanKaryawanMattelAction } from "@/app/actions/master-aksi"
import { FormEdit, type FieldSpec } from "@/components/master/FormEdit"
import { ModalForm } from "@/components/ui/Modal"

export function AksiKaryawanMattel({ item }: { item: Record<string, unknown> }) {
    const router = useRouter()
    const [modal, setModal] = useState<"ubah" | "hapus" | null>(null)
    const boleh = useBolehAksi(), menuKaryawan = [MENU.karyawanMattel, MENU.daftarKaryawan]
    const id = String(item.id ?? "")
    const nik = String(item.nik ?? "")
    const tertaut = item._tertaut === true
    const selesai = useCallback(() => {
        router.refresh()
        setTimeout(() => setModal(null), 1200)
    }, [router])
    const fields: FieldSpec[] = [
        { name: "id", label: "", hidden: true },
        { name: "plant", label: "Plant", required: true },
        { name: "nama", label: "Nama", required: true },
        { name: "deptname", label: "Departemen" },
        { name: "sectname", label: "Seksi" },
        { name: "grade", label: "Grade" },
        { name: "joindate", label: "Tanggal masuk", hint: "Format YYYY-MM-DD." },
        { name: "tgl_lahir", label: "Tanggal lahir", hint: "Format YYYY-MM-DD." },
        { name: "no_rek", label: "No. rekening" },
        { name: "emphone", label: "No. HP" },
        { name: "sts", label: "Status" },
    ]
    const fieldsHapus: FieldSpec[] = [
        { name: "id", label: "", hidden: true },
        { name: "konfirmasi", label: "Ketik NIK untuk mengonfirmasi", required: true, hint: nik },
    ]

    return (
        <>
            {boleh(menuKaryawan, "ubah") && <button type="button" title="Ubah data karyawan" aria-label="Ubah data karyawan" onClick={() => setModal("ubah")}
                className="inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-muted">
                <Pencil className="h-4 w-4" />
            </button>}
            {boleh(menuKaryawan, "hapus") && <button type="button" title={tertaut ? "Karyawan terhubung ke anggota/akun" : "Hapus karyawan"}
                aria-label={tertaut ? "Tidak dapat dihapus" : "Hapus karyawan"} disabled={tertaut}
                onClick={() => setModal("hapus")} className="inline-flex h-8 w-8 items-center justify-center rounded-md text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-30">
                <Trash2 className="h-4 w-4" />
            </button>}
            <ModalForm open={modal === "ubah"} onOpenChange={(buka) => { if (!buka) setModal(null) }}
                judul={`Ubah Karyawan ${nik}`} keterangan="NIK tidak dapat diubah karena dipakai sebagai identitas karyawan." lebar="sm:max-w-[40rem]">
                {modal === "ubah" && <FormEdit fields={fields}
                    nilai={Object.fromEntries(Object.entries(item).map(([k, v]) => [k, v as string | number | boolean | null]))}
                    aksi={simpanKaryawanMattelAction} onSelesai={selesai} />}
            </ModalForm>
            <ModalForm open={modal === "hapus"} onOpenChange={(buka) => { if (!buka) setModal(null) }}
                judul={`Hapus Karyawan ${nik}`} keterangan="Hanya karyawan yang belum tertaut ke anggota atau akun aplikasi yang dapat dihapus.">
                {modal === "hapus" && <FormEdit fields={fieldsHapus} nilai={{ id }} aksi={hapusKaryawanMattelAction}
                    tombol="Hapus permanen" onSelesai={selesai} kolom={1} />}
            </ModalForm>
        </>
    )
}
