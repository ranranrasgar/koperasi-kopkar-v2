"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { ChevronRight, ChevronsDownUp, ChevronsUpDown, FileText, Folder, FolderOpen, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { formatAngka } from "@/lib/format"
import { cn } from "@/lib/utils"

export interface BarisPohon {
    id: number; parent_id: number | null; kode_perkiraan: string; nama_perkiraan: string; d_k: string; keterangan: string | null
    saldo: number // debit - kredit akun ini sendiri; induk dijumlahkan dari anaknya
}

interface Simpul extends BarisPohon { anak: Simpul[]; total: number; tingkat: number }

const KUNCI_SIMPAN = "kopkar.coa.terbuka"

/** Bangun pohon dari daftar datar (urut kode) dan jumlahkan saldo anak ke induk. */
function bangunPohon(baris: BarisPohon[]) {
    const peta = new Map<number, Simpul>(baris.map((b) => [b.id, { ...b, anak: [], total: 0, tingkat: 0 }]))
    const akar: Simpul[] = []
    for (const s of peta.values()) {
        const induk = s.parent_id === null ? undefined : peta.get(s.parent_id)
        if (induk) induk.anak.push(s)
        else akar.push(s)
    }
    const hitung = (s: Simpul, tingkat: number): number => {
        s.tingkat = tingkat
        s.total = s.saldo + s.anak.reduce((t, a) => t + hitung(a, tingkat + 1), 0)
        return s.total
    }
    for (const a of akar) hitung(a, 0)
    return { akar, peta }
}

export function PohonCoa({ baris, per, dari }: { baris: BarisPohon[]; per: string; dari: string }) {
    const { akar, peta } = useMemo(() => bangunPohon(baris), [baris])
    const semuaInduk = useMemo(() => [...peta.values()].filter((s) => s.anak.length > 0).map((s) => s.id), [peta])
    // Awal: tingkat pertama terbuka. Posisi buka/tutup diingat per browser.
    const [terbuka, setTerbuka] = useState<Set<number>>(() => new Set(akar.map((a) => a.id)))
    const [cari, setCari] = useState("")

    useEffect(() => {
        try {
            const simpan = localStorage.getItem(KUNCI_SIMPAN)
            if (simpan) setTerbuka(new Set((JSON.parse(simpan) as number[]).filter((id) => peta.has(id))))
        } catch { /* penyimpanan tidak tersedia: pakai bawaan */ }
    }, [peta])

    const ubah = (baru: Set<number>) => {
        setTerbuka(baru)
        try { localStorage.setItem(KUNCI_SIMPAN, JSON.stringify([...baru])) } catch { /* abaikan */ }
    }
    const balik = (id: number) => {
        const baru = new Set(terbuka)
        if (baru.has(id)) baru.delete(id)
        else baru.add(id)
        ubah(baru)
    }

    // Pencarian: tampilkan akun yang cocok beserta semua induknya (induk otomatis terbuka).
    const kata = cari.trim().toLowerCase()
    const cocok = useMemo(() => {
        if (!kata) return null
        const tampil = new Set<number>()
        for (const s of peta.values()) {
            if (!s.kode_perkiraan.toLowerCase().includes(kata) && !s.nama_perkiraan.toLowerCase().includes(kata)) continue
            for (let x: Simpul | undefined = s; x; x = x.parent_id === null ? undefined : peta.get(x.parent_id)) tampil.add(x.id)
        }
        return tampil
    }, [kata, peta])

    const baris_: Simpul[] = []
    const jalan = (daftar: Simpul[]) => {
        for (const s of daftar) {
            if (cocok && !cocok.has(s.id)) continue
            baris_.push(s)
            if (s.anak.length && (cocok ? true : terbuka.has(s.id))) jalan(s.anak)
        }
    }
    jalan(akar)

    const jumlahDetail = peta.size - semuaInduk.length
    // Saldo ditampilkan di sisi normal akun: debit untuk D, kredit untuk C.
    const tampilSaldo = (s: Simpul) => (s.d_k === "D" ? s.total : -s.total)

    return (
        <div className="rounded-lg border bg-background shadow-sm overflow-hidden">
            <div className="p-3 border-b flex flex-wrap items-center gap-2 print:hidden">
                <div className="relative w-full md:w-[280px]">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <input value={cari} onChange={(e) => setCari(e.target.value)} placeholder="Cari kode atau nama akun" aria-label="Cari akun"
                        className="w-full pl-9 pr-3 h-9 text-sm border rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500" />
                </div>
                <Button variant="outline" size="sm" className="h-9" onClick={() => ubah(new Set(semuaInduk))} disabled={!!cocok}>
                    <ChevronsUpDown className="h-4 w-4" /> Buka semua
                </Button>
                <Button variant="outline" size="sm" className="h-9" onClick={() => ubah(new Set())} disabled={!!cocok}>
                    <ChevronsDownUp className="h-4 w-4" /> Tutup semua
                </Button>
                <span className="ml-auto text-xs text-muted-foreground">
                    {cocok ? `${[...cocok].filter((id) => !peta.get(id)?.anak.length).length} akun cocok` : `${semuaInduk.length} induk, ${jumlahDetail} akun detail`}
                </span>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead className="bg-muted text-muted-foreground text-xs">
                        <tr>
                            <th className="px-3 py-2 text-left">Akun</th>
                            <th className="px-3 py-2 text-left w-36">Kode</th>
                            <th className="px-3 py-2 text-center w-14">D/K</th>
                            <th className="px-3 py-2 text-right w-44">Saldo</th>
                        </tr>
                    </thead>
                    <tbody>
                        {baris_.map((s) => {
                            const induk = s.anak.length > 0
                            const buka = cocok ? true : terbuka.has(s.id)
                            const saldo = tampilSaldo(s)
                            const IkonFolder = buka ? FolderOpen : Folder
                            return (
                                <tr key={s.id} onClick={induk ? () => balik(s.id) : undefined}
                                    className={cn("border-t", induk && "cursor-pointer hover:bg-muted/50", s.tingkat === 0 && "bg-muted/30")}>
                                    <td className="px-3 py-1.5">
                                        <div className="flex items-center gap-1.5" style={{ paddingLeft: s.tingkat * 22 }}>
                                            {induk ? (
                                                <button type="button" aria-expanded={buka} aria-label={`${buka ? "Tutup" : "Buka"} ${s.nama_perkiraan}`}
                                                    onClick={(e) => { e.stopPropagation(); balik(s.id) }} disabled={!!cocok}
                                                    className="rounded p-0.5 text-muted-foreground hover:text-foreground hover:bg-muted print:hidden">
                                                    <ChevronRight className={cn("h-4 w-4 transition-transform", buka && "rotate-90")} />
                                                </button>
                                            ) : <span className="w-5 shrink-0" />}
                                            {induk
                                                ? <IkonFolder className="h-4 w-4 shrink-0 text-amber-500 dark:text-amber-400" />
                                                : <FileText className="h-4 w-4 shrink-0 text-blue-500 dark:text-blue-400" />}
                                            {induk ? (
                                                <span className={cn(s.tingkat === 0 ? "font-bold uppercase" : "font-semibold")}>{s.nama_perkiraan}</span>
                                            ) : (
                                                <Link href={`/dashboard/accounting/ledger?akun=${encodeURIComponent(s.kode_perkiraan)}&dari=${dari}&sampai=${per}`}
                                                    className="hover:underline hover:text-blue-600 dark:hover:text-blue-400" title="Buka buku besar akun ini">
                                                    {s.nama_perkiraan}
                                                </Link>
                                            )}
                                            {induk && !buka && <span className="text-xs text-muted-foreground">({s.anak.length})</span>}
                                        </div>
                                    </td>
                                    <td className="px-3 py-1.5 font-mono text-xs text-muted-foreground">{s.kode_perkiraan}</td>
                                    <td className="px-3 py-1.5 text-center text-xs">{s.d_k}</td>
                                    <td className={cn("px-3 py-1.5 text-right tabular-nums", induk && "font-semibold", saldo < 0 && "text-red-600 dark:text-red-400")}>
                                        {Math.abs(s.total) >= 0.5 ? formatAngka(saldo) : <span className="text-muted-foreground">-</span>}
                                    </td>
                                </tr>
                            )
                        })}
                        {baris_.length === 0 && (
                            <tr><td colSpan={4} className="px-3 py-8 text-center text-muted-foreground">Tidak ada akun yang cocok dengan &quot;{cari}&quot;.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
