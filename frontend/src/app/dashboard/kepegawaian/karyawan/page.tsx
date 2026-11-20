import { DaftarEdit } from "@/components/master/DaftarEdit"
import type { FieldSpec } from "@/components/master/FormEdit"
import { simpanKaryawanAction } from "@/app/actions/gaji"
import { daftarKaryawan } from "@/lib/queries/gaji"
import { wajibIzin } from "@/lib/operator"
import { STATUS_PTKP } from "@kopkar/backend/src/gaji/hitung.ts"

export const dynamic = "force-dynamic"

const TAB = { diri: "Data diri", kerja: "Pekerjaan", gaji: "Gaji & rekening" }
const FIELDS: FieldSpec[] = [
    { name: "nama", label: "Nama", required: true, tab: TAB.diri },
    { name: "nik_ktp", label: "NIK KTP", tab: TAB.diri },
    { name: "jenis_kelamin", label: "Jenis kelamin", type: "select", tab: TAB.diri, options: [{ value: "L", label: "Laki-laki" }, { value: "P", label: "Perempuan" }] },
    { name: "npwp", label: "NPWP", tab: TAB.diri },
    { name: "kode_agt", label: "Kode anggota (bila juga anggota)", hint: "Untuk absensi dari QR saya dan potongan pinjaman koperasi.", tab: TAB.diri },
    { name: "catatan", label: "Catatan", type: "textarea", wide: true, tab: TAB.diri },
    { name: "status_kerja", label: "Status kerja", type: "select", required: true, tab: TAB.kerja, options: [{ value: "Kontrak", label: "Kontrak" }, { value: "Tetap", label: "Tetap" }] },
    { name: "tgl_masuk", label: "Tanggal masuk", type: "date", tab: TAB.kerja },
    { name: "akhir_kontrak", label: "Akhir kontrak (EOC)", type: "date", tab: TAB.kerja },
    { name: "bidang", label: "Bidang", tab: TAB.kerja },
    { name: "jabatan", label: "Jabatan", tab: TAB.kerja },
    { name: "atasan", label: "Atasan", tab: TAB.kerja },
    { name: "aktif", label: "Masih bekerja (aktif)", type: "checkbox", tab: TAB.kerja },
    { name: "umk", label: "UMK", type: "uang", required: true, tab: TAB.gaji },
    { name: "tunj_jabatan", label: "Tunjangan jabatan", type: "uang", tab: TAB.gaji },
    { name: "status_ptkp", label: "Status PTKP", type: "select", required: true, hint: "Menentukan kategori tarif PPh 21 (TER).", tab: TAB.gaji,
        options: STATUS_PTKP.map((s) => ({ value: s, label: s })) },
    { name: "bank", label: "Bank", tab: TAB.gaji },
    { name: "no_rek", label: "No. rekening", tab: TAB.gaji },
    { name: "atas_nama_rek", label: "Atas nama rekening", tab: TAB.gaji },
]

/** Master karyawan koperasi untuk penggajian (bukan anggota berstatus Staff). */
export default async function DataKaryawanPage() {
    await wajibIzin("/dashboard/kepegawaian/karyawan") // layout tidak dijalankan ulang pada navigasi antarhalaman
    const baris = await daftarKaryawan()
    return (
        <DaftarEdit title="Data Karyawan" description="Karyawan koperasi yang digaji koperasi. Jml. upah = UMK + tunjangan jabatan, dasar potongan alpa, lembur, dan BPJS."
            kolom={[
                { key: "kode", label: "Kode" }, { key: "nama", label: "Nama" }, { key: "jabatan", label: "Jabatan" }, { key: "status_kerja", label: "Status" },
                { key: "akhir_kontrak", label: "Akhir kontrak" }, { key: "status_ptkp", label: "PTKP" },
                { key: "umk", label: "UMK", align: "right", format: "rupiah" }, { key: "tunj_jabatan", label: "T. Jabatan", align: "right", format: "rupiah" },
                { key: "jml_upah", label: "Jml. Upah", align: "right", format: "rupiah" }, { key: "aktif", label: "Aktif", align: "center", format: "ya" },
            ]}
            baris={baris}
            fields={FIELDS}
            fieldsBaru={[{ name: "kode", label: "Kode karyawan", required: true, hint: "Mis. K015. Tidak bisa diubah setelah disimpan.", tab: TAB.diri }]}
            nilaiBaru={{ aktif: true, status_kerja: "Kontrak", status_ptkp: "TK/0", umk: baris.find((b) => b.aktif)?.umk ?? null }}
            aksi={simpanKaryawanAction} />
    )
}
