import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { KatalogKantin, type ProdukKatalog } from "@/components/KatalogKantin"
import { Kepala } from "@/components/ui"
import { wajibAnggota } from "@/lib/anggota"
import { query } from "@/lib/db"
import { sqlBuka, sqlKetBuka, sqlPesanTutup } from "@kopkar/backend/src/unit-usaha/kantin.ts"

export const metadata: Metadata = { title: "Belanja Kantin" }

/** Katalog satu kantin: produk aktif yang tampil di aplikasi dan masih ada stoknya, beserta isi tas anggota. */
export default async function KatalogPage(props: PageProps<"/kantin/[unit]">) {
    const a = await wajibAnggota()
    const unitId = Number((await props.params).unit)
    if (!Number.isSafeInteger(unitId)) notFound()
    const [u] = await query<{ id: number; nama: string; lokasi: string | null; buka: boolean; ket: string; pesan_tutup: string | null }>(
        `SELECT id, nama, lokasi, ${sqlBuka('u')} buka, ${sqlKetBuka('u')} ket, ${sqlPesanTutup('u')} pesan_tutup
           FROM unit_usaha u WHERE id = $1 AND jenis = 'KANTIN' AND aktif AND tampil_anggota`, [unitId])
    if (!u) notFound()
    const [produk, tas] = await Promise.all([
        query<ProdukKatalog>(`SELECT p.id, p.nama, p.satuan, p.harga_jual harga, k.nama kategori, p.kelola_stok, p.stok, g.token gambar
            FROM kantin_produk p LEFT JOIN kantin_kategori k ON k.id = p.kategori_id
            LEFT JOIN pengumuman_gambar_ref r ON r.jenis = 'produk' AND r.ref_id = p.id LEFT JOIN pengumuman_gambar g ON g.id = r.gambar_id
           WHERE p.unit_usaha_id = $1 AND p.aktif AND p.tampil_anggota AND (NOT p.kelola_stok OR p.stok > 0) ORDER BY k.urutan NULLS LAST, p.nama`, [unitId]),
        query<{ produk_id: number; qty: number }>("SELECT produk_id, qty FROM kantin_tas WHERE anggota_id = $1 AND unit_usaha_id = $2", [a.anggotaId, unitId]),
    ])
    return (
        <main>
            <Kepala judul={u.nama} sub={[u.lokasi, u.ket].filter(Boolean).join(" · ")} kembali="/kantin" />
            {!u.buka && <p className="mx-5 mb-3 rounded-xl bg-keluar-lembut px-4 py-2.5 text-sm text-keluar">
                {u.pesan_tutup !== null ? `Kantin tutup sementara${u.ket.includes("s.d.") ? ` ${u.ket.slice(u.ket.indexOf("s.d."))}` : ""}.${u.pesan_tutup ? ` ${u.pesan_tutup}.` : ""}` : "Kantin sedang tutup."}
                {" "}Anda bisa melihat menu, tetapi pesanan baru bisa dikirim saat kantin buka.</p>}
            <KatalogKantin unitId={unitId} produk={produk.map((p) => ({ ...p, harga: Number(p.harga), stok: Number(p.stok) }))}
                tas={Object.fromEntries(tas.map((t) => [Number(t.produk_id), Number(t.qty)]))} />
        </main>
    )
}
