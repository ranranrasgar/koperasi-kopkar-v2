"use client"

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ImageOff, LayoutGrid, List, Loader2, LockKeyhole, Minus, Pause, Plus, Printer, QrCode, Search, Trash2, UserRound, X } from "lucide-react"
import { bukaSesiAction, jualTunaiAction, ringkasSesiAction, tutupSesiAction } from "@/app/actions/kantin"
import { AnggotaPicker } from "@/components/transaksi/common"
import { Input } from "@/components/ui/input"
import { InputUang } from "@/components/ui/InputUang"
import { ModalForm } from "@/components/ui/Modal"
import type { AnggotaRingkas } from "@/lib/queries/anggota"
import type { ModelKantin } from "@kopkar/backend/src/unit-usaha/kantin.ts"
import { cn } from "@/lib/utils"

export interface ProdukPos { id: number; kode: string; barcode: string | null; nama: string; kategori: string | null; satuan: string; harga: number; kelola_stok: boolean; stok: number; gambar: string | null }
interface Sesi { sesiId: number; dibuka: string; modal: string; tunai: string; nota: number; batal: number; seharusnya: string }
interface Baris { produkId: number; qty: number }
interface Ditahan { keranjang: Baris[]; anggota: AnggotaRingkas | null; diskon: string }
interface Struk { noBukti: string; waktu: string; kasir: string; anggota: AnggotaRingkas | null; baris: { nama: string; qty: number; harga: number }[]; subtotal: number; diskon: number; total: number; diterima: number; kembalian: number }

const rp = (n: number) => n.toLocaleString("id-ID", { maximumFractionDigits: 0 })
const PECAHAN = [5000, 10000, 20000, 50000, 100000]
const KUNCI_TAMPILAN = "kantin-kasir-tampilan"

/**
 * Layar kasir kantin: katalog (kartu bergambar atau tabel) di kiri, keranjang di kanan. Semua langkah bisa dengan keyboard:
 * F1 cari, F2 pembeli, F3 diskon, F4 tampilan, F7 tahan, F8 bayar tunai, panah atas/bawah pilih baris, + / - jumlah, Del hapus, Esc tutup, Ctrl+P cetak ulang.
 */
export function KasirPos({ unit, produk, sesi, kasir, lebihDariSatu }: { unit: { id: number; nama: string; model: ModelKantin }; produk: ProdukPos[]; sesi: Sesi | null; kasir: string; lebihDariSatu: boolean }) {
    const router = useRouter()
    const cariRef = useRef<HTMLInputElement>(null)
    const [tampilan, setTampilan] = useState<"kartu" | "tabel">("kartu")
    const [kategori, setKategori] = useState<string | null>(null)
    const [cari, setCari] = useState("")
    const [keranjang, setKeranjang] = useState<Baris[]>([])
    const [pilih, setPilih] = useState(0)
    const [anggota, setAnggota] = useState<AnggotaRingkas | null>(null)
    const [diskon, setDiskon] = useState("")
    const [modal, setModal] = useState<null | "bayar" | "anggota" | "diskon" | "tutup">(null)
    const [tahan, setTahan] = useState<Ditahan[]>([])
    const [struk, setStruk] = useState<Struk | null>(null)
    const [cetakOtomatis, setCetakOtomatis] = useState(true)
    const [pesan, setPesan] = useState<{ ok: boolean; teks: string } | null>(null)
    const kunci = useRef<string>("")
    useEffect(() => { kunci.current = crypto.randomUUID() }, [])
    useEffect(() => { try { if (localStorage.getItem(KUNCI_TAMPILAN) === "tabel") setTampilan("tabel") } catch { /* tanpa penyimpanan */ } }, [])
    useEffect(() => { try { localStorage.setItem(KUNCI_TAMPILAN, tampilan) } catch { /* tanpa penyimpanan */ } }, [tampilan])
    useEffect(() => { if (!pesan) return; const t = setTimeout(() => setPesan(null), 6000); return () => clearTimeout(t) }, [pesan])

    const peta = useMemo(() => new Map(produk.map((p) => [p.id, p])), [produk])
    const daftarKategori = useMemo(() => [...new Set(produk.map((p) => p.kategori).filter((k): k is string => !!k))], [produk])
    const tampil = useMemo(() => {
        const q = cari.trim().toLowerCase()
        return produk.filter((p) => (!kategori || p.kategori === kategori) && (!q || [p.nama, p.kode, p.barcode ?? ""].some((x) => x.toLowerCase().includes(q))))
    }, [produk, cari, kategori])
    const diKeranjang = (id: number) => keranjang.find((b) => b.produkId === id)?.qty ?? 0
    const sisa = (p: ProdukPos) => (p.kelola_stok ? p.stok - diKeranjang(p.id) : Infinity)

    const subtotal = keranjang.reduce((s, b) => s + (peta.get(b.produkId)?.harga ?? 0) * b.qty, 0)
    const nilaiDiskon = Math.min(Number(diskon || 0), subtotal)
    const total = subtotal - nilaiDiskon

    const tambah = useCallback((p: ProdukPos, n = 1) => {
        if (p.kelola_stok && p.stok - (keranjang.find((b) => b.produkId === p.id)?.qty ?? 0) < n) { setPesan({ ok: false, teks: `Stok ${p.nama} habis` }); return }
        setKeranjang((k) => {
            const i = k.findIndex((b) => b.produkId === p.id)
            if (i >= 0) { setPilih(i); return k.map((b, j) => (j === i ? { ...b, qty: b.qty + n } : b)) }
            setPilih(k.length)
            return [...k, { produkId: p.id, qty: n }]
        })
    }, [keranjang])
    const ubahQty = useCallback((i: number, delta: number) => {
        const b = keranjang[i]; if (!b) return
        const p = peta.get(b.produkId)
        if (delta > 0 && p && p.kelola_stok && p.stok < b.qty + delta) { setPesan({ ok: false, teks: `Stok ${p.nama} tinggal ${p.stok}` }); return }
        setKeranjang((k) => k.flatMap((x, j) => (j !== i ? [x] : x.qty + delta > 0 ? [{ ...x, qty: x.qty + delta }] : [])))
    }, [keranjang, peta])
    const hapus = useCallback((i: number) => { setKeranjang((k) => k.filter((_, j) => j !== i)); setPilih((n) => Math.max(0, Math.min(n, keranjang.length - 2))) }, [keranjang.length])
    const kosongkan = () => { setKeranjang([]); setAnggota(null); setDiskon(""); setPilih(0) }

    const cariEnter = () => {
        const q = cari.trim().toLowerCase()
        if (!q) return
        const p = produk.find((x) => x.barcode?.toLowerCase() === q || x.kode.toLowerCase() === q) ?? tampil[0]
        if (p) { tambah(p); setCari("") } else setPesan({ ok: false, teks: `Produk "${cari}" tidak ditemukan` })
    }
    const tahanAtauPanggil = () => {
        if (keranjang.length) { setTahan((t) => [...t, { keranjang, anggota, diskon }]); kosongkan(); setPesan({ ok: true, teks: "Transaksi ditahan. Tekan F7 saat keranjang kosong untuk memanggilnya." }) }
        else if (tahan.length) { const d = tahan[tahan.length - 1]; setTahan((t) => t.slice(0, -1)); setKeranjang(d.keranjang); setAnggota(d.anggota); setDiskon(d.diskon) }
    }
    const cetak = () => { if (struk) setTimeout(() => window.print(), 50) }

    // Pintasan keyboard: dipasang sekali, membaca keadaan terbaru lewat ref.
    const aksi = useRef<(e: KeyboardEvent) => void>(() => {})
    useEffect(() => {
        aksi.current = (e: KeyboardEvent) => {
            if (!sesi) return
            const diInput = document.activeElement instanceof HTMLInputElement || document.activeElement instanceof HTMLTextAreaElement
            const kunciF: Record<string, () => void> = {
                F1: () => cariRef.current?.focus(), F2: () => setModal("anggota"), F3: () => setModal("diskon"),
                F4: () => setTampilan((t) => (t === "kartu" ? "tabel" : "kartu")), F7: tahanAtauPanggil,
                F8: () => { if (keranjang.length) setModal("bayar") },
                F9: () => setPesan({ ok: false, teks: "Bayar dengan Simpanan Sukarela (QR) hadir di tahap berikutnya" }),
                F10: () => setPesan({ ok: false, teks: "Bayar dengan Simpanan Sukarela (QR) hadir di tahap berikutnya" }),
            }
            if (kunciF[e.key]) { e.preventDefault(); if (!modal) kunciF[e.key](); return }
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "p") { e.preventDefault(); cetak(); return }
            if (modal) return
            if (e.key === "Escape") { setCari(""); cariRef.current?.focus(); return }
            if (e.key === "ArrowDown" || e.key === "ArrowUp") { e.preventDefault(); setPilih((n) => Math.max(0, Math.min(keranjang.length - 1, n + (e.key === "ArrowDown" ? 1 : -1)))); return }
            const bebas = !diInput || cari === ""
            if (bebas && (e.key === "+" || e.key === "=")) { e.preventDefault(); ubahQty(pilih, 1) }
            else if (bebas && e.key === "-") { e.preventDefault(); ubahQty(pilih, -1) }
            else if (bebas && e.key === "Delete") { e.preventDefault(); hapus(pilih) }
        }
    })
    useEffect(() => {
        const f = (e: KeyboardEvent) => aksi.current(e)
        window.addEventListener("keydown", f)
        return () => window.removeEventListener("keydown", f)
    }, [])

    if (!sesi) return <BukaSesi unit={unit} lebihDariSatu={lebihDariSatu} />

    const selesaiJual = (s: Struk) => {
        setStruk(s); kosongkan(); setModal(null)
        kunci.current = crypto.randomUUID()
        setPesan({ ok: true, teks: `${s.noBukti} tersimpan. Kembalian Rp ${rp(s.kembalian)}` })
        router.refresh()
        if (cetakOtomatis) setTimeout(() => window.print(), 100)
        cariRef.current?.focus()
    }

    return (
        <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2 text-sm">
                <h1 className="text-lg font-semibold">{unit.nama}</h1>
                <span className="rounded-full bg-muted px-2 py-0.5 text-xs">Kasir {kasir}</span>
                <span className="text-xs text-muted-foreground">Sesi dibuka {new Date(sesi.dibuka).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })} · {sesi.nota} nota · tunai Rp {rp(Number(sesi.tunai))}</span>
                <div className="ml-auto flex items-center gap-2">
                    {lebihDariSatu && <Link href="?" className="rounded-md border px-2 py-1 text-xs hover:bg-muted">Ganti kantin</Link>}
                    <label className="flex items-center gap-1 text-xs"><input type="checkbox" checked={cetakOtomatis} onChange={(e) => setCetakOtomatis(e.target.checked)} /> Cetak struk otomatis</label>
                    <button type="button" onClick={cetak} disabled={!struk} className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs hover:bg-muted disabled:opacity-40"><Printer className="h-3.5 w-3.5" /> Cetak ulang (Ctrl+P)</button>
                    <button type="button" onClick={() => setModal("tutup")} className="inline-flex items-center gap-1 rounded-md border border-red-300 px-2 py-1 text-xs text-red-700 hover:bg-red-50"><LockKeyhole className="h-3.5 w-3.5" /> Tutup sesi</button>
                </div>
            </div>

            <div className="grid gap-3 lg:grid-cols-[1fr_380px]">
                {/* Katalog */}
                <div className="min-w-0 space-y-2 rounded-lg border bg-card p-3">
                    <div className="flex gap-2">
                        <div className="relative flex-1">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input ref={cariRef} autoFocus value={cari} onChange={(e) => setCari(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); cariEnter() } }}
                                placeholder="F1 Cari nama / kode, atau pindai barcode lalu Enter" className="pl-8" />
                        </div>
                        <button type="button" title="F4 Ganti tampilan" onClick={() => setTampilan((t) => (t === "kartu" ? "tabel" : "kartu"))} className="rounded-md border px-2.5 hover:bg-muted">
                            {tampilan === "kartu" ? <List className="h-4 w-4" /> : <LayoutGrid className="h-4 w-4" />}
                        </button>
                    </div>
                    {daftarKategori.length > 0 && <div className="flex gap-1.5 overflow-x-auto pb-1">
                        {[null, ...daftarKategori].map((k) => (
                            <button key={k ?? "semua"} type="button" onClick={() => setKategori(k)}
                                className={cn("shrink-0 rounded-full border px-3 py-1 text-xs", kategori === k ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted")}>{k ?? "Semua"}</button>
                        ))}
                    </div>}
                    <div className="max-h-[calc(100vh-15rem)] overflow-y-auto">
                        {tampilan === "kartu" ? (
                            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-4">
                                {tampil.map((p) => {
                                    const habis = sisa(p) <= 0
                                    return (
                                        <button key={p.id} type="button" disabled={habis} onClick={() => tambah(p)}
                                            className={cn("flex flex-col overflow-hidden rounded-lg border text-left transition hover:border-primary hover:shadow-sm", habis && "opacity-40")}>
                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                            {p.gambar ? <img src={`/dashboard/gambar/${p.gambar}`} alt="" className="aspect-[4/3] w-full object-cover" />
                                                : <div className="flex aspect-[4/3] w-full items-center justify-center bg-muted"><ImageOff className="h-6 w-6 text-muted-foreground" /></div>}
                                            <div className="space-y-0.5 p-2">
                                                <div className="line-clamp-2 text-sm font-medium leading-tight">{p.nama}</div>
                                                <div className="text-sm font-semibold text-primary">Rp {rp(p.harga)}</div>
                                                {p.kelola_stok && <div className={cn("text-[11px]", sisa(p) <= 3 ? "text-amber-700" : "text-muted-foreground")}>Stok {sisa(p)}</div>}
                                            </div>
                                        </button>
                                    )
                                })}
                            </div>
                        ) : (
                            <table className="w-full text-sm">
                                <thead className="sticky top-0 bg-muted text-xs text-muted-foreground"><tr><th className="px-2 py-1.5 text-left">Kode</th><th className="px-2 py-1.5 text-left">Produk</th><th className="px-2 py-1.5 text-right">Harga</th><th className="px-2 py-1.5 text-right">Stok</th></tr></thead>
                                <tbody>
                                    {tampil.map((p) => (
                                        <tr key={p.id} onClick={() => sisa(p) > 0 && tambah(p)} className={cn("cursor-pointer border-t hover:bg-muted/50", sisa(p) <= 0 && "opacity-40")}>
                                            <td className="px-2 py-1.5 font-mono text-xs">{p.kode}</td>
                                            <td className="px-2 py-1.5">{p.nama} <span className="text-xs text-muted-foreground">/{p.satuan}</span></td>
                                            <td className="px-2 py-1.5 text-right tabular-nums">{rp(p.harga)}</td>
                                            <td className="px-2 py-1.5 text-right tabular-nums">{p.kelola_stok ? sisa(p) : "-"}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                        {tampil.length === 0 && <p className="py-10 text-center text-sm text-muted-foreground">{produk.length ? "Tidak ada produk yang cocok." : "Belum ada produk aktif. Tambahkan di menu Produk Kantin."}</p>}
                    </div>
                </div>

                {/* Keranjang */}
                <div className="flex flex-col rounded-lg border bg-card">
                    <button type="button" onClick={() => setModal("anggota")} className="flex items-center gap-2 border-b px-3 py-2 text-left text-sm hover:bg-muted/50">
                        <UserRound className="h-4 w-4 text-muted-foreground" />
                        <span className="flex-1">{anggota ? <><b>{anggota.nama}</b> <span className="text-xs text-muted-foreground">{anggota.kode_agt}</span></> : <span className="text-muted-foreground">Pembeli umum</span>}</span>
                        <kbd className="rounded border px-1 text-[10px]">F2</kbd>
                    </button>
                    <div className="max-h-[calc(100vh-25rem)] min-h-40 flex-1 overflow-y-auto">
                        {keranjang.map((b, i) => {
                            const p = peta.get(b.produkId)
                            if (!p) return null
                            return (
                                <div key={b.produkId} onClick={() => setPilih(i)} className={cn("flex items-center gap-2 border-b px-3 py-2 text-sm", i === pilih && "bg-primary/10")}>
                                    <div className="min-w-0 flex-1">
                                        <div className="truncate font-medium">{p.nama}</div>
                                        <div className="text-xs text-muted-foreground">Rp {rp(p.harga)} / {p.satuan}</div>
                                    </div>
                                    <button type="button" onClick={() => ubahQty(i, -1)} className="rounded border p-1 hover:bg-muted"><Minus className="h-3 w-3" /></button>
                                    <span className="w-6 text-center tabular-nums">{b.qty}</span>
                                    <button type="button" onClick={() => ubahQty(i, 1)} className="rounded border p-1 hover:bg-muted"><Plus className="h-3 w-3" /></button>
                                    <span className="w-20 text-right font-semibold tabular-nums">{rp(p.harga * b.qty)}</span>
                                    <button type="button" onClick={() => hapus(i)} className="rounded p-1 text-red-600 hover:bg-red-50"><Trash2 className="h-3.5 w-3.5" /></button>
                                </div>
                            )
                        })}
                        {keranjang.length === 0 && <p className="px-3 py-10 text-center text-sm text-muted-foreground">Keranjang kosong.<br /><span className="text-xs">Klik produk, atau ketik lalu Enter.{tahan.length ? ` ${tahan.length} transaksi ditahan (F7).` : ""}</span></p>}
                    </div>
                    <div className="space-y-1 border-t px-3 py-2 text-sm">
                        <div className="flex justify-between"><span>Subtotal</span><span className="tabular-nums">{rp(subtotal)}</span></div>
                        <button type="button" onClick={() => setModal("diskon")} className="flex w-full justify-between text-muted-foreground hover:text-foreground"><span>Diskon <kbd className="rounded border px-1 text-[10px]">F3</kbd></span><span className="tabular-nums">{nilaiDiskon ? `-${rp(nilaiDiskon)}` : "0"}</span></button>
                        <div className="flex justify-between text-xl font-bold"><span>Total</span><span className="tabular-nums">Rp {rp(total)}</span></div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 border-t p-3">
                        <button type="button" disabled={!keranjang.length} onClick={() => setModal("bayar")} className="col-span-2 h-12 rounded-md bg-primary text-base font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-40">F8 Bayar Tunai</button>
                        <button type="button" onClick={() => setPesan({ ok: false, teks: "Bayar dengan Simpanan Sukarela (QR) hadir di tahap berikutnya" })} className="inline-flex items-center justify-center gap-1 rounded-md border px-2 py-2 text-xs text-muted-foreground"><QrCode className="h-3.5 w-3.5" /> F9 QR anggota</button>
                        <button type="button" onClick={() => setPesan({ ok: false, teks: "Bayar dengan Simpanan Sukarela (QR) hadir di tahap berikutnya" })} className="inline-flex items-center justify-center gap-1 rounded-md border px-2 py-2 text-xs text-muted-foreground"><QrCode className="h-3.5 w-3.5" /> F10 QR kantin</button>
                        <button type="button" onClick={tahanAtauPanggil} className="inline-flex items-center justify-center gap-1 rounded-md border px-2 py-2 text-xs hover:bg-muted"><Pause className="h-3.5 w-3.5" /> F7 {keranjang.length ? "Tahan" : `Panggil (${tahan.length})`}</button>
                        <button type="button" disabled={!keranjang.length} onClick={() => confirm("Kosongkan keranjang?") && kosongkan()} className="inline-flex items-center justify-center gap-1 rounded-md border px-2 py-2 text-xs text-red-700 hover:bg-red-50 disabled:opacity-40"><X className="h-3.5 w-3.5" /> Batal</button>
                    </div>
                </div>
            </div>
            <p className="text-[11px] text-muted-foreground">F1 cari · F2 pembeli · F3 diskon · F4 tampilan · F7 tahan/panggil · F8 bayar · ↑↓ pilih baris · + / − jumlah · Del hapus · Esc kosongkan pencarian · Ctrl+P cetak ulang</p>

            {pesan && <div role="status" className={cn("fixed bottom-4 right-4 z-50 max-w-[24rem] rounded-md border px-4 py-3 text-sm shadow-lg", pesan.ok ? "border-emerald-300 bg-emerald-50 text-emerald-900" : "border-amber-300 bg-amber-50 text-amber-900")}>{pesan.teks}</div>}

            <ModalForm open={modal === "bayar"} onOpenChange={(b) => !b && setModal(null)} judul="Bayar tunai" kunci={false}>
                <Bayar total={total} onBatal={() => setModal(null)} onBayar={async (diterima) => {
                    const h = await jualTunaiAction({ unitId: unit.id, kodeAgt: anggota?.kode_agt ?? null, items: keranjang.map((b) => ({ produkId: b.produkId, qty: String(b.qty) })), diskon: String(nilaiDiskon), uangDiterima: String(diterima), kunci: kunci.current })
                    if (!h.ok) return h.error
                    selesaiJual({ noBukti: h.data.noBukti, waktu: h.data.waktu, kasir: h.data.kasir, anggota, subtotal, diskon: nilaiDiskon, total: Number(h.data.total), diterima, kembalian: Number(h.data.kembalian),
                        baris: keranjang.map((b) => ({ nama: peta.get(b.produkId)?.nama ?? "", qty: b.qty, harga: peta.get(b.produkId)?.harga ?? 0 })) })
                    if (h.pesan.startsWith("MODE UJI")) setPesan({ ok: false, teks: h.pesan })
                    return null
                }} />
            </ModalForm>
            <ModalForm open={modal === "anggota"} onOpenChange={(b) => !b && setModal(null)} judul="Pembeli" keterangan="Opsional untuk tunai. Cari anggota atau pindai QR dari HP anggota." kunci={false}>
                <div className="space-y-3">
                    <AnggotaPicker value={anggota} onChange={(a) => { setAnggota(a); if (a) setModal(null) }} pindai />
                    {anggota && <button type="button" onClick={() => { setAnggota(null); setModal(null) }} className="text-sm text-muted-foreground hover:text-foreground">Jadikan pembeli umum</button>}
                </div>
            </ModalForm>
            <ModalForm open={modal === "diskon"} onOpenChange={(b) => !b && setModal(null)} judul="Diskon nota" keterangan={`Subtotal Rp ${rp(subtotal)}`} kunci={false}>
                <form onSubmit={(e) => { e.preventDefault(); setModal(null) }} className="space-y-3">
                    <InputUang value={diskon} onChange={setDiskon} autoFocus placeholder="0" />
                    <div className="flex gap-2">{[5, 10].map((n) => <button key={n} type="button" onClick={() => setDiskon(String(Math.round(subtotal * n / 100)))} className="rounded-md border px-3 py-1 text-sm hover:bg-muted">{n}%</button>)}
                        <button type="button" onClick={() => setDiskon("")} className="rounded-md border px-3 py-1 text-sm hover:bg-muted">Tanpa diskon</button></div>
                    <button type="submit" className="h-9 w-full rounded-md bg-primary text-sm font-semibold text-primary-foreground">Terapkan (Enter)</button>
                </form>
            </ModalForm>
            <ModalForm open={modal === "tutup"} onOpenChange={(b) => !b && setModal(null)} judul="Tutup sesi kasir" kunci={false}>
                <TutupSesi unitId={unit.id} sesi={sesi} onSelesai={() => { setModal(null); router.refresh() }} />
            </ModalForm>

            {struk && <StrukCetak unit={unit.nama} s={struk} />}
        </div>
    )
}

function Bayar({ total, onBayar, onBatal }: { total: number; onBayar: (diterima: number) => Promise<string | null>; onBatal: () => void }) {
    const [nilai, setNilai] = useState(String(total))
    const [galat, setGalat] = useState<string | null>(null)
    const [sibuk, mulai] = useTransition()
    const diterima = Number(nilai || 0)
    const kembali = diterima - total
    const saran = [total, ...PECAHAN.map((p) => Math.ceil(total / p) * p)].filter((v, i, a) => v >= total && a.indexOf(v) === i).slice(0, 5)
    const kirim = (e?: React.FormEvent) => {
        e?.preventDefault()
        if (diterima < total) { setGalat("Uang diterima kurang dari total"); return }
        mulai(async () => setGalat(await onBayar(diterima)))
    }
    return (
        <form onSubmit={kirim} className="space-y-3">
            <div className="rounded-md bg-muted px-3 py-2 text-center"><div className="text-xs text-muted-foreground">Total</div><div className="text-3xl font-bold tabular-nums">Rp {rp(total)}</div></div>
            <label className="block text-xs font-semibold text-muted-foreground">Uang diterima</label>
            <InputUang value={nilai} onChange={setNilai} autoFocus className="h-12 text-2xl font-semibold" />
            <div className="flex flex-wrap gap-2">{saran.map((v) => <button key={v} type="button" onClick={() => setNilai(String(v))} className="rounded-md border px-3 py-1.5 text-sm hover:bg-muted">{v === total ? "Uang pas" : rp(v)}</button>)}</div>
            <div className={cn("flex justify-between rounded-md border px-3 py-2 text-lg font-semibold", kembali < 0 ? "border-red-300 text-red-700" : "border-emerald-300 text-emerald-800")}>
                <span>{kembali < 0 ? "Kurang" : "Kembalian"}</span><span className="tabular-nums">Rp {rp(Math.abs(kembali))}</span>
            </div>
            {galat && <p role="alert" className="text-sm text-red-700">{galat}</p>}
            <div className="flex gap-2">
                <button type="button" onClick={onBatal} className="h-10 flex-1 rounded-md border text-sm hover:bg-muted">Kembali (Esc)</button>
                <button type="submit" disabled={sibuk || kembali < 0} className="inline-flex h-10 flex-[2] items-center justify-center gap-2 rounded-md bg-primary text-sm font-semibold text-primary-foreground disabled:opacity-50">
                    {sibuk && <Loader2 className="h-4 w-4 animate-spin" />} Simpan (Enter)
                </button>
            </div>
        </form>
    )
}

function BukaSesi({ unit, lebihDariSatu }: { unit: { id: number; nama: string }; lebihDariSatu: boolean }) {
    const router = useRouter()
    const [modal, setModal] = useState("")
    const [galat, setGalat] = useState<string | null>(null)
    const [sibuk, mulai] = useTransition()
    return (
        <div className="mx-auto mt-10 w-full max-w-[28rem] rounded-lg border bg-card p-6">
            <h1 className="text-lg font-semibold">Buka sesi kasir {unit.nama}</h1>
            <p className="mb-4 text-sm text-muted-foreground">Hitung uang modal di laci, lalu isi di bawah. Saat tutup sesi, uang laci dicocokkan dengan modal + penjualan tunai.</p>
            <form onSubmit={(e) => { e.preventDefault(); mulai(async () => { const h = await bukaSesiAction(unit.id, modal || "0"); if (h && !h.ok) setGalat(h.error); else router.refresh() }) }} className="space-y-3">
                <label className="block text-xs font-semibold text-muted-foreground">Modal awal laci (Rp)</label>
                <InputUang value={modal} onChange={setModal} autoFocus placeholder="0" />
                {galat && <p role="alert" className="text-sm text-red-700">{galat}</p>}
                <button type="submit" disabled={sibuk} className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-primary text-sm font-semibold text-primary-foreground">{sibuk && <Loader2 className="h-4 w-4 animate-spin" />} Buka sesi (Enter)</button>
            </form>
            {lebihDariSatu && <Link href="?" className="mt-3 block text-center text-sm text-muted-foreground hover:text-foreground">Pilih kantin lain</Link>}
        </div>
    )
}

function TutupSesi({ unitId, sesi: awal, onSelesai }: { unitId: number; sesi: Sesi; onSelesai: () => void }) {
    const [sesi, setSesi] = useState(awal)
    const [fisik, setFisik] = useState("")
    const [catatan, setCatatan] = useState("")
    const [hasil, setHasil] = useState<{ ok: boolean; teks: string } | null>(null)
    const [sibuk, mulai] = useTransition()
    useEffect(() => { ringkasSesiAction(unitId).then((r) => { if (r.ok) setSesi(r.data) }) }, [unitId])
    const selisih = Number(fisik || 0) - Number(sesi.seharusnya)
    return (
        <form onSubmit={(e) => { e.preventDefault(); mulai(async () => {
            const h = await tutupSesiAction(unitId, sesi.sesiId, fisik || "0", catatan)
            setHasil(h.ok ? { ok: true, teks: h.pesan } : { ok: false, teks: h.error })
            if (h.ok) setTimeout(onSelesai, 2000)
        }) }} className="space-y-3 text-sm">
            <div className="space-y-1 rounded-md border px-3 py-2">
                <div className="flex justify-between"><span>Modal awal</span><span className="tabular-nums">{rp(Number(sesi.modal))}</span></div>
                <div className="flex justify-between"><span>Penjualan tunai ({sesi.nota} nota{sesi.batal ? `, ${sesi.batal} batal` : ""})</span><span className="tabular-nums">{rp(Number(sesi.tunai))}</span></div>
                <div className="flex justify-between font-semibold"><span>Seharusnya di laci</span><span className="tabular-nums">Rp {rp(Number(sesi.seharusnya))}</span></div>
            </div>
            <label className="block text-xs font-semibold text-muted-foreground">Uang fisik di laci (Rp)</label>
            <InputUang value={fisik} onChange={setFisik} autoFocus />
            {fisik !== "" && <p className={cn("font-semibold", selisih === 0 ? "text-emerald-700" : "text-red-700")}>{selisih === 0 ? "Cocok" : `Selisih ${selisih < 0 ? "kurang" : "lebih"} Rp ${rp(Math.abs(selisih))}`}</p>}
            <Input value={catatan} onChange={(e) => setCatatan(e.target.value)} placeholder="Catatan (opsional), mis. alasan selisih" maxLength={255} />
            {hasil && <p role="alert" className={hasil.ok ? "text-emerald-700" : "text-red-700"}>{hasil.teks}</p>}
            <button type="submit" disabled={sibuk || fisik === ""} className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-red-600 font-semibold text-white disabled:opacity-50">{sibuk && <Loader2 className="h-4 w-4 animate-spin" />} Tutup sesi</button>
        </form>
    )
}

/** Struk termal 58/80 mm: hanya tampil saat dicetak. */
function StrukCetak({ unit, s }: { unit: string; s: Struk }) {
    return (
        <div id="struk-kantin" className="hidden font-mono text-[11px] leading-tight text-black print:block">
            <style>{`@media print { body * { visibility: hidden !important; } #struk-kantin, #struk-kantin * { visibility: visible !important; }
                #struk-kantin { position: fixed; left: 0; top: 0; width: 72mm; } @page { margin: 3mm; } }`}</style>
            <div className="text-center font-bold">{unit}</div>
            <div className="text-center">Koperasi Karyawan MJS 2000</div>
            <div className="my-1 border-t border-dashed border-black" />
            <div>{s.noBukti}</div>
            <div>{new Date(s.waktu).toLocaleString("id-ID", { dateStyle: "short", timeStyle: "short" })} · {s.kasir}</div>
            {s.anggota && <div>{s.anggota.nama} ({s.anggota.kode_agt})</div>}
            <div className="my-1 border-t border-dashed border-black" />
            {s.baris.map((b, i) => (
                <div key={i}>
                    <div>{b.nama}</div>
                    <div className="flex justify-between"><span>{b.qty} x {rp(b.harga)}</span><span>{rp(b.qty * b.harga)}</span></div>
                </div>
            ))}
            <div className="my-1 border-t border-dashed border-black" />
            <div className="flex justify-between"><span>Subtotal</span><span>{rp(s.subtotal)}</span></div>
            {s.diskon > 0 && <div className="flex justify-between"><span>Diskon</span><span>-{rp(s.diskon)}</span></div>}
            <div className="flex justify-between font-bold"><span>TOTAL</span><span>{rp(s.total)}</span></div>
            <div className="flex justify-between"><span>Tunai</span><span>{rp(s.diterima)}</span></div>
            <div className="flex justify-between"><span>Kembali</span><span>{rp(s.kembalian)}</span></div>
            <div className="my-1 border-t border-dashed border-black" />
            <div className="text-center">Terima kasih</div>
        </div>
    )
}
