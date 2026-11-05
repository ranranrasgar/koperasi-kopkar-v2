"use client"

import React, { useMemo, useState, useTransition } from "react"
import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react"
import { MemuatData } from "@/components/ui/MemuatData"
import { Paginasi } from "@/components/ui/Paginasi"
import { PilihKolom } from "@/components/ui/PilihKolom"
import { bukaCetak, tabelHtml, type KolomTabel } from "@/lib/cetak-klien"
import { unduhExcel } from "@/lib/ekspor-excel"
import { formatAngka, formatTanggal } from "@/lib/format"
import { MAKS_SEMUA, ukuranHalaman } from "@/lib/halaman"
import { useKolomTersimpan } from "@/lib/kolom-tersimpan"
import type { BarisKpr } from "@/lib/queries/kpr"

interface Kolom {
    judul: string; nilai: (r: BarisKpr) => string | number; kanan?: boolean; tengah?: boolean; mono?: boolean; tebal?: boolean; warna?: string
    teks?: (r: BarisKpr) => string; jumlah?: boolean
}
const BULAN = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"]
const HIJAU = "text-green-600 dark:text-green-400"
const status = (r: BarisKpr) => r.sisa > 0 ? "Berjalan" : "Lunas"
// Susunan dan gaya sama dengan Daftar Pinjaman. KPR tidak punya uang muka, adm, dan provisi; jasanya bernilai nol karena angsuran hanya titipan pokok.
const KOLOM: Kolom[] = [
    { judul: "Realisasi", nilai: (r) => r.tgl_pinjaman, teks: (r) => formatTanggal(r.tgl_pinjaman) },
    { judul: "No.KPR", nilai: (r) => r.no_pinjaman, mono: true, tebal: true },
    { judul: "Nama Anggota", nilai: (r) => r.nama, tebal: true, teks: (r) => `${r.nama} (${r.nik ?? "-"} | ${r.kode_agt})` },
    { judul: "#Jns", nilai: (r) => r.kode_kredit ?? "", tengah: true },
    { judul: "Jenis", nilai: (r) => r.nama_kredit ?? "" },
    { judul: "Pinjaman", nilai: (r) => r.rp_pinjaman_pokok, kanan: true, mono: true, jumlah: true },
    { judul: "Lama", nilai: (r) => r.lama_angsuran, tengah: true },
    { judul: "Bayar", nilai: (r) => r.jml_cicilan, tengah: true },
    { judul: "Sisa", nilai: (r) => Math.max(0, r.lama_angsuran - r.jml_cicilan), tengah: true, warna: "text-error" },
    { judul: "Jasa", nilai: (r) => r.jasa, kanan: true, mono: true, jumlah: true },
    { judul: "Angsuran", nilai: (r) => r.rp_angsuran_per_bulan, kanan: true, mono: true, tebal: true, warna: "text-primary" },
    { judul: "Byr Pokok", nilai: (r) => r.bayar, kanan: true, mono: true, warna: HIJAU, jumlah: true },
    { judul: "Byr Jasa", nilai: (r) => r.bayar_jasa, kanan: true, mono: true, warna: HIJAU, jumlah: true },
    { judul: "Total Bayar", nilai: (r) => r.bayar + r.bayar_jasa, kanan: true, mono: true, tebal: true, jumlah: true },
    { judul: "Sisa Pokok", nilai: (r) => r.sisa, kanan: true, mono: true, tebal: true, jumlah: true },
    { judul: "Status", nilai: status, tengah: true },
]
const teksKolom = (k: Kolom, r: BarisKpr) => {
    if (k.teks) return k.teks(r)
    const v = k.nilai(r)
    return typeof v === "number" ? formatAngka(v) : v
}
const kelasIsian = "h-9 border border-outline-variant rounded-md px-3 py-0 text-sm bg-background text-on-surface focus:outline-none focus:ring-1 focus:ring-primary"
const kelasAlat = "flex items-center gap-2 bg-surface text-on-surface border border-outline-variant px-4 py-2 rounded-md font-label-md text-sm hover:bg-surface-variant transition-colors"

export interface FilterTampilKpr { keyword: string; kredit: string; bulan: string; tahun: string; status: string; aktif: string }

/** Tampilan sama dengan Daftar Pinjaman. KPR sedikit, jadi semua baris hasil saringan dikirim ke sini lalu diurutkan dan dipotong per halaman di klien. */
export function DaftarKpr({ data, filter, jenis, daftarTahun }: {
    data: BarisKpr[]; filter: FilterTampilKpr; jenis: { kode_kredit: string; nama_kredit: string }[]; daftarTahun: number[]
}) {
    const router = useRouter(), pathname = usePathname(), searchParams = useSearchParams()
    const [isLoading, mulai] = useTransition()
    const [f, setF] = useState(filter)
    const ganti = (k: keyof FilterTampilKpr) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value })
    const { terlihat, ubah, aturUlang, sudahDiubah } = useKolomTersimpan(pathname, Object.fromEntries(KOLOM.map((k) => [k.judul, true])))
    const tetap = (k: Kolom) => k.judul === "Nama Anggota" || k.judul === "No.KPR"
    const kolomTampil = KOLOM.filter((k) => terlihat[k.judul] !== false || tetap(k))

    const urutKolom = searchParams.get("sortBy") ?? ""
    const urutArah = searchParams.get("sortOrder") === "desc" ? "desc" : "asc"
    const barisParam = searchParams.get("pageSize") ?? ""
    const pageSize = ukuranHalaman(barisParam, 25)
    const urut = useMemo(() => {
        const k = KOLOM.find((x) => x.judul === urutKolom)
        if (!k) return data
        const arah = urutArah === "asc" ? 1 : -1
        return [...data].sort((a, b) => {
            const x = k.nilai(a), y = k.nilai(b)
            return arah * (typeof x === "number" && typeof y === "number" ? x - y : String(x).localeCompare(String(y), "id"))
        })
    }, [data, urutKolom, urutArah])
    const totalPages = Math.max(1, Math.ceil(urut.length / pageSize))
    const page = Math.min(totalPages, Math.max(1, parseInt(searchParams.get("page") ?? "1", 10) || 1))
    const rows = urut.slice((page - 1) * pageSize, page * pageSize)

    const go = (p: number, baris = pageSize >= MAKS_SEMUA ? "semua" : String(pageSize), ur: { kolom: string; arah: string } | null = null) => {
        const q = new URLSearchParams({ page: String(p), pageSize: baris, ...f })
        const kolom = ur ? ur.kolom : urutKolom, arah = ur ? ur.arah : urutArah
        if (kolom) { q.set("sortBy", kolom); q.set("sortOrder", arah) }
        mulai(() => router.push(`${pathname}?${q.toString()}`))
    }
    const urutkan = (k: string) => {
        if (urutKolom !== k) go(1, undefined, { kolom: k, arah: "asc" })
        else if (urutArah === "asc") go(1, undefined, { kolom: k, arah: "desc" })
        else go(1, undefined, { kolom: "", arah: "asc" })
    }

    const awalTotal = kolomTampil.findIndex((k) => k.jumlah)
    const jumlahkan = (k: Kolom, isi: BarisKpr[]) => isi.reduce((t, r) => t + (Number(k.nilai(r)) || 0), 0)
    const BarisTotal = ({ label, isi }: { label: string; isi: BarisKpr[] }) => (
        <tr className="border-t border-outline-variant">
            <td colSpan={awalTotal + 1} className="px-3 py-2 text-right">{label}</td>
            {kolomTampil.slice(awalTotal).map((k) => (
                <td key={k.judul} className={`px-3 py-2 ${k.kanan ? "text-right font-mono" : ""}`}>{k.jumlah ? formatAngka(jumlahkan(k, isi)) : ""}</td>
            ))}
        </tr>
    )

    // Cetak dan Ekspor berisi semua KPR hasil saringan, bukan hanya halaman ini.
    const siapkan = () => {
        const kolom: KolomTabel[] = kolomTampil.map((k) => ({ label: k.judul, kanan: k.kanan, tengah: k.tengah, mono: k.mono && !k.kanan }))
        const baris = urut.map((r) => kolomTampil.map((k) => teksKolom(k, r)))
        const total = kolomTampil.map((k) => k.judul === "Nama Anggota" ? `Total (${urut.length.toLocaleString("id-ID")} KPR)` : k.jumlah ? formatAngka(jumlahkan(k, urut)) : "")
        const subjudul = [filter.kredit ? `Jenis ${filter.kredit}` : "", filter.aktif === "T" ? "Anggota non-aktif" : filter.aktif === "S" ? "Semua anggota" : "Anggota aktif",
            filter.status === "berjalan" ? "Status Berjalan" : filter.status === "lunas" ? "Status Lunas" : "", filter.bulan ? `Bulan ${BULAN[Number(filter.bulan) - 1]}` : "",
            filter.tahun ? `Tahun ${filter.tahun}` : "", filter.keyword ? `Kata kunci "${filter.keyword}"` : ""].filter(Boolean).join(" · ")
        return { kolom, baris, total, subjudul }
    }
    const cetak = async () => {
        const d = siapkan()
        const galat = await bukaCetak({ judul: "Daftar KPR", subjudul: d.subjudul, isi: tabelHtml(d.kolom, d.baris, urut.length, { total: d.total }) })
        if (galat) alert(galat)
    }
    const ekspor = async () => {
        const d = siapkan()
        const galat = await unduhExcel({ nama: "daftar-kpr", judul: "Daftar KPR", subjudul: d.subjudul, bagian: [{ kolom: d.kolom, baris: d.baris, total: d.total, nomor: true, jumlahTotal: urut.length }] })
        if (galat) alert(galat)
    }

    return (
        <div>
            <div className="mb-lg flex flex-col md:flex-row md:items-end justify-between gap-4 print:hidden">
                <div>
                    <h1 className="font-headline-lg text-headline-lg font-black text-on-background">Data KPR</h1>
                    <p className="font-label-md text-label-md text-on-surface-variant">KPR dibiayai bank; koperasi mencatat titipan angsurannya. Angsuran dibayar di Setoran Angsuran, tab KPR.</p>
                </div>
                <div className="flex items-center gap-2">
                    <button type="button" onClick={cetak} className={kelasAlat}><span className="material-symbols-outlined text-[1.2rem]">print</span>Cetak Laporan</button>
                    <button type="button" onClick={ekspor} className={kelasAlat}><span className="material-symbols-outlined text-[1.2rem]">download</span>Ekspor</button>
                </div>
            </div>

            <div className="bg-surface rounded-xl border border-outline-variant shadow-xs overflow-clip print:hidden">
                <div className="border-b border-outline-variant bg-surface-container-lowest p-3 print:hidden">
                    <form onSubmit={(e) => { e.preventDefault(); go(1) }} className="flex flex-wrap items-center gap-2">
                        <div className="relative w-full md:w-[240px]">
                            <span className="material-symbols-outlined pointer-events-none absolute left-2.5 top-2 text-[18px] text-on-surface-variant">search</span>
                            <input type="search" aria-label="Cari KPR" placeholder="No. KPR, kode, KPK, nama" value={f.keyword} onChange={ganti("keyword")} className={`${kelasIsian} w-full pl-9`} />
                        </div>
                        <select aria-label="Jenis KPR" value={f.kredit} onChange={ganti("kredit")} className={kelasIsian}>
                            <option value="">Semua Jenis</option>
                            {jenis.map((j) => <option key={j.kode_kredit} value={j.kode_kredit}>{j.nama_kredit}</option>)}
                        </select>
                        <select aria-label="Bulan realisasi" value={f.bulan} onChange={ganti("bulan")} className={kelasIsian}>
                            <option value="">Semua Bulan</option>
                            {BULAN.map((b, i) => <option key={b} value={i + 1}>{b}</option>)}
                        </select>
                        <select aria-label="Tahun realisasi" value={f.tahun} onChange={ganti("tahun")} className={kelasIsian}>
                            <option value="">Semua Tahun</option>
                            {daftarTahun.map((t) => <option key={t} value={t}>{t}</option>)}
                        </select>
                        <select aria-label="Status" value={f.status} onChange={ganti("status")} className={kelasIsian}>
                            <option value="">Semua Status</option>
                            <option value="berjalan">Berjalan</option>
                            <option value="lunas">Lunas</option>
                        </select>
                        <select aria-label="Status anggota" value={f.aktif} onChange={ganti("aktif")} className={kelasIsian}>
                            <option value="Y">Anggota Aktif</option>
                            <option value="T">Anggota Non-aktif</option>
                            <option value="S">Semua Anggota</option>
                        </select>
                        <button type="submit" disabled={isLoading} className="flex h-9 cursor-pointer items-center gap-1.5 rounded-md bg-primary px-4 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-90 disabled:opacity-70">
                            <span className={`material-symbols-outlined text-[18px] ${isLoading ? "animate-spin" : ""}`}>{isLoading ? "refresh" : "filter_alt"}</span>
                            Terapkan
                        </button>
                        <div className="ml-auto">
                            <PilihKolom kolom={KOLOM.filter((k) => !tetap(k)).map((k) => ({ kunci: k.judul, label: k.judul }))} terlihat={terlihat} onUbah={ubah} onAturUlang={aturUlang} sudahDiubah={sudahDiubah} />
                        </div>
                    </form>
                </div>
                <div className="relative min-h-[16rem] max-h-[calc(100dvh-20rem)] overflow-auto w-full">
                    <MemuatData aktif={isLoading} pesan="Memuat data KPR..." />
                    <table className="w-full text-left font-body-md whitespace-nowrap">
                        <thead className="sticky top-0 z-10 bg-muted border-b border-outline-variant text-on-surface-variant font-label-md text-xs">
                            <tr>
                                <th className="p-3 font-medium">No</th>
                                {kolomTampil.map((k) => {
                                    const aktif = urutKolom === k.judul
                                    const Panah = aktif ? (urutArah === "asc" ? ArrowUp : ArrowDown) : ArrowUpDown
                                    return (
                                        <th key={k.judul} aria-sort={aktif ? (urutArah === "asc" ? "ascending" : "descending") : "none"} className={`p-3 font-medium ${k.kanan ? "text-right" : k.tengah ? "text-center" : ""}`}>
                                            <button type="button" onClick={() => urutkan(k.judul)} title={`Urutkan menurut ${k.judul}`}
                                                className={`inline-flex items-center gap-1 hover:text-on-surface ${k.kanan ? "flex-row-reverse" : ""} ${aktif ? "text-on-surface font-semibold" : ""}`}>
                                                {k.judul}<Panah className={`h-3 w-3 ${aktif ? "" : "opacity-40"}`} />
                                            </button>
                                        </th>
                                    )
                                })}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-outline-variant bg-surface">
                            {rows.length === 0 ? (
                                <tr><td colSpan={kolomTampil.length + 1} className="p-10 text-center text-on-surface-variant">
                                    <span className="material-symbols-outlined text-4xl mb-2 opacity-50 block">home_work</span>
                                    <p className="font-semibold text-sm">Tidak ada data KPR yang ditemukan.</p>
                                </td></tr>
                            ) : rows.map((row, idx) => (
                                <tr key={row.no_pinjaman} className={`hover:bg-surface-container-lowest/50 transition-colors ${row.sisa > 0 ? "" : "bg-surface-variant/30 text-on-surface-variant"}`}>
                                    <td className="p-3 align-top text-center text-sm text-on-surface-variant">{(page - 1) * pageSize + idx + 1}</td>
                                    {kolomTampil.map((k) => (
                                        <td key={k.judul} className={`px-3 py-2 align-top text-sm ${k.kanan ? "text-right" : k.tengah ? "text-center" : ""} ${k.mono ? "font-mono" : ""} ${k.tebal ? "font-bold" : ""} ${k.warna ?? ""}`}>
                                            {k.judul === "No.KPR"
                                                ? <Link href={`/dashboard/loans/kpr/${encodeURIComponent(row.no_pinjaman)}`} title="Lihat jadwal angsuran dan riwayat pembayaran" className="text-primary underline-offset-2 hover:underline">{row.no_pinjaman}</Link>
                                                : k.judul === "Nama Anggota"
                                                ? <>{row.nama}<div className="text-[11px] font-normal text-on-surface-variant mt-0.5 font-mono">{row.nik ?? "-"} | {row.kode_agt}</div></>
                                                : teksKolom(k, row)}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                        {rows.length > 0 && awalTotal >= 0 && (
                            <tfoot className="sticky bottom-0 z-10 bg-muted font-bold border-t-2 border-outline-variant text-sm">
                                <BarisTotal label="Subtotal halaman ini" isi={rows} />
                                <BarisTotal label={`Total seluruh data (${urut.length.toLocaleString("id-ID")} KPR)`} isi={urut} />
                            </tfoot>
                        )}
                    </table>
                </div>
                <div className="flex flex-wrap items-center gap-x-5 gap-y-1 border-t border-outline-variant px-4 py-2 text-[11px] text-on-surface-variant">
                    <span className="flex items-center gap-1.5"><span className="size-3 rounded-sm bg-surface-variant" />KPR lunas</span>
                    <span>Sisa pokok minus berarti pokok dibayar berlebih; telusuri di Audit Data. Tunggakan KPR ada di Kredit Macet.</span>
                </div>
                <Paginasi page={page} totalPages={totalPages} pageSize={pageSize} total={urut.length} disabled={isLoading} onHalaman={(p) => go(p)} onBaris={(v) => go(1, v)}
                    className="sticky bottom-0 z-10 border-t border-outline-variant bg-surface-container-lowest/95 backdrop-blur" />
            </div>
        </div>
    )
}
