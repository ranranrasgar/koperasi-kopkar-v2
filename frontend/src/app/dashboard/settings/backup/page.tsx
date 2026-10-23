import { FormCard } from "@/components/transaksi/common"
import { KelolaCadangan } from "@/components/master/KelolaCadangan"
import { daftarCadangan, folderCadangan, namaDatabaseServer, prosesBerjalan, ruangKosongCadangan } from "@/lib/cadangan"
import { query } from "@/lib/db"
import { wajibIzin } from "@/lib/operator"

export default async function BackupPage() {
    await wajibIzin("/dashboard/settings/backup") // layout tidak dijalankan ulang pada navigasi antarhalaman
    const [{ ukuran }] = await query<{ ukuran: number }>("SELECT pg_database_size(current_database()) ukuran")
    return (
        <div className="max-w-5xl space-y-6">
            <FormCard title="Backup & Restore"
                description="Cadangan seluruh database: data, akun, pengaturan, dan media (foto anggota, gambar pengumuman, logo), karena semua media disimpan di database.">
                <KelolaCadangan daftar={daftarCadangan()} folder={folderCadangan()} ruangKosong={ruangKosongCadangan()}
                    ukuranDatabase={ukuran} database={namaDatabaseServer()} sedang={prosesBerjalan()} />
            </FormCard>

            <FormCard title="Yang perlu diketahui" description="Cadangan dan pemulihan selalu sungguhan, tidak dipengaruhi mode Uji / Live.">
                <ul className="list-disc space-y-1.5 pl-5 text-sm text-muted-foreground">
                    <li>Cadangan dikompres (database 1,5 GB menjadi sekitar 40 MB), dipotong per 500 MB, dan setiap potongan punya SHA-256 untuk memastikan berkas tidak rusak saat disalin.</li>
                    <li>Unduh <b>semua</b> berkas satu cadangan (termasuk manifest.json) ke satu folder bila ingin menyimpannya di luar server. Simpan juga <code className="font-mono">.env.local</code> secara terpisah; berkas itu tidak ikut cadangan.</li>
                    <li><b>Pulihkan</b> menimpa seluruh database dengan isi cadangan. Database dipulihkan ke database sementara dulu, jumlah barisnya dicocokkan, baru ditukar; bila gagal, database lama tidak berubah. Semua pengguna sebaiknya keluar dulu.</li>
                    <li>Cadangan dari komputer lain: salin foldernya (berisi manifest.json) ke folder cadangan server, lalu muat ulang halaman ini. Untuk ruang disk yang sempit atau pemindahan ke server baru, pakai perintah <code className="font-mono">npm run restore</code> (lihat Pusat Panduan).</li>
                </ul>
            </FormCard>
        </div>
    )
}
