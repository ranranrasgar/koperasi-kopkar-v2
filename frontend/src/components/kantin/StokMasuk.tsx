"use client"

import { Fragment, useState, useTransition } from "react"
import { AkunBox } from "@/components/bankbook/AkunBox"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { AlertCircle, CheckCircle2, ChevronDown, ChevronRight, Loader2, Pencil, Plus, Trash2 } from "lucide-react"
import { hapusStokMasukAction, penyesuaianStokAction, stokMasukAction, ubahStokMasukAction } from "@/app/actions/kantin"
import { ModalForm } from "@/components/ui/Modal"
import { useBolehAksi } from "@/components/layout/SidebarContext"
import { PaginasiUrl } from "@/components/ui/PaginasiUrl"
import { MENU } from "@/config/akses"
import { Field, FormCard, selectClass } from "@/components/transaksi/common"
import { Input } from "@/components/ui/input"
import { InputUang } from "@/components/ui/InputUang"
import type { UnitOperator } from "@kopkar/backend/src/unit-usaha/kantin.ts"
import { cn } from "@/lib/utils"

export interface ProdukStok { id: number; kode: string; nama: string; satuan: string; harga_beli: number; harga_pokok: number; stok: number; stok_minimal: number }
export interface MutasiStok { id: number; tanggal: string; waktu: string; jenis: string; no_bukti: string; nama: string; satuan: string; qty: number; harga: number; stok_setelah: number; opr: string; keterangan: string | null }
export interface RiwayatMasuk {
    no_bukti: string; tanggal: string; waktu: string; opr: string; keterangan: string | null; total: number; akun: string | null; akun_kode: string | null
    bisa_hapus: boolean; total_semua: number
    item: { produkId: number; nama: string; satuan: string; qty: number; harga: number }[]
}
export interface FilterStok { dari: string; sampai: string; produk: number | null; jenis: string; cari: string }
export const TAB_STOK = ["masuk", "riwayat", "opname", "kartu"] as const
export type TabStok = (typeof TAB_STOK)[number]
const LABEL_TAB: Record<TabStok, string> = { masuk: "Stok Masuk", riwayat: "Riwayat Stok Masuk", opname: "Opname & Rusak", kartu: "Kartu Stok" }

const rp = (n: number) => n.toLocaleString("id-ID", { maximumFractionDigits: 0 })
const hariIni = () => new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Jakarta" })
const waktu = (w: string) => new Date(w).toLocaleString("id-ID", { dateStyle: "short", timeStyle: "short" })
const JENIS: Record<string, string> = { masuk: "Masuk", jual: "Terjual", batal: "Batal jual", opname: "Opname", rusak: "Rusak" }
type Hal = { page: number; pageSize: number; total: number; totalPages: number }
const TERKUNCI = "Produknya sudah punya mutasi sesudah bukti ini (terjual, opname, rusak, atau stok masuk berikutnya); tidak bisa diubah atau dihapus"

function Pesan({ hasil }: { hasil: { ok: boolean; teks: string } }) {
    return <div role="alert" className={cn("mb-3 flex items-start gap-2 rounded-md border px-3 py-2 text-sm", hasil.ok ? "border-emerald-300 bg-emerald-50 text-emerald-900" : "border-red-300 bg-red-50 text-red-900")}>
        {hasil.ok ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /> : <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />} {hasil.teks}</div>
}

/** Halaman Stok Kantin bertab: catat stok masuk, riwayat stok masuk (hapus salah input), opname/rusak, dan kartu stok. Filter dan halaman lewat URL. */
export function StokMasuk({ unit, tab, filter, produk, akun, riwayat, mutasi, hal, lebihDariSatu }: {
    unit: UnitOperator; tab: TabStok; filter: FilterStok; produk: ProdukStok[]; akun: { kode_perkiraan: string; nama_perkiraan: string }[]
    riwayat: RiwayatMasuk[]; mutasi: MutasiStok[]; hal: Hal; lebihDariSatu: boolean
}) {
    const tipis = produk.filter((p) => p.stok <= 0 || (p.stok_minimal > 0 && p.stok <= p.stok_minimal))
    const pengelola = unit.peran !== "kasir"
    return (
        <div className="max-w-6xl space-y-4">
            {tipis.length > 0 && (
                <div className="rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                    <b>Stok menipis atau habis:</b> {tipis.map((p) => `${p.nama} (${p.stok} ${p.satuan}${p.stok_minimal > 0 ? `, min. ${p.stok_minimal}` : ""})`).join(", ")}
                </div>
            )}
            <div className="flex flex-wrap items-center gap-1 border-b">
                {TAB_STOK.map((t) => (
                    <Link key={t} href={`?unit=${unit.id}&tab=${t}`}
                        className={cn("-mb-px border-b-2 px-4 py-2 text-sm", t === tab ? "border-primary font-semibold" : "border-transparent text-muted-foreground hover:text-foreground")}>{LABEL_TAB[t]}</Link>
                ))}
                {lebihDariSatu && <Link href="?" className="ml-auto px-2 text-sm text-muted-foreground hover:text-foreground">Ganti kantin ({unit.nama})</Link>}
            </div>
            {tab === "masuk" && <FormMasuk unit={unit} produk={produk} akun={akun} pengelola={pengelola} />}
            {tab === "riwayat" && <Riwayat unit={unit} filter={filter} produk={produk} akun={akun} riwayat={riwayat} hal={hal} pengelola={pengelola} />}
            {tab === "opname" && (pengelola
                ? produk.length > 0 ? <Penyesuaian unit={unit} produk={produk} /> : <p className="text-sm text-muted-foreground">Belum ada produk aktif dengan kelola stok.</p>
                : <p className="text-sm text-muted-foreground">Hanya pengelola kantin yang mencatat opname dan barang rusak.</p>)}
            {tab === "kartu" && <Kartu unit={unit} filter={filter} produk={produk} mutasi={mutasi} hal={hal} />}
        </div>
    )
}

/** Filter periode, produk, (jenis), dan kata kunci; dikirim sebagai GET supaya bisa di-bookmark. */
function Saring({ unit, tab, filter, produk, jenis }: { unit: UnitOperator; tab: TabStok; filter: FilterStok; produk: ProdukStok[]; jenis?: boolean }) {
    const kecil = "block text-xs text-muted-foreground"
    return (
        <form className="mb-4 flex flex-wrap items-end gap-2 text-sm">
            <input type="hidden" name="unit" value={unit.id} /><input type="hidden" name="tab" value={tab} />
            <label className="space-y-1"><span className={kecil}>Dari</span><Input type="date" name="dari" defaultValue={filter.dari} /></label>
            <label className="space-y-1"><span className={kecil}>Sampai</span><Input type="date" name="sampai" defaultValue={filter.sampai} /></label>
            <label className="space-y-1"><span className={kecil}>Produk</span>
                <select name="produk" defaultValue={filter.produk ?? ""} className={cn(selectClass, "w-48")}>
                    <option value="">Semua produk</option>
                    {produk.map((p) => <option key={p.id} value={p.id}>{p.nama}</option>)}
                </select></label>
            {jenis && <label className="space-y-1"><span className={kecil}>Jenis</span>
                <select name="jenis" defaultValue={filter.jenis} className={cn(selectClass, "w-36")}>
                    <option value="">Semua jenis</option>
                    {Object.entries(JENIS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select></label>}
            <label className="space-y-1"><span className={kecil}>Cari bukti / keterangan</span><Input name="cari" defaultValue={filter.cari} className="w-48" /></label>
            <button type="submit" className="h-9 rounded-md bg-primary px-4 font-semibold text-primary-foreground">Tampilkan</button>
        </form>
    )
}

/** Riwayat stok masuk per bukti KTB; baris bisa dibuka untuk rincian produk. Hapus = hapus permanen beserta jurnalnya (salah input / uji). */
function Riwayat({ unit, filter, produk, akun, riwayat, hal, pengelola }: {
    unit: UnitOperator; filter: FilterStok; produk: ProdukStok[]; akun: { kode_perkiraan: string; nama_perkiraan: string }[]; riwayat: RiwayatMasuk[]; hal: Hal; pengelola: boolean
}) {
    const router = useRouter()
    const boleh = useBolehAksi()
    const [buka, setBuka] = useState<string | null>(null)
    const [hapusIni, setHapusIni] = useState<RiwayatMasuk | null>(null)
    const [ubahIni, setUbahIni] = useState<RiwayatMasuk | null>(null)
    const [pesan, setPesan] = useState<{ ok: boolean; teks: string } | null>(null)
    const [sibuk, mulai] = useTransition()
    const bolehHapus = pengelola && boleh([MENU.stokKantin], "hapus")
    const milik = unit.model === "milik"
    const hapus = (r: RiwayatMasuk) => mulai(async () => {
        const h = await hapusStokMasukAction(unit.id, r.no_bukti)
        if (h) setPesan(h.ok ? { ok: true, teks: h.pesan } : { ok: false, teks: h.error })
        setHapusIni(null)
        router.refresh()
    })
    return (
        <FormCard title="Riwayat Stok Masuk" description="Satu baris per bukti stok masuk (KTB); klik baris untuk rinciannya. Hapus hanya untuk salah input atau uji: stok, HPP, kartu stok, dan jurnalnya dikembalikan seperti sebelum transaksi. Bisa dihapus selama produknya belum punya mutasi lain sesudah bukti itu.">
            <Saring unit={unit} tab="riwayat" filter={filter} produk={produk} />
            {pesan && <Pesan hasil={pesan} />}
            {hal.total > 0 && <p className="mb-2 text-sm text-muted-foreground">{hal.total} bukti, total pembelian Rp {rp(riwayat[0]?.total_semua ?? 0)}</p>}
            <div className="rounded-md border">
                <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead className="bg-muted text-xs text-muted-foreground"><tr>
                        <th className="w-8" /><th className="px-3 py-2 text-left">Tanggal</th><th className="px-3 py-2 text-left">Bukti</th><th className="px-3 py-2 text-left">Keterangan</th>
                        {milik && <th className="px-3 py-2 text-left">Dibayar dari</th>}
                        <th className="px-3 py-2 text-right">Produk</th><th className="px-3 py-2 text-right">Total</th><th className="px-3 py-2 text-left">Oleh</th>{bolehHapus && <th className="w-20" />}
                    </tr></thead>
                    <tbody>
                        {riwayat.map((r) => (
                            <Fragment key={r.no_bukti}>
                                <tr className="cursor-pointer border-t hover:bg-muted/50" onClick={() => setBuka(buka === r.no_bukti ? null : r.no_bukti)}>
                                    <td className="pl-2 text-muted-foreground">{buka === r.no_bukti ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}</td>
                                    <td className="px-3 py-1.5">{r.tanggal}<div className="text-xs text-muted-foreground">{waktu(r.waktu)}</div></td>
                                    <td className="px-3 py-1.5 font-mono text-xs">{r.no_bukti}</td>
                                    <td className="px-3 py-1.5">{r.keterangan ?? <span className="text-muted-foreground">-</span>}</td>
                                    {milik && <td className="px-3 py-1.5 text-xs">{r.akun ?? "-"}</td>}
                                    <td className="px-3 py-1.5 text-right tabular-nums">{r.item.length}</td>
                                    <td className="px-3 py-1.5 text-right tabular-nums">{rp(r.total)}</td>
                                    <td className="px-3 py-1.5 text-xs">{r.opr}</td>
                                    {bolehHapus && <td className="whitespace-nowrap px-2" onClick={(e) => e.stopPropagation()}>
                                        <button type="button" disabled={sibuk || !r.bisa_hapus} onClick={() => { setPesan(null); setUbahIni(r) }}
                                            title={r.bisa_hapus ? "Edit stok masuk" : TERKUNCI}
                                            className="rounded p-1 text-primary hover:bg-muted disabled:cursor-not-allowed disabled:text-muted-foreground disabled:hover:bg-transparent"><Pencil className="h-4 w-4" /></button>
                                        <button type="button" disabled={sibuk || !r.bisa_hapus} onClick={() => { setPesan(null); setHapusIni(r) }}
                                            title={r.bisa_hapus ? "Hapus permanen (salah input)" : TERKUNCI}
                                            className="rounded p-1 text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:text-muted-foreground disabled:hover:bg-transparent"><Trash2 className="h-4 w-4" /></button>
                                    </td>}
                                </tr>
                                {buka === r.no_bukti && <tr className="bg-muted/30"><td /><td colSpan={(milik ? 7 : 6) + (bolehHapus ? 1 : 0)} className="px-3 py-2">
                                    <table className="w-full text-xs"><tbody>
                                        {r.item.map((it, i) => <tr key={i}><td className="py-0.5">{it.nama}</td><td className="py-0.5 text-right tabular-nums">{it.qty} {it.satuan}</td>
                                            <td className="py-0.5 text-right tabular-nums">@ {rp(it.harga)}</td><td className="py-0.5 text-right tabular-nums">{rp(Math.round(it.qty * it.harga))}</td></tr>)}
                                    </tbody></table>
                                </td></tr>}
                            </Fragment>
                        ))}
                        {riwayat.length === 0 && <tr><td colSpan={9} className="px-3 py-5 text-center text-muted-foreground">Tidak ada stok masuk pada periode ini.</td></tr>}
                    </tbody>
                </table>
                </div>
                <PaginasiUrl className="sticky bottom-0 z-10 border-t border-outline-variant bg-background/95 backdrop-blur" page={hal.page} totalPages={hal.totalPages} pageSize={hal.pageSize} total={hal.total} />
            </div>
            <ModalForm open={!!hapusIni} onOpenChange={(b) => { if (!b && !sibuk) setHapusIni(null) }} kunci={false} judul={`Hapus stok masuk ${hapusIni?.no_bukti ?? ""}?`}
                keterangan={`Rp ${rp(hapusIni?.total ?? 0)}. Stok dan HPP dikembalikan, kartu stok${milik ? " dan jurnalnya" : ""} ikut dihapus tanpa jurnal balik. Tidak bisa dibatalkan.`}>
                <div className="flex justify-end gap-2">
                    <button type="button" disabled={sibuk} onClick={() => setHapusIni(null)} className="h-9 rounded-md border px-4 text-sm">Batal</button>
                    <button type="button" disabled={sibuk} onClick={() => hapusIni && hapus(hapusIni)}
                        className="inline-flex h-9 items-center gap-2 rounded-md bg-red-600 px-4 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50">
                        {sibuk ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />} Hapus permanen</button>
                </div>
            </ModalForm>
            <ModalForm open={!!ubahIni} onOpenChange={(b) => { if (!b) setUbahIni(null) }} lebar="sm:max-w-[56rem]" judul={`Edit stok masuk ${ubahIni?.no_bukti ?? ""}`}
                keterangan="Transaksi lama dihapus lalu dicatat ulang dengan nomor bukti yang sama: stok, HPP, kartu stok, dan jurnal ikut menyesuaikan.">
                {ubahIni && <FormMasuk unit={unit} produk={produk} akun={akun} pengelola edit={ubahIni}
                    selesai={(teks) => { setPesan({ ok: true, teks }); setUbahIni(null) }} />}
            </ModalForm>
        </FormCard>
    )
}

function Kartu({ unit, filter, produk, mutasi, hal }: { unit: UnitOperator; filter: FilterStok; produk: ProdukStok[]; mutasi: MutasiStok[]; hal: Hal }) {
    return (
        <FormCard title="Kartu Stok" description="Semua mutasi: stok masuk, terjual, batal jual, opname, dan barang rusak. Pilih produk untuk kartu stok satu produk.">
            <Saring unit={unit} tab="kartu" filter={filter} produk={produk} jenis />
            <div className="rounded-md border">
                <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead className="bg-muted text-xs text-muted-foreground"><tr>
                        <th className="px-3 py-2 text-left">Waktu</th><th className="px-3 py-2 text-left">Bukti</th><th className="px-3 py-2 text-left">Produk</th><th className="px-3 py-2 text-left">Jenis</th>
                        <th className="px-3 py-2 text-right">Jumlah</th><th className="px-3 py-2 text-right">Harga</th><th className="px-3 py-2 text-right">Stok</th><th className="px-3 py-2 text-left">Oleh</th>
                    </tr></thead>
                    <tbody>
                        {mutasi.map((m) => (
                            <tr key={m.id} className="border-t">
                                <td className="px-3 py-1.5 text-xs">{waktu(m.waktu)}</td>
                                <td className="px-3 py-1.5 font-mono text-xs">{m.no_bukti}</td>
                                <td className="px-3 py-1.5">{m.nama}</td>
                                <td className="px-3 py-1.5">{JENIS[m.jenis] ?? m.jenis}{m.keterangan && <div className="text-xs text-muted-foreground">{m.keterangan}</div>}</td>
                                <td className={cn("px-3 py-1.5 text-right tabular-nums", m.qty < 0 ? "text-red-700" : "text-emerald-700")}>{m.qty > 0 ? "+" : ""}{m.qty}</td>
                                <td className="px-3 py-1.5 text-right tabular-nums">{rp(m.harga)}</td>
                                <td className="px-3 py-1.5 text-right tabular-nums">{m.stok_setelah}</td>
                                <td className="px-3 py-1.5 text-xs">{m.opr}</td>
                            </tr>
                        ))}
                        {mutasi.length === 0 && <tr><td colSpan={8} className="px-3 py-5 text-center text-muted-foreground">Tidak ada mutasi stok pada periode ini.</td></tr>}
                    </tbody>
                </table>
                </div>
                <PaginasiUrl className="sticky bottom-0 z-10 border-t border-outline-variant bg-background/95 backdrop-blur" page={hal.page} totalPages={hal.totalPages} pageSize={hal.pageSize} total={hal.total} />
            </div>
        </FormCard>
    )
}

/** Catat barang datang (produk berstok). Kantin milik koperasi menjurnal Dr Persediaan / Cr akun bayar. */
function FormMasuk({ unit, produk, akun, pengelola, edit, selesai }: {
    unit: UnitOperator; produk: ProdukStok[]; akun: { kode_perkiraan: string; nama_perkiraan: string }[]; pengelola: boolean
    /** Mode edit: isi awal dari bukti lama; selesai dipanggil dengan pesan setelah tersimpan. */
    edit?: RiwayatMasuk; selesai?: (pesan: string) => void
}) {
    const router = useRouter()
    const [tanggal, setTanggal] = useState(edit?.tanggal ?? hariIni())
    const [akunBayar, setAkunBayar] = useState(edit?.akun_kode ?? akun[0]?.kode_perkiraan ?? "")
    const [ket, setKet] = useState(edit?.keterangan ?? "")
    const [baris, setBaris] = useState<{ produkId: number; qty: string; hargaBeli: string }[]>(
        () => edit?.item.map((it) => ({ produkId: it.produkId, qty: String(it.qty), hargaBeli: String(it.harga) })) ?? [])
    const [hasil, setHasil] = useState<{ ok: boolean; teks: string } | null>(null)
    const [sibuk, mulai] = useTransition()
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
            const isi = { unitId: unit.id, tanggal, akunBayar: unit.model === "milik" ? akunBayar : null, keterangan: ket, items: baris }
            const h = edit ? await ubahStokMasukAction({ ...isi, noBukti: edit.no_bukti }) : await stokMasukAction(isi)
            setHasil(h.ok ? { ok: true, teks: h.pesan } : { ok: false, teks: h.error })
            if (!h.ok) return
            router.refresh()
            if (selesai) selesai(h.pesan)
            else { setBaris([]); setKet("") }
        })
    }
    const isiForm = (
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
                                    const lama = edit?.item.find((x) => x.produkId === b.produkId)
                                    const p = produk.find((x) => x.id === b.produkId) ?? { nama: lama?.nama ?? "?", satuan: lama?.satuan ?? "", harga_pokok: 0, stok: 0 }
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
                            {sibuk ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} {edit ? "Simpan perubahan" : "Simpan stok masuk"}
                        </button>
                    </div>
                </form>
    )
    if (edit) return isiForm
    return (
        <FormCard title={`Stok Masuk ${unit.nama}`} description={unit.model === "milik"
            ? "Barang datang untuk produk berstok. Stok bertambah, HPP rata-rata diperbarui, dan jurnal Dr Persediaan / Cr akun pembayaran dibuat. Bahan masakan (produk tanpa kelola stok) dicatat lewat Bank Book ke akun Persediaan kantin."
            : "Barang datang milik tenant: stok bertambah tanpa jurnal koperasi."}>
            {!pengelola ? <p className="text-sm text-muted-foreground">Hanya pengelola kantin yang mencatat stok masuk.</p> : isiForm}
        </FormCard>
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
