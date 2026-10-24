"use client"

import { useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { Download, Loader2, Printer, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { kopCetakAction } from "@/app/actions/cetak"
import { bukaCetak, esc } from "@/lib/cetak-klien"
import type { RekapPotongan } from "@/lib/queries/potongan-gaji"

const angka = (v: number) => Math.round(v).toLocaleString("id-ID")
const KOLOM: [keyof RekapPotongan, string][] = [["s_wajib", "S. Wajib"], ["s_sukarela", "S. Sukarela"], ["koperasi", "Koperasi"], ["bank", "Bank"],
    ["kpr", "Kpr"], ["adm", "Adm Bank"], ["total", "Jumlah"]]

/** Rekap Potongan Anggota, sama dengan cetakan desktop: tabel per anggota, baris jumlah, tempat-tanggal dan tanda tangan koperasi. */
function rekapHtml(rows: RekapPotongan[], kota: string, koperasi: string) {
    const jml = Object.fromEntries(KOLOM.map(([k]) => [k, rows.reduce((t, r) => t + (r[k] as number), 0)])) as Record<string, number>
    const tgl = new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Jakarta" }).format(new Date())
    const kepala = `<tr><th class="no">NO</th><th>NO. KPK</th><th>NAMA</th>${KOLOM.map(([, l]) => `<th class="kanan">${l}</th>`).join("")}<th>NO. REK</th><th>BANK</th></tr>`
    const isi = rows.map((r, i) => `<tr><td class="no">${i + 1}</td><td class="mono">${esc(r.nik)}</td><td style="white-space:nowrap">${esc(r.nama)}</td>${
        KOLOM.map(([k]) => `<td class="kanan">${angka(r[k] as number)}</td>`).join("")}<td class="mono">${esc(r.bank_no_rek)}</td><td>${esc(r.bank_nama)}</td></tr>`).join("")
    const total = `<tr><td colspan="3"><b>JUMLAH (${rows.length.toLocaleString("id-ID")} anggota)</b></td>${
        KOLOM.map(([k]) => `<td class="kanan"><b>${angka(jml[k])}</b></td>`).join("")}<td colspan="2"></td></tr>`
    const ttd = `<div style="display:flex;justify-content:flex-end;margin-top:22px;break-inside:avoid">
<div style="text-align:center;min-width:240px;font-size:11.5px">${esc(kota ? `${kota}, ${tgl}` : tgl)}<br><b>${esc(koperasi)}</b>
<div style="height:64px"></div><div style="border-top:1px solid #111;margin:0 20px"></div></div></div>`
    // Nama ditulis lengkap (dipakai mencocokkan rekening bank); muat di kertas lewat huruf kecil dan sel rapat.
    return `<style>.isi table.rekap{font-size:8.5px}.isi table.rekap th,.isi table.rekap td{padding:2px 4px}</style>
<table class="rekap"><thead>${kepala}</thead><tbody>${isi}</tbody><tfoot>${total}</tfoot></table>${ttd}`
}

/** Tombol Cetak (Rekap Potongan Anggota) dan Ekspor (file potongan gaji Excel) untuk satu periode. */
export function CetakEksporPotongan({ periode, judulPeriode, rows, staff }: { periode: string; judulPeriode: string; rows: RekapPotongan[]; staff: string }) {
    const [sibuk, setSibuk] = useState(false)
    const cetak = async () => {
        setSibuk(true)
        const kop = await kopCetakAction()
        const galat = await bukaCetak({ judul: "Rekap Potongan Anggota", orientasi: "lanskap",
            subjudul: `Periode ${judulPeriode}${staff ? ` · ${staff}` : ""}`, isi: rekapHtml(rows, kop?.kota ?? "", kop?.nama ?? "") }, kop)
        setSibuk(false)
        if (galat) alert(galat)
    }
    const unduh = `/dashboard/deductions/periode/${periode}/ekspor${staff ? `?staff=${encodeURIComponent(staff)}` : ""}`
    return (
        <div className="flex items-center gap-2 print:hidden">
            <Button onClick={cetak} variant="outline" size="sm" className="h-9 font-medium shadow-sm" disabled={sibuk || rows.length === 0}>
                {sibuk ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Printer className="mr-1.5 h-4 w-4" />} Cetak
            </Button>
            <Button asChild variant="outline" size="sm" className="h-9 font-medium shadow-sm" aria-disabled={rows.length === 0}>
                <a href={unduh} download><Download className="mr-1.5 h-4 w-4" /> Ekspor</a>
            </Button>
        </div>
    )
}

const kelasFilter = "h-9 border rounded-md px-3 py-0 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 bg-background text-foreground transition-all"

/** Bilah filter dengan gaya dan perilaku sama dengan tabel modul lain: cari (Enter), pilihan langsung berlaku. */
export function FilterPotongan() {
    const router = useRouter(), pathname = usePathname(), sp = useSearchParams()
    const [cari, setCari] = useState(sp.get("q") ?? "")
    const ubah = (k: string, v: string) => {
        const p = new URLSearchParams(sp.toString())
        if (v) p.set(k, v); else p.delete(k)
        router.push(`${pathname}${p.size ? `?${p}` : ""}`)
    }
    return (
        <div className="p-3 border-b flex flex-wrap items-center gap-2 bg-background print:hidden">
            <form className="relative w-full md:w-[260px]" onSubmit={(e) => { e.preventDefault(); ubah("q", cari.trim()) }}>
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <input type="search" value={cari} onChange={(e) => setCari(e.target.value)} placeholder="Cari kode, KPK, atau nama"
                    className="w-full pl-9 pr-3 h-9 text-sm border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-background transition-all" />
            </form>
            <select className={kelasFilter} value={sp.get("staff") ?? ""} title="Staff" onChange={(e) => ubah("staff", e.target.value)}>
                <option value="">Semua Staff</option><option value="Staff">Staff</option><option value="No Staff">No Staff</option>
            </select>
            <select className={kelasFilter} value={sp.get("tampil") ?? ""} title="Tampilkan" onChange={(e) => ubah("tampil", e.target.value)}>
                <option value="">Semua Anggota</option><option value="tidak">Hanya tidak dipotong</option><option value="diubah">Hanya yang diubah</option>
            </select>
        </div>
    )
}
