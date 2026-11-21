"use client"

import { useCallback, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Loader2, Lock, Pencil, Printer, Unlock } from "lucide-react"
import { kopCetakAction } from "@/app/actions/cetak"
import { bukaKembaliPeriodeAction, finalkanPeriodeAction, simpanIsianSlipAction } from "@/app/actions/gaji"
import { useBolehAksi } from "@/components/layout/SidebarContext"
import { FormEdit, type FieldSpec } from "@/components/master/FormEdit"
import { ModalForm } from "@/components/ui/Modal"
import { MENU } from "@/config/akses"
import { bukaCetak } from "@/lib/cetak-klien"
import { cn } from "@/lib/utils"
import type { BarisGaji, RekapGaji } from "@kopkar/backend/src/gaji/penggajian.ts"
import { slipHtml } from "./slip-gaji"

const n = (v: number) => Math.round(v).toLocaleString("id-ID")
type KolomGaji = keyof BarisGaji["gaji"]
/** Kolom rekap seperti sheet Master Karyawan. */
const KOLOM: [KolomGaji, string][] = [["jmlUpah", "Jml. Upah"], ["hariPotong", "Hr Potong"], ["gaji", "Gaji"], ["hk", "HK"], ["transport", "Transport"],
    ["makan", "Makan"], ["uangLembur", "Lembur"], ["cadResiko", "Cad. Risiko"], ["thr", "THR"], ["tunjLain", "Tunj. Lain"], ["gajiKotor", "Gaji Kotor"],
    ["jht", "JHT"], ["jp", "JP"], ["kes", "BPJS Kes"], ["pph21", "PPh 21"], ["potKoperasi", "Pot. Kop"], ["potLain", "Lain-lain"], ["gajiBersih", "Gaji Bersih"]]
const BUKAN_UANG: KolomGaji[] = ["hariPotong", "hk"]

/** Rekap penggajian satu periode: isian manual per karyawan, final / buka kembali, slip cetak. */
export function TabelGaji({ rekap }: { rekap: RekapGaji }) {
    const boleh = useBolehAksi()
    const router = useRouter()
    const [edit, setEdit] = useState<BarisGaji | null>(null)
    const [pesan, setPesan] = useState<{ ok: boolean; teks: string } | null>(null)
    const [sibuk, mulai] = useTransition()
    const p = rekap.periode
    const selesai = useCallback(() => { router.refresh(); setTimeout(() => setEdit(null), 1000) }, [router])
    const total = (k: KolomGaji) => rekap.baris.reduce((t, b) => t + Number(b.gaji[k]), 0)
    const kosong = rekap.baris.filter((b) => b.hariKosong > 0)

    const jalan = (fn: () => Promise<{ ok: true; pesan: string } | { ok: false; error: string } | null>, tanya: string) => {
        if (!confirm(tanya)) return
        mulai(async () => {
            const r = await fn()
            if (r) setPesan(r.ok ? { ok: true, teks: r.pesan } : { ok: false, teks: r.error })
            router.refresh()
        })
    }
    const cetak = (daftar: BarisGaji[]) => mulai(async () => {
        const kop = await kopCetakAction()
        const galat = await bukaCetak({ judul: "Slip Pembayaran Gaji", subjudul: `Periode ${p.periode}`, orientasi: "lanskap", isi: slipHtml(daftar, p, kop?.kota ?? "", kop?.nama ?? "") }, kop)
        if (galat) alert(galat)
    })
    const fields: FieldSpec[] = [
        { name: "periode_id", label: "", hidden: true }, { name: "karyawan_id", label: "", hidden: true },
        { name: "cad_resiko", label: "Cadangan risiko", type: "uang" }, { name: "thr", label: "THR", type: "uang" }, { name: "tunj_lain", label: "Tunjangan lain", type: "uang" },
        { name: "pot_koperasi", label: "Potongan koperasi", type: "uang", hint: edit?.usulanKoperasi ? `Jadwal tagih pinjaman koperasi periode ini: Rp ${n(edit.usulanKoperasi)}` : "Cicilan pinjaman koperasi bila karyawan juga anggota." },
        { name: "pot_lain", label: "Potongan lain-lain", type: "uang" }, { name: "ket_pot_lain", label: "Keterangan potongan lain", hint: "Mis. cicilan laptop ke-4." },
    ]

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2 print:hidden">
                {rekap.baris.length > 0 && (
                    <button type="button" onClick={() => cetak(rekap.baris)} disabled={sibuk} className="inline-flex h-9 items-center gap-1.5 rounded-md border px-3 text-sm font-medium hover:bg-muted">
                        <Printer className="h-4 w-4" /> Cetak semua slip
                    </button>
                )}
                {!rekap.final && boleh([MENU.penggajian], "tambah") && (
                    <button type="button" disabled={sibuk || kosong.length > 0 || rekap.baris.length === 0}
                        onClick={() => jalan(() => finalkanPeriodeAction(Number(p.id)), `Finalkan periode ${p.periode}? Kehadiran, lembur, dan isian dikunci, dan hasil hitung disimpan untuk slip.`)}
                        className="inline-flex h-9 items-center gap-1.5 rounded-md bg-blue-600 px-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">
                        {sibuk ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />} Finalkan periode
                    </button>
                )}
                {rekap.final && boleh([MENU.penggajian], "hapus") && (
                    <button type="button" disabled={sibuk} onClick={() => jalan(() => bukaKembaliPeriodeAction(Number(p.id)), `Buka kembali periode ${p.periode}? Gaji dihitung ulang dari data terkini saat difinalkan lagi.`)}
                        className="inline-flex h-9 items-center gap-1.5 rounded-md border border-amber-400 px-3 text-sm font-medium text-amber-800 hover:bg-amber-50 dark:text-amber-300 dark:hover:bg-amber-500/10">
                        <Unlock className="h-4 w-4" /> Buka kembali
                    </button>
                )}
                <span className={cn("text-sm", rekap.final ? "font-semibold text-emerald-700 dark:text-emerald-400" : "text-muted-foreground")}>
                    {rekap.final ? "Final: angka di bawah adalah salinan saat difinalkan." : "Draf: dihitung ulang dari data terkini setiap kali halaman dibuka."}
                </span>
            </div>
            {kosong.length > 0 && !rekap.final && (
                <p role="alert" className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:bg-amber-500/10 dark:text-amber-300">
                    Kehadiran belum lengkap ({rekap.jumlahHari} hari): {kosong.map((b) => `${b.kode} ${b.hariKosong} hari kosong`).join(", ")}. Lengkapi di Absensi Karyawan sebelum finalkan.
                </p>
            )}
            {pesan && <p role={pesan.ok ? "status" : "alert"} className={cn("rounded-md border px-3 py-2 text-sm", pesan.ok ? "border-emerald-300 bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400" : "border-red-300 bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400")}>{pesan.teks}</p>}
            <div className="overflow-x-auto rounded-md border">
                <table className="w-full text-xs">
                    <thead className="bg-muted text-muted-foreground">
                        <tr>
                            <th className="sticky left-0 z-10 bg-muted px-2 py-2 text-left">Karyawan</th>
                            <th className="px-2 py-2 text-left">PTKP</th>
                            {KOLOM.map(([k, l]) => <th key={k} className={cn("px-2 py-2 text-right whitespace-nowrap", k === "gajiBersih" && "text-foreground")}>{l}</th>)}
                            <th className="px-2 py-2 print:hidden" />
                        </tr>
                    </thead>
                    <tbody>
                        {rekap.baris.length === 0 && <tr><td colSpan={KOLOM.length + 3} className="p-6 text-center text-sm text-muted-foreground">Belum ada karyawan pada periode ini.</td></tr>}
                        {rekap.baris.map((b) => (
                            <tr key={b.karyawanId} className="border-t">
                                <td className="sticky left-0 z-10 bg-background px-2 py-1.5 whitespace-nowrap"><span className="font-mono">{b.kode}</span> <span className="font-medium">{b.nama}</span></td>
                                <td className="px-2 py-1.5">{b.statusPtkp}</td>
                                {KOLOM.map(([k]) => (
                                    <td key={k} className={cn("px-2 py-1.5 text-right tabular-nums whitespace-nowrap", (k === "gajiKotor" || k === "gajiBersih") && "font-semibold")}>
                                        {BUKAN_UANG.includes(k) ? Number(b.gaji[k]) : n(Number(b.gaji[k]))}
                                    </td>
                                ))}
                                <td className="px-1 py-1 whitespace-nowrap print:hidden">
                                    {!rekap.final && boleh([MENU.penggajian], "ubah") && (
                                        <button type="button" title="Isian manual" onClick={() => setEdit(b)} className="rounded p-1 hover:bg-muted"><Pencil className="h-3.5 w-3.5" /></button>
                                    )}
                                    <button type="button" title="Cetak slip" onClick={() => cetak([b])} disabled={sibuk} className="rounded p-1 hover:bg-muted"><Printer className="h-3.5 w-3.5" /></button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                    {rekap.baris.length > 0 && (
                        <tfoot className="border-t-2 bg-muted/50 font-semibold">
                            <tr>
                                <td className="sticky left-0 z-10 bg-muted px-2 py-2" colSpan={2}>Jumlah ({rekap.baris.length} karyawan)</td>
                                {KOLOM.map(([k]) => <td key={k} className="px-2 py-2 text-right tabular-nums whitespace-nowrap">{BUKAN_UANG.includes(k) ? "" : n(total(k))}</td>)}
                                <td className="print:hidden" />
                            </tr>
                        </tfoot>
                    )}
                </table>
            </div>
            <p className="text-xs text-muted-foreground">Gaji = jml. upah - potongan tidak hadir (hari / pembagi). Gaji kotor = gaji + transport + makan + lembur + cadangan risiko + THR + tunjangan lain. Gaji bersih = gaji kotor - JHT - JP - BPJS Kes - PPh 21 - potongan koperasi - lain-lain. PPh 21 memakai tarif TER dari bruto (gaji kotor + premi BPJS yang dibayar koperasi).</p>
            <ModalForm open={edit !== null} onOpenChange={(b) => { if (!b) setEdit(null) }} judul={edit ? `Isian gaji ${edit.kode} ${edit.nama}` : ""} keterangan={`Periode ${p.periode}`}>
                {edit && <FormEdit key={edit.karyawanId} fields={fields} aksi={simpanIsianSlipAction} onSelesai={selesai} kolom={2}
                    nilai={{ periode_id: Number(p.id), karyawan_id: Number(edit.karyawanId), cad_resiko: edit.gaji.cadResiko, thr: edit.gaji.thr, tunj_lain: edit.gaji.tunjLain,
                        pot_koperasi: edit.gaji.potKoperasi, pot_lain: edit.gaji.potLain, ket_pot_lain: edit.ketPotLain }} />}
            </ModalForm>
        </div>
    )
}
