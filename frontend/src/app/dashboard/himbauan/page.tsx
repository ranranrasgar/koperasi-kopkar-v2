import { tokenGambar } from "@kopkar/backend/src/anggota/gambar.ts"
import { KelolaPengumuman } from "@/components/notifikasi/KelolaPengumuman"
import { FormCard } from "@/components/transaksi/common"
import { pool, query } from "@/lib/db"
import { wajibIzin } from "@/lib/operator"

export default async function HimbauanPromoPage() {
    await wajibIzin("/dashboard/himbauan") // layout tidak dijalankan ulang pada navigasi antarhalaman
    const [himbauan, promo] = await Promise.all([
        query<{ id: number; judul: string | null; isi: string | null; aktif: boolean }>(
            "SELECT id, judul_himbauan judul, isi_himbauan isi, COALESCE(status, false) aktif FROM himbauan ORDER BY id DESC"),
        query<{ id: number; judul: string | null; isi: string | null; aktif: boolean }>(
            "SELECT id, judul, isi, COALESCE(status, false) aktif FROM promo ORDER BY id DESC"),
    ])
    const [gH, gP] = await Promise.all([tokenGambar(pool, "himbauan", himbauan.map((x) => x.id)), tokenGambar(pool, "promo", promo.map((x) => x.id))])
    const bentuk = (r: typeof himbauan, g: Map<number, string>) => r.map((x) => ({ id: x.id, judul: x.judul ?? "", isi: x.isi ?? "", aktif: x.aktif, gambar: g.get(x.id) ?? null }))
    return (
        <div className="max-w-3xl space-y-6">
            <FormCard title="Himbauan" description="Tampil di Beranda aplikasi anggota. Bila ada beberapa yang tampil, anggota menggesernya sebagai slide. Aplikasi Android lama hanya menampilkan yang terbaru.">
                <KelolaPengumuman jenis="himbauan" nama="Himbauan" daftar={bentuk(himbauan, gH)} />
            </FormCard>
            <FormCard title="Promo" description="Himbauan dan promo yang tampil digabung dalam satu slide di Beranda aplikasi anggota. Gambar yang diunggah dari web hanya tampil di aplikasi baru ini.">
                <KelolaPengumuman jenis="promo" nama="Promo" daftar={bentuk(promo, gP)} />
            </FormCard>
        </div>
    )
}
