"use client"

import React, { useState, useTransition } from "react"
import { useRouter, usePathname, useSearchParams } from "next/navigation"
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react"
import type { PageData } from "@/config/modules"
import { formatRupiah, formatTanggal, formatAngka } from "@/lib/format"
import { Paginasi } from "@/components/ui/Paginasi"
import { PilihKolom } from "@/components/ui/PilihKolom"
import { useKolomTersimpan } from "@/lib/kolom-tersimpan"
import { MAKS_SEMUA } from "@/lib/halaman"
import { dataCetakAction } from "@/app/actions/cetak"
import { bukaCetak, tabelHtml, type KolomTabel } from "@/lib/cetak-klien"

interface Row {
    tgl_pinjaman: string; no_pinjaman: string; kode_agt: string; nik: string | null; nama: string; kode_kredit: string | null; opr: string | null
    rp_pinjaman_pokok: number; uang_muka: number; rp_provisi: number; rp_adm: number; temp_total_plafond: number; temp_total_jasa: number
    temp_angs_per_bulan: number; angs_pokok: number; angs_jasa: number; lama_angsuran: number; jml_cicilan: number; sisa_cicilan: number
    jml_tunggakan: number | null; bayar_pokok: number; bayar_bunga: number; total_bayar: number; sisa_pokok: number
    lunas: boolean; jatuh_tempo: string | null; sisa_buku: number
}

// Kolom sama dengan layar Data Pinjaman Anggota di aplikasi desktop. `teks` untuk dokumen cetak, `jumlah` bila kolom dijumlahkan di baris total.
interface Kolom { judul: string; urut: string; kanan?: boolean; tengah?: boolean; mono?: boolean; tebal?: boolean; warna?: string; teks: (r: Row) => string; jumlah?: (r: Row) => number }
const angka = (v: number | null | undefined) => formatAngka(Number(v ?? 0))
const KOLOM: Kolom[] = [
    { judul: "Realisasi", urut: "tgl_pinjaman", teks: (r) => formatTanggal(r.tgl_pinjaman) },
    { judul: "No.Pinjaman", urut: "no_pinjaman", mono: true, tebal: true, teks: (r) => r.no_pinjaman },
    { judul: "Nama Anggota", urut: "nama", tebal: true, teks: (r) => `${r.nama} (${r.nik ?? "-"} | ${r.kode_agt})` },
    { judul: "#Jns", urut: "kode_kredit", tengah: true, teks: (r) => r.kode_kredit ?? "" },
    { judul: "Pinjaman", urut: "rp_pinjaman_pokok", kanan: true, mono: true, teks: (r) => angka(r.rp_pinjaman_pokok), jumlah: (r) => r.rp_pinjaman_pokok },
    { judul: "Uang Muka", urut: "uang_muka", kanan: true, mono: true, teks: (r) => angka(r.uang_muka), jumlah: (r) => r.uang_muka },
    { judul: "Sisa Pinjaman", urut: "temp_total_plafond", kanan: true, mono: true, tebal: true, teks: (r) => angka(r.temp_total_plafond), jumlah: (r) => r.temp_total_plafond },
    { judul: "Lama", urut: "lama_angsuran", tengah: true, teks: (r) => String(r.lama_angsuran) },
    { judul: "Bayar", urut: "jml_cicilan", tengah: true, teks: (r) => String(r.jml_cicilan) },
    { judul: "Sisa", urut: "sisa_cicilan", tengah: true, warna: "text-error", teks: (r) => String(r.sisa_cicilan) },
    { judul: "Jasa", urut: "temp_total_jasa", kanan: true, mono: true, teks: (r) => angka(r.temp_total_jasa), jumlah: (r) => r.temp_total_jasa },
    { judul: "Adm", urut: "rp_adm", kanan: true, mono: true, teks: (r) => angka(r.rp_adm), jumlah: (r) => r.rp_adm },
    { judul: "Provisi", urut: "rp_provisi", kanan: true, mono: true, teks: (r) => angka(r.rp_provisi), jumlah: (r) => r.rp_provisi },
    { judul: "Angs Pokok", urut: "angs_pokok", kanan: true, mono: true, teks: (r) => angka(r.angs_pokok) },
    { judul: "Angs Jasa", urut: "angs_jasa", kanan: true, mono: true, teks: (r) => angka(r.angs_jasa) },
    { judul: "Angsuran", urut: "temp_angs_per_bulan", kanan: true, mono: true, tebal: true, warna: "text-primary", teks: (r) => angka(r.temp_angs_per_bulan) },
    { judul: "Byr Pokok", urut: "bayar_pokok", kanan: true, mono: true, warna: "text-green-600 dark:text-green-400", teks: (r) => angka(r.bayar_pokok), jumlah: (r) => r.bayar_pokok },
    { judul: "Byr Jasa", urut: "bayar_bunga", kanan: true, mono: true, warna: "text-green-600 dark:text-green-400", teks: (r) => angka(r.bayar_bunga), jumlah: (r) => r.bayar_bunga },
    { judul: "Total Bayar", urut: "total_bayar", kanan: true, mono: true, tebal: true, teks: (r) => angka(r.total_bayar), jumlah: (r) => r.total_bayar },
    // Lunas tetapi saldo buku masih ada (mis. diselesaikan lewat top-up): sisa 0 dengan tanda *.
    { judul: "Sisa Pokok", urut: "sisa_pokok", kanan: true, mono: true, tebal: true, teks: (r) => angka(r.sisa_pokok) + (r.lunas && Number(r.sisa_buku) > 100 ? " *" : ""), jumlah: (r) => r.sisa_pokok },
    { judul: "Tunggak", urut: "jml_tunggakan", tengah: true, tebal: true, warna: "text-error", teks: (r) => String(r.jml_tunggakan ?? 0) },
    { judul: "Jatuh Tempo", urut: "jatuh_tempo", teks: (r) => (r.jatuh_tempo ? formatTanggal(r.jatuh_tempo) : "") },
    { judul: "#Opr", urut: "opr", teks: (r) => r.opr ?? "" },
]

export interface LoansFilter {
    searchBy: number; keyword: string; aktif: string; grup: string; kredit: string; lunas: number
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
    const searchParams = useSearchParams()
    const urutKolom = searchParams.get("sortBy") ?? ""
    const urutArah = searchParams.get("sortOrder") === "desc" ? "desc" : "asc"
    // Kolom yang tampil diingat di browser; "Nama Anggota" dan "No.Pinjaman" selalu tampil karena penanda baris.
    const { terlihat, ubah: ubahKolom, aturUlang: aturUlangKolom, sudahDiubah: kolomDiubah } = useKolomTersimpan(pathname, Object.fromEntries(KOLOM.map((k) => [k.judul, true])))
    const kolomTampil = KOLOM.filter((k) => terlihat[k.judul] !== false || k.judul === "Nama Anggota" || k.judul === "No.Pinjaman")
    const [isLoading, startTransition] = useTransition()

    // Filter mengikuti form desktop; diterapkan ke URL saat tombol ditekan.
    const [searchBy, setSearchBy] = useState<number>(filter.searchBy)
    const [keyword, setKeyword] = useState<string>(filter.keyword)
    const [isAktif, setIsAktif] = useState<string>(filter.aktif)
    const [selectedGroupPinjaman, setSelectedGroupPinjaman] = useState<string>(filter.grup)
    const [selectedKredit, setSelectedKredit] = useState<string>(filter.kredit)
    const [statusLunas, setStatusLunas] = useState<number>(filter.lunas)

    const { page, pageSize, totalPages, total: totalRecords } = data
    const rows = data.items
    const jenisGrup = jenisKredit.filter((jk) => selectedGroupPinjaman === "All" || jk.group_pinjaman === selectedGroupPinjaman)

    const statusLunasOptions = ["Semua", "Tunggak", "Lunas", "Belum Lunas"]

    // baris: parameter pageSize; bawaan ukuran halaman saat ini, supaya pilihan baris ikut saat pindah halaman atau mencari.
    const go = (p: number, baris = pageSize >= MAKS_SEMUA ? "semua" : String(pageSize), urut: { kolom: string; arah: string } | null = null) => {
        const q = new URLSearchParams({
            page: String(p), searchBy: String(searchBy), keyword, aktif: isAktif, grup: selectedGroupPinjaman,
            kredit: selectedKredit, lunas: String(statusLunas), pageSize: baris,
        })
        // Urutan kolom dipertahankan saat pindah halaman, mengganti filter, atau mengubah jumlah baris.
        const kolom = urut ? urut.kolom : urutKolom, arah = urut ? urut.arah : urutArah
        if (kolom) { q.set("sortBy", kolom); q.set("sortOrder", arah) }
        startTransition(() => router.push(`${pathname}?${q.toString()}`))
    }

    // Klik judul kolom: urut naik; klik lagi: turun; klik ketiga: kembali ke urutan bawaan (terbaru dulu).
    const urutkan = (kunci: string) => {
        if (urutKolom !== kunci) go(1, undefined, { kolom: kunci, arah: "asc" })
        else if (urutArah === "asc") go(1, undefined, { kolom: kunci, arah: "desc" })
        else go(1, undefined, { kolom: "", arah: "asc" })
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
        const kolom: KolomTabel[] = kolomTampil.map((k) => ({ label: k.judul, kanan: k.kanan, tengah: k.tengah, mono: k.mono && !k.kanan }))
        const baris = items.map((x) => kolomTampil.map((k) => k.teks(x)))
        const jml = (k: Kolom) => formatAngka(items.reduce((t, x) => t + (k.jumlah ? Number(k.jumlah(x)) || 0 : 0), 0))
        const total = kolomTampil.map((k) => (k.judul === "Nama Anggota" ? `Total (${items.length.toLocaleString("id-ID")} pinjaman)` : k.jumlah ? jml(k) : ""))
        const subjudul = [`Grup ${filter.grup}`, filter.kredit !== "All" ? `Jenis ${filter.kredit}` : "",  filter.aktif === "T" ? "Anggota non-aktif" : filter.aktif === "S" ? "Semua anggota" : "Anggota aktif",
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

            {/* Filter: satu baris, rata kiri, seperti halaman daftar lainnya */}
            <div className="mb-lg rounded-lg border border-outline-variant bg-surface-container-lowest p-3 print:hidden">
                <form onSubmit={handleSearch} className="flex flex-wrap items-center gap-2">
                    <select className="h-9 border border-outline-variant rounded-md px-3 py-0 text-sm bg-background text-on-surface focus:outline-none focus:ring-1 focus:ring-primary" value={searchBy} onChange={(e) => setSearchBy(Number(e.target.value))} aria-label="Cari berdasarkan">
                        {searchByOptions.map((opt, idx) => (
                            <option key={idx} value={idx}>{opt}</option>
                        ))}
                    </select>
                    <div className="relative w-full md:w-[240px]">
                        <span className="material-symbols-outlined pointer-events-none absolute left-2.5 top-2 text-[18px] text-on-surface-variant">search</span>
                        <input type="search" className="w-full pl-9 pr-3 h-9 border border-outline-variant rounded-md px-3 py-0 text-sm bg-background text-on-surface focus:outline-none focus:ring-1 focus:ring-primary" placeholder="Kata kunci..." value={keyword} onChange={(e) => setKeyword(e.target.value)} />
                    </div>
                    <select className="h-9 border border-outline-variant rounded-md px-3 py-0 text-sm bg-background text-on-surface focus:outline-none focus:ring-1 focus:ring-primary" value={selectedGroupPinjaman} aria-label="Grup pinjaman"
                        onChange={(e) => { setSelectedGroupPinjaman(e.target.value); setSelectedKredit("All") }}>
                        <option value="All">Semua Grup</option>
                        <option value="KOPERASI">KOPERASI</option>
                        <option value="BANK / PIHAK LAIN">BANK / PIHAK LAIN</option>
                        <option value="KPR">KPR</option>
                    </select>
                    <select className="h-9 border border-outline-variant rounded-md px-3 py-0 text-sm bg-background text-on-surface focus:outline-none focus:ring-1 focus:ring-primary" value={selectedKredit} onChange={(e) => setSelectedKredit(e.target.value)} aria-label="Jenis kredit">
                        <option value="All">Semua Jenis</option>
                        {jenisGrup.map((jk) => (
                            <option key={jk.kode_kredit} value={jk.kode_kredit}>{jk.nama_kredit}</option>
                        ))}
                    </select>
                    <div className="flex h-9 items-center gap-3 rounded-md border border-outline-variant bg-background px-3" role="radiogroup" aria-label="Status pinjaman">
                        {statusLunasOptions.map((opt, idx) => (
                            <label key={idx} className="flex cursor-pointer items-center gap-1.5 text-sm text-on-surface">
                                <input type="radio" name="statusLunas" checked={statusLunas === idx} onChange={() => setStatusLunas(idx)} />
                                {opt}
                            </label>
                        ))}
                    </div>
                    <label className="flex h-9 cursor-pointer items-center gap-1.5 rounded-md border border-outline-variant bg-background px-3 text-sm text-on-surface">
                        <input type="checkbox" checked={isAktif === "Y"} onChange={(e) => setIsAktif(e.target.checked ? "Y" : "S")} />
                        Anggota aktif
                    </label>
                    <button type="submit" disabled={isLoading}
                        className="flex h-9 cursor-pointer items-center gap-1.5 rounded-md bg-primary px-4 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-90 disabled:opacity-70">
                        <span className={`material-symbols-outlined text-[18px] ${isLoading ? "animate-spin" : ""}`}>{isLoading ? "refresh" : "filter_alt"}</span>
                        Terapkan
                    </button>
                </form>
            </div>

            {/* Data Table */}
            <div className="bg-surface rounded-xl border border-outline-variant shadow-xs overflow-hidden print:hidden">
                <div className="flex items-center justify-end border-b border-outline-variant px-3 py-2 print:hidden">
                    <PilihKolom kolom={KOLOM.filter((k) => k.judul !== "Nama Anggota" && k.judul !== "No.Pinjaman").map((k) => ({ kunci: k.judul, label: k.judul }))}
                        terlihat={terlihat} onUbah={ubahKolom} onAturUlang={aturUlangKolom} sudahDiubah={kolomDiubah} />
                </div>
                {/* Halaman (atas) */}
                {!isLoading && <Paginasi page={page} totalPages={totalPages} pageSize={pageSize} total={totalRecords} onHalaman={(p) => go(p)} onBaris={(v) => go(1, v)}
                    className="border-b border-outline-variant bg-surface-container-lowest" />}
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
                                    {kolomTampil.map((k) => {
                                        const aktif = urutKolom === k.urut
                                        const Panah = aktif ? (urutArah === "asc" ? ArrowUp : ArrowDown) : ArrowUpDown
                                        return (
                                            <th key={k.judul} aria-sort={aktif ? (urutArah === "asc" ? "ascending" : "descending") : "none"}
                                                className={`p-3 font-medium ${k.kanan ? "text-right" : k.tengah ? "text-center" : ""}`}>
                                                <button type="button" onClick={() => urutkan(k.urut)} title={`Urutkan menurut ${k.judul}`}
                                                    className={`inline-flex items-center gap-1 hover:text-on-surface ${k.kanan ? "flex-row-reverse" : ""} ${aktif ? "text-on-surface font-semibold" : ""}`}>
                                                    {k.judul}
                                                    <Panah className={`h-3 w-3 ${aktif ? "" : "opacity-40"}`} />
                                                </button>
                                            </th>
                                        )
                                    })}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-outline-variant bg-surface">
                                {rows.length === 0 ? (
                                    <tr>
                                        <td colSpan={kolomTampil.length + 1} className="p-10 text-center text-on-surface-variant">
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
                                                {kolomTampil.map((k) => (
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
                            <span>* Lunas menurut cicilan, tetapi saldo buku pinjaman masih tersisa (diselesaikan di luar angsuran koperasi: top-up atau pelunasan langsung ke bank, dibereskan lewat jurnal balik)</span>
                        </div>
                        </>
                    )}
                </div>

                {/* Halaman (bawah) */}
                {!isLoading && <Paginasi page={page} totalPages={totalPages} pageSize={pageSize} total={totalRecords} onHalaman={(p) => go(p)} onBaris={(v) => go(1, v)}
                    className="border-t border-outline-variant bg-surface-container-lowest" />}
            </div>
        </div>
    )
}
