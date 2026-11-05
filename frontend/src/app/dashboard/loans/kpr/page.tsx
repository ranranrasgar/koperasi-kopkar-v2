import Link from "next/link"
import { Filter } from "lucide-react"
import { selectClass } from "@/components/transaksi/common"
import { HalamanLaporan } from "@/components/laporan/HalamanLaporan"
import { KopLaporan } from "@/components/laporan/Periode"
import { Input } from "@/components/ui/input"
import { PaginasiUrl } from "@/components/ui/PaginasiUrl"
import { daftarKpr, jenisKpr, tahunKpr } from "@/lib/queries/kpr"
import { formatAngka, formatTanggal, hariIni } from "@/lib/format"
import { ukuranHalaman } from "@/lib/halaman"
import { sp } from "@/lib/list"
import { wajibIzin } from "@/lib/operator"

export const dynamic = "force-dynamic"

const BULAN = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"]
const sel = `${selectClass} h-9 w-auto`

/** Daftar KPR: titipan angsuran ke bank, dari tabel kpr. Tanpa jasa, adm, dan provisi, jadi kolomnya berbeda dengan Daftar Pinjaman. */
export default async function DaftarKprPage(props: PageProps<"/dashboard/loans/kpr">) {
    await wajibIzin("/dashboard/loans/kpr") // layout tidak dijalankan ulang pada navigasi antarhalaman
    const s = await props.searchParams
    const filter = {
        keyword: sp(s, "keyword").trim().slice(0, 60), kredit: sp(s, "kredit"), status: sp(s, "status"), aktif: sp(s, "aktif") || "Y",
        bulan: parseInt(sp(s, "bulan"), 10) || 0, tahun: parseInt(sp(s, "tahun"), 10) || 0,
    }
    const [data, jenis, tahun] = await Promise.all([daftarKpr(filter), jenisKpr(), tahunKpr()])
    const pageSize = ukuranHalaman(sp(s, "pageSize"), 25)
    const totalPages = Math.max(1, Math.ceil(data.length / pageSize))
    const page = Math.min(totalPages, Math.max(1, parseInt(sp(s, "page") || "1", 10) || 1))
    const baris = data.slice((page - 1) * pageSize, page * pageSize)
    const total = data.reduce((t, k) => ({ pokok: t.pokok + k.rp_pinjaman_pokok, bayar: t.bayar + k.bayar, sisa: t.sisa + k.sisa }), { pokok: 0, bayar: 0, sisa: 0 })
    const status = (sisa: number) => sisa > 0 ? "Berjalan" : "Lunas"
    const th = "px-3 py-2 whitespace-nowrap", kanan = `${th} text-right`, tengah = `${th} text-center`

    return (
        <HalamanLaporan title="Daftar KPR" berhalaman
            description="KPR dibiayai bank; koperasi mencatat titipan angsurannya. Angsuran dibayar di Setoran Angsuran, tab KPR."
            filter={
                <form method="get" className="flex flex-wrap items-center gap-2 text-sm">
                    <Input name="keyword" defaultValue={filter.keyword} aria-label="Cari KPR" placeholder="No. KPR, kode, KPK, nama" className="h-9 w-56" />
                    <select name="kredit" aria-label="Jenis KPR" defaultValue={filter.kredit} className={sel}>
                        <option value="">Semua Jenis</option>
                        {jenis.map((j) => <option key={j.kode_kredit} value={j.kode_kredit}>{j.nama_kredit}</option>)}
                    </select>
                    <select name="bulan" aria-label="Bulan realisasi" defaultValue={filter.bulan || ""} className={sel}>
                        <option value="">Semua Bulan</option>
                        {BULAN.map((b, i) => <option key={b} value={i + 1}>{b}</option>)}
                    </select>
                    <select name="tahun" aria-label="Tahun realisasi" defaultValue={filter.tahun || ""} className={sel}>
                        <option value="">Semua Tahun</option>
                        {tahun.map((t) => <option key={t.tahun} value={t.tahun}>{t.tahun}</option>)}
                    </select>
                    <select name="status" aria-label="Status" defaultValue={filter.status} className={sel}>
                        <option value="">Semua Status</option>
                        <option value="berjalan">Berjalan</option>
                        <option value="lunas">Lunas</option>
                    </select>
                    <select name="aktif" aria-label="Status anggota" defaultValue={filter.aktif} className={sel}>
                        <option value="Y">Anggota Aktif</option>
                        <option value="T">Anggota Non-aktif</option>
                        <option value="S">Semua Anggota</option>
                    </select>
                    <button type="submit" className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary px-4 font-medium text-primary-foreground hover:bg-primary/90">
                        <Filter className="h-4 w-4" /> Terapkan
                    </button>
                </form>
            }
            ekspor={{
                nama: `daftar-kpr_${hariIni()}`, baris: [
                    ["No. KPR", "Realisasi", "Nama", "KPK", "Kode", "Jenis", "Pokok", "Lama", "Bayar", "Angsuran/Bulan", "Sudah Dibayar", "Sisa Pokok", "Status"],
                    ...data.map((k) => [k.no_pinjaman, k.tgl_pinjaman, k.nama, k.nik ?? "", k.kode_agt, k.nama_kredit ?? "", String(k.rp_pinjaman_pokok), String(k.lama_angsuran),
                        String(k.jml_cicilan), String(k.rp_angsuran_per_bulan), String(k.bayar), String(k.sisa), status(k.sisa)]),
                ],
            }}>
            <div className="space-y-3">
                <KopLaporan judul="Daftar KPR" periode={`Per ${formatTanggal(hariIni(), "long")}`} />
                <div className="rounded-md border">
                    <PaginasiUrl className="border-b" page={page} totalPages={totalPages} pageSize={pageSize} total={data.length} />
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-muted text-xs text-muted-foreground">
                                <tr>
                                    <th className={tengah}>No.</th><th className={`${th} text-left`}>Realisasi</th><th className={`${th} text-left`}>No. KPR</th>
                                    <th className={`${th} text-left`}>Anggota</th><th className={`${th} text-left`}>Jenis</th><th className={kanan}>Pokok</th>
                                    <th className={tengah}>Lama</th><th className={tengah}>Bayar</th><th className={tengah}>Sisa</th><th className={kanan}>Angsuran/Bulan</th>
                                    <th className={kanan}>Sudah Dibayar</th><th className={kanan}>Sisa Pokok</th><th className={tengah}>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {baris.length === 0 && <tr><td colSpan={13} className="p-8 text-center text-muted-foreground">Tidak ada KPR yang cocok dengan penyaringan.</td></tr>}
                                {baris.map((k, i) => (
                                    <tr key={k.no_pinjaman} className="border-t hover:bg-muted/30">
                                        <td className="px-3 py-1.5 text-center text-muted-foreground">{(page - 1) * pageSize + i + 1}</td>
                                        <td className="px-3 py-1.5 whitespace-nowrap">{formatTanggal(k.tgl_pinjaman)}</td>
                                        <td className="px-3 py-1.5 whitespace-nowrap font-mono text-xs">
                                            <Link href={`/dashboard/loans/kpr/${encodeURIComponent(k.no_pinjaman)}`} className="text-primary underline-offset-2 hover:underline">{k.no_pinjaman}</Link>
                                        </td>
                                        <td className="px-3 py-1.5">
                                            <span className="block font-medium">{k.nama}{!k.aktif && <span className="ml-2 text-xs font-normal text-muted-foreground">(non-aktif)</span>}</span>
                                            <span className="block text-xs text-muted-foreground">{k.nik ?? "-"} | {k.kode_agt}</span>
                                        </td>
                                        <td className="px-3 py-1.5 whitespace-nowrap">{k.nama_kredit ?? "-"}</td>
                                        <td className="px-3 py-1.5 text-right tabular-nums">{formatAngka(k.rp_pinjaman_pokok)}</td>
                                        <td className="px-3 py-1.5 text-center tabular-nums">{k.lama_angsuran}</td>
                                        <td className="px-3 py-1.5 text-center tabular-nums">{k.jml_cicilan}</td>
                                        <td className="px-3 py-1.5 text-center tabular-nums">{Math.max(0, k.lama_angsuran - k.jml_cicilan)}</td>
                                        <td className="px-3 py-1.5 text-right tabular-nums">{formatAngka(k.rp_angsuran_per_bulan)}</td>
                                        <td className="px-3 py-1.5 text-right tabular-nums">{formatAngka(k.bayar)}</td>
                                        <td className="px-3 py-1.5 text-right font-semibold tabular-nums">{formatAngka(k.sisa)}</td>
                                        <td className="px-3 py-1.5 text-center text-xs">{status(k.sisa)}</td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot className="border-t bg-muted font-semibold">
                                <tr>
                                    <td colSpan={5} className="px-3 py-2 text-right">Total seluruh data ({formatAngka(data.length)} KPR)</td>
                                    <td className="px-3 py-2 text-right tabular-nums">{formatAngka(total.pokok)}</td>
                                    <td colSpan={4} />
                                    <td className="px-3 py-2 text-right tabular-nums">{formatAngka(total.bayar)}</td>
                                    <td className="px-3 py-2 text-right tabular-nums">{formatAngka(total.sisa)}</td>
                                    <td />
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                    <PaginasiUrl className="border-t" page={page} totalPages={totalPages} pageSize={pageSize} total={data.length} />
                </div>
            </div>
        </HalamanLaporan>
    )
}
