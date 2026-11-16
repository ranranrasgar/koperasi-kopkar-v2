"use client"

import { useMemo, useState, useTransition } from "react"
import Link from "next/link"
import { ImageOff, Minus, Plus, ShoppingBag } from "lucide-react"
import { aturTasAction } from "@/app/actions/kantin"

export interface ProdukKatalog { id: number; nama: string; satuan: string; harga: number; kategori: string | null; kelola_stok: boolean; stok: number; gambar: string | null }

const rupiah = (n: number) => `Rp ${n.toLocaleString("id-ID", { maximumFractionDigits: 0 })}`

/** Kartu produk dengan tombol tambah/kurang; tas disimpan di server setiap kali jumlah berubah. */
export function KatalogKantin({ unitId, produk, tas: awal }: { unitId: number; produk: ProdukKatalog[]; tas: Record<number, number> }) {
    const [tas, setTas] = useState(awal)
    const [kategori, setKategori] = useState<string | null>(null)
    const [galat, setGalat] = useState("")
    const [, mulai] = useTransition()
    const daftarKategori = useMemo(() => [...new Set(produk.map((p) => p.kategori).filter((k): k is string => !!k))], [produk])
    const jumlah = Object.values(tas).reduce((s, n) => s + n, 0)
    const total = produk.reduce((s, p) => s + (tas[p.id] ?? 0) * p.harga, 0)

    const ubah = (p: ProdukKatalog, n: number) => {
        if (n < 0) return
        if (p.kelola_stok && n > p.stok) { setGalat(`Stok ${p.nama} tinggal ${p.stok}`); return }
        const lama = tas[p.id] ?? 0
        setGalat("")
        setTas((t) => ({ ...t, [p.id]: n }))
        mulai(async () => {
            const r = await aturTasAction(unitId, p.id, n)
            if (!r.ok) { setGalat(r.error); setTas((t) => ({ ...t, [p.id]: lama })) }
        })
    }

    return (
        <div className="px-5 pb-28">
            {daftarKategori.length > 0 && (
                <div className="-mx-5 mb-3 flex gap-2 overflow-x-auto px-5 pb-1">
                    {[null, ...daftarKategori].map((k) => (
                        <button key={k ?? "semua"} type="button" onClick={() => setKategori(k)}
                            className={`shrink-0 rounded-full border px-4 py-1.5 text-sm ${kategori === k ? "border-utama bg-utama text-white" : "border-garis"}`}>{k ?? "Semua"}</button>
                    ))}
                </div>
            )}
            {galat && <p role="alert" className="mb-3 rounded-xl bg-keluar-lembut px-4 py-2.5 text-sm text-keluar">{galat}</p>}
            {produk.length === 0 && <p className="py-10 text-center text-sm text-redup">Belum ada menu yang tersedia.</p>}
            <div className="grid grid-cols-2 gap-3">
                {produk.filter((p) => !kategori || p.kategori === kategori).map((p) => {
                    const n = tas[p.id] ?? 0
                    return (
                        <div key={p.id} className="overflow-hidden rounded-2xl border border-garis bg-permukaan">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            {p.gambar ? <img src={`/gambar/${p.gambar}`} alt="" className="aspect-[4/3] w-full object-cover" />
                                : <div className="flex aspect-[4/3] items-center justify-center bg-garis/40"><ImageOff size={22} className="text-redup" /></div>}
                            <div className="p-3">
                                <p className="line-clamp-2 text-sm font-medium leading-snug">{p.nama}</p>
                                <p className="angka mt-0.5 text-sm font-bold text-utama">{rupiah(p.harga)}</p>
                                {p.kelola_stok && <p className="text-xs text-redup">Stok {p.stok}</p>}
                                <div className="mt-2 flex items-center justify-between">
                                    {n === 0 ? (
                                        <button type="button" onClick={() => ubah(p, 1)} className="w-full rounded-full bg-utama-lembut py-1.5 text-sm font-semibold text-utama">Tambah</button>
                                    ) : <>
                                        <button type="button" aria-label="Kurangi" onClick={() => ubah(p, n - 1)} className="grid size-8 place-items-center rounded-full border border-garis"><Minus size={16} /></button>
                                        <span className="angka font-semibold">{n}</span>
                                        <button type="button" aria-label="Tambah" onClick={() => ubah(p, n + 1)} className="grid size-8 place-items-center rounded-full bg-utama text-white"><Plus size={16} /></button>
                                    </>}
                                </div>
                            </div>
                        </div>
                    )
                })}
            </div>
            {jumlah > 0 && (
                <Link href={`/kantin/${unitId}/tas`}
                    className="fixed inset-x-5 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-30 flex items-center justify-between rounded-full bg-utama px-5 py-3.5 text-white shadow-lg">
                    <span className="flex items-center gap-2 font-semibold"><ShoppingBag size={18} /> Tas ({jumlah})</span>
                    <span className="angka font-bold">{rupiah(total)}</span>
                </Link>
            )}
        </div>
    )
}
