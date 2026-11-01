"use client"

import { useCallback, useState } from "react"
import { useRouter } from "next/navigation"
import { Pencil, RotateCcw, UserRoundX, Trash2 } from "lucide-react"
import { hapusAnggotaAction, simpanAnggotaAction, ubahStatusAnggotaAction } from "@/app/actions/master-aksi"
import { FormEdit, type FieldSpec } from "@/components/master/FormEdit"
import { ModalForm } from "@/components/ui/Modal"

type Baris = Record<string, unknown>

const staffOptions = [
    { value: "Staff", label: "Staff" },
    { value: "No Staff", label: "No Staff" },
]

export function AksiAnggota({ item }: { item: Baris }) {
    const router = useRouter()
    const [modal, setModal] = useState<"ubah" | "keluar" | "hapus" | null>(null)
    const aktif = item.aktif === true
    const id = String(item.id ?? "")
    const kode = String(item.kode_agt ?? "")
    const bisaHapus = item._bisa_hapus === true
    const selesai = useCallback(() => {
        router.refresh()
        setTimeout(() => setModal(null), 1200)
    }, [router])
    const editFields: FieldSpec[] = [
        { name: "id", label: "", hidden: true },
        { name: "nama", label: "Nama lengkap", required: true },
        { name: "nik", label: "KPK" },
        { name: "jns_kelamin", label: "Jenis kelamin", type: "select", options: [
            { value: "L", label: "Laki-laki" }, { value: "P", label: "Perempuan" },
        ] },
        { name: "status_staff", label: "Status staff", type: "select", options: staffOptions },
        { name: "alamat", label: "Alamat", type: "textarea", wide: true },
        { name: "kota", label: "Kota" },
        { name: "hp", label: "No. HP" },
        { name: "grade", label: "Grade", hint: "Harus cocok dengan Data Master → Grade." },
        { name: "bank_nama", label: "Bank" },
        { name: "bank_no_rek", label: "No. rekening" },
        { name: "bank_atas_nama", label: "Atas nama rekening" },
        { name: "simpanan_pokok", label: "Simpanan pokok / bulan", type: "number", step: "0.01" },
        { name: "simpanan_wajib", label: "Simpanan wajib / bulan", type: "number", step: "0.01" },
        { name: "simpanan_sukarela", label: "Simpanan sukarela / bulan", type: "number", step: "0.01" },
    ]
    const fieldsKeluar: FieldSpec[] = [
        { name: "id", label: "", hidden: true },
        { name: "keluar", label: "", hidden: true },
        { name: "tgl_keluar", label: "Tanggal keluar", type: "date", required: true },
        { name: "alasan_keluar", label: "Alasan keluar", type: "textarea", required: true, wide: true },
    ]
    const fieldsAktif: FieldSpec[] = [
        { name: "id", label: "", hidden: true },
        { name: "keluar", label: "", hidden: true },
    ]
    const fieldsHapus: FieldSpec[] = [
        { name: "id", label: "", hidden: true },
        { name: "konfirmasi", label: "Ketik kode anggota untuk mengonfirmasi", required: true, hint: kode },
    ]

    return (
        <>
            <button type="button" title="Ubah data anggota" aria-label="Ubah data anggota" onClick={() => setModal("ubah")}
                className="inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-muted">
                <Pencil className="h-4 w-4" />
            </button>
            <button type="button" title={aktif ? "Catat anggota keluar" : "Aktifkan kembali"} aria-label={aktif ? "Catat anggota keluar" : "Aktifkan kembali"}
                onClick={() => setModal("keluar")} className="inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-muted">
                {aktif ? <UserRoundX className="h-4 w-4" /> : <RotateCcw className="h-4 w-4" />}
            </button>
            <button type="button" title={bisaHapus ? "Hapus anggota" : "Punya transaksi atau akun terkait, gunakan Keluar"}
                aria-label={bisaHapus ? "Hapus anggota" : "Tidak dapat dihapus"} disabled={!bisaHapus}
                onClick={() => setModal("hapus")} className="inline-flex h-8 w-8 items-center justify-center rounded-md text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-30">
                <Trash2 className="h-4 w-4" />
            </button>

            <ModalForm open={modal === "ubah"} onOpenChange={(buka) => { if (!buka) setModal(null) }}
                judul={`Ubah Anggota ${kode}`} keterangan="Kode anggota tidak dapat diubah." lebar="sm:max-w-[44rem]">
                {modal === "ubah" && <FormEdit fields={editFields} nilai={Object.fromEntries(Object.entries(item).map(([k, v]) => [k, v as string | number | boolean | null]))}
                    aksi={simpanAnggotaAction} onSelesai={selesai} />}
            </ModalForm>
            <ModalForm open={modal === "keluar"} onOpenChange={(buka) => { if (!buka) setModal(null) }}
                judul={aktif ? `Catat Anggota Keluar: ${kode}` : `Aktifkan Kembali: ${kode}`}
                keterangan={aktif ? "Riwayat transaksi tetap tersimpan. Anggota keluar tidak ikut generate potongan gaji." : "Tanggal dan alasan keluar akan dihapus."}>
                {modal === "keluar" && <FormEdit
                    fields={aktif ? fieldsKeluar : fieldsAktif}
                    nilai={{ id, keluar: String(aktif), tgl_keluar: String(item.tgl_keluar ?? ""), alasan_keluar: String(item.alasan_keluar ?? "") }}
                    aksi={ubahStatusAnggotaAction} tombol={aktif ? "Catat keluar" : "Aktifkan kembali"} onSelesai={selesai} kolom={1} />}
            </ModalForm>
            <ModalForm open={modal === "hapus"} onOpenChange={(buka) => { if (!buka) setModal(null) }}
                judul={`Hapus Anggota ${kode}`} keterangan="Penghapusan permanen hanya untuk anggota tanpa transaksi dan akun terkait.">
                {modal === "hapus" && <FormEdit fields={fieldsHapus} nilai={{ id }} aksi={hapusAnggotaAction}
                    tombol="Hapus permanen" onSelesai={selesai} kolom={1} />}
            </ModalForm>
        </>
    )
}
