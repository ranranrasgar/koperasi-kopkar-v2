"use client"

import { useActionState, useEffect, useMemo, useRef, useState, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { AlertCircle, CheckCircle2, ImageOff, Loader2, Pencil, Plus, Search } from "lucide-react"
import { simpanProdukAction } from "@/app/actions/kantin"
import type { HasilSimpan } from "@/app/actions/master"
import { useBolehAksi } from "@/components/layout/SidebarContext"
import { PilihGambar } from "@/components/notifikasi/PilihGambar"
import { Field, FormCard } from "@/components/transaksi/common"
import { Input } from "@/components/ui/input"
import { InputUang } from "@/components/ui/InputUang"
import { ModalForm } from "@/components/ui/Modal"
import { MENU } from "@/config/akses"
import type { UnitOperator } from "@kopkar/backend/src/unit-usaha/kantin.ts"
import { cn } from "@/lib/utils"

export interface BarisProduk {
    id: number; kode: string; barcode: string | null; nama: string; kategori: string | null; satuan: string
    harga_beli: string; harga_jual: string; harga_pokok: string; kelola_stok: boolean; stok: string; stok_minimal: string
    tampil_anggota: boolean; aktif: boolean; keterangan: string | null; gambar: string | null
}

const rp = (n: number) => n.toLocaleString("id-ID", { maximumFractionDigits: 0 })
const angka = (s: string | null | undefined) => (s ? String(Number(s)) : "")
/** Margin terhadap harga jual dan markup terhadap harga beli. */
export function margin(beli: number, jual: number) {
    const m = jual - beli
    return { rp: m, persen: jual > 0 ? (m / jual) * 100 : 0, markup: beli > 0 ? (m / beli) * 100 : null }
}

/** Produk satu kantin: daftar dengan margin dan stok, form tambah/ubah. Kasir hanya melihat. */
export function KelolaProduk({ unit, unitId, produk, kategori }: { unit: UnitOperator[]; unitId: number | null; produk: BarisProduk[]; kategori: string[] }) {
    const boleh = useBolehAksi()
    const [edit, setEdit] = useState<BarisProduk | "baru" | null>(null)
    const [cari, setCari] = useState("")
    const [semua, setSemua] = useState(false)
    const aktif = unit.find((u) => u.id === unitId)
    const pengelola = aktif && aktif.peran !== "kasir"
    const tampil = useMemo(() => {
        const q = cari.trim().toLowerCase()
        return produk.filter((p) => (semua || p.aktif) && (!q || [p.kode, p.nama, p.barcode ?? "", p.kategori ?? ""].some((x) => x.toLowerCase().includes(q))))
    }, [produk, cari, semua])

    if (!aktif) return (
        <FormCard title="Produk Kantin" description="Belum ada kantin yang ditugaskan kepada Anda.">
            <p className="text-sm text-muted-foreground">Minta admin menambahkan Anda sebagai petugas di menu Daftar Unit Usaha.</p>
        </FormCard>
    )
    return (
        <div className="max-w-6xl space-y-6">
            <FormCard title="Produk Kantin" description="Harga beli, harga jual, dan margin setiap produk. Stok hanya berubah lewat stok masuk, penjualan, dan opname; produk tanpa kelola stok (mis. masakan harian) selalu tersedia.">
                <div className="space-y-3">
                    {unit.length > 1 && <div className="flex flex-wrap gap-1.5">
                        {unit.map((u) => <Link key={u.id} href={`?unit=${u.id}`}
                            className={cn("rounded-full border px-3 py-1 text-sm", u.id === unitId ? "border-blue-600 bg-blue-600 text-white" : "hover:bg-muted", !u.aktif && "opacity-60")}>{u.nama}</Link>)}
                    </div>}
                    <div className="flex flex-wrap items-center gap-2">
                        <div className="relative min-w-60 flex-1">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input value={cari} onChange={(e) => setCari(e.target.value)} placeholder="Cari kode, nama, barcode, kategori" className="pl-8" />
                        </div>
                        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={semua} onChange={(e) => setSemua(e.target.checked)} /> Tampilkan nonaktif</label>
                        {pengelola && boleh([MENU.produkKantin], "tambah") && <button type="button" onClick={() => setEdit("baru")}
                            className="inline-flex h-9 items-center gap-1.5 rounded-md bg-blue-600 px-3 text-sm font-semibold text-white hover:bg-blue-700">
                            <Plus className="h-4 w-4" /> Tambah produk
                        </button>}
                    </div>
                    <div className="overflow-x-auto rounded-md border">
                        <table className="w-full text-sm">
                            <thead className="bg-muted text-xs text-muted-foreground">
                                <tr>
                                    <th className="w-14 px-3 py-2" />
                                    <th className="px-3 py-2 text-left">Kode</th>
                                    <th className="px-3 py-2 text-left">Produk</th>
                                    <th className="px-3 py-2 text-left">Kategori</th>
                                    <th className="px-3 py-2 text-right">Harga beli</th>
                                    <th className="px-3 py-2 text-right">Harga jual</th>
                                    <th className="px-3 py-2 text-right">Margin</th>
                                    <th className="px-3 py-2 text-right">Stok</th>
                                    <th className="w-12 px-3 py-2" />
                                </tr>
                            </thead>
                            <tbody>
                                {tampil.map((p) => {
                                    const m = margin(Number(p.harga_beli), Number(p.harga_jual))
                                    const tipis = Number(p.stok) <= Number(p.stok_minimal)
                                    return (
                                        <tr key={p.id} className={cn("border-t hover:bg-muted/30", !p.aktif && "text-muted-foreground")}>
                                            <td className="px-3 py-1.5">
                                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                                {p.gambar ? <img src={`/dashboard/gambar/${p.gambar}`} alt="" className="h-10 w-10 rounded object-cover" />
                                                    : <div className="flex h-10 w-10 items-center justify-center rounded bg-muted"><ImageOff className="h-4 w-4 text-muted-foreground" /></div>}
                                            </td>
                                            <td className="px-3 py-1.5 font-mono text-xs">{p.kode}{p.barcode && <div className="text-muted-foreground">{p.barcode}</div>}</td>
                                            <td className="px-3 py-1.5">
                                                <div className="font-medium">{p.nama}</div>
                                                <div className="text-xs text-muted-foreground">per {p.satuan}{!p.aktif && " · nonaktif"}{!p.tampil_anggota && " · tidak tampil di aplikasi"}</div>
                                            </td>
                                            <td className="px-3 py-1.5">{p.kategori ?? "-"}</td>
                                            <td className="px-3 py-1.5 text-right tabular-nums">{rp(Number(p.harga_beli))}</td>
                                            <td className="px-3 py-1.5 text-right font-semibold tabular-nums">{rp(Number(p.harga_jual))}</td>
                                            <td className={cn("px-3 py-1.5 text-right tabular-nums", m.rp <= 0 && "font-semibold text-red-600")}>
                                                {rp(m.rp)} <span className="text-xs text-muted-foreground">({m.persen.toLocaleString("id-ID", { maximumFractionDigits: 1 })}%)</span>
                                            </td>
                                            <td className={cn("px-3 py-1.5 text-right tabular-nums", p.kelola_stok && tipis && "font-semibold text-amber-700")}>
                                                {p.kelola_stok ? Number(p.stok).toLocaleString("id-ID") : <span className="text-xs text-muted-foreground">tidak dikelola</span>}
                                            </td>
                                            <td className="px-3 py-1.5 text-right">
                                                {pengelola && boleh([MENU.produkKantin], "ubah") && <button type="button" title="Ubah" onClick={() => setEdit(p)} className="rounded p-1.5 hover:bg-muted"><Pencil className="h-4 w-4" /></button>}
                                            </td>
                                        </tr>
                                    )
                                })}
                                {tampil.length === 0 && <tr><td colSpan={9} className="px-3 py-6 text-center text-muted-foreground">{produk.length ? "Tidak ada produk yang cocok." : "Belum ada produk. Tekan Tambah produk."}</td></tr>}
                            </tbody>
                        </table>
                    </div>
                    <p className="text-xs text-muted-foreground">{produk.filter((p) => p.aktif).length} produk aktif dari {produk.length}.</p>
                </div>
            </FormCard>
            <ModalForm open={edit !== null} onOpenChange={(b) => { if (!b) setEdit(null) }} judul={edit === "baru" ? `Tambah produk ${aktif.nama}` : `Ubah ${edit?.nama ?? ""}`} lebar="sm:max-w-2xl">
                {edit && <FormProduk key={edit === "baru" ? "baru" : edit.id} unitId={aktif.id} produk={edit === "baru" ? null : edit} kategori={kategori} onSelesai={() => setEdit(null)} />}
            </ModalForm>
        </div>
    )
}

function FormProduk({ unitId, produk: p, kategori, onSelesai }: { unitId: number; produk: BarisProduk | null; kategori: string[]; onSelesai: () => void }) {
    const router = useRouter()
    const [hasil, jalankan, pending] = useActionState<HasilSimpan, FormData>(simpanProdukAction, null)
    const [, mulai] = useTransition()
    const [beli, setBeli] = useState(angka(p?.harga_beli))
    const [jual, setJual] = useState(angka(p?.harga_jual))
    const [stokMin, setStokMin] = useState(angka(p?.stok_minimal))
    const [kelola, setKelola] = useState(p?.kelola_stok ?? false)
    const m = margin(Number(beli || 0), Number(jual || 0))
    // Hanya saat hasil berubah: onSelesai dibuat ulang setiap render induk, dan router.refresh membuat induk render ulang.
    const selesai = useRef(onSelesai)
    useEffect(() => { selesai.current = onSelesai })
    useEffect(() => { if (hasil?.ok) { router.refresh(); const t = setTimeout(() => selesai.current(), 1200); return () => clearTimeout(t) } }, [hasil, router])

    // Tanpa form action: React 19 mengosongkan isian setelah action, juga saat validasi server menolak.
    const kirim = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        const data = new FormData(e.currentTarget)
        mulai(() => jalankan(data))
    }
    return (
        <form onSubmit={kirim} className="space-y-4">
            <input type="hidden" name="unitId" value={unitId} />
            <input type="hidden" name="id" value={p?.id ?? ""} />
            <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Nama produk" className="sm:col-span-2"><Input name="nama" defaultValue={p?.nama} required maxLength={100} placeholder="Nasi rames" autoFocus /></Field>
                <Field label="Kode" hint="Kosongkan untuk nomor otomatis (P0001)"><Input name="kode" defaultValue={p?.kode} maxLength={30} /></Field>
                <Field label="Barcode (opsional)" hint="Untuk pemindai di kasir"><Input name="barcode" defaultValue={p?.barcode ?? ""} maxLength={50} /></Field>
                <Field label="Kategori" hint="Ketik kategori baru atau pilih yang ada">
                    <Input name="kategori" defaultValue={p?.kategori ?? ""} list="kategori-kantin" maxLength={50} placeholder="Makanan" />
                    <datalist id="kategori-kantin">{kategori.map((k) => <option key={k} value={k} />)}</datalist>
                </Field>
                <Field label="Satuan"><Input name="satuan" defaultValue={p?.satuan ?? "porsi"} maxLength={20} list="satuan-kantin" />
                    <datalist id="satuan-kantin">{["porsi", "pcs", "gelas", "botol", "bungkus", "kotak"].map((s) => <option key={s} value={s} />)}</datalist>
                </Field>
                <Field label="Harga beli (Rp)" hint="Modal per satuan; untuk produk berstok, HPP mengikuti rata-rata stok masuk"><InputUang name="hargaBeli" value={beli} onChange={setBeli} /></Field>
                <Field label="Harga jual (Rp)"><InputUang name="hargaJual" value={jual} onChange={setJual} required /></Field>
                <div className={cn("rounded-md border px-3 py-2 text-sm sm:col-span-2", m.rp <= 0 && jual ? "border-red-300 bg-red-50 text-red-900" : "bg-muted/40")}>
                    Margin <b>Rp {rp(m.rp)}</b> ({m.persen.toLocaleString("id-ID", { maximumFractionDigits: 1 })}% dari harga jual
                    {m.markup !== null && <>, markup {m.markup.toLocaleString("id-ID", { maximumFractionDigits: 1 })}% dari harga beli</>})
                    {m.rp <= 0 && jual ? " · harga jual tidak lebih besar dari harga beli" : ""}
                </div>
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="kelolaStok" checked={kelola} onChange={(e) => setKelola(e.target.checked)} /> Kelola stok</label>
                {kelola ? <Field label="Stok minimal (peringatan)"><InputUang name="stokMinimal" value={stokMin} onChange={setStokMin} /></Field> : <span className="text-xs text-muted-foreground">Tanpa kelola stok: selalu tersedia, HPP = harga beli.</span>}
                {p?.kelola_stok && <p className="text-xs text-muted-foreground sm:col-span-2">Stok sekarang {Number(p.stok).toLocaleString("id-ID")} {p.satuan}, HPP rata-rata Rp {rp(Number(p.harga_pokok))}.</p>}
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="tampilAnggota" defaultChecked={p?.tampil_anggota ?? true} /> Tampil di aplikasi anggota</label>
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="aktif" defaultChecked={p?.aktif ?? true} /> Aktif (bisa dijual)</label>
                <Field label="Keterangan" className="sm:col-span-2"><Input name="keterangan" defaultValue={p?.keterangan ?? ""} maxLength={255} /></Field>
                <Field label="Gambar" className="sm:col-span-2"><PilihGambar gambarAda={p?.gambar} /></Field>
            </div>
            {hasil && <div role="alert" className={cn("flex items-start gap-2 rounded-md border px-3 py-2 text-sm", hasil.ok ? "border-emerald-300 bg-emerald-50 text-emerald-900" : "border-red-300 bg-red-50 text-red-900")}>
                {hasil.ok ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /> : <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />} {hasil.ok ? hasil.pesan : hasil.error}</div>}
            <div className="flex justify-end">
                <button type="submit" disabled={pending} className="inline-flex h-9 items-center gap-2 rounded-md bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60">
                    {pending && <Loader2 className="h-4 w-4 animate-spin" />} Simpan
                </button>
            </div>
        </form>
    )
}
