import { FormCard } from "@/components/transaksi/common"
import { FormEdit, type FieldSpec } from "@/components/master/FormEdit"
import { FormLogo } from "@/components/master/FormLogo"
import { PosterDaftar } from "@/components/master/PosterDaftar"
import { simpanKontakWaAction, simpanNilaiAwalAnggotaAction, simpanPerusahaanAction, simpanTemplatNotifAction } from "@/app/actions/master"
import { KUNCI_NILAI_AWAL } from "@kopkar/backend/src/anggota/akun.ts"
import { BIDANG_TEMPLAT, kunciTemplat } from "@kopkar/backend/src/anggota/templat-notif.ts"
import { query } from "@/lib/db"
import { identitasKoperasi } from "@/lib/koperasi"
import { wajibIzin } from "@/lib/operator"

/** Dipakai poster bila env ANGGOTA_URL belum diisi. */
const ALAMAT_ANGGOTA_BAWAAN = "https://anggota.kopkarmjsmattel.com"

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
    { name: "rp_adm_bank", label: "Biaya Adm Bank (Rp)", type: "uang" },
    { name: "persen_pajak_pendapatan", label: "Pajak Pendapatan (%)", type: "number" },
    { name: "ket_nota", label: "Keterangan Nota", type: "textarea", wide: true },
]

/** Teks notifikasi push dan email yang bisa diatur pengurus; satu tab per peristiwa. */
const FIELD_TEMPLAT: FieldSpec[] = BIDANG_TEMPLAT.map((b) => ({
    name: b.kunci, label: b.label, type: b.panjang ? "textarea" : "text", wide: true, tab: b.kelompok,
    hint: `Kosongkan untuk teks bawaan: "${b.bawaan}" Peubah yang bisa dipakai: ${b.peubah.map((k) => `{${k}}`).join(" ")}. Maksimal ${b.maks} karakter.`,
}))

export default async function PerusahaanPage() {
    await wajibIzin("/dashboard/settings") // layout tidak dijalankan ulang pada navigasi antarhalaman
    const [[p], k, [wa], awal, templat] = await Promise.all([
        query<Record<string, string | number | null>>(`SELECT nama_perusahaan, nama_manager, alamat_perusahaan1, alamat_perusahaan2,
            kota_perusahaan, email, http, npwp, siup, tdp, rp_adm_bank, persen_pajak_pendapatan, ket_nota FROM perusahaan ORDER BY id LIMIT 1`),
        identitasKoperasi(),
        query<{ nilai: string }>("SELECT nilai FROM pengaturan_web WHERE kunci = 'wa_kontak'").catch(() => []),
        query<{ kunci: string; nilai: string }>("SELECT kunci, nilai FROM pengaturan_web WHERE kunci = ANY($1::text[])", [Object.values(KUNCI_NILAI_AWAL)]).catch(() => []),
        query<{ kunci: string; nilai: string }>("SELECT kunci, nilai FROM pengaturan_web WHERE kunci = ANY($1::text[])", [BIDANG_TEMPLAT.map((b) => kunciTemplat(b.kunci))]).catch(() => []),
    ])
    const alamatAnggota = (process.env.ANGGOTA_URL || ALAMAT_ANGGOTA_BAWAAN).replace(/\/+$/, "")
    const nilaiAwal = Object.fromEntries(Object.entries(KUNCI_NILAI_AWAL).map(([b, kunci]) => [b, awal.find((r) => r.kunci === kunci)?.nilai ?? ""]))
    const nilaiTemplat = Object.fromEntries(BIDANG_TEMPLAT.map((b) => [b.kunci, templat.find((r) => r.kunci === kunciTemplat(b.kunci))?.nilai ?? ""]))
    return (
        <div className="max-w-4xl space-y-6">
            <FormCard title="Logo Koperasi" description="Tampil di sidebar, halaman login, dan sebagai ikon aplikasi di tab browser.">
                <FormLogo logo={k.logo} logoSendiri={k.logoSendiri} />
            </FormCard>
            <FormCard title="Kontak WhatsApp" description="Tombol Hubungi kami di aplikasi anggota (mis. halaman pendaftaran menunggu verifikasi) membuka chat ke nomor ini.">
                <FormEdit fields={[{ name: "wa_kontak", label: "Nomor WhatsApp", hint: "Contoh: 081234567890. Kosongkan untuk menyembunyikan tombol." }]}
                    nilai={{ wa_kontak: wa?.nilai ?? "" }} aksi={simpanKontakWaAction} kolom={1} />
            </FormCard>
            <FormCard title="QR Pendaftaran Anggota" description="Poster berisi kode QR ke halaman pendaftaran aplikasi anggota, untuk dicetak atau dibagikan pengurus.">
                <PosterDaftar url={`${alamatAnggota}/daftar`} nama={k.nama} logo={k.logo} wa={wa?.nilai?.trim() || null} tanpaEnv={!process.env.ANGGOTA_URL} />
            </FormCard>
            <FormCard title="Nilai Awal Anggota Baru" description="Simpanan bulanan awal untuk anggota baru dari pendaftaran aplikasi. Muncul sebagai isian awal di form kelengkapan saat admin menyetujui, dan bisa diubah di sana. Kosongkan untuk memakai tebakan dari anggota baru bergrade sama.">
                <FormEdit fields={[
                    { name: "pokok", label: "Simpanan Pokok (Rp)", type: "uang" },
                    { name: "wajib", label: "Simpanan Wajib (Rp per bulan)", type: "uang" },
                    { name: "sukarela", label: "Simpanan Sukarela (Rp per bulan)", type: "uang" },
                ]} nilai={nilaiAwal} aksi={simpanNilaiAwalAnggotaAction} kolom={3} />
            </FormCard>
            <FormCard title="Teks Notifikasi dan Email Pinjaman" description="Judul dan isi notifikasi di HP anggota (aplikasi anggota, muncul walau aplikasi tidak dibuka) dan email saat pengajuan disetujui, ditolak, dan pinjaman dicairkan. Kosongkan satu isian untuk memakai teks bawaan. Nomor pinjaman, jadwal angsuran, dan lampiran PDF tetap ditambahkan otomatis.">
                <FormEdit fields={FIELD_TEMPLAT} nilai={nilaiTemplat} aksi={simpanTemplatNotifAction} kolom={1} />
            </FormCard>
            <FormCard title="Pengaturan Perusahaan" description="Identitas koperasi untuk kop laporan, nota, dan tampilan aplikasi.">
                <FormEdit fields={FIELDS} nilai={p ?? {}} aksi={simpanPerusahaanAction} />
            </FormCard>
        </div>
    )
}
