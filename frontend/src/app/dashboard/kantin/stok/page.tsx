import { PilihKantin } from "@/components/kantin/PilihKantin"
import { StokMasuk, type FilterStok, type MutasiStok, type ProdukStok, type RiwayatMasuk, type TabStok } from "@/components/kantin/StokMasuk"
import { pool, query } from "@/lib/db"
import { ukuranHalaman } from "@/lib/halaman"
import { unitBoleh } from "@/lib/kantin"
import { wajibIzin } from "@/lib/operator"

export const dynamic = "force-dynamic"

const TGL = /^\d{4}-\d{2}-\d{2}$/
// Salinan TAB_STOK: konstanta dari modul "use client" hanya referensi klien di server component.
const TAB: TabStok[] = ["masuk", "riwayat", "opname", "kartu"]
const JENIS = ["masuk", "jual", "batal", "opname", "rusak"]
const teks = (v: unknown) => (typeof v === "string" ? v : "")

export default async function StokKantinPage(props: PageProps<"/dashboard/kantin/stok">) {
    const o = await wajibIzin("/dashboard/kantin/stok") // layout tidak dijalankan ulang pada navigasi antarhalaman
    const unit = await unitBoleh(pool, o)
    const sp = await props.searchParams
    const pilih = unit.find((u) => u.id === Number(sp.unit)) ?? (unit.length === 1 ? unit[0] : null)
    if (!pilih) return <PilihKantin judul="Stok Kantin" unit={unit} />

    const tab: TabStok = (TAB as string[]).includes(teks(sp.tab)) ? (teks(sp.tab) as TabStok) : "masuk"
    const hariIni = new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Jakarta" })
    const filter: FilterStok = {
        dari: TGL.test(teks(sp.dari)) ? teks(sp.dari) : hariIni.slice(0, 8) + "01",
        sampai: TGL.test(teks(sp.sampai)) ? teks(sp.sampai) : hariIni,
        produk: Number(sp.produk) || null,
        jenis: JENIS.includes(teks(sp.jenis)) ? teks(sp.jenis) : "",
        cari: teks(sp.cari).trim().slice(0, 50),
    }
    const pageSize = ukuranHalaman(teks(sp.pageSize), 50) // termasuk pilihan "semua", sama dengan tabel lain
    const page = Math.max(1, Math.floor(Number(sp.page)) || 1)
    const offset = (page - 1) * pageSize
    const cari = filter.cari ? `%${filter.cari}%` : ""

    const [produk, akun, riwayat, mutasi] = await Promise.all([
        query<ProdukStok>(`SELECT id, kode, nama, satuan, harga_beli::float8 harga_beli, harga_pokok::float8 harga_pokok, stok::float8 stok, stok_minimal::float8 stok_minimal
            FROM kantin_produk WHERE unit_usaha_id = $1 AND kelola_stok AND aktif ORDER BY nama`, [pilih.id]),
        // Akun pembayaran untuk kantin milik koperasi: kas kantin dulu, lalu akun kas/bank lain dan utang lancar (pembelian tempo).
        (tab === "masuk" || tab === "riwayat") && pilih.model === "milik" ? query<{ kode_perkiraan: string; nama_perkiraan: string }>(`SELECT p.kode_perkiraan, p.nama_perkiraan FROM perkiraan p
            WHERE (p.keterangan IN ('BANK', 'GC') OR p.kode_perkiraan IN ('2.1.00.17', '2.1.00.18'))
              AND NOT EXISTS (SELECT 1 FROM perkiraan c WHERE c.parent_id = p.id AND c.id <> p.id)
            ORDER BY (p.id = (SELECT akun_kas_id FROM unit_usaha WHERE id = $1)) DESC, p.kode_perkiraan`, [pilih.id]) : Promise.resolve([]),
        // Riwayat per bukti KTB. bisa_hapus: tidak ada mutasi produknya sesudah bukti ini (aturan hapusStokMasuk).
        tab === "riwayat" ? query<RiwayatMasuk & { jumlah: number }>(`WITH b AS (
                SELECT m.no_bukti, min(m.tanggal)::text tanggal, min(m.waktu) waktu, min(m.opr) opr, min(m.keterangan) keterangan,
                       sum(round(m.qty * m.harga, 2))::float8 total,
                       json_agg(json_build_object('produkId', m.produk_id, 'nama', p.nama, 'satuan', p.satuan, 'qty', m.qty::float8, 'harga', m.harga::float8) ORDER BY m.id) item,
                       bool_and(NOT EXISTS (SELECT 1 FROM kantin_stok_mutasi y WHERE y.produk_id = m.produk_id AND y.id > m.id AND y.no_bukti <> m.no_bukti)) bisa_hapus
                  FROM kantin_stok_mutasi m JOIN kantin_produk p ON p.id = m.produk_id
                 WHERE m.unit_usaha_id = $1 AND m.jenis = 'masuk' AND m.tanggal BETWEEN $2 AND $3
                 GROUP BY m.no_bukti
                HAVING ($4::bigint IS NULL OR bool_or(m.produk_id = $4)) AND ($5 = '' OR m.no_bukti ILIKE $5 OR bool_or(m.keterangan ILIKE $5)))
            SELECT b.no_bukti, b.tanggal, b.waktu::text, b.opr, b.keterangan, b.total, b.item, b.bisa_hapus,
                   (SELECT k.kode_perkiraan || ' ' || k.nama_perkiraan FROM jurnal_umum j JOIN perkiraan k ON k.id = j.perkiraan_id
                     WHERE j.nomor_bukti = b.no_bukti AND j.kredit_jurnalumum > 0 LIMIT 1) akun,
                   (SELECT j.kode_perkiraan FROM jurnal_umum j WHERE j.nomor_bukti = b.no_bukti AND j.kredit_jurnalumum > 0 LIMIT 1) akun_kode,
                   count(*) OVER ()::int jumlah, sum(b.total) OVER ()::float8 total_semua
              FROM b ORDER BY b.waktu DESC, b.no_bukti DESC LIMIT $6 OFFSET $7`,
            [pilih.id, filter.dari, filter.sampai, filter.produk, cari, pageSize, offset]) : Promise.resolve([]),
        tab === "kartu" ? query<MutasiStok & { jumlah: number }>(`SELECT m.id, m.tanggal::text, m.waktu::text, m.jenis, m.no_bukti, p.nama, p.satuan, m.qty::float8 qty, m.harga::float8 harga,
                m.stok_setelah::float8 stok_setelah, m.opr, m.keterangan, count(*) OVER ()::int jumlah
            FROM kantin_stok_mutasi m JOIN kantin_produk p ON p.id = m.produk_id
           WHERE m.unit_usaha_id = $1 AND m.tanggal BETWEEN $2 AND $3 AND ($4::bigint IS NULL OR m.produk_id = $4) AND ($5 = '' OR m.jenis = $5)
             AND ($6 = '' OR m.no_bukti ILIKE $6 OR m.keterangan ILIKE $6)
           ORDER BY m.id DESC LIMIT $7 OFFSET $8`,
            [pilih.id, filter.dari, filter.sampai, filter.produk, filter.jenis, cari, pageSize, offset]) : Promise.resolve([]),
    ])
    const total = (riwayat[0] ?? mutasi[0])?.jumlah ?? 0
    return <StokMasuk unit={pilih} tab={tab} filter={filter} produk={produk} akun={akun} riwayat={riwayat} mutasi={mutasi}
        hal={{ page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) }} lebihDariSatu={unit.length > 1} />
}
