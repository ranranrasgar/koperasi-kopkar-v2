import { FormCard } from "@/components/transaksi/common"
import { wajibIzin } from "@/lib/operator"

export default async function AbsensiPage() {
    await wajibIzin("/dashboard/attendance") // layout tidak dijalankan ulang pada navigasi antarhalaman
    return (
        <FormCard title="Absensi Fingerprint" description="Kehadiran karyawan koperasi dari mesin fingerprint.">
            <div role="note" className="rounded-md border border-amber-400 bg-amber-50 dark:bg-amber-500/10 px-3 py-2 text-sm text-amber-800 dark:text-amber-300">
                Tabel absensi di database desktop (absen, absensi, karyawan) kosong sehingga tidak dipindahkan ke PostgreSQL, dan belum ada
                sambungan ke mesin fingerprint. Halaman ini akan berisi data setelah sumber absensi (ekspor mesin atau API) ditentukan.
            </div>
        </FormCard>
    )
}
