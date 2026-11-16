import { PenjualanKantin, type NotaKantin, type RekapProduk } from "@/components/kantin/PenjualanKantin"
import { PilihKantin } from "@/components/kantin/PilihKantin"
import { pool, query } from "@/lib/db"
import { unitBoleh } from "@/lib/kantin"
import { wajibIzin } from "@/lib/operator"

export const dynamic = "force-dynamic"

const TGL = /^\d{4}-\d{2}-\d{2}$/

export default async function PenjualanKantinPage(props: PageProps<"/dashboard/kantin/penjualan">) {
    const o = await wajibIzin("/dashboard/kantin/penjualan") // layout tidak dijalankan ulang pada navigasi antarhalaman
    const unit = await unitBoleh(pool, o)
    const sp = await props.searchParams
    const pilih = unit.find((u) => u.id === Number(sp.unit)) ?? (unit.length === 1 ? unit[0] : null)
    if (!pilih) return <PilihKantin judul="Penjualan Kantin" unit={unit} />
    const hariIni = new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Jakarta" })
    const dari = typeof sp.dari === "string" && TGL.test(sp.dari) ? sp.dari : hariIni
    const sampai = typeof sp.sampai === "string" && TGL.test(sp.sampai) ? sp.sampai : hariIni
    const [nota, rekap] = await Promise.all([
        query<NotaKantin>(`SELECT p.id, p.no_bukti, p.tanggal::text, p.dibuat_pada::text waktu, p.metode, p.status, p.subtotal::float8 subtotal, p.diskon::float8 diskon,
                p.total::float8 total, p.total_pokok::float8 total_pokok, p.bagi_hasil::float8 bagi_hasil, p.uang_diterima::float8 uang_diterima, p.kembalian::float8 kembalian,
                p.opr, a.nama anggota, a.kode_agt, p.alasan_batal, p.opr_batal,
                (SELECT json_agg(json_build_object('nama', i.nama_produk, 'qty', i.qty::float8, 'harga', i.harga_jual::float8, 'subtotal', i.subtotal::float8) ORDER BY i.id)
                   FROM kantin_penjualan_item i WHERE i.penjualan_id = p.id) item
           FROM kantin_penjualan p LEFT JOIN anggota a ON a.id = p.anggota_id
          WHERE p.unit_usaha_id = $1 AND p.tanggal BETWEEN $2 AND $3 ORDER BY p.id DESC LIMIT 1000`, [pilih.id, dari, sampai]),
        query<RekapProduk>(`SELECT i.nama_produk nama, SUM(i.qty)::float8 qty, SUM(i.subtotal)::float8 penjualan, SUM(round(i.qty * i.harga_pokok, 2))::float8 hpp
           FROM kantin_penjualan_item i JOIN kantin_penjualan p ON p.id = i.penjualan_id
          WHERE p.unit_usaha_id = $1 AND p.tanggal BETWEEN $2 AND $3 AND p.status <> 'batal' GROUP BY i.nama_produk ORDER BY 3 DESC LIMIT 50`, [pilih.id, dari, sampai]),
    ])
    return <PenjualanKantin unit={pilih} dari={dari} sampai={sampai} nota={nota} rekap={rekap} lebihDariSatu={unit.length > 1} />
}
