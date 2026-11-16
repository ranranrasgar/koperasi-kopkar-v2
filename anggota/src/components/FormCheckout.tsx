"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Loader2, Minus, Plus } from "lucide-react"
import { aturTasAction, checkoutAction } from "@/app/actions/kantin"

interface BarisTas { produkId: number; nama: string; satuan: string; harga: number; qty: number; stok: number | null }
const rupiah = (n: number) => `Rp ${n.toLocaleString("id-ID", { maximumFractionDigits: 0 })}`

/** Isi tas, catatan, cara bayar (Simpanan Sukarela dengan PIN, atau tunai saat ambil), lalu kirim pesanan. */
export function FormCheckout({ unitId, baris: awal, saldo, adaPin, terimaTunai, terimaSukarela, menit }: {
    unitId: number; baris: BarisTas[]; saldo: number; adaPin: boolean; terimaTunai: boolean; terimaSukarela: boolean; menit: number
}) {
    const router = useRouter()
    const [baris, setBaris] = useState(awal)
    const [catatan, setCatatan] = useState("")
    const [metode, setMetode] = useState<"sukarela" | "tunai">(terimaSukarela ? "sukarela" : "tunai")
    const [pin, setPin] = useState("")
    const [galat, setGalat] = useState("")
    const [sibuk, mulai] = useTransition()
    const total = baris.reduce((s, b) => s + b.harga * b.qty, 0)

    const ubah = (b: BarisTas, n: number) => {
        if (b.stok !== null && n > b.stok) { setGalat(`Stok ${b.nama} tinggal ${b.stok}`); return }
        setGalat("")
        setBaris((x) => x.flatMap((y) => (y.produkId !== b.produkId ? [y] : n > 0 ? [{ ...y, qty: n }] : [])))
        mulai(async () => { const r = await aturTasAction(unitId, b.produkId, n); if (!r.ok) { setGalat(r.error); router.refresh() } })
    }
    const pesan = (e: React.FormEvent) => {
        e.preventDefault()
        setGalat("")
        mulai(async () => {
            const r = await checkoutAction({ unitId, metode, catatan, totalDilihat: String(total), pin })
            if (!r.ok) { setGalat(r.error); setPin(""); return }
            router.push(`/kantin/pesanan/${r.id}`)
        })
    }

    if (!baris.length) return (
        <div className="px-5 py-10 text-center text-sm text-redup">Tas masih kosong. <Link href={`/kantin/${unitId}`} className="font-semibold text-utama">Pilih menu</Link></div>
    )
    return (
        <form onSubmit={pesan} className="space-y-5 px-5 pb-10">
            <div className="-mx-5 divide-y divide-garis border-y border-garis">
                {baris.map((b) => (
                    <div key={b.produkId} className="flex items-center gap-3 px-5 py-3">
                        <div className="min-w-0 flex-1">
                            <p className="truncate font-medium">{b.nama}</p>
                            <p className="angka text-xs text-redup">{rupiah(b.harga)} / {b.satuan}</p>
                        </div>
                        <button type="button" aria-label="Kurangi" onClick={() => ubah(b, b.qty - 1)} className="grid size-8 place-items-center rounded-full border border-garis"><Minus size={16} /></button>
                        <span className="angka w-5 text-center font-semibold">{b.qty}</span>
                        <button type="button" aria-label="Tambah" onClick={() => ubah(b, b.qty + 1)} className="grid size-8 place-items-center rounded-full border border-garis"><Plus size={16} /></button>
                        <span className="angka w-20 text-right font-semibold">{rupiah(b.harga * b.qty)}</span>
                    </div>
                ))}
                <div className="flex justify-between px-5 py-3 text-lg font-bold"><span>Total</span><span className="angka">{rupiah(total)}</span></div>
            </div>

            <div>
                <label htmlFor="catatan" className="text-sm font-medium">Catatan untuk kantin</label>
                <input id="catatan" value={catatan} onChange={(e) => setCatatan(e.target.value)} maxLength={255} placeholder="Mis. tidak pedas, diambil jam 12"
                    className="mt-2 w-full rounded-xl border border-garis bg-transparent px-4 py-3 text-sm" />
            </div>

            <fieldset className="space-y-2">
                <legend className="mb-2 text-sm font-medium">Cara bayar</legend>
                {terimaSukarela && <label className={`flex items-start gap-3 rounded-xl border px-4 py-3 ${metode === "sukarela" ? "border-utama" : "border-garis"}`}>
                    <input type="radio" name="metode" checked={metode === "sukarela"} onChange={() => setMetode("sukarela")} className="mt-1" />
                    <span><span className="font-medium">Simpanan Sukarela</span><span className="block text-xs text-redup">Saldo {rupiah(saldo)}{saldo - total < 0 ? " · tidak cukup" : ` · sisa ${rupiah(saldo - total)}`}. Langsung dibayar.</span></span>
                </label>}
                {terimaTunai && <label className={`flex items-start gap-3 rounded-xl border px-4 py-3 ${metode === "tunai" ? "border-utama" : "border-garis"}`}>
                    <input type="radio" name="metode" checked={metode === "tunai"} onChange={() => setMetode("tunai")} className="mt-1" />
                    <span><span className="font-medium">Tunai saat ambil</span><span className="block text-xs text-redup">Bayar di kasir. Pesanan batal bila tidak diambil dalam {menit} menit.</span></span>
                </label>}
            </fieldset>

            {metode === "sukarela" && (adaPin ? (
                <div>
                    <label htmlFor="pin-pesan" className="text-sm font-medium">PIN transaksi</label>
                    <input id="pin-pesan" type="password" inputMode="numeric" autoComplete="off" maxLength={6} value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
                        className="angka mt-2 w-full rounded-xl border border-garis bg-transparent px-4 py-3 text-center text-2xl tracking-[0.5em]" />
                </div>
            ) : <p className="text-sm">Bayar dengan Simpanan Sukarela memerlukan PIN transaksi. <Link href="/akun/pin" className="font-semibold text-utama underline">Atur PIN</Link></p>)}

            {galat && <p role="alert" className="rounded-xl bg-keluar-lembut px-4 py-3 text-sm text-keluar">{galat}</p>}
            <button type="submit" disabled={sibuk || (metode === "sukarela" && (!adaPin || pin.length !== 6))}
                className="flex h-13 w-full items-center justify-center gap-2 rounded-xl bg-utama text-base font-semibold text-white disabled:opacity-50">
                {sibuk && <Loader2 size={18} className="animate-spin" />} {metode === "sukarela" ? `Bayar ${rupiah(total)}` : "Kirim pesanan"}
            </button>
        </form>
    )
}
