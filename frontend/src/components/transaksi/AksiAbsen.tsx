"use client"

import { useCallback, useState, useTransition } from "react"
import { Pencil, Trash2 } from "lucide-react"
import { hapusAbsenAction, ubahAbsenAction } from "@/app/actions/absensi"
import { useBolehAksi } from "@/components/layout/SidebarContext"
import { FormEdit, type FieldSpec } from "@/components/master/FormEdit"
import { ModalForm } from "@/components/ui/Modal"
import { MENU } from "@/config/akses"
import type { BarisAbsensi } from "@/lib/queries/absensi"

const fields: FieldSpec[] = [
    { name: "id", label: "", hidden: true },
    { name: "masuk", label: "Jam masuk", type: "time", required: true },
    { name: "pulang", label: "Jam pulang", type: "time", hint: "Kosongkan bila belum pulang." },
]

/** Koreksi dan hapus satu baris absensi, sesuai izin ubah/hapus menu Absensi. */
export function AksiAbsen({ item }: { item: BarisAbsensi }) {
    const boleh = useBolehAksi()
    const [ubah, setUbah] = useState(false)
    const [sibuk, mulai] = useTransition()
    const selesai = useCallback(() => { setTimeout(() => setUbah(false), 800) }, [])
    const hapus = () => {
        if (!confirm(`Hapus absensi ${item.nama} tanggal ${item.tanggal}?`)) return
        mulai(async () => {
            const r = await hapusAbsenAction(Number(item.id))
            if (r && !r.ok) alert(r.error)
        })
    }
    return (
        <>
            {boleh([MENU.absensi], "ubah") && <button type="button" title="Ubah absensi" aria-label={`Ubah absensi ${item.nama}`} onClick={() => setUbah(true)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-muted"><Pencil className="h-4 w-4" /></button>}
            {boleh([MENU.absensi], "hapus") && <button type="button" title="Hapus absensi" aria-label={`Hapus absensi ${item.nama}`} onClick={hapus} disabled={sibuk}
                className="inline-flex h-8 w-8 items-center justify-center rounded-md text-red-600 hover:bg-red-50 disabled:opacity-40"><Trash2 className="h-4 w-4" /></button>}
            <ModalForm open={ubah} onOpenChange={setUbah} judul={`Ubah Absensi: ${item.nama}`} keterangan={`Tanggal ${item.tanggal}`}>
                {ubah && <FormEdit fields={fields} nilai={{ id: item.id, masuk: item.masuk, pulang: item.pulang }} aksi={ubahAbsenAction} onSelesai={selesai} />}
            </ModalForm>
        </>
    )
}
