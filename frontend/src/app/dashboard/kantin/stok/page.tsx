import { PilihKantin } from "@/components/kantin/PilihKantin"
import { StokMasuk, type MutasiStok, type ProdukStok } from "@/components/kantin/StokMasuk"
import { pool, query } from "@/lib/db"
import { unitBoleh } from "@/lib/kantin"
import { wajibIzin } from "@/lib/operator"

export const dynamic = "force-dynamic"

export default async function StokKantinPage(props: PageProps<"/dashboard/kantin/stok">) {
    const o = await wajibIzin("/dashboard/kantin/stok") // layout tidak dijalankan ulang pada navigasi antarhalaman
    const unit = await unitBoleh(pool, o)
    const sp = await props.searchParams
    const minta = Number(sp.unit)
    const produkId = Number(sp.produk) || null
    const pilih = unit.find((u) => u.id === minta) ?? (unit.length === 1 ? unit[0] : null)
    if (!pilih) return <PilihKantin judul="Stok Masuk" unit={unit} />
    const [produk, akun, mutasi] = await Promise.all([
        query<ProdukStok>(`SELECT id, kode, nama, satuan, harga_beli::float8 harga_beli, harga_pokok::float8 harga_pokok, stok::float8 stok, stok_minimal::float8 stok_minimal
            FROM kantin_produk WHERE unit_usaha_id = $1 AND kelola_stok AND aktif ORDER BY nama`, [pilih.id]),
        // Akun pembayaran untuk kantin milik koperasi: kas kantin dulu, lalu akun kas/bank lain dan utang lancar (pembelian tempo).
        pilih.model === "milik" ? query<{ kode_perkiraan: string; nama_perkiraan: string }>(`SELECT p.kode_perkiraan, p.nama_perkiraan FROM perkiraan p
            WHERE (p.keterangan IN ('BANK', 'GC') OR p.kode_perkiraan IN ('2.1.00.17', '2.1.00.18'))
              AND NOT EXISTS (SELECT 1 FROM perkiraan c WHERE c.parent_id = p.id AND c.id <> p.id)
            ORDER BY (p.id = (SELECT akun_kas_id FROM unit_usaha WHERE id = $1)) DESC, p.kode_perkiraan`, [pilih.id]) : Promise.resolve([]),
        query<MutasiStok>(`SELECT m.id, m.tanggal::text, m.waktu::text, m.jenis, m.no_bukti, p.nama, p.satuan, m.qty::float8 qty, m.harga::float8 harga, m.stok_setelah::float8 stok_setelah, m.opr, m.keterangan
            FROM kantin_stok_mutasi m JOIN kantin_produk p ON p.id = m.produk_id WHERE m.unit_usaha_id = $1 AND ($2::bigint IS NULL OR m.produk_id = $2)
            ORDER BY m.id DESC LIMIT 200`, [pilih.id, produkId]),
    ])
    return <StokMasuk unit={pilih} produk={produk} akun={akun} mutasi={mutasi} produkFilter={produkId} lebihDariSatu={unit.length > 1} />
}
