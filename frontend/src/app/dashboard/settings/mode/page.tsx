import Link from "next/link"
import { FormCard } from "@/components/transaksi/common"
import { SaklarMode } from "@/components/master/SaklarMode"
import { modeAplikasi } from "@/lib/db"
import { formatTanggal } from "@/lib/format"
import { wajibIzin } from "@/lib/operator"

export default async function ModeAplikasiPage() {
    await wajibIzin("/dashboard/settings/mode") // layout tidak dijalankan ulang pada navigasi antarhalaman
    const mode = await modeAplikasi()
    return (
        <div className="max-w-3xl space-y-6">
            <FormCard title="Mode Uji / Live" description="Berlaku langsung untuk semua operator. Hanya grup admin dan superadmin yang bisa mengubahnya.">
                <SaklarMode uji={mode.uji} terkunci={mode.terkunci} />
                <p className="mt-4 text-xs text-muted-foreground">
                    {mode.terkunci
                        ? <>Mode <b>dikunci</b> oleh <code className="font-mono">KOPKAR_UJI_ROLLBACK</code> di <code className="font-mono">.env.local</code> server. Hapus baris itu lalu jalankan ulang server untuk memakai saklar ini.</>
                        : mode.diubahPada
                            ? <>Terakhir diubah {formatTanggal(mode.diubahPada, "long")}, {mode.diubahPada.slice(11, 16)}{mode.diubahOleh ? ` oleh ${mode.diubahOleh}` : ""}.</>
                            : <>Belum pernah diubah; aplikasi berjalan dalam mode Live.</>}
                </p>
            </FormCard>

            <FormCard title="Perbedaan kedua mode" description="Pilih Uji untuk latihan atau mencoba form, Live untuk transaksi sungguhan.">
                <div className="overflow-x-auto rounded-lg border">
                    <table className="w-full text-sm">
                        <thead className="bg-muted/60 text-left">
                            <tr><th className="px-3 py-2"></th><th className="px-3 py-2">Uji</th><th className="px-3 py-2">Live</th></tr>
                        </thead>
                        <tbody>
                            {[
                                ["Transaksi uang (simpanan, pinjaman, angsuran, jurnal)", "Dijalankan lalu dibatalkan", "Tersimpan dan dijurnal"],
                                ["Data master, logo, setuju/tolak pengajuan, panduan", "Dibatalkan", "Tersimpan"],
                                ["Hak akses, operator, ganti password, saklar ini", "Tetap tersimpan", "Tersimpan"],
                                ["Pesan setelah simpan", "Diawali MODE UJI, tidak tersimpan", "Biasa"],
                                ["Penanda di layar", "Banner kuning di setiap halaman", "Tidak ada"],
                                ["Nomor bukti", "Tetap terpakai (nomor bisa melompat)", "Terpakai"],
                            ].map(([hal, u, l]) => (
                                <tr key={hal} className="border-t"><td className="px-3 py-2 font-medium">{hal}</td><td className="px-3 py-2">{u}</td><td className="px-3 py-2">{l}</td></tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <p className="mt-3 text-sm text-muted-foreground">
                    Untuk menguji alur antar halaman dengan data yang benar-benar tersimpan, pakai database uji terpisah.
                    Penjelasannya ada di <Link href="/dashboard/panduan/mode-uji-dan-database-uji" className="text-blue-600 dark:text-blue-400 underline">panduan mode uji dan database uji</Link>.
                </p>
            </FormCard>
        </div>
    )
}
