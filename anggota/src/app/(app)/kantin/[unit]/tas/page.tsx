import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { adaPin } from "@kopkar/backend/src/anggota/pin.ts"
import { FormCheckout } from "@/components/FormCheckout"
import { Kepala } from "@/components/ui"
import { wajibAnggota } from "@/lib/anggota"
import { pool, query } from "@/lib/db"

export const metadata: Metadata = { title: "Tas Belanja" }

export default async function TasPage(props: PageProps<"/kantin/[unit]/tas">) {
    const a = await wajibAnggota()
    const unitId = Number((await props.params).unit)
    if (!Number.isSafeInteger(unitId)) notFound()
    const [u] = await query<{ nama: string; terima_tunai: boolean; terima_sukarela: boolean; menit: number }>(
        "SELECT nama, terima_tunai, terima_sukarela, menit_batal_pesanan menit FROM unit_usaha WHERE id = $1 AND aktif AND tampil_anggota", [unitId])
    if (!u) notFound()
    const [baris, [saldo], pin] = await Promise.all([
        query<{ produk_id: number; nama: string; satuan: string; harga: number; qty: number; kelola_stok: boolean; stok: number }>(
            `SELECT t.produk_id, p.nama, p.satuan, p.harga_jual harga, t.qty, p.kelola_stok, p.stok FROM kantin_tas t JOIN kantin_produk p ON p.id = t.produk_id
              WHERE t.anggota_id = $1 AND t.unit_usaha_id = $2 AND p.aktif AND p.tampil_anggota ORDER BY p.nama`, [a.anggotaId, unitId]),
        query<{ saldo: number }>(`SELECT COALESCE(SUM(s.rp_setoran - s.rp_pengambilan), 0) saldo FROM simpanan s JOIN jenis_simpanan j ON j.id = s.jenis_simpanan_id
            WHERE s.anggota_id = $1 AND j.kode_simpanan = '03'`, [a.anggotaId]),
        adaPin(pool, a.anggotaId),
    ])
    return (
        <main>
            <Kepala judul="Tas belanja" sub={u.nama} kembali={`/kantin/${unitId}`} />
            <FormCheckout unitId={unitId} saldo={Number(saldo?.saldo ?? 0)} adaPin={pin} terimaTunai={u.terima_tunai} terimaSukarela={u.terima_sukarela} menit={u.menit}
                baris={baris.map((b) => ({ produkId: Number(b.produk_id), nama: b.nama, satuan: b.satuan, harga: Number(b.harga), qty: Number(b.qty), stok: b.kelola_stok ? Number(b.stok) : null }))} />
        </main>
    )
}
