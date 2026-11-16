import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { LABEL_STATUS } from "@kopkar/backend/src/posting/kantin-pesanan.ts"
import { StatusPesananLive } from "@/components/StatusPesananLive"
import { Kartu, Kepala } from "@/components/ui"
import { wajibAnggota } from "@/lib/anggota"
import { query } from "@/lib/db"
import { rupiah } from "@/lib/format"

export const metadata: Metadata = { title: "Pesanan Kantin" }

const LANGKAH = ["dibayar", "diproses", "siap", "selesai"]

export default async function PesananPage(props: PageProps<"/kantin/pesanan/[id]">) {
    const a = await wajibAnggota()
    const id = Number((await props.params).id)
    if (!Number.isSafeInteger(id)) notFound()
    await query(`UPDATE kantin_pesanan SET status = 'batal', alasan_batal = 'Tidak diambil sampai batas waktu', diubah_pada = now(), diubah_oleh = 'sistem'
        WHERE id = $1 AND metode = 'tunai' AND status IN ('menunggu', 'diproses', 'siap') AND batas_ambil < now()`, [id])
    const [p] = await query<{ id: number; kantin: string; isi: { nama: string; qty: string; harga: string; satuan: string }[]; total: number; metode: string; status: string; catatan: string | null
        batas: string | null; alasan_batal: string | null; dibuat: string; no_bukti: string | null }>(
        `SELECT p.id, u.nama kantin, p.isi, p.total, p.metode, p.status, p.catatan, to_char(p.batas_ambil AT TIME ZONE 'Asia/Jakarta', 'HH24:MI') batas,
                p.alasan_batal, to_char(p.dibuat_pada AT TIME ZONE 'Asia/Jakarta', 'DD/MM HH24:MI') dibuat, j.no_bukti
           FROM kantin_pesanan p JOIN unit_usaha u ON u.id = p.unit_usaha_id LEFT JOIN kantin_penjualan j ON j.id = p.penjualan_id
          WHERE p.id = $1 AND p.anggota_id = $2`, [id, a.anggotaId])
    if (!p) notFound()
    const urutan = p.metode === "tunai" ? ["menunggu", "diproses", "siap", "selesai"] : LANGKAH
    const ke = urutan.indexOf(p.status)
    return (
        <main>
            <Kepala judul={`Pesanan #${p.id}`} sub={`${p.kantin} · ${p.dibuat}`} kembali="/kantin" />
            <div className="space-y-4 px-5">
                <div className={`rounded-2xl px-4 py-4 ${p.status === "batal" ? "bg-keluar-lembut text-keluar" : p.status === "siap" ? "bg-masuk/15" : "bg-utama-lembut"}`}>
                    <p className="text-lg font-bold">{LABEL_STATUS[p.status] ?? p.status}</p>
                    {p.status === "siap" && <p className="text-sm">Silakan ambil di {p.kantin}{p.metode === "tunai" ? ` dan bayar ${rupiah(Number(p.total))} di kasir` : ""}.</p>}
                    {p.metode === "tunai" && ["menunggu", "diproses", "siap"].includes(p.status) && p.batas && <p className="text-sm">Ambil sebelum pukul {p.batas}, atau pesanan batal otomatis.</p>}
                    {p.status === "batal" && p.alasan_batal && <p className="text-sm">{p.alasan_batal}{p.metode === "sukarela" && p.no_bukti ? ". Saldo Simpanan Sukarela sudah dikembalikan." : ""}</p>}
                </div>
                {p.status !== "batal" && (
                    <ol className="flex gap-1">
                        {urutan.map((s, i) => <li key={s} className={`h-1.5 flex-1 rounded-full ${i <= ke ? "bg-utama" : "bg-garis"}`} title={LABEL_STATUS[s]} />)}
                    </ol>
                )}
                <Kartu className="divide-y divide-garis">
                    {p.isi.map((it, i) => (
                        <div key={i} className="flex justify-between gap-3 px-5 py-3 text-sm"><span>{it.nama} · {Number(it.qty)} x {rupiah(Number(it.harga))}</span><span className="angka">{rupiah(Number(it.qty) * Number(it.harga))}</span></div>
                    ))}
                    <div className="flex justify-between px-5 py-3 font-bold"><span>Total ({p.metode === "sukarela" ? "Simpanan Sukarela" : "tunai saat ambil"})</span><span className="angka">{rupiah(Number(p.total))}</span></div>
                </Kartu>
                {p.catatan && <p className="text-sm text-redup">Catatan: {p.catatan}</p>}
                {p.no_bukti && <p className="text-xs text-redup">Nota {p.no_bukti}</p>}
                <StatusPesananLive id={p.id} bolehBatal={["menunggu", "dibayar"].includes(p.status)} aktif={!["selesai", "batal"].includes(p.status)} />
            </div>
        </main>
    )
}
