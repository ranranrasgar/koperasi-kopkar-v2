import { KelolaPengumuman } from "@/components/notifikasi/KelolaPengumuman"
import { FormCard } from "@/components/transaksi/common"
import { query } from "@/lib/db"
import { wajibIzin } from "@/lib/operator"

export default async function HimbauanPromoPage() {
    await wajibIzin("/dashboard/himbauan") // layout tidak dijalankan ulang pada navigasi antarhalaman
    const [himbauan, promo] = await Promise.all([
        query<{ id: number; judul: string | null; isi: string | null; aktif: boolean }>(
            "SELECT id, judul_himbauan judul, isi_himbauan isi, COALESCE(status, false) aktif FROM himbauan ORDER BY id DESC"),
        query<{ id: number; judul: string | null; isi: string | null; aktif: boolean }>(
            "SELECT id, judul, isi, COALESCE(status, false) aktif FROM promo ORDER BY id DESC"),
    ])
    const bentuk = (r: typeof himbauan) => r.map((x) => ({ id: x.id, judul: x.judul ?? "", isi: x.isi ?? "", aktif: x.aktif }))
    return (
        <div className="max-w-3xl space-y-6">
            <FormCard title="Himbauan" description="Tampil di Beranda aplikasi anggota. Bila ada beberapa yang tampil, hanya yang terbaru yang dipakai.">
                <KelolaPengumuman jenis="himbauan" nama="Himbauan" daftar={bentuk(himbauan)} />
            </FormCard>
            <FormCard title="Promo" description="Semua promo yang tampil muncul di Beranda aplikasi anggota. Gambar belum bisa diunggah dari web.">
                <KelolaPengumuman jenis="promo" nama="Promo" daftar={bentuk(promo)} />
            </FormCard>
        </div>
    )
}
