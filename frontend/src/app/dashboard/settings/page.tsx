import { FormCard } from "@/components/transaksi/common"
import { FormEdit, type FieldSpec } from "@/components/master/FormEdit"
import { FormLogo } from "@/components/master/FormLogo"
import { simpanKontakWaAction, simpanPerusahaanAction } from "@/app/actions/master"
import { query } from "@/lib/db"
import { identitasKoperasi } from "@/lib/koperasi"
import { wajibIzin } from "@/lib/operator"

const FIELDS: FieldSpec[] = [
    { name: "nama_perusahaan", label: "Nama Koperasi", required: true, hint: "Tampil di sidebar, halaman login, dan judul tab browser." },
    { name: "nama_manager", label: "Nama Manager / Ketua" },
    { name: "alamat_perusahaan1", label: "Alamat", wide: true },
    { name: "alamat_perusahaan2", label: "Alamat 2 / Telepon" },
    { name: "kota_perusahaan", label: "Kota" },
    { name: "email", label: "Email" },
    { name: "http", label: "Website" },
    { name: "npwp", label: "NPWP" },
    { name: "siup", label: "SIUP" },
    { name: "tdp", label: "TDP" },
    { name: "rp_adm_bank", label: "Biaya Adm Bank (Rp)", type: "number" },
    { name: "persen_pajak_pendapatan", label: "Pajak Pendapatan (%)", type: "number" },
    { name: "ket_nota", label: "Keterangan Nota", type: "textarea", wide: true },
]

export default async function PerusahaanPage() {
    await wajibIzin("/dashboard/settings") // layout tidak dijalankan ulang pada navigasi antarhalaman
    const [[p], k, [wa]] = await Promise.all([
        query<Record<string, string | number | null>>(`SELECT nama_perusahaan, nama_manager, alamat_perusahaan1, alamat_perusahaan2,
            kota_perusahaan, email, http, npwp, siup, tdp, rp_adm_bank, persen_pajak_pendapatan, ket_nota FROM perusahaan ORDER BY id LIMIT 1`),
        identitasKoperasi(),
        query<{ nilai: string }>("SELECT nilai FROM pengaturan_web WHERE kunci = 'wa_kontak'").catch(() => []),
    ])
    return (
        <div className="max-w-4xl space-y-6">
            <FormCard title="Logo Koperasi" description="Tampil di sidebar, halaman login, dan sebagai ikon aplikasi di tab browser.">
                <FormLogo logo={k.logo} logoSendiri={k.logoSendiri} />
            </FormCard>
            <FormCard title="Kontak WhatsApp" description="Tombol Hubungi kami di aplikasi anggota (mis. halaman pendaftaran menunggu verifikasi) membuka chat ke nomor ini.">
                <FormEdit fields={[{ name: "wa_kontak", label: "Nomor WhatsApp", hint: "Contoh: 081234567890. Kosongkan untuk menyembunyikan tombol." }]}
                    nilai={{ wa_kontak: wa?.nilai ?? "" }} aksi={simpanKontakWaAction} kolom={1} />
            </FormCard>
            <FormCard title="Pengaturan Perusahaan" description="Identitas koperasi untuk kop laporan, nota, dan tampilan aplikasi.">
                <FormEdit fields={FIELDS} nilai={p ?? {}} aksi={simpanPerusahaanAction} />
            </FormCard>
        </div>
    )
}
