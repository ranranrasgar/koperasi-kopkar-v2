"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { AlertCircle, CheckCircle2, Loader2, Pencil, Plus, Trash2 } from "lucide-react"
import { simpanUnitAction } from "@/app/actions/kantin"
import { useBolehAksi } from "@/components/layout/SidebarContext"
import { Field, FormCard, selectClass } from "@/components/transaksi/common"
import { Input } from "@/components/ui/input"
import { InputUang } from "@/components/ui/InputUang"
import { ModalForm } from "@/components/ui/Modal"
import { MENU } from "@/config/akses"
import type { ModelKantin, PeranKantin, UnitInput } from "@kopkar/backend/src/unit-usaha/kantin.ts"
import { cn } from "@/lib/utils"

export interface BarisUnit {
    id: number; kode: string; nama: string; lokasi: string | null; jam_buka: string | null; jam_tutup: string | null
    aktif: boolean; tampil_anggota: boolean; model: ModelKantin; terima_tunai: boolean; terima_sukarela: boolean
    batas_sukarela_transaksi: string; batas_sukarela_harian: string; saldo_sukarela_minimal: string; menit_batal_pesanan: number
    nama_usaha: string | null; pemilik: string | null; telepon: string | null; email: string | null; bank: string | null; no_rekening: string | null; nama_rekening: string | null
    kontrak_mulai: string | null; kontrak_selesai: string | null; persen_bagi_hasil: string | null; minimum_bulanan: string | null; sewa_bulanan: string | null
    periode_penyelesaian: "bulanan" | "mingguan" | null
    akun: string[]; operator: { oprId: number; peran: PeranKantin }[]; produk: number
}
export interface PilihanOperator { id: number; nama: string; nama_lengkap: string | null; nama_grup: string | null }

const MODEL: { value: ModelKantin; label: string; ket: string }[] = [
    { value: "milik", label: "Milik koperasi", ket: "Barang, stok, dan uang tunai milik koperasi. Akun: Kas, Persediaan, Penjualan, HPP." },
    { value: "bagi_hasil", label: "Tenant bagi hasil", ket: "Tenant memegang barang dan uang tunai; koperasi mendapat persen penjualan (minimal per bulan). Akun: Piutang Tenant, Utang ke Tenant, Pendapatan Bagi Hasil." },
    { value: "sewa", label: "Tenant sewa tetap", ket: "Tenant membayar sewa tetap per bulan. Akun: Piutang Tenant, Utang ke Tenant, Pendapatan Sewa." },
]
const LABEL_MODEL = Object.fromEntries(MODEL.map((m) => [m.value, m.label])) as Record<ModelKantin, string>
const angka = (s: string | null | undefined) => (s === null || s === undefined || s === "" ? "" : String(Number(s)))
const rp = (s: string | null) => `Rp ${Number(s ?? 0).toLocaleString("id-ID", { maximumFractionDigits: 0 })}`
const hariIni = () => new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Jakarta" })

function awal(u: BarisUnit | null): UnitInput {
    return {
        id: u?.id ?? null, kode: u?.kode ?? "", nama: u?.nama ?? "", lokasi: u?.lokasi ?? "", jamBuka: u?.jam_buka ?? "", jamTutup: u?.jam_tutup ?? "",
        aktif: u?.aktif ?? true, tampilAnggota: u?.tampil_anggota ?? true, model: u?.model ?? "milik",
        terimaTunai: u?.terima_tunai ?? true, terimaSukarela: u?.terima_sukarela ?? true,
        batasSukarelaTransaksi: angka(u?.batas_sukarela_transaksi ?? "100000"), batasSukarelaHarian: angka(u?.batas_sukarela_harian ?? "200000"),
        saldoSukarelaMinimal: angka(u?.saldo_sukarela_minimal ?? "0"), menitBatalPesanan: u?.menit_batal_pesanan ?? 30,
        tenant: { namaUsaha: u?.nama_usaha ?? "", pemilik: u?.pemilik ?? "", telepon: u?.telepon ?? "", email: u?.email ?? "", bank: u?.bank ?? "",
            noRekening: u?.no_rekening ?? "", namaRekening: u?.nama_rekening ?? "" },
        kontrak: { mulai: u?.kontrak_mulai ?? hariIni(), selesai: u?.kontrak_selesai ?? "", persenBagiHasil: angka(u?.persen_bagi_hasil),
            minimumBulanan: angka(u?.minimum_bulanan), sewaBulanan: angka(u?.sewa_bulanan), periode: u?.periode_penyelesaian ?? "bulanan" },
        operator: u?.operator ?? [],
    }
}

/** Daftar kantin dan form tambah/ubah: data umum, cara bayar, tenant + kontrak (model tenant), dan operator yang ditugaskan. */
export function KelolaUnitUsaha({ unit, operator }: { unit: BarisUnit[]; operator: PilihanOperator[] }) {
    const boleh = useBolehAksi()
    const [edit, setEdit] = useState<BarisUnit | "baru" | null>(null)
    return (
        <div className="max-w-6xl space-y-6">
            <FormCard title="Daftar Unit Usaha" description="Kantin koperasi dan kantin tenant. Akun jurnal dibuat otomatis saat unit disimpan sesuai modelnya; petugas kantin ditugaskan per unit sebagai pengelola (produk dan stok) atau kasir.">
                <div className="space-y-3">
                    <div className="flex justify-end">
                        {boleh([MENU.unitUsaha], "tambah") && <button type="button" onClick={() => setEdit("baru")}
                            className="inline-flex h-9 items-center gap-1.5 rounded-md bg-blue-600 px-3 text-sm font-semibold text-white hover:bg-blue-700">
                            <Plus className="h-4 w-4" /> Tambah kantin
                        </button>}
                    </div>
                    <div className="overflow-x-auto rounded-md border">
                        <table className="w-full text-sm">
                            <thead className="bg-muted text-xs text-muted-foreground">
                                <tr>
                                    <th className="px-3 py-2 text-left">Kode</th>
                                    <th className="px-3 py-2 text-left">Nama</th>
                                    <th className="px-3 py-2 text-left">Model</th>
                                    <th className="px-3 py-2 text-left">Akun jurnal</th>
                                    <th className="px-3 py-2 text-right">Petugas</th>
                                    <th className="px-3 py-2 text-right">Produk</th>
                                    <th className="px-3 py-2 text-left">Status</th>
                                    <th className="w-12 px-3 py-2" />
                                </tr>
                            </thead>
                            <tbody>
                                {unit.map((u) => (
                                    <tr key={u.id} className="border-t align-top hover:bg-muted/30">
                                        <td className="px-3 py-1.5 font-mono font-semibold">{u.kode}</td>
                                        <td className="px-3 py-1.5">
                                            <div className="font-medium">{u.nama}</div>
                                            {u.lokasi && <div className="text-xs text-muted-foreground">{u.lokasi}</div>}
                                        </td>
                                        <td className="px-3 py-1.5">
                                            <div>{LABEL_MODEL[u.model]}</div>
                                            {u.model !== "milik" && <div className="text-xs text-muted-foreground">
                                                {u.nama_usaha}{u.model === "bagi_hasil" ? `, ${Number(u.persen_bagi_hasil ?? 0).toLocaleString("id-ID")}% min. ${rp(u.minimum_bulanan)}/bln` : `, sewa ${rp(u.sewa_bulanan)}/bln`}
                                            </div>}
                                        </td>
                                        <td className="min-w-64 px-3 py-1.5 font-mono text-xs">{u.akun.map((a) => <div key={a}>{a}</div>)}</td>
                                        <td className="px-3 py-1.5 text-right tabular-nums">{u.operator.length}</td>
                                        <td className="px-3 py-1.5 text-right tabular-nums">{Number(u.produk).toLocaleString("id-ID")}</td>
                                        <td className="px-3 py-1.5">{u.aktif ? <span className="text-emerald-700">Aktif</span> : <span className="text-muted-foreground">Nonaktif</span>}</td>
                                        <td className="px-3 py-1.5 text-right">
                                            {boleh([MENU.unitUsaha], "ubah") && <button type="button" title="Ubah" onClick={() => setEdit(u)} className="rounded p-1.5 hover:bg-muted"><Pencil className="h-4 w-4" /></button>}
                                        </td>
                                    </tr>
                                ))}
                                {unit.length === 0 && <tr><td colSpan={8} className="px-3 py-6 text-center text-muted-foreground">Belum ada kantin. Tekan Tambah kantin.</td></tr>}
                            </tbody>
                        </table>
                    </div>
                </div>
            </FormCard>
            <ModalForm open={edit !== null} onOpenChange={(b) => { if (!b) setEdit(null) }} judul={edit === "baru" ? "Tambah kantin" : `Ubah ${edit?.nama ?? ""}`} lebar="sm:max-w-3xl">
                {edit && <FormUnit key={edit === "baru" ? "baru" : edit.id} unit={edit === "baru" ? null : edit} operator={operator} onSelesai={() => setEdit(null)} />}
            </ModalForm>
        </div>
    )
}

const TAB = ["Umum", "Pembayaran", "Tenant", "Petugas"] as const

function FormUnit({ unit, operator, onSelesai }: { unit: BarisUnit | null; operator: PilihanOperator[]; onSelesai: () => void }) {
    const router = useRouter()
    const [d, setD] = useState<UnitInput>(() => awal(unit))
    const [tab, setTab] = useState<(typeof TAB)[number]>("Umum")
    const [hasil, setHasil] = useState<{ ok: boolean; teks: string } | null>(null)
    const [sibuk, mulai] = useTransition()
    const ubah = (p: Partial<UnitInput>) => setD((x) => ({ ...x, ...p }))
    const ubahTenant = (p: Partial<NonNullable<UnitInput["tenant"]>>) => setD((x) => ({ ...x, tenant: { ...x.tenant!, ...p } }))
    const ubahKontrak = (p: Partial<NonNullable<UnitInput["kontrak"]>>) => setD((x) => ({ ...x, kontrak: { ...x.kontrak!, ...p } }))
    const tenant = d.model !== "milik"
    const tabs = TAB.filter((t) => t !== "Tenant" || tenant)
    const petugas = new Map(d.operator.map((o) => [o.oprId, o.peran]))
    const tambahPetugas = (id: number) => { if (id && !petugas.has(id)) ubah({ operator: [...d.operator, { oprId: id, peran: "kasir" }] }) }

    const simpan = (e: React.FormEvent) => {
        e.preventDefault()
        setHasil(null)
        mulai(async () => {
            const h = await simpanUnitAction(d)
            if (!h) return
            setHasil(h.ok ? { ok: true, teks: h.pesan } : { ok: false, teks: h.error })
            // Galat isian tenant/kontrak: buka tab Tenant supaya isian yang salah terlihat.
            if (!h.ok && tenant && /tenant|kontrak|bagi hasil|sewa|rekening|pemilik|telepon/i.test(h.error)) setTab("Tenant")
            if (h.ok) { router.refresh(); setTimeout(onSelesai, 1500) }
        })
    }

    return (
        <form onSubmit={simpan} onInvalidCapture={() => setTab("Umum")} className="space-y-4">
            <div role="tablist" className="flex gap-1 border-b">
                {tabs.map((t) => (
                    <button key={t} type="button" role="tab" aria-selected={t === tab} onClick={() => setTab(t)}
                        className={cn("-mb-px border-b-2 px-4 py-2 text-sm", t === tab ? "border-blue-600 font-semibold" : "border-transparent text-muted-foreground hover:text-foreground")}>{t}</button>
                ))}
            </div>

            <div className={cn("grid gap-4 sm:grid-cols-2", tab !== "Umum" && "hidden")}>
                <Field label="Kode unit" hint="Huruf/angka, mis. KTN01"><Input value={d.kode} onChange={(e) => ubah({ kode: e.target.value.toUpperCase() })} required maxLength={20} /></Field>
                <Field label="Nama kantin"><Input value={d.nama} onChange={(e) => ubah({ nama: e.target.value })} required maxLength={80} placeholder="Kantin Gedung A" /></Field>
                <Field label="Lokasi" className="sm:col-span-2"><Input value={d.lokasi} onChange={(e) => ubah({ lokasi: e.target.value })} maxLength={100} /></Field>
                <Field label="Jam buka"><Input type="time" value={d.jamBuka} onChange={(e) => ubah({ jamBuka: e.target.value })} /></Field>
                <Field label="Jam tutup"><Input type="time" value={d.jamTutup} onChange={(e) => ubah({ jamTutup: e.target.value })} /></Field>
                <Field label="Model kepemilikan" className="sm:col-span-2" hint={MODEL.find((m) => m.value === d.model)?.ket}>
                    <select className={selectClass} value={d.model} onChange={(e) => ubah({ model: e.target.value as ModelKantin })}>
                        {MODEL.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                    </select>
                </Field>
                {unit && unit.model !== d.model && <p className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900 sm:col-span-2">
                    Akun untuk model baru dibuat saat disimpan. Akun model lama tidak dihapus.</p>}
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={d.aktif} onChange={(e) => ubah({ aktif: e.target.checked })} /> Aktif</label>
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={d.tampilAnggota} onChange={(e) => ubah({ tampilAnggota: e.target.checked })} /> Tampil di aplikasi anggota</label>
                {unit && unit.akun.length > 0 && <div className="sm:col-span-2">
                    <p className="mb-1 text-xs font-semibold text-muted-foreground">Akun jurnal</p>
                    <div className="rounded-md border bg-muted/30 px-3 py-2 font-mono text-xs">{unit.akun.map((a) => <div key={a}>{a}</div>)}</div>
                </div>}
            </div>

            <div className={cn("grid gap-4 sm:grid-cols-2", tab !== "Pembayaran" && "hidden")}>
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={d.terimaTunai} onChange={(e) => ubah({ terimaTunai: e.target.checked })} /> Terima tunai</label>
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={d.terimaSukarela} onChange={(e) => ubah({ terimaSukarela: e.target.checked })} /> Terima bayar dari Simpanan Sukarela (QR)</label>
                <Field label="Batas sukarela per transaksi (Rp)"><InputUang value={String(d.batasSukarelaTransaksi ?? "")} onChange={(v) => ubah({ batasSukarelaTransaksi: v })} /></Field>
                <Field label="Batas sukarela per hari per anggota (Rp)"><InputUang value={String(d.batasSukarelaHarian ?? "")} onChange={(v) => ubah({ batasSukarelaHarian: v })} /></Field>
                <Field label="Saldo sukarela minimal yang harus tersisa (Rp)"><InputUang value={String(d.saldoSukarelaMinimal ?? "")} onChange={(v) => ubah({ saldoSukarelaMinimal: v })} /></Field>
                <Field label="Batas waktu ambil pesanan tunai (menit)" hint="Pesanan dari aplikasi anggota yang belum dibayar dibatalkan otomatis">
                    <Input type="number" min={5} max={1440} value={d.menitBatalPesanan} onChange={(e) => ubah({ menitBatalPesanan: e.target.value })} /></Field>
            </div>

            {tenant && <div className={cn("grid gap-4 sm:grid-cols-2", tab !== "Tenant" && "hidden")}>
                <Field label="Nama usaha tenant"><Input value={d.tenant!.namaUsaha} onChange={(e) => ubahTenant({ namaUsaha: e.target.value })} maxLength={100} /></Field>
                <Field label="Pemilik"><Input value={d.tenant!.pemilik} onChange={(e) => ubahTenant({ pemilik: e.target.value })} maxLength={100} /></Field>
                <Field label="Telepon"><Input value={d.tenant!.telepon} onChange={(e) => ubahTenant({ telepon: e.target.value })} maxLength={30} /></Field>
                <Field label="Email"><Input type="email" value={d.tenant!.email} onChange={(e) => ubahTenant({ email: e.target.value })} maxLength={100} /></Field>
                <Field label="Bank"><Input value={d.tenant!.bank} onChange={(e) => ubahTenant({ bank: e.target.value })} maxLength={50} /></Field>
                <Field label="No. rekening"><Input value={d.tenant!.noRekening} onChange={(e) => ubahTenant({ noRekening: e.target.value })} maxLength={50} /></Field>
                <Field label="Nama pemilik rekening" className="sm:col-span-2"><Input value={d.tenant!.namaRekening} onChange={(e) => ubahTenant({ namaRekening: e.target.value })} maxLength={100} /></Field>
                <p className="text-xs font-semibold text-muted-foreground sm:col-span-2">Kontrak (tanggal mulai baru = kontrak baru; kontrak lama tetap tersimpan)</p>
                <Field label="Mulai kontrak"><Input type="date" value={d.kontrak!.mulai} onChange={(e) => ubahKontrak({ mulai: e.target.value })} /></Field>
                <Field label="Selesai kontrak (kosong = tanpa batas)"><Input type="date" value={d.kontrak!.selesai} onChange={(e) => ubahKontrak({ selesai: e.target.value })} /></Field>
                {d.model === "bagi_hasil" ? <>
                    <Field label="Bagi hasil koperasi (% dari penjualan)"><InputUang value={String(d.kontrak!.persenBagiHasil ?? "")} onChange={(v) => ubahKontrak({ persenBagiHasil: v })} /></Field>
                    <Field label="Bagi hasil minimum per bulan (Rp)" hint="Bila persen penjualan lebih kecil, koperasi menerima nilai ini"><InputUang value={String(d.kontrak!.minimumBulanan ?? "")} onChange={(v) => ubahKontrak({ minimumBulanan: v })} /></Field>
                </> : <Field label="Sewa per bulan (Rp)"><InputUang value={String(d.kontrak!.sewaBulanan ?? "")} onChange={(v) => ubahKontrak({ sewaBulanan: v })} /></Field>}
                <Field label="Penyelesaian dengan tenant">
                    <select className={selectClass} value={d.kontrak!.periode} onChange={(e) => ubahKontrak({ periode: e.target.value as "bulanan" | "mingguan" })}>
                        <option value="bulanan">Bulanan</option><option value="mingguan">Mingguan</option>
                    </select>
                </Field>
            </div>}

            <div className={cn("space-y-3", tab !== "Petugas" && "hidden")}>
                <p className="text-xs text-muted-foreground">Petugas login memakai akun operator (menu Sistem → Operator, grup <b>Kantin</b> untuk petugas yang hanya menjaga kantin). <b>Pengelola</b> mengatur produk dan stok; <b>kasir</b> hanya berjualan.</p>
                <select className={selectClass} value="" onChange={(e) => tambahPetugas(Number(e.target.value))}>
                    <option value="">+ Tambah petugas...</option>
                    {operator.filter((o) => !petugas.has(o.id)).map((o) => <option key={o.id} value={o.id}>{o.nama}{o.nama_lengkap ? ` (${o.nama_lengkap})` : ""}, grup {o.nama_grup ?? "-"}</option>)}
                </select>
                <div className="rounded-md border">
                    {d.operator.map((p) => {
                        const o = operator.find((x) => x.id === p.oprId)
                        return (
                            <div key={p.oprId} className="flex items-center gap-3 border-b px-3 py-2 text-sm last:border-b-0">
                                <span className="flex-1">{o?.nama ?? `#${p.oprId}`} <span className="text-xs text-muted-foreground">{o?.nama_lengkap ?? ""} · {o?.nama_grup ?? "-"}</span></span>
                                <select className={cn(selectClass, "w-36")} value={p.peran}
                                    onChange={(e) => ubah({ operator: d.operator.map((x) => x.oprId === p.oprId ? { ...x, peran: e.target.value as PeranKantin } : x) })}>
                                    <option value="pengelola">Pengelola</option><option value="kasir">Kasir</option>
                                </select>
                                <button type="button" title="Lepas" onClick={() => ubah({ operator: d.operator.filter((x) => x.oprId !== p.oprId) })} className="rounded p-1.5 text-red-600 hover:bg-red-50"><Trash2 className="h-4 w-4" /></button>
                            </div>
                        )
                    })}
                    {d.operator.length === 0 && <p className="px-3 py-4 text-center text-sm text-muted-foreground">Belum ada petugas.</p>}
                </div>
            </div>

            {hasil && <div role="alert" className={cn("flex items-start gap-2 rounded-md border px-3 py-2 text-sm", hasil.ok ? "border-emerald-300 bg-emerald-50 text-emerald-900" : "border-red-300 bg-red-50 text-red-900")}>
                {hasil.ok ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /> : <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />} {hasil.teks}</div>}
            <div className="flex justify-end">
                <button type="submit" disabled={sibuk} className="inline-flex h-9 items-center gap-2 rounded-md bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60">
                    {sibuk && <Loader2 className="h-4 w-4 animate-spin" />} Simpan
                </button>
            </div>
        </form>
    )
}
