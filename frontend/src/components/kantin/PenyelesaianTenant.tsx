"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { AlertCircle, Calculator, CheckCircle2, Loader2, XCircle } from "lucide-react"
import { batalPenyelesaianAction, hitungPenyelesaianAction, simpanPenyelesaianAction } from "@/app/actions/kantin"
import { useBolehAksi } from "@/components/layout/SidebarContext"
import { Field, FormCard, selectClass } from "@/components/transaksi/common"
import { Input } from "@/components/ui/input"
import { TombolCetak } from "@/components/ui/TombolCetak"
import { MENU } from "@/config/akses"
import type { HitungPenyelesaian } from "@kopkar/backend/src/posting/kantin-tenant.ts"
import { cn } from "@/lib/utils"

export interface RiwayatPenyelesaian {
    id: number; no_bukti: string; kantin: string; tenant: string | null; model: string; dari: string; sampai: string; tanggal: string; nota: number
    penjualan: number; tunai: number; sukarela: number; bagi_hasil: number; tambahan: number; utang: number; piutang: number; neto: number
    akun_kas: string | null; catatan: string | null; opr: string; dibatalkan: string | null; opr_batal: string | null
}

const rp = (n: number | string) => `Rp ${Number(n).toLocaleString("id-ID", { maximumFractionDigits: 0 })}`
const hariIni = () => new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Jakarta" })
/** Bulan lalu: tanggal 1 sampai akhir bulan. */
function bulanLalu() {
    const [y, m] = hariIni().split("-").map(Number)
    const awal = new Date(Date.UTC(y, m - 2, 1)), akhir = new Date(Date.UTC(y, m - 1, 0))
    return [awal.toISOString().slice(0, 10), akhir.toISOString().slice(0, 10)]
}

/** Penyelesaian periode dengan tenant kantin: hitung, simpan (jurnal KTP + transfer neto), cetak rekap, batalkan. */
export function PenyelesaianTenant({ unit, akun, riwayat }: { unit: { id: number; nama: string; model: string; tenant: string | null }[]; akun: { kode_perkiraan: string; nama_perkiraan: string }[]; riwayat: RiwayatPenyelesaian[] }) {
    const router = useRouter()
    const boleh = useBolehAksi()
    const [awal, akhir] = bulanLalu()
    const [unitId, setUnitId] = useState(unit[0]?.id ?? 0)
    const [dari, setDari] = useState(awal)
    const [sampai, setSampai] = useState(akhir)
    const [tanggal, setTanggal] = useState(hariIni())
    const [akunKas, setAkunKas] = useState(akun.find((a) => a.kode_perkiraan === "1.1.01.20")?.kode_perkiraan ?? akun[0]?.kode_perkiraan ?? "")
    const [catatan, setCatatan] = useState("")
    const [h, setH] = useState<HitungPenyelesaian | null>(null)
    const [pesan, setPesan] = useState<{ ok: boolean; teks: string } | null>(null)
    const [sibuk, mulai] = useTransition()

    const hitung = () => mulai(async () => {
        setPesan(null)
        const r = await hitungPenyelesaianAction(unitId, dari, sampai)
        if (r.ok) setH(r.data); else { setH(null); setPesan({ ok: false, teks: r.error }) }
    })
    const simpan = () => {
        if (!h || !confirm(`Simpan penyelesaian ${h.nama} ${dari} s.d. ${sampai}? Nota periode ini tidak bisa dibatalkan lagi sampai penyelesaiannya dibatalkan.`)) return
        mulai(async () => {
            const r = await simpanPenyelesaianAction({ unitId, dari, sampai, tanggal, akunKas, catatan })
            if (r) setPesan(r.ok ? { ok: true, teks: r.pesan } : { ok: false, teks: r.error })
            if (r?.ok) { setH(null); router.refresh() }
        })
    }
    const batal = (p: RiwayatPenyelesaian) => {
        if (!confirm(`Batalkan penyelesaian ${p.no_bukti}? Jurnalnya dihapus; transfer yang sudah dilakukan perlu dicatat ulang.`)) return
        mulai(async () => { const r = await batalPenyelesaianAction(p.id); if (r) alert(r.ok ? r.pesan : r.error); router.refresh() })
    }

    if (!unit.length) return <FormCard title="Penyelesaian Tenant" description="Belum ada kantin tenant (model bagi hasil atau sewa)."><p className="text-sm text-muted-foreground">Tambahkan di Daftar Unit Usaha.</p></FormCard>
    const neto = h ? Number(h.neto) : 0
    return (
        <div className="max-w-5xl space-y-6">
            <FormCard title="Penyelesaian Tenant" description="Hitung bagi hasil (dengan minimum bulanan) atau sewa, utang koperasi dari belanja Simpanan Sukarela, dan piutang bagi hasil dari penjualan tunai; selisihnya ditransfer.">
                <div className="grid gap-4 sm:grid-cols-4">
                    <Field label="Kantin tenant" className="sm:col-span-2">
                        <select className={selectClass} value={unitId} onChange={(e) => { setUnitId(Number(e.target.value)); setH(null) }}>
                            {unit.map((u) => <option key={u.id} value={u.id}>{u.nama}{u.tenant ? ` (${u.tenant})` : ""}</option>)}
                        </select>
                    </Field>
                    <Field label="Dari"><Input type="date" value={dari} onChange={(e) => { setDari(e.target.value); setH(null) }} /></Field>
                    <Field label="Sampai"><Input type="date" value={sampai} onChange={(e) => { setSampai(e.target.value); setH(null) }} /></Field>
                </div>
                <div className="mt-3 flex justify-end">
                    <button type="button" onClick={hitung} disabled={sibuk} className="inline-flex h-9 items-center gap-2 rounded-md border px-4 text-sm font-semibold hover:bg-muted">
                        {sibuk ? <Loader2 className="h-4 w-4 animate-spin" /> : <Calculator className="h-4 w-4" />} Hitung
                    </button>
                </div>
                {pesan && <div role="alert" className={cn("mt-3 flex items-start gap-2 rounded-md border px-3 py-2 text-sm", pesan.ok ? "border-emerald-300 bg-emerald-50 text-emerald-900" : "border-red-300 bg-red-50 text-red-900")}>
                    {pesan.ok ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /> : <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />} {pesan.teks}</div>}

                {h && <div className="mt-4 space-y-4">
                    <div data-area-cetak data-judul-cetak={`Rekap Penyelesaian Tenant ${h.nama}`} data-subjudul-cetak={`${h.tenant ?? ""} · periode ${h.dari} s.d. ${h.sampai}`} className="rounded-md border">
                        <table className="w-full text-sm">
                            <tbody>
                                <Baris label="Kantin / tenant" nilai={`${h.nama} / ${h.tenant ?? "-"}`} />
                                <Baris label="Periode" nilai={`${h.dari} s.d. ${h.sampai} (${h.periode})`} />
                                <Baris label="Jumlah nota" nilai={String(h.nota)} />
                                <Baris label="Penjualan tunai" nilai={rp(h.tunai)} />
                                <Baris label="Penjualan Simpanan Sukarela" nilai={rp(h.sukarela)} />
                                <Baris label="Total penjualan" nilai={rp(h.penjualan)} tebal />
                                {h.model === "bagi_hasil" ? <>
                                    <Baris label={`Bagi hasil koperasi ${Number(h.persen ?? 0).toLocaleString("id-ID")}%`} nilai={rp(h.bagiHasil)} />
                                    <Baris label={`Kekurangan minimum (min. ${rp(h.minimum)}/bulan)`} nilai={rp(h.tambahan)} />
                                </> : <Baris label="Sewa" nilai={rp(h.tambahan)} />}
                                <Baris label="Utang koperasi ke tenant (belanja sukarela dikurangi bagi hasilnya)" nilai={rp(h.utang)} />
                                <Baris label="Piutang koperasi ke tenant (bagi hasil tunai + kekurangan/sewa)" nilai={rp(h.piutang)} />
                                <Baris label={neto >= 0 ? "Koperasi membayar ke tenant" : "Tenant membayar ke koperasi"} nilai={rp(Math.abs(neto))} tebal />
                            </tbody>
                        </table>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-4">
                        <Field label="Tanggal jurnal"><Input type="date" value={tanggal} onChange={(e) => setTanggal(e.target.value)} /></Field>
                        {neto !== 0 && <Field label={neto > 0 ? "Ditransfer dari" : "Diterima ke"} className="sm:col-span-2">
                            <select className={selectClass} value={akunKas} onChange={(e) => setAkunKas(e.target.value)}>
                                {akun.map((a) => <option key={a.kode_perkiraan} value={a.kode_perkiraan}>{a.kode_perkiraan} {a.nama_perkiraan}</option>)}
                            </select>
                        </Field>}
                        <Field label="Catatan (no. transfer)" className={neto !== 0 ? "" : "sm:col-span-3"}><Input value={catatan} onChange={(e) => setCatatan(e.target.value)} maxLength={255} /></Field>
                    </div>
                    <div className="flex justify-end gap-2">
                        <TombolCetak label="Cetak rekap" />
                        {boleh([MENU.penyelesaianTenant], "tambah") && <button type="button" onClick={simpan} disabled={sibuk} className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-50">
                            {sibuk && <Loader2 className="h-4 w-4 animate-spin" />} Simpan penyelesaian</button>}
                    </div>
                </div>}
            </FormCard>

            <FormCard title="Riwayat penyelesaian" description="Penyelesaian yang dibatalkan tetap tercatat.">
                <div className="overflow-x-auto rounded-md border">
                    <table className="w-full text-sm">
                        <thead className="bg-muted text-xs text-muted-foreground"><tr>
                            <th className="px-3 py-2 text-left">Bukti</th><th className="px-3 py-2 text-left">Kantin</th><th className="px-3 py-2 text-left">Periode</th>
                            <th className="px-3 py-2 text-right">Penjualan</th><th className="px-3 py-2 text-right">Bagi hasil + tambahan</th><th className="px-3 py-2 text-right">Neto</th><th className="w-10" />
                        </tr></thead>
                        <tbody>
                            {riwayat.map((p) => (
                                <tr key={p.id} className={cn("border-t", p.dibatalkan && "text-muted-foreground line-through")}>
                                    <td className="px-3 py-1.5 font-mono text-xs">{p.no_bukti}<div className="font-sans text-muted-foreground no-underline">{p.tanggal} · {p.opr}</div></td>
                                    <td className="px-3 py-1.5">{p.kantin}<div className="text-xs text-muted-foreground">{p.tenant}</div></td>
                                    <td className="px-3 py-1.5 text-xs">{p.dari} s.d. {p.sampai}</td>
                                    <td className="px-3 py-1.5 text-right tabular-nums">{rp(p.penjualan)}</td>
                                    <td className="px-3 py-1.5 text-right tabular-nums">{rp(p.bagi_hasil + p.tambahan)}</td>
                                    <td className="px-3 py-1.5 text-right tabular-nums">{p.neto >= 0 ? "ke tenant " : "dari tenant "}{rp(Math.abs(p.neto))}</td>
                                    <td className="px-2 text-right">{!p.dibatalkan && boleh([MENU.penyelesaianTenant], "hapus") &&
                                        <button type="button" title="Batalkan" disabled={sibuk} onClick={() => batal(p)} className="rounded p-1 text-red-600 hover:bg-red-50"><XCircle className="h-4 w-4" /></button>}</td>
                                </tr>
                            ))}
                            {riwayat.length === 0 && <tr><td colSpan={7} className="px-3 py-5 text-center text-muted-foreground">Belum ada penyelesaian.</td></tr>}
                        </tbody>
                    </table>
                </div>
            </FormCard>
        </div>
    )
}

function Baris({ label, nilai, tebal }: { label: string; nilai: string; tebal?: boolean }) {
    return <tr className={cn("border-t first:border-t-0", tebal && "font-semibold")}><td className="px-3 py-1.5">{label}</td><td className="px-3 py-1.5 text-right tabular-nums">{nilai}</td></tr>
}
