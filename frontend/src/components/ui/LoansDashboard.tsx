"use client"

import React, { useState, useTransition } from "react"
import { useRouter, usePathname } from "next/navigation"
import type { PageData } from "@/config/modules"
import { formatRupiah, formatTanggal, formatAngka } from "@/lib/format"

interface Row {
    tgl_pinjaman: string; no_pinjaman: string; kode_agt: string; nik: string | null; nama: string
    rp_pinjaman_pokok: number; rp_provisi: number; temp_total_plafond: number; temp_total_jasa: number
    temp_angs_per_bulan: number; lama_angsuran: number; jml_cicilan: number; sisa_cicilan: number
    jml_tunggakan: number | null; bayar_pokok: number; bayar_bunga: number
}

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

    const statusLunasOptions = ["Semua", "Tunggakan", "Lunas", "Belum Lunas"]

    const go = (p: number) => {
        const q = new URLSearchParams({
            page: String(p), searchBy: String(searchBy), keyword, aktif: isAktif, grup: selectedGroupPinjaman,
            kredit: selectedKredit, bulan: String(filterBulan), tahun: filterTahun, lunas: String(statusLunas),
        })
        startTransition(() => router.push(`${pathname}?${q.toString()}`))
    }

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault()
        go(1)
    }

    const formatIDR = (val: number) => formatRupiah(val)

    const handlePrint = () => {
        window.print()
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
                            <div className="flex gap-2">
                                <select
                                    className="bg-surface-container-lowest border border-outline-variant rounded-xl px-3 py-2 text-xs text-on-surface focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all"
                                    value={isAktif}
                                    onChange={e => setIsAktif(e.target.value)}
                                >
                                    <option value="Y">Aktif</option>
                                    <option value="T">Non-Aktif</option>
                                </select>
                                <select
                                    className="w-full bg-surface-container-lowest border border-outline-variant rounded-xl px-3 py-2 text-xs text-on-surface focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all"
                                    value={statusLunas}
                                    onChange={e => setStatusLunas(Number(e.target.value))}
                                >
                                    {statusLunasOptions.map((opt, idx) => (
                                        <option key={idx} value={idx}>{opt}</option>
                                    ))}
                                </select>
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
                        <table className="w-full text-left font-body-md whitespace-nowrap">
                            <thead className="bg-surface-container-lowest border-b border-outline-variant text-on-surface-variant font-label-md text-xs">
                                <tr>
                                    <th className="p-3 font-medium">No</th>
                                    <th className="p-3 font-medium">Tgl Pinjaman</th>
                                    <th className="p-3 font-medium">No Pinjaman</th>
                                    <th className="p-3 font-medium">Nama</th>
                                    <th className="p-3 font-medium text-right">Plafond Pokok</th>
                                    <th className="p-3 font-medium text-right">Provisi</th>
                                    <th className="p-3 font-medium text-right">Total Plafond</th>
                                    <th className="p-3 font-medium text-right">Total Jasa</th>
                                    <th className="p-3 font-medium text-right">Angs Per Bulan</th>
                                    <th className="p-3 font-medium text-center">Lama<br/>Angs</th>
                                    <th className="p-3 font-medium text-center">Jml<br/>Cicilan</th>
                                    <th className="p-3 font-medium text-center">Sisa<br/>Cicilan</th>
                                    <th className="p-3 font-medium text-center">Tunggakan</th>
                                    <th className="p-3 font-medium text-right">Bayar Pokok</th>
                                    <th className="p-3 font-medium text-right">Bayar Bunga</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-outline-variant bg-surface">
                                {rows.length === 0 ? (
                                    <tr>
                                        <td colSpan={15} className="p-10 text-center text-on-surface-variant">
                                            <span className="material-symbols-outlined text-4xl mb-2 opacity-50 block">receipt_long</span>
                                            <p className="font-semibold text-sm">Tidak ada data pinjaman yang ditemukan.</p>
                                        </td>
                                    </tr>
                                ) : (
                                    rows.map((row, idx) => (
                                        <tr key={row.no_pinjaman} className="hover:bg-surface-container-lowest/50 transition-colors">
                                            <td className="p-4 align-top text-center text-sm text-on-surface-variant">{(page - 1) * pageSize + idx + 1}</td>
                                            <td className="p-4 align-top text-sm text-on-surface-variant">{formatTanggal(row.tgl_pinjaman)}</td>
                                            <td className="p-4 align-top font-bold text-sm text-on-surface font-mono">{row.no_pinjaman}</td>
                                            <td className="p-4 align-top font-bold text-sm text-on-surface">
                                                {row.nama}
                                                <div className="text-[11px] text-on-surface-variant mt-0.5 font-mono">{row.nik} | {row.kode_agt}</div>
                                            </td>
                                            
                                            <td className="p-4 align-top text-right font-mono text-sm text-on-surface-variant">{formatIDR(row.rp_pinjaman_pokok)}</td>
                                            <td className="p-4 align-top text-right font-mono text-sm text-on-surface-variant">{formatIDR(row.rp_provisi)}</td>
                                            <td className="p-4 align-top text-right font-mono text-sm font-bold text-on-surface">{formatIDR(row.temp_total_plafond)}</td>
                                            <td className="p-4 align-top text-right font-mono text-sm font-bold text-on-surface">{formatIDR(row.temp_total_jasa)}</td>
                                            <td className="p-4 align-top text-right font-mono text-sm font-bold text-primary">{formatIDR(row.temp_angs_per_bulan)}</td>
                                            
                                            <td className="p-4 align-top text-center text-sm text-on-surface">{row.lama_angsuran}</td>
                                            <td className="p-4 align-top text-center text-sm text-on-surface">{row.jml_cicilan}</td>
                                            <td className="p-4 align-top text-center text-sm font-bold text-error">{row.sisa_cicilan}</td>
                                            <td className="p-4 align-top text-center text-sm text-error font-semibold">{row.jml_tunggakan}</td>
                                            
                                            <td className="p-4 align-top text-right font-mono text-sm text-green-600 dark:text-green-400">{formatIDR(row.bayar_pokok)}</td>
                                            <td className="p-4 align-top text-right font-mono text-sm text-green-600 dark:text-green-400">{formatIDR(row.bayar_bunga)}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* Pagination */}
                {!isLoading && totalPages > 1 && (
                    <div className="flex items-center justify-between p-4 border-t border-outline-variant bg-surface-container-lowest print:hidden">
                        <span className="text-sm text-on-surface-variant">
                            Menampilkan <span className="font-medium text-on-surface">{(page - 1) * pageSize + 1}</span> - <span className="font-medium text-on-surface">{Math.min(page * pageSize, totalRecords)}</span> dari <span className="font-medium text-on-surface">{formatAngka(totalRecords)}</span> hasil
                        </span>
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
