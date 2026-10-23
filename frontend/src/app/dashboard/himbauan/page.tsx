import { tokenGambar } from "@kopkar/backend/src/anggota/gambar.ts"
import { daftarGrupOperator, daftarStatusStaff, SASARAN_BAWAAN, sasaranUntuk } from "@kopkar/backend/src/anggota/sasaran.ts"
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
    const [sH, sP, opsiStatus, opsiGrup] = await Promise.all([
        sasaranUntuk(pool, "himbauan", himbauan.map((x) => x.id)), sasaranUntuk(pool, "promo", promo.map((x) => x.id)),
        daftarStatusStaff(pool), daftarGrupOperator(pool),
    ])
    const bentuk = (r: typeof himbauan, g: Map<number, string>, sas: typeof sH) => r.map((x) => ({
        id: x.id, judul: x.judul ?? "", isi: x.isi ?? "", aktif: x.aktif, gambar: g.get(x.id) ?? null, sasaran: sas.get(x.id) ?? SASARAN_BAWAAN,
    }))
    return (
        <div className="max-w-3xl space-y-6">
            <FormCard title="Himbauan" description="Pilih penerimanya: anggota (semua atau status tertentu) dan/atau internal kantor (semua grup atau grup tertentu). Yang aktif tampil sebagai slide di Beranda anggota dan di Pengumuman (lonceng) aplikasi admin. Aplikasi Android lama hanya menampilkan satu himbauan terbaru untuk semua anggota.">
                <KelolaPengumuman jenis="himbauan" nama="Himbauan" daftar={bentuk(himbauan, gH, sH)} opsiStatus={opsiStatus} opsiGrup={opsiGrup} />
            </FormCard>
            <FormCard title="Promo" description="Sama seperti himbauan: pilih penerimanya. Himbauan dan promo yang tampil digabung dalam satu slide. Gambar yang diunggah dari web hanya tampil di aplikasi baru.">
                <KelolaPengumuman jenis="promo" nama="Promo" daftar={bentuk(promo, gP, sP)} opsiStatus={opsiStatus} opsiGrup={opsiGrup} />
            </FormCard>
        </div>
    )
}
