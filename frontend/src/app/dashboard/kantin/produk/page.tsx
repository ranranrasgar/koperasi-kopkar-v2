import { KelolaProduk, type BarisProduk } from "@/components/kantin/KelolaProduk"
import { pool, query } from "@/lib/db"
import { unitBoleh } from "@/lib/kantin"
import { wajibIzin } from "@/lib/operator"

export const dynamic = "force-dynamic"

export default async function ProdukKantinPage(props: PageProps<"/dashboard/kantin/produk">) {
    const o = await wajibIzin("/dashboard/kantin/produk") // layout tidak dijalankan ulang pada navigasi antarhalaman
    const unit = await unitBoleh(pool, o)
    const minta = Number((await props.searchParams).unit)
    const pilih = unit.find((u) => u.id === minta) ?? unit.find((u) => u.aktif) ?? unit[0]
    const [produk, kategori] = pilih ? await Promise.all([
        query<BarisProduk>(`SELECT p.id, p.kode, p.barcode, p.nama, k.nama kategori, p.satuan, p.harga_beli::text, p.harga_jual::text, p.harga_pokok::text,
                p.kelola_stok, p.stok::text, p.stok_minimal::text, p.tampil_anggota, p.aktif, p.keterangan, g.token gambar
           FROM kantin_produk p LEFT JOIN kantin_kategori k ON k.id = p.kategori_id
           LEFT JOIN pengumuman_gambar_ref r ON r.jenis = 'produk' AND r.ref_id = p.id LEFT JOIN pengumuman_gambar g ON g.id = r.gambar_id
          WHERE p.unit_usaha_id = $1 ORDER BY p.aktif DESC, k.urutan NULLS LAST, p.nama`, [pilih.id]),
        query<{ nama: string }>("SELECT nama FROM kantin_kategori WHERE unit_usaha_id = $1 ORDER BY urutan, nama", [pilih.id]),
    ]) : [[], []]
    return <KelolaProduk unit={unit} unitId={pilih?.id ?? null} produk={produk} kategori={kategori.map((k) => k.nama)} />
}
