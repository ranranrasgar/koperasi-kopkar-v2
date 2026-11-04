"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Loader2, Plus } from "lucide-react"
import { bahanAnggotaBaruAction, tambahAnggotaAction } from "@/app/actions/master-aksi"
import { FormLengkapiAnggota, type BahanLengkapi } from "@/components/master/FormLengkapiAnggota"
import { tombolModalUtama } from "@/components/ui/Modal"

/** Tombol Tambah Anggota di Daftar Anggota: bahan form (nilai simpanan, grade) dimuat saat dibuka. */
export function TombolTambahAnggota() {
    const router = useRouter()
    const [bahan, setBahan] = useState<BahanLengkapi | null>(null)
    const [memuat, mulai] = useTransition()
    const buka = () => mulai(async () => {
        const d = await bahanAnggotaBaruAction()
        if (!d.ok) { alert(d.error); return }
        setBahan({ username: "", nik: "", form: d.form, dariPengaturan: d.dariPengaturan, daftarGrade: d.daftarGrade, gradeKaryawan: "" })
    })
    return (
        <>
            <button type="button" onClick={buka} disabled={memuat} className={tombolModalUtama}>
                {memuat ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Tambah Anggota
            </button>
            <FormLengkapiAnggota bahan={bahan} tombol="Tambah" judul="Tambah Anggota" keterangan="Kode anggota dibuat otomatis. Nilai simpanan awal mengikuti Pengaturan Perusahaan dan bisa diubah di sini."
                onTutup={() => setBahan(null)}
                onSimpan={async (data, nik) => {
                    const h = (await tambahAnggotaAction(nik, data))! // simpan() selalu mengembalikan hasil
                    if (h.ok) { alert(h.pesan); router.refresh() }
                    return h
                }} />
        </>
    )
}
