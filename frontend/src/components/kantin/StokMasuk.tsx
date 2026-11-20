"use client"

import { useState, useTransition } from "react"
import { AkunBox } from "@/components/bankbook/AkunBox"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { AlertCircle, CheckCircle2, Loader2, Plus, Trash2 } from "lucide-react"
import { penyesuaianStokAction, stokMasukAction } from "@/app/actions/kantin"
import { Field, FormCard, selectClass } from "@/components/transaksi/common"
import { Input } from "@/components/ui/input"
import { InputUang } from "@/components/ui/InputUang"
import type { UnitOperator } from "@kopkar/backend/src/unit-usaha/kantin.ts"
import { cn } from "@/lib/utils"

export interface ProdukStok { id: number; kode: string; nama: string; satuan: string; harga_beli: number; harga_pokok: number; stok: number; stok_minimal: number }
export interface MutasiStok { id: number; tanggal: string; waktu: string; jenis: string; no_bukti: string; nama: string; satuan: string; qty: number; harga: number; stok_setelah: number; opr: string; keterangan: string | null }

const rp = (n: number) => n.toLocaleString("id-ID", { maximumFractionDigits: 0 })
const hariIni = () => new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Jakarta" })
const JENIS: Record<string, string> = { masuk: "Masuk", jual: "Terjual", batal: "Batal jual", opname: "Opname", rusak: "Rusak" }

/** Catat barang datang (produk berstok) dan lihat kartu stok terakhir. Kantin milik koperasi menjurnal Dr Persediaan / Cr akun bayar. */
export function StokMasuk({ unit, produk, akun, mutasi, produkFilter, lebihDariSatu }: {
    unit: UnitOperator; produk: ProdukStok[]; akun: { kode_perkiraan: string; nama_perkiraan: string }[]; mutasi: MutasiStok[]; produkFilter: number | null; lebihDariSatu: boolean
}) {
    const tipis = produk.filter((p) => p.stok <= 0 || (p.stok_minimal > 0 && p.stok <= p.stok_minimal))
    const router = useRouter()
    const [tanggal, setTanggal] = useState(hariIni())
    const [akunBayar, setAkunBayar] = useState(akun[0]?.kode_perkiraan ?? "")
    const [ket, setKet] = useState("")
    const [baris, setBaris] = useState<{ produkId: number; qty: string; hargaBeli: string }[]>([])
    const [hasil, setHasil] = useState<{ ok: boolean; teks: string } | null>(null)
    const [sibuk, mulai] = useTransition()
    const pengelola = unit.peran !== "kasir"
    const total = baris.reduce((s, b) => s + Number(b.qty || 0) * Number(b.hargaBeli || 0), 0)
    const tambah = (id: number) => {
        const p = produk.find((x) => x.id === id)
        if (p && !baris.some((b) => b.produkId === id)) setBaris((b) => [...b, { produkId: id, qty: "", hargaBeli: String(p.harga_beli) }])
    }
    const ubah = (i: number, p: Partial<(typeof baris)[number]>) => setBaris((b) => b.map((x, j) => (j === i ? { ...x, ...p } : x)))
    const simpan = (e: React.FormEvent) => {
        e.preventDefault()
        setHasil(null)
        mulai(async () => {
            const h = await stokMasukAction({ unitId: unit.id, tanggal, akunBayar: unit.model === "milik" ? akunBayar : null, keterangan: ket, items: baris })
            setHasil(h.ok ? { ok: true, teks: h.pesan } : { ok: false, teks: h.error })
            if (h.ok) { setBaris([]); setKet(""); router.refresh() }
        })
    }
    return (
        <div className="max-w-6xl space-y-6">
            {tipis.length > 0 && (
                <div className="rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                    <b>Stok menipis atau habis:</b> {tipis.map((p) => `${p.nama} (${p.stok} ${p.satuan}${p.stok_minimal > 0 ? `, min. ${p.stok_minimal}` : ""})`).join(", ")}
                </div>
            )}
            <FormCard title={`Stok Masuk ${unit.nama}`} description={unit.model === "milik"
                ? "Barang datang untuk produk berstok. Stok bertambah, HPP rata-rata diperbarui, dan jurnal Dr Persediaan / Cr akun pembayaran dibuat. Bahan masakan (produk tanpa kelola stok) dicatat lewat Bank Book ke akun Persediaan kantin."
                : "Barang datang milik tenant: stok bertambah tanpa jurnal koperasi."}>
                {lebihDariSatu && <Link href="?" className="mb-3 inline-block text-sm text-muted-foreground hover:text-foreground">Ganti kantin</Link>}
                {!pengelola ? <p className="text-sm text-muted-foreground">Hanya pengelola kantin yang mencatat stok masuk.</p> : (
                    <form onSubmit={simpan} className="space-y-4">
                        <div className="grid gap-4 sm:grid-cols-3">
                            <Field label="Tanggal"><Input type="date" value={tanggal} onChange={(e) => setTanggal(e.target.value)} required /></Field>
                            {unit.model === "milik" && <Field label="Dibayar dari / dicatat ke" className="sm:col-span-2">
                                <AkunBox akun={akun} nilai={akunBayar} onUbah={setAkunBayar} dataF="akunBayar" name="akunBayar" label="Dibayar dari / dicatat ke" />
                            </Field>}
                            <Field label="Keterangan (pemasok, no. nota)" className="sm:col-span-3"><Input value={ket} onChange={(e) => setKet(e.target.value)} maxLength={255} /></Field>
                        </div>
                        <select className={selectClass} value="" onChange={(e) => tambah(Number(e.target.value))}>
                            <option value="">+ Tambah produk...</option>
                            {produk.filter((p) => !baris.some((b) => b.produkId === p.id)).map((p) => <option key={p.id} value={p.id}>{p.kode} {p.nama} (stok {p.stok} {p.satuan})</option>)}
                        </select>
                        {produk.length === 0 && <p className="text-xs text-muted-foreground">Belum ada produk aktif dengan kelola stok. Centang Kelola stok di Produk Kantin.</p>}
                        <div className="overflow-x-auto rounded-md border">
                            <table className="w-full text-sm">
                                <thead className="bg-muted text-xs text-muted-foreground"><tr>
                                    <th className="px-3 py-2 text-left">Produk</th><th className="px-3 py-2 text-right">Stok</th><th className="w-28 px-3 py-2 text-right">Jumlah</th>
                                    <th className="w-36 px-3 py-2 text-right">Harga beli / satuan</th><th className="px-3 py-2 text-right">Subtotal</th><th className="w-10" />
                                </tr></thead>
                                <tbody>
                                    {baris.map((b, i) => {
                                        const p = produk.find((x) => x.id === b.produkId)!
                                        return (
                                            <tr key={b.produkId} className="border-t">
                                                <td className="px-3 py-1.5">{p.nama} <span className="text-xs text-muted-foreground">/{p.satuan} · HPP {rp(p.harga_pokok)}</span></td>
                                                <td className="px-3 py-1.5 text-right tabular-nums">{p.stok}</td>
                                                <td className="px-3 py-1.5"><InputUang value={b.qty} onChange={(v) => ubah(i, { qty: v })} className="text-right" autoFocus /></td>
                                                <td className="px-3 py-1.5"><InputUang value={b.hargaBeli} onChange={(v) => ubah(i, { hargaBeli: v })} className="text-right" /></td>
                                                <td className="px-3 py-1.5 text-right tabular-nums">{rp(Number(b.qty || 0) * Number(b.hargaBeli || 0))}</td>
                                                <td className="px-2"><button type="button" onClick={() => setBaris((x) => x.filter((_, j) => j !== i))} className="rounded p-1 text-red-600 hover:bg-red-50"><Trash2 className="h-4 w-4" /></button></td>
                                            </tr>
                                        )
                                    })}
                                    {baris.length === 0 && <tr><td colSpan={6} className="px-3 py-5 text-center text-muted-foreground">Pilih produk yang datang.</td></tr>}
                                </tbody>
                                {baris.length > 0 && <tfoot><tr className="border-t font-semibold"><td colSpan={4} className="px-3 py-2 text-right">Total</td><td className="px-3 py-2 text-right tabular-nums">Rp {rp(total)}</td><td /></tr></tfoot>}
                            </table>
                        </div>
                        {hasil && <div role="alert" className={cn("flex items-start gap-2 rounded-md border px-3 py-2 text-sm", hasil.ok ? "border-emerald-300 bg-emerald-50 text-emerald-900" : "border-red-300 bg-red-50 text-red-900")}>
                            {hasil.ok ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /> : <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />} {hasil.teks}</div>}
                        <div className="flex justify-end">
                            <button type="submit" disabled={sibuk || !baris.length} className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-50">
                                {sibuk ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Simpan stok masuk
                            </button>
                        </div>
                    </form>
                )}
            </FormCard>

            {pengelola && produk.length > 0 && <Penyesuaian unit={unit} produk={produk} />}

            <FormCard title="Kartu stok" description="Mutasi terakhir (maks. 200): stok masuk, terjual, batal jual, opname, dan barang rusak. Pilih produk untuk kartu stok satu produk.">
                <div className="mb-3 flex flex-wrap gap-1.5 text-sm">
                    <Link href={`?unit=${unit.id}`} className={cn("rounded-full border px-3 py-1", !produkFilter ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted")}>Semua produk</Link>
                    {produk.map((p) => <Link key={p.id} href={`?unit=${unit.id}&produk=${p.id}`} className={cn("rounded-full border px-3 py-1", produkFilter === p.id ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted")}>{p.nama}</Link>)}
                </div>
                <div className="overflow-x-auto rounded-md border">
                    <table className="w-full text-sm">
                        <thead className="bg-muted text-xs text-muted-foreground"><tr>
                            <th className="px-3 py-2 text-left">Waktu</th><th className="px-3 py-2 text-left">Bukti</th><th className="px-3 py-2 text-left">Produk</th><th className="px-3 py-2 text-left">Jenis</th>
                            <th className="px-3 py-2 text-right">Jumlah</th><th className="px-3 py-2 text-right">Harga</th><th className="px-3 py-2 text-right">Stok</th><th className="px-3 py-2 text-left">Oleh</th>
                        </tr></thead>
                        <tbody>
                            {mutasi.map((m) => (
                                <tr key={m.id} className="border-t">
                                    <td className="px-3 py-1.5 text-xs">{new Date(m.waktu).toLocaleString("id-ID", { dateStyle: "short", timeStyle: "short" })}</td>
                                    <td className="px-3 py-1.5 font-mono text-xs">{m.no_bukti}</td>
                                    <td className="px-3 py-1.5">{m.nama}</td>
                                    <td className="px-3 py-1.5">{JENIS[m.jenis] ?? m.jenis}{m.keterangan && <div className="text-xs text-muted-foreground">{m.keterangan}</div>}</td>
                                    <td className={cn("px-3 py-1.5 text-right tabular-nums", m.qty < 0 ? "text-red-700" : "text-emerald-700")}>{m.qty > 0 ? "+" : ""}{m.qty}</td>
                                    <td className="px-3 py-1.5 text-right tabular-nums">{rp(m.harga)}</td>
                                    <td className="px-3 py-1.5 text-right tabular-nums">{m.stok_setelah}</td>
                                    <td className="px-3 py-1.5 text-xs">{m.opr}</td>
                                </tr>
                            ))}
                            {mutasi.length === 0 && <tr><td colSpan={8} className="px-3 py-5 text-center text-muted-foreground">Belum ada mutasi stok.</td></tr>}
                        </tbody>
                    </table>
                </div>
            </FormCard>
        </div>
    )
}

/** Opname (stok fisik hasil hitung) atau barang rusak (jumlah dibuang). Nilainya dihitung dengan HPP rata-rata saat ini. */
function Penyesuaian({ unit, produk }: { unit: UnitOperator; produk: ProdukStok[] }) {
    const router = useRouter()
    const [jenis, setJenis] = useState<"opname" | "rusak">("opname")
    const [tanggal, setTanggal] = useState(hariIni())
    const [ket, setKet] = useState("")
    const [isi, setIsi] = useState<Record<number, string>>({})
    const [hasil, setHasil] = useState<{ ok: boolean; teks: string } | null>(null)
    const [sibuk, mulai] = useTransition()
    const items = Object.entries(isi).filter(([, v]) => v !== "").map(([id, qty]) => ({ produkId: Number(id), qty }))
    const nilai = (p: ProdukStok) => {
        const v = isi[p.id]
        if (v === undefined || v === "") return 0
        return (jenis === "opname" ? Number(v) - p.stok : -Number(v)) * p.harga_pokok
    }
    const totalNilai = produk.reduce((s, p) => s + nilai(p), 0)
    const simpan = (e: React.FormEvent) => {
        e.preventDefault()
        setHasil(null)
        mulai(async () => {
            const h = await penyesuaianStokAction({ unitId: unit.id, tanggal, jenis, keterangan: ket, items })
            setHasil(h.ok ? { ok: true, teks: h.pesan } : { ok: false, teks: h.error })
            if (h.ok) { setIsi({}); setKet(""); router.refresh() }
        })
    }
    return (
        <FormCard title="Opname dan barang rusak" description={jenis === "opname"
            ? "Isi stok fisik hasil hitung untuk produk yang dihitung; produk yang dikosongkan tidak berubah. Selisihnya dicatat senilai HPP rata-rata."
            : "Isi jumlah barang yang dibuang karena rusak, kedaluwarsa, atau hilang. Nilainya dicatat sebagai beban senilai HPP rata-rata."}>
            <form onSubmit={simpan} className="space-y-4">
                <div className="flex gap-1 border-b">
                    {(["opname", "rusak"] as const).map((j) => (
                        <button key={j} type="button" onClick={() => { setJenis(j); setIsi({}) }}
                            className={cn("-mb-px border-b-2 px-4 py-2 text-sm", j === jenis ? "border-primary font-semibold" : "border-transparent text-muted-foreground")}>{j === "opname" ? "Stok opname" : "Barang rusak"}</button>
                    ))}
                </div>
                <div className="grid gap-4 sm:grid-cols-3">
                    <Field label="Tanggal"><Input type="date" value={tanggal} onChange={(e) => setTanggal(e.target.value)} required /></Field>
                    <Field label={jenis === "rusak" ? "Keterangan (wajib)" : "Keterangan"} className="sm:col-span-2"><Input value={ket} onChange={(e) => setKet(e.target.value)} maxLength={255} required={jenis === "rusak"} placeholder={jenis === "rusak" ? "Mis. kedaluwarsa, kemasan pecah" : "Mis. opname akhir bulan"} /></Field>
                </div>
                <div className="overflow-x-auto rounded-md border">
                    <table className="w-full text-sm">
                        <thead className="bg-muted text-xs text-muted-foreground"><tr>
                            <th className="px-3 py-2 text-left">Produk</th><th className="px-3 py-2 text-right">Stok sistem</th>
                            <th className="w-36 px-3 py-2 text-right">{jenis === "opname" ? "Stok fisik" : "Jumlah dibuang"}</th>
                            <th className="px-3 py-2 text-right">Selisih</th><th className="px-3 py-2 text-right">Nilai (HPP)</th>
                        </tr></thead>
                        <tbody>
                            {produk.map((p) => {
                                const v = isi[p.id] ?? ""
                                const sel = v === "" ? null : jenis === "opname" ? Number(v) - p.stok : -Number(v)
                                return (
                                    <tr key={p.id} className="border-t">
                                        <td className="px-3 py-1.5">{p.nama} <span className="text-xs text-muted-foreground">/{p.satuan}</span></td>
                                        <td className="px-3 py-1.5 text-right tabular-nums">{p.stok}</td>
                                        <td className="px-3 py-1.5"><InputUang value={v} onChange={(x) => setIsi((o) => ({ ...o, [p.id]: x }))} className="text-right" /></td>
                                        <td className={cn("px-3 py-1.5 text-right tabular-nums", sel !== null && sel < 0 && "text-red-700", sel !== null && sel > 0 && "text-emerald-700")}>{sel === null ? "" : `${sel > 0 ? "+" : ""}${sel}`}</td>
                                        <td className="px-3 py-1.5 text-right tabular-nums">{sel === null ? "" : rp(nilai(p))}</td>
                                    </tr>
                                )
                            })}
                        </tbody>
                        {items.length > 0 && <tfoot><tr className="border-t font-semibold"><td colSpan={4} className="px-3 py-2 text-right">Total nilai</td><td className="px-3 py-2 text-right tabular-nums">Rp {rp(totalNilai)}</td></tr></tfoot>}
                    </table>
                </div>
                {hasil && <div role="alert" className={cn("flex items-start gap-2 rounded-md border px-3 py-2 text-sm", hasil.ok ? "border-emerald-300 bg-emerald-50 text-emerald-900" : "border-red-300 bg-red-50 text-red-900")}>
                    {hasil.ok ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /> : <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />} {hasil.teks}</div>}
                <div className="flex justify-end">
                    <button type="submit" disabled={sibuk || !items.length} className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-50">
                        {sibuk && <Loader2 className="h-4 w-4 animate-spin" />} Simpan {jenis === "opname" ? "opname" : "barang rusak"}
                    </button>
                </div>
            </form>
        </FormCard>
    )
}
