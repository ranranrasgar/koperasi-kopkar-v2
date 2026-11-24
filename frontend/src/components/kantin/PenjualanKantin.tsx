"use client"

import { Fragment, useState, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ChevronDown, ChevronRight, Loader2, XCircle } from "lucide-react"
import { batalJualAction } from "@/app/actions/kantin"
import { useBolehAksi } from "@/components/layout/SidebarContext"
import { FormCard } from "@/components/transaksi/common"
import { Input } from "@/components/ui/input"
import { beriTahu, tanyaIsian } from "@/components/ui/Tanya"
import { MENU } from "@/config/akses"
import type { UnitOperator } from "@kopkar/backend/src/unit-usaha/kantin.ts"
import { cn } from "@/lib/utils"

export interface NotaKantin {
    id: number; no_bukti: string; tanggal: string; waktu: string; metode: string; status: string; subtotal: number; diskon: number; total: number
    total_pokok: number; bagi_hasil: number; uang_diterima: number | null; kembalian: number | null; opr: string; anggota: string | null; kode_agt: string | null
    alasan_batal: string | null; opr_batal: string | null; item: { nama: string; qty: number; harga: number; subtotal: number }[]
}
export interface RekapProduk { nama: string; qty: number; penjualan: number; hpp: number }

const rp = (n: number) => n.toLocaleString("id-ID", { maximumFractionDigits: 0 })

/** Daftar nota kantin per periode dengan ringkasan (penjualan, HPP, laba kotor atau bagi hasil) dan rekap per produk; batal nota. */
export function PenjualanKantin({ unit, dari, sampai, nota, rekap, lebihDariSatu }: {
    unit: UnitOperator; dari: string; sampai: string; nota: NotaKantin[]; rekap: RekapProduk[]; lebihDariSatu: boolean
}) {
    const router = useRouter()
    const boleh = useBolehAksi()
    const [buka, setBuka] = useState<number | null>(null)
    const [sibuk, mulai] = useTransition()
    const sah = nota.filter((n) => n.status !== "batal")
    const jumlah = (f: (n: NotaKantin) => number) => sah.reduce((s, n) => s + f(n), 0)
    const penjualan = jumlah((n) => n.total), hpp = jumlah((n) => n.total_pokok)
    const bolehBatal = unit.peran !== "kasir" && boleh([MENU.penjualanKantin], "hapus")
    const hariIni = new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Jakarta" })

    const batal = async (n: NotaKantin) => {
        const alasan = await tanyaIsian(`Nota ${n.no_bukti} Rp ${rp(n.total)}. Stok dikembalikan, jurnalnya dihapus${n.metode === "sukarela" ? ", dan saldo Simpanan Sukarela anggota kembali" : ""}. Tulis alasannya:`,
            { judul: "Batalkan nota", tombol: "Batalkan nota", bahaya: true, label: "Mis. salah input", minimal: 3 })
        if (alasan === null) return
        mulai(async () => {
            const h = await batalJualAction(unit.id, n.id, alasan)
            router.refresh()
            if (h) await beriTahu(h.ok ? h.pesan : h.error, { ok: h.ok })
        })
    }

    return (
        <div className="max-w-6xl space-y-6">
            <FormCard title={`Penjualan ${unit.nama}`} description={unit.model === "milik" ? "Nota kasir, penjualan, HPP, dan laba kotor." : "Nota kasir dan bagi hasil koperasi dari penjualan tenant."}>
                <form className="flex flex-wrap items-end gap-2 text-sm">
                    <input type="hidden" name="unit" value={unit.id} />
                    <label className="space-y-1"><span className="block text-xs text-muted-foreground">Dari</span><Input type="date" name="dari" defaultValue={dari} /></label>
                    <label className="space-y-1"><span className="block text-xs text-muted-foreground">Sampai</span><Input type="date" name="sampai" defaultValue={sampai} /></label>
                    <button type="submit" className="h-9 rounded-md bg-primary px-4 font-semibold text-primary-foreground">Tampilkan</button>
                    {lebihDariSatu && <Link href="?" className="ml-auto text-muted-foreground hover:text-foreground">Ganti kantin</Link>}
                </form>
                <div className="mt-4 grid gap-3 sm:grid-cols-4">
                    <Kotak label="Nota" nilai={`${sah.length}`} ket={nota.length - sah.length ? `${nota.length - sah.length} batal` : undefined} />
                    <Kotak label="Penjualan" nilai={`Rp ${rp(penjualan)}`} ket={jumlah((n) => n.diskon) ? `diskon Rp ${rp(jumlah((n) => n.diskon))}` : undefined} />
                    {unit.model === "milik" ? <>
                        <Kotak label="HPP" nilai={`Rp ${rp(hpp)}`} />
                        <Kotak label="Laba kotor" nilai={`Rp ${rp(penjualan - hpp)}`} ket={penjualan ? `${((penjualan - hpp) / penjualan * 100).toLocaleString("id-ID", { maximumFractionDigits: 1 })}% dari penjualan` : undefined} />
                    </> : <Kotak label="Bagi hasil koperasi" nilai={`Rp ${rp(jumlah((n) => n.bagi_hasil))}`} ket="dari penjualan tunai di kasir" />}
                </div>
            </FormCard>

            <FormCard title="Nota" description="Klik nota untuk melihat rinciannya. Pengelola membatalkan nota hari ini; nota lama hanya admin.">
                <div className="overflow-x-auto rounded-md border">
                    <table className="w-full text-sm">
                        <thead className="bg-muted text-xs text-muted-foreground"><tr>
                            <th className="w-6" /><th className="px-3 py-2 text-left">Nota</th><th className="px-3 py-2 text-left">Waktu</th><th className="px-3 py-2 text-left">Pembeli</th>
                            <th className="px-3 py-2 text-left">Bayar</th><th className="px-3 py-2 text-right">Total</th><th className="px-3 py-2 text-left">Kasir</th><th className="w-10" />
                        </tr></thead>
                        <tbody>
                            {nota.map((n) => (
                                <Fragment key={n.id}>
                                    <tr onClick={() => setBuka(buka === n.id ? null : n.id)} className={cn("cursor-pointer border-t hover:bg-muted/30", n.status === "batal" && "text-muted-foreground line-through")}>
                                        <td className="pl-2">{buka === n.id ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}</td>
                                        <td className="px-3 py-1.5 font-mono text-xs">{n.no_bukti}</td>
                                        <td className="px-3 py-1.5 text-xs">{new Date(n.waktu).toLocaleString("id-ID", { dateStyle: "short", timeStyle: "short" })}</td>
                                        <td className="px-3 py-1.5">{n.anggota ?? <span className="text-muted-foreground">Umum</span>}</td>
                                        <td className="px-3 py-1.5 capitalize">{n.metode}</td>
                                        <td className="px-3 py-1.5 text-right font-semibold tabular-nums">{rp(n.total)}</td>
                                        <td className="px-3 py-1.5 text-xs">{n.opr}</td>
                                        <td className="px-2 text-right">
                                            {bolehBatal && n.status !== "batal" && (unit.peran === "admin" || n.tanggal === hariIni) &&
                                                <button type="button" title="Batalkan nota" disabled={sibuk} onClick={(e) => { e.stopPropagation(); batal(n) }} className="rounded p-1 text-red-600 hover:bg-red-50 disabled:opacity-40">
                                                    {sibuk ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}</button>}
                                        </td>
                                    </tr>
                                    {buka === n.id && <tr className="bg-muted/20"><td /><td colSpan={7} className="px-3 py-2 text-xs">
                                        {(n.item ?? []).map((it, i) => <div key={i} className="flex max-w-[28rem] justify-between"><span>{it.nama} · {it.qty} x {rp(it.harga)}</span><span className="tabular-nums">{rp(it.subtotal)}</span></div>)}
                                        <div className="mt-1 max-w-[28rem] border-t pt-1">
                                            {n.diskon > 0 && <div className="flex justify-between"><span>Diskon</span><span>-{rp(n.diskon)}</span></div>}
                                            {n.uang_diterima !== null && <div className="flex justify-between"><span>Diterima / kembali</span><span>{rp(n.uang_diterima)} / {rp(n.kembalian ?? 0)}</span></div>}
                                            {unit.model === "milik" ? <div className="flex justify-between"><span>HPP</span><span>{rp(n.total_pokok)}</span></div> : <div className="flex justify-between"><span>Bagi hasil koperasi</span><span>{rp(n.bagi_hasil)}</span></div>}
                                        </div>
                                        {n.status === "batal" && <p className="mt-1 text-red-700">Dibatalkan {n.opr_batal}: {n.alasan_batal}</p>}
                                    </td></tr>}
                                </Fragment>
                            ))}
                            {nota.length === 0 && <tr><td colSpan={8} className="px-3 py-6 text-center text-muted-foreground">Tidak ada nota pada periode ini.</td></tr>}
                        </tbody>
                    </table>
                </div>
            </FormCard>

            <FormCard title="Rekap per produk" description="Produk terlaris pada periode ini (nota batal tidak dihitung).">
                <div className="overflow-x-auto rounded-md border">
                    <table className="w-full text-sm">
                        <thead className="bg-muted text-xs text-muted-foreground"><tr>
                            <th className="px-3 py-2 text-left">Produk</th><th className="px-3 py-2 text-right">Terjual</th><th className="px-3 py-2 text-right">Penjualan</th>
                            {unit.model === "milik" && <><th className="px-3 py-2 text-right">HPP</th><th className="px-3 py-2 text-right">Laba kotor</th></>}
                        </tr></thead>
                        <tbody>
                            {rekap.map((r) => (
                                <tr key={r.nama} className="border-t">
                                    <td className="px-3 py-1.5">{r.nama}</td><td className="px-3 py-1.5 text-right tabular-nums">{r.qty}</td><td className="px-3 py-1.5 text-right tabular-nums">{rp(r.penjualan)}</td>
                                    {unit.model === "milik" && <><td className="px-3 py-1.5 text-right tabular-nums">{rp(r.hpp)}</td><td className="px-3 py-1.5 text-right tabular-nums">{rp(r.penjualan - r.hpp)}</td></>}
                                </tr>
                            ))}
                            {rekap.length === 0 && <tr><td colSpan={5} className="px-3 py-5 text-center text-muted-foreground">Belum ada penjualan.</td></tr>}
                        </tbody>
                    </table>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">Penjualan per produk sebelum diskon nota.</p>
            </FormCard>
        </div>
    )
}

function Kotak({ label, nilai, ket }: { label: string; nilai: string; ket?: string }) {
    return (
        <div className="rounded-lg border px-4 py-3">
            <div className="text-xs text-muted-foreground">{label}</div>
            <div className="text-xl font-bold tabular-nums">{nilai}</div>
            {ket && <div className="text-xs text-muted-foreground">{ket}</div>}
        </div>
    )
}
