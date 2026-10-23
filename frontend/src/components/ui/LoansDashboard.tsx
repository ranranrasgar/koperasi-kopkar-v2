"use client"

import React, { useState, useTransition } from "react"
import { useRouter, usePathname } from "next/navigation"
import type { PageData } from "@/config/modules"
import { formatRupiah, formatTanggal, formatAngka } from "@/lib/format"
import { PilihBaris } from "@/components/ui/PilihBaris"
import { MAKS_SEMUA } from "@/lib/halaman"
import { dataCetakAction } from "@/app/actions/cetak"
import { bukaCetak, tabelHtml, type KolomTabel } from "@/lib/cetak-klien"

interface Row {
    tgl_pinjaman: string; no_pinjaman: string; kode_agt: string; nik: string | null; nama: string; kode_kredit: string | null; opr: string | null
    rp_pinjaman_pokok: number; uang_muka: number; rp_provisi: number; rp_adm: number; temp_total_plafond: number; temp_total_jasa: number
    temp_angs_per_bulan: number; angs_pokok: number; angs_jasa: number; lama_angsuran: number; jml_cicilan: number; sisa_cicilan: number
    jml_tunggakan: number | null; bayar_pokok: number; bayar_bunga: number; total_bayar: number; sisa_pokok: number
    lunas: boolean; jatuh_tempo: string | null
}

// Kolom sama dengan layar Data Pinjaman Anggota di aplikasi desktop. `teks` untuk dokumen cetak, `jumlah` bila kolom dijumlahkan di baris total.
interface Kolom { judul: string; kanan?: boolean; tengah?: boolean; mono?: boolean; tebal?: boolean; warna?: string; teks: (r: Row) => string; jumlah?: (r: Row) => number }
const angka = (v: number | null | undefined) => formatAngka(Number(v ?? 0))
const KOLOM: Kolom[] = [
    { judul: "Realisasi", teks: (r) => formatTanggal(r.tgl_pinjaman) },
    { judul: "No.Pinjaman", mono: true, tebal: true, teks: (r) => r.no_pinjaman },
    { judul: "Nama Anggota", tebal: true, teks: (r) => `${r.nama} (${r.nik ?? "-"} | ${r.kode_agt})` },
    { judul: "#Jns", tengah: true, teks: (r) => r.kode_kredit ?? "" },
    { judul: "Pinjaman", kanan: true, mono: true, teks: (r) => angka(r.rp_pinjaman_pokok), jumlah: (r) => r.rp_pinjaman_pokok },
    { judul: "Uang Muka", kanan: true, mono: true, teks: (r) => angka(r.uang_muka), jumlah: (r) => r.uang_muka },
    { judul: "Sisa Pinjaman", kanan: true, mono: true, tebal: true, teks: (r) => angka(r.temp_total_plafond), jumlah: (r) => r.temp_total_plafond },
    { judul: "Lama", tengah: true, teks: (r) => String(r.lama_angsuran) },
    { judul: "Bayar", tengah: true, teks: (r) => String(r.jml_cicilan) },
    { judul: "Sisa", tengah: true, warna: "text-error", teks: (r) => String(r.sisa_cicilan) },
    { judul: "Jasa", kanan: true, mono: true, teks: (r) => angka(r.temp_total_jasa), jumlah: (r) => r.temp_total_jasa },
    { judul: "Adm", kanan: true, mono: true, teks: (r) => angka(r.rp_adm), jumlah: (r) => r.rp_adm },
    { judul: "Provisi", kanan: true, mono: true, teks: (r) => angka(r.rp_provisi), jumlah: (r) => r.rp_provisi },
    { judul: "Angs Pokok", kanan: true, mono: true, teks: (r) => angka(r.angs_pokok) },
    { judul: "Angs Jasa", kanan: true, mono: true, teks: (r) => angka(r.angs_jasa) },
    { judul: "Angsuran", kanan: true, mono: true, tebal: true, warna: "text-primary", teks: (r) => angka(r.temp_angs_per_bulan) },
    { judul: "Byr Pokok", kanan: true, mono: true, warna: "text-green-600 dark:text-green-400", teks: (r) => angka(r.bayar_pokok), jumlah: (r) => r.bayar_pokok },
    { judul: "Byr Jasa", kanan: true, mono: true, warna: "text-green-600 dark:text-green-400", teks: (r) => angka(r.bayar_bunga), jumlah: (r) => r.bayar_bunga },
    { judul: "Total Bayar", kanan: true, mono: true, tebal: true, teks: (r) => angka(r.total_bayar), jumlah: (r) => r.total_bayar },
    { judul: "Sisa Pokok", kanan: true, mono: true, tebal: true, teks: (r) => angka(r.sisa_pokok), jumlah: (r) => r.sisa_pokok },
    { judul: "Tunggak", tengah: true, tebal: true, warna: "text-error", teks: (r) => String(r.jml_tunggakan ?? 0) },
    { judul: "Jatuh Tempo", teks: (r) => (r.jatuh_tempo ? formatTanggal(r.jatuh_tempo) : "") },
    { judul: "#Opr", teks: (r) => r.opr ?? "" },
]

export interface LoansFilter {
    searchBy: number; keyword: string; aktif: string; grup: string; kredit: string; bulan: number; tahun: string; lunas: number
}

interface LoansDashboardProps {
    data: PageData<Row>
    filter: LoansFilter
    jenisKredit: { kode_kredit: string; nama_kredit: string; group_pinjaman: string }[]
    searchByOptions: string[]
}

export function LoansDashboard({ data, filter, jenisKredit, searchByOptions }: LoansDashboardProps) {
    const router = useRouter()
    const pathname = usePathname()
    const [isLoading, startTransition] = useTransition()

    // Filter mengikuti form desktop; diterapkan ke URL saat tombol ditekan.
    const [searchBy, setSearchBy] = useState<number>(filter.searchBy)
    const [keyword, setKeyword] = useState<string>(filter.keyword)
    const [isAktif, setIsAktif] = useState<string>(filter.aktif)
    const [selectedGroupPinjaman, setSelectedGroupPinjaman] = useState<string>(filter.grup)
    const [selectedKredit, setSelectedKredit] = useState<string>(filter.kredit)
    const [filterBulan, setFilterBulan] = useState<number>(filter.bulan)
    const [filterTahun, setFilterTahun] = useState<string>(filter.tahun)
    const [statusLunas, setStatusLunas] = useState<number>(filter.lunas)

    const { page, pageSize, totalPages, total: totalRecords } = data
    const rows = data.items
    const jenisGrup = jenisKredit.filter((jk) => selectedGroupPinjaman === "All" || jk.group_pinjaman === selectedGroupPinjaman)

    const statusLunasOptions = ["Semua", "Tunggak", "Lunas", "Belum Lunas"]

    // baris: parameter pageSize; bawaan ukuran halaman saat ini, supaya pilihan baris ikut saat pindah halaman atau mencari.
    const go = (p: number, baris = pageSize >= MAKS_SEMUA ? "semua" : String(pageSize)) => {
        const q = new URLSearchParams({
            page: String(p), searchBy: String(searchBy), keyword, aktif: isAktif, grup: selectedGroupPinjaman,
            kredit: selectedKredit, bulan: String(filterBulan), tahun: filterTahun, lunas: String(statusLunas), pageSize: baris,
        })
        startTransition(() => router.push(`${pathname}?${q.toString()}`))
    }

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault()
        go(1)
    }

    const formatIDR = (val: number) => formatRupiah(val)

    // Cetak = dokumen sendiri berisi SEMUA pinjaman sesuai filter yang sedang diterapkan (bukan hanya halaman ini), dengan kop dan total.
    const handlePrint = async () => {
        const r = await dataCetakAction(pathname, Object.fromEntries(new URLSearchParams(window.location.search)))
        if ("error" in r) { alert(r.error); return }
        const items = r.items as unknown as typeof rows
        const kolom: KolomTabel[] = KOLOM.map((k) => ({ label: k.judul, kanan: k.kanan, tengah: k.tengah, mono: k.mono && !k.kanan }))
        const baris = items.map((x) => KOLOM.map((k) => k.teks(x)))
        const jml = (k: Kolom) => formatAngka(items.reduce((t, x) => t + (k.jumlah ? Number(k.jumlah(x)) || 0 : 0), 0))
        const total = KOLOM.map((k, i) => (i === 2 ? `Total (${items.length.toLocaleString("id-ID")} pinjaman)` : k.jumlah ? jml(k) : ""))
        const bulan = filter.bulan ? new Date(2000, filter.bulan - 1, 1).toLocaleString("id-ID", { month: "long" }) : "Semua bulan"
        const subjudul = [`Grup ${filter.grup}`, filter.kredit !== "All" ? `Jenis ${filter.kredit}` : "", `${bulan} ${filter.tahun}`, filter.aktif === "T" ? "Anggota non-aktif" : filter.aktif === "S" ? "Semua anggota" : "Anggota aktif",
            statusLunasOptions[filter.lunas] && filter.lunas ? `Status ${statusLunasOptions[filter.lunas]}` : "", filter.keyword ? `Pencarian ${(searchByOptions[filter.searchBy] ?? "")}: ${filter.keyword}` : ""].filter(Boolean).join(" · ")
        const galat = await bukaCetak({ judul: "Daftar Pinjaman", subjudul, isi: tabelHtml(kolom, baris, r.total, { total }) })
        if (galat) alert(galat)
    }

    return (
        <div>
            {/* Header */}
            <div className="mb-lg flex flex-col md:flex-row md:items-end justify-between gap-4 print:hidden">
                <div>
                    <h1 className="font-headline-lg text-headline-lg font-black text-on-background">Data Pinjaman Koperasi</h1>
                    <p className="font-label-md text-label-md text-on-surface-variant">Monitoring dan pencarian data pinjaman berdasarkan berbagai kriteria.</p>
                </div>
                <div className="flex items-center gap-2">
                    <button 
                        type="button" 
                        onClick={handlePrint}
                        className="flex items-center gap-2 bg-surface text-on-surface border border-outline-variant px-4 py-2 rounded-md font-label-md text-sm hover:bg-surface-variant transition-colors"
                    >
                        <span className="material-symbols-outlined text-[1.2rem]">print</span>
                        Cetak Laporan
                    </button>
                </div>
            </div>

            {/* Filter Toolbar */}
            <div className="bg-surface-container-lowest rounded-xl border border-outline-variant p-4 sm:p-5 shadow-xs mb-lg print:hidden">
                <div className="flex items-center gap-2 mb-4">
                    <span className="material-symbols-outlined text-primary text-[1.2rem]">filter_list</span>
                    <h3 className="font-headline-sm font-bold text-on-surface">Filter & Pencarian</h3>
                </div>
                
                <form onSubmit={handleSearch} className="flex flex-col gap-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {/* Search Group */}
                        <div className="flex flex-col gap-1.5">
                            <label className="font-label-md text-label-md font-semibold text-on-surface-variant flex items-center gap-1">
                                <span className="material-symbols-outlined text-[15px]">search</span> Pencarian
                            </label>
                            <div className="flex gap-2">
                                <select 
                                    className="bg-surface-container-lowest border border-outline-variant rounded-xl px-3 py-2 text-xs text-on-surface focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all max-w-[120px]"
                                    value={searchBy}
                                    onChange={e => setSearchBy(Number(e.target.value))}
                                >
                                    {searchByOptions.map((opt, idx) => (
                                        <option key={idx} value={idx}>{opt}</option>
                                    ))}
                                </select>
                                <input 
                                    type="text"
                                    className="w-full bg-surface-container-lowest border border-outline-variant rounded-xl px-3 py-2 text-xs text-on-surface focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all"
                                    placeholder="Kata kunci..." 
                                    value={keyword}
                                    onChange={e => setKeyword(e.target.value)}
                                />
                            </div>
                        </div>

                        {/* Grup Pinjaman & Jenis Kredit */}
                        <div className="flex flex-col gap-1.5">
                            <label className="font-label-md text-label-md font-semibold text-on-surface-variant flex items-center gap-1">
                                <span className="material-symbols-outlined text-[15px]">category</span> Grup & Jenis
                            </label>
                            <div className="flex gap-2">
                                <select
                                    className="w-full bg-surface-container-lowest border border-outline-variant rounded-xl px-3 py-2 text-xs text-on-surface focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all"
                                    value={selectedGroupPinjaman}
                                    onChange={(e) => { setSelectedGroupPinjaman(e.target.value); setSelectedKredit("All") }}
                                >
                                    <option value="All">Semua Grup...</option>
                                    <option value="KOPERASI">KOPERASI</option>
                                    <option value="BANK / PIHAK LAIN">BANK / PIHAK LAIN</option>
                                    <option value="KPR">KPR</option>
                                </select>
                                <select
                                    className="w-full bg-surface-container-lowest border border-outline-variant rounded-xl px-3 py-2 text-xs text-on-surface focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all"
                                    value={selectedKredit}
                                    onChange={(e) => setSelectedKredit(e.target.value)}
                                >
                                    <option value="All">Semua Jenis...</option>
                                    {jenisGrup.map((jk) => (
                                        <option key={jk.kode_kredit} value={jk.kode_kredit}>
                                            {jk.nama_kredit}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Periode */}
                        <div className="flex flex-col gap-1.5">
                            <label className="font-label-md text-label-md font-semibold text-on-surface-variant flex items-center gap-1">
                                <span className="material-symbols-outlined text-[15px]">calendar_today</span> Periode
                            </label>
                            <div className="flex gap-2">
                                <select 
                                    className="w-full bg-surface-container-lowest border border-outline-variant rounded-xl px-3 py-2 text-xs text-on-surface focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all"
                                    value={filterBulan}
                                    onChange={(e) => setFilterBulan(Number(e.target.value))}
                                >
                                    <option value="0">Tahunan</option>
                                    <option value="1">Januari</option>
                                    <option value="2">Februari</option>
                                    <option value="3">Maret</option>
                                    <option value="4">April</option>
                                    <option value="5">Mei</option>
                                    <option value="6">Juni</option>
                                    <option value="7">Juli</option>
                                    <option value="8">Agustus</option>
                                    <option value="9">September</option>
                                    <option value="10">Oktober</option>
                                    <option value="11">November</option>
                                    <option value="12">Desember</option>
                                </select>
                                <input 
                                    type="text"
                                    className="w-24 bg-surface-container-lowest border border-outline-variant rounded-xl px-3 py-2 text-xs text-on-surface focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all"
                                    placeholder="Tahun" 
                                    value={filterTahun}
                                    onChange={e => setFilterTahun(e.target.value)}
                                />
                            </div>
                        </div>

                        {/* Status Aktif & Status Lunas */}
                        <div className="flex flex-col gap-1.5">
                            <label className="font-label-md text-label-md font-semibold text-on-surface-variant flex items-center gap-1">
                                <span className="material-symbols-outlined text-[15px]">filter_list</span> Status
                            </label>
                            <div className="flex flex-col gap-2 pt-1">
                                <div className="flex flex-wrap items-center gap-x-4 gap-y-1" role="radiogroup" aria-label="Status pinjaman">
                                    {statusLunasOptions.map((opt, idx) => (
                                        <label key={idx} className="flex cursor-pointer items-center gap-1.5 text-xs text-on-surface">
                                            <input type="radio" name="statusLunas" checked={statusLunas === idx} onChange={() => setStatusLunas(idx)} />
                                            {opt}
                                        </label>
                                    ))}
                                </div>
                                <label className="flex cursor-pointer items-center gap-1.5 text-xs text-on-surface">
                                    <input type="checkbox" checked={isAktif === "Y"} onChange={(e) => setIsAktif(e.target.checked ? "Y" : "S")} />
                                    Anggota aktif
                                </label>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-outline-variant/50">
                        <span className="text-xs text-on-surface-variant">
                            Ditemukan <strong className="text-on-surface">{formatAngka(totalRecords)}</strong> data
                        </span>
                        <div className="flex items-center gap-2">
                            <button 
                                type="submit" 
                                disabled={isLoading} 
                                className="px-4 py-1.5 rounded-xl bg-primary text-white text-xs font-bold shadow-sm hover:opacity-90 transition-opacity flex items-center gap-1 cursor-pointer disabled:opacity-70"
                            >
                                <span className={`material-symbols-outlined text-[15px] ${isLoading ? "animate-spin" : ""}`}>
                                    {isLoading ? "refresh" : "filter_alt"}
                                </span>
                                Terapkan Filter
                            </button>
                        </div>
                    </div>
                </form>
            </div>

            {/* Data Table */}
            <div className="bg-surface rounded-xl border border-outline-variant shadow-xs overflow-hidden print:hidden">
                <div className="overflow-x-auto w-full">
                    {isLoading ? (
                        <div className="h-64 flex flex-col items-center justify-center text-on-surface-variant">
                            <span className="material-symbols-outlined text-4xl animate-spin mb-2">refresh</span>
                            <span className="font-label-md">Memuat data pinjaman...</span>
                        </div>
                    ) : (
                        <>
                        <table className="w-full text-left font-body-md whitespace-nowrap">
                            <thead className="bg-surface-container-lowest border-b border-outline-variant text-on-surface-variant font-label-md text-xs">
                                <tr>
                                    <th className="p-3 font-medium">No</th>
                                    {KOLOM.map((k) => (
                                        <th key={k.judul} className={`p-3 font-medium ${k.kanan ? "text-right" : k.tengah ? "text-center" : ""}`}>{k.judul}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-outline-variant bg-surface">
                                {rows.length === 0 ? (
                                    <tr>
                                        <td colSpan={KOLOM.length + 1} className="p-10 text-center text-on-surface-variant">
                                            <span className="material-symbols-outlined text-4xl mb-2 opacity-50 block">receipt_long</span>
                                            <p className="font-semibold text-sm">Tidak ada data pinjaman yang ditemukan.</p>
                                        </td>
                                    </tr>
                                ) : (
                                    rows.map((row, idx) => {
                                        // Warna baris seperti desktop: merah = sudah jatuh tempo (menunggak), biru = jatuh tempo hari ini, abu-abu = lunas.
                                        const hariIni = new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Jakarta" })
                                        const warnaBaris = row.lunas ? "bg-surface-variant/30 text-on-surface-variant"
                                            : (row.jml_tunggakan ?? 0) > 0 ? "bg-red-500/10"
                                            : row.jatuh_tempo && row.jatuh_tempo.slice(0, 10) === hariIni ? "bg-blue-500/10" : ""
                                        return (
                                            <tr key={row.no_pinjaman} className={`hover:bg-surface-container-lowest/50 transition-colors ${warnaBaris}`}>
                                                <td className="p-3 align-top text-center text-sm text-on-surface-variant">{(page - 1) * pageSize + idx + 1}</td>
                                                {KOLOM.map((k) => (
                                                    <td key={k.judul} className={`p-3 align-top text-sm ${k.kanan ? "text-right" : k.tengah ? "text-center" : ""} ${k.mono ? "font-mono" : ""} ${k.tebal ? "font-bold" : ""} ${k.warna ?? ""}`}>
                                                        {k.judul === "Nama Anggota"
                                                            ? <>{row.nama}<div className="text-[11px] font-normal text-on-surface-variant mt-0.5 font-mono">{row.nik ?? "-"} | {row.kode_agt}</div></>
                                                            : k.teks(row)}
                                                    </td>
                                                ))}
                                            </tr>
                                        )
                                    })
                                )}
                            </tbody>
                        </table>
                        <div className="flex flex-wrap items-center gap-x-5 gap-y-1 border-t border-outline-variant px-4 py-2 text-[11px] text-on-surface-variant">
                            <span className="flex items-center gap-1.5"><span className="size-3 rounded-sm bg-blue-500/40" />Jatuh tempo hari ini</span>
                            <span className="flex items-center gap-1.5"><span className="size-3 rounded-sm bg-red-500/40" />Sudah jatuh tempo (tunggak)</span>
                            <span className="flex items-center gap-1.5"><span className="size-3 rounded-sm bg-surface-variant" />Pinjaman lunas</span>
                        </div>
                        </>
                    )}
                </div>

                {/* Pagination */}
                {!isLoading && totalRecords > 0 && (
                    <div className="flex flex-wrap items-center justify-between gap-3 p-4 border-t border-outline-variant bg-surface-container-lowest print:hidden">
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                            <PilihBaris pageSize={pageSize} total={totalRecords} onUbah={(v) => go(1, v)} />
                            <span className="text-sm text-on-surface-variant">
                                Menampilkan <span className="font-medium text-on-surface">{(page - 1) * pageSize + 1}</span> - <span className="font-medium text-on-surface">{Math.min(page * pageSize, totalRecords)}</span> dari <span className="font-medium text-on-surface">{formatAngka(totalRecords)}</span> hasil
                            </span>
                        </div>
                        <div className="flex items-center gap-1">
                            <button
                                onClick={() => go(Math.max(1, page - 1))}
                                disabled={page === 1}
                                className="p-1 rounded-md text-on-surface hover:bg-surface-variant disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                            >
                                <span className="material-symbols-outlined">chevron_left</span>
                            </button>
                            <span className="text-sm font-medium text-on-surface px-2">
                                {page} / {totalPages}
                            </span>
                            <button
                                onClick={() => go(Math.min(totalPages, page + 1))}
                                disabled={page === totalPages}
                                className="p-1 rounded-md text-on-surface hover:bg-surface-variant disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                            >
                                <span className="material-symbols-outlined">chevron_right</span>
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
