"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2, Pencil, RotateCcw, UserRoundX, Trash2 } from "lucide-react"
import { detailAnggotaAction, hapusAnggotaAction, simpanAnggotaAction, ubahStatusAnggotaAction } from "@/app/actions/master-aksi"
import { FormEdit, type FieldSpec } from "@/components/master/FormEdit"
import { ModalForm } from "@/components/ui/Modal"
import { formatRupiah } from "@/lib/format"

type Baris = Record<string, unknown>

const staffOptions = [
    { value: "Staff", label: "Staff" },
    { value: "No Staff", label: "No Staff" },
]

const TAB = { pribadi: "Data Pribadi", kontak: "Alamat & Kontak", kerja: "Pekerjaan & Gaji", bank: "Bank & Simpanan" }
const editFields: FieldSpec[] = [
    { name: "id", label: "", hidden: true },
    { name: "nama", label: "Nama lengkap", required: true, tab: TAB.pribadi },
    { name: "nik", label: "KPK", tab: TAB.pribadi },
    { name: "jns_kelamin", label: "Jenis kelamin", type: "select", tab: TAB.pribadi, options: [{ value: "L", label: "Laki-laki" }, { value: "P", label: "Perempuan" }] },
    { name: "status", label: "Status perkawinan", type: "select", tab: TAB.pribadi, options: ["KAWIN", "BELUM KAWIN", "TIDAK KAWIN", "JANDA", "DUDA"].map((v) => ({ value: v, label: v })) },
    { name: "no_ktp_sim", label: "No. KTP / SIM", tab: TAB.pribadi },
    { name: "npwp", label: "NPWP", tab: TAB.pribadi },
    { name: "nama_istri_suami", label: "Nama istri / suami", tab: TAB.pribadi },
    { name: "jml_tanggungan", label: "Jumlah tanggungan", tab: TAB.pribadi },
    { name: "jml_anak", label: "Jumlah anak", tab: TAB.pribadi },
    { name: "alamat", label: "Alamat", type: "textarea", wide: true, tab: TAB.kontak },
    { name: "kota", label: "Kota", tab: TAB.kontak },
    { name: "kodepos", label: "Kode pos", tab: TAB.kontak },
    { name: "hp", label: "No. HP", tab: TAB.kontak },
    { name: "telp_rmh", label: "Telepon rumah", tab: TAB.kontak },
    { name: "status_staff", label: "Status staff", type: "select", options: staffOptions, tab: TAB.kerja },
    { name: "grade", label: "Grade", type: "select", hint: "Dari Data Master → Grade.", tab: TAB.kerja },
    { name: "rp_gaji_pokok", label: "Gaji per bulan", type: "uang", hint: "Dipakai menghitung take home pay saat meninjau pengajuan.", tab: TAB.kerja },
    { name: "jabatan", label: "Jabatan", tab: TAB.kerja },
    { name: "pekerjaan", label: "Pekerjaan", tab: TAB.kerja },
    { name: "departemen", label: "Departemen", tab: TAB.kerja },
    { name: "nama_perusahaan", label: "Nama perusahaan", tab: TAB.kerja },
    { name: "telp_ktr", label: "Telepon kantor", tab: TAB.kerja },
    { name: "lama_bekerja_tahun", label: "Lama bekerja (tahun)", tab: TAB.kerja },
    { name: "lama_bekerja_bulan", label: "Lama bekerja (bulan)", tab: TAB.kerja },
    { name: "alamat_kerja", label: "Alamat kerja", type: "textarea", wide: true, tab: TAB.kerja },
    { name: "bank_nama", label: "Bank", tab: TAB.bank },
    { name: "bank_no_rek", label: "No. rekening", tab: TAB.bank },
    { name: "bank_atas_nama", label: "Atas nama rekening", tab: TAB.bank },
    { name: "simpanan_pokok", label: "Simpanan pokok / bulan", type: "uang", tab: TAB.bank },
    { name: "simpanan_wajib", label: "Simpanan wajib / bulan", type: "uang", tab: TAB.bank },
    { name: "simpanan_sukarela", label: "Simpanan sukarela / bulan", type: "uang", tab: TAB.bank },
]

/** Isi form ubah: baris tabel ditambah data rinci yang dibaca saat modal dibuka (tidak ikut di daftar karena memuat gaji). */
function UbahAnggota({ item, selesai }: { item: Baris; selesai: () => void }) {
    const [detail, setDetail] = useState<Awaited<ReturnType<typeof detailAnggotaAction>> | null>(null)
    useEffect(() => { void detailAnggotaAction(Number(item.id)).then(setDetail) }, [item.id])
    if (!detail) return <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" />
    if ("error" in detail) return <p role="alert" className="text-sm text-red-700">{detail.error}</p>
    // Grade lama yang tidak ada di master tetap tampil, supaya tidak terhapus diam-diam; menyimpannya ditolak server sampai diganti.
    const lama = String(item.grade ?? "")
    const opsiGrade = [...detail.grade.map((g) => ({ value: g.nama, label: `${g.nama} · ${formatRupiah(g.nominal)}` })),
        ...(lama && !detail.grade.some((g) => g.nama === lama) ? [{ value: lama, label: `${lama} (tidak ada di master)` }] : [])]
    return <FormEdit fields={editFields.map((f) => (f.name === "grade" ? { ...f, options: opsiGrade } : f))}
        nilai={{ ...Object.fromEntries(Object.entries(item).map(([k, v]) => [k, v as string | number | boolean | null])), ...detail.data }}
        aksi={simpanAnggotaAction} onSelesai={selesai} />
}

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
                {modal === "ubah" && <UbahAnggota item={item} selesai={selesai} />}
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
