import type { Metadata } from "next"
import { PindaiTagihanKantin } from "@/components/PindaiTagihanKantin"
import { TombolBayarKantin } from "@/components/TombolBayarKantin"
import { LABEL_STATUS } from "@kopkar/backend/src/posting/kantin-pesanan.ts"
import { BarisTautan, batasBaris, Blok, JudulBagian, Kartu, Kepala, Kosong, MuatLagi } from "@/components/ui"
import { wajibAnggota } from "@/lib/anggota"
import { query } from "@/lib/db"
import { rupiah, tanggal } from "@/lib/format"

export const metadata: Metadata = { title: "Kantin" }

interface Nota {
    id: number; no_bukti: string; tanggal: string; waktu: string; kantin: string; metode: string; status: string; total: number; diskon: number
    item: { nama: string; qty: number; harga: number; subtotal: number }[]
}

const LANGKAH = 20

/** Kantin koperasi: bayar belanja dari Simpanan Sukarela lewat QR, dan riwayat belanja anggota (semua kantin). anggotaId dari sesi. */
export default async function KantinPage(props: PageProps<"/kantin">) {
    const a = await wajibAnggota()
    const batas = batasBaris((await props.searchParams).n, LANGKAH)
    await query(`UPDATE kantin_pesanan SET status = 'batal', alasan_batal = 'Tidak diambil sampai batas waktu', diubah_pada = now(), diubah_oleh = 'sistem'
        WHERE anggota_id = $1 AND metode = 'tunai' AND status IN ('menunggu', 'diproses', 'siap') AND batas_ambil < now()`, [a.anggotaId])
    const [[saldo], semua, kantin, berjalan] = await Promise.all([
        query<{ saldo: number }>(`SELECT COALESCE(SUM(s.rp_setoran - s.rp_pengambilan), 0) saldo FROM simpanan s JOIN jenis_simpanan j ON j.id = s.jenis_simpanan_id
            WHERE s.anggota_id = $1 AND j.kode_simpanan = '03'`, [a.anggotaId]),
        query<Nota>(`SELECT p.id, p.no_bukti, p.tanggal::text, p.dibuat_pada::text waktu, u.nama kantin, p.metode, p.status, p.total, p.diskon,
                (SELECT json_agg(json_build_object('nama', i.nama_produk, 'qty', i.qty, 'harga', i.harga_jual, 'subtotal', i.subtotal) ORDER BY i.id)
                   FROM kantin_penjualan_item i WHERE i.penjualan_id = p.id) item
           FROM kantin_penjualan p JOIN unit_usaha u ON u.id = p.unit_usaha_id
          WHERE p.anggota_id = $1 ORDER BY p.id DESC LIMIT $2`, [a.anggotaId, batas + 1]),
        query<{ id: number; nama: string; lokasi: string | null; buka: boolean; tas: number }>(`SELECT u.id, u.nama, u.lokasi,
                (u.jam_buka IS NULL OR u.jam_tutup IS NULL OR (now() AT TIME ZONE 'Asia/Jakarta')::time BETWEEN u.jam_buka AND u.jam_tutup) buka,
                (SELECT COALESCE(SUM(t.qty), 0) FROM kantin_tas t WHERE t.anggota_id = $1 AND t.unit_usaha_id = u.id) tas
           FROM unit_usaha u WHERE u.jenis = 'KANTIN' AND u.aktif AND u.tampil_anggota ORDER BY u.nama`, [a.anggotaId]),
        query<{ id: number; kantin: string; status: string; total: number }>(`SELECT p.id, u.nama kantin, p.status, p.total FROM kantin_pesanan p
            JOIN unit_usaha u ON u.id = p.unit_usaha_id WHERE p.anggota_id = $1 AND p.status NOT IN ('selesai', 'batal') ORDER BY p.id DESC`, [a.anggotaId]),
    ])
    const nota = semua.slice(0, batas)
    const bulanIni = nota.filter((n) => n.status !== "batal" && n.tanggal.slice(0, 7) === new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Jakarta" }).slice(0, 7))

    return (
        <main>
            <Kepala judul="Kantin" sub="Belanja di kantin koperasi" kembali="/beranda" />
            <div className="px-5">
                <Blok>
                    <p className="text-sm text-redup">Saldo Simpanan Sukarela</p>
                    <p className="angka mt-0.5 text-2xl font-bold">{rupiah(Number(saldo?.saldo ?? 0))}</p>
                    <p className="mb-4 mt-1 text-xs leading-relaxed text-redup">Belanja di kantin koperasi bisa dibayar dari saldo ini: tunjukkan QR Anda ke kasir, atau pindai QR yang ditampilkan kasir lalu setujui dengan PIN transaksi.</p>
                    <div className="space-y-2">
                        <TombolBayarKantin saldo={Number(saldo?.saldo ?? 0)} />
                        <PindaiTagihanKantin />
                    </div>
                </Blok>

                {berjalan.length > 0 && <>
                    <JudulBagian>Pesanan berjalan</JudulBagian>
                    <Kartu className="divide-y divide-garis">
                        {berjalan.map((p) => <BarisTautan key={p.id} href={`/kantin/pesanan/${p.id}`} judul={`Pesanan #${p.id} · ${p.kantin}`} sub={LABEL_STATUS[p.status] ?? p.status} nilai={rupiah(Number(p.total))} />)}
                    </Kartu>
                </>}

                {kantin.length > 0 && <>
                    <JudulBagian>Pesan dari aplikasi</JudulBagian>
                    <Kartu className="divide-y divide-garis">
                        {kantin.map((k) => <BarisTautan key={k.id} href={`/kantin/${k.id}`} judul={k.nama} sub={[k.buka ? "Buka" : "Tutup", k.lokasi].filter(Boolean).join(" · ")}
                            nilai={Number(k.tas) > 0 ? `${Number(k.tas)} di tas` : undefined} />)}
                    </Kartu>
                </>}

                <JudulBagian>Riwayat belanja</JudulBagian>
                {bulanIni.length > 0 && <p className="-mt-1 mb-2 text-xs text-redup">Bulan ini {bulanIni.length} nota, total <span className="angka font-semibold">{rupiah(bulanIni.reduce((t, n) => t + Number(n.total), 0))}</span></p>}
                {nota.length === 0 ? <Kartu><Kosong judul="Belum ada belanja" isi="Belanja di kantin yang mencantumkan nama Anda tampil di sini." /></Kartu> : (
                    <Kartu className="divide-y divide-garis">
                        {nota.map((n) => (
                            <details key={n.id} className="group px-5 py-3.5">
                                <summary className="flex cursor-pointer list-none items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <p className={`truncate font-medium ${n.status === "batal" ? "text-redup line-through" : ""}`}>{n.kantin}</p>
                                        <p className="text-xs text-redup">{tanggal(n.tanggal)} · {n.metode === "sukarela" ? "Simpanan Sukarela" : "Tunai"}{n.status === "batal" ? " · dibatalkan" : ""}</p>
                                    </div>
                                    <p className={`angka shrink-0 font-semibold ${n.status === "batal" ? "text-redup line-through" : ""}`}>{rupiah(Number(n.total))}</p>
                                </summary>
                                <div className="mt-2 space-y-1 text-sm text-redup">
                                    {(n.item ?? []).map((it, i) => (
                                        <div key={i} className="flex justify-between gap-3"><span>{it.nama} · {Number(it.qty)} x {rupiah(Number(it.harga))}</span><span className="angka">{rupiah(Number(it.subtotal))}</span></div>
                                    ))}
                                    {Number(n.diskon) > 0 && <div className="flex justify-between"><span>Diskon</span><span className="angka">-{rupiah(Number(n.diskon))}</span></div>}
                                    <p className="text-xs">{n.no_bukti}</p>
                                </div>
                            </details>
                        ))}
                    </Kartu>
                )}
                <MuatLagi href={`/kantin?n=${batas + LANGKAH}`} sisa={semua.length - nota.length} />
            </div>
        </main>
    )
}
