import { KasirPos, type ProdukPos } from "@/components/kantin/KasirPos"
import { PilihKantin } from "@/components/kantin/PilihKantin"
import { ringkasSesi, sesiTerbuka } from "@kopkar/backend/src/posting/kantin.ts"
import { pool, query } from "@/lib/db"
import { unitBoleh } from "@/lib/kantin"
import { wajibIzin } from "@/lib/operator"

export const dynamic = "force-dynamic"

export default async function KasirKantinPage(props: PageProps<"/dashboard/kantin/kasir">) {
    const o = await wajibIzin("/dashboard/kantin/kasir") // layout tidak dijalankan ulang pada navigasi antarhalaman
    const unit = (await unitBoleh(pool, o)).filter((u) => u.aktif)
    const minta = Number((await props.searchParams).unit)
    const pilih = unit.find((u) => u.id === minta) ?? (unit.length === 1 ? unit[0] : null)
    if (!pilih) return <PilihKantin judul="Kasir Kantin" unit={unit} />
    const [produk, sesi] = await Promise.all([
        query<ProdukPos>(`SELECT p.id, p.kode, p.barcode, p.nama, k.nama kategori, p.satuan, p.harga_jual::float8 harga, p.kelola_stok, p.stok::float8 stok, g.token gambar
            FROM kantin_produk p LEFT JOIN kantin_kategori k ON k.id = p.kategori_id
            LEFT JOIN pengumuman_gambar_ref r ON r.jenis = 'produk' AND r.ref_id = p.id LEFT JOIN pengumuman_gambar g ON g.id = r.gambar_id
           WHERE p.unit_usaha_id = $1 AND p.aktif ORDER BY k.urutan NULLS LAST, p.nama`, [pilih.id]),
        sesiTerbuka(pool, pilih.id, o.id),
    ])
    const ringkas = sesi ? { ...(await ringkasSesi(pool, Number(sesi.id))), sesiId: Number(sesi.id), dibuka: sesi.dibuka_pada } : null
    return <KasirPos unit={{ id: pilih.id, nama: pilih.nama, model: pilih.model }} produk={produk} sesi={ringkas} kasir={o.namaLengkap} lebihDariSatu={unit.length > 1} />
}
