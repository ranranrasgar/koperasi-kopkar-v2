"use client"

import React, { useActionState, useEffect, useRef, useState, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, Bold, Heading2, Info, Link2, List, ListOrdered, Loader2, Save, Table, Trash2, TriangleAlert } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Field, selectClass } from "@/components/transaksi/common"
import { IsiPanduan } from "@/components/panduan/IsiPanduan"
import { Pesan } from "@/components/panduan/KelolaPanduan"
import { hapusArtikelAction, simpanArtikelAction, type HasilPanduan } from "@/app/actions/panduan"
import { slugTeks } from "@/lib/panduan-teks"
import { cn } from "@/lib/utils"

export interface ArtikelEdit {
    id: number | null; kategori_id: number | null; slug: string; judul: string; ringkasan: string; isi: string
    href_menu: string; urutan: number; terbit: boolean
}

// Sisipan format: [sebelum, sesudah, teks contoh bila tidak ada yang dipilih]. Blok diawali baris kosong
// supaya tidak menempel ke paragraf sebelumnya (tabel tidak dikenali tanpa baris kosong).
const ALAT: { label: string; ikon: typeof Bold; sisip: [string, string, string] }[] = [
    { label: "Judul bagian", ikon: Heading2, sisip: ["\n\n## ", "\n\n", "Judul bagian"] },
    { label: "Tebal", ikon: Bold, sisip: ["**", "**", "teks tebal"] },
    { label: "Daftar berbutir", ikon: List, sisip: ["\n\n- ", "\n", "butir"] },
    { label: "Daftar bernomor", ikon: ListOrdered, sisip: ["\n\n1. ", "\n", "langkah pertama"] },
    { label: "Tabel", ikon: Table, sisip: ["\n\n| Kolom 1 | Kolom 2 |\n| --- | --- |\n| ", " | isi |\n\n", "isi"] },
    { label: "Kotak penting", ikon: TriangleAlert, sisip: ["\n\n> **Penting:** ", "\n\n", "hal yang wajib diperhatikan"] },
    { label: "Kotak catatan", ikon: Info, sisip: ["\n\n> **Catatan:** ", "\n\n", "keterangan tambahan"] },
    { label: "Tautan halaman", ikon: Link2, sisip: ["[", "](/dashboard)", "teks tautan"] },
]

export function EditorArtikel({ awal, kategori, menu }: {
    awal: ArtikelEdit
    kategori: { id: number; nama: string }[]
    menu: { grup: string; item: { label: string; href: string }[] }[]
}) {
    const router = useRouter()
    const [hasil, jalankan, pending] = useActionState(simpanArtikelAction, null)
    const [hapus, setHapus] = useState<HasilPanduan>(null)
    const [, startTransition] = useTransition()
    const [judul, setJudul] = useState(awal.judul)
    const [slug, setSlug] = useState(awal.slug)
    const [slugManual, setSlugManual] = useState(!!awal.id)
    const [isi, setIsi] = useState(awal.isi)
    const [tab, setTab] = useState<"tulis" | "pratinjau">("tulis")
    const [berubah, setBerubah] = useState(false)
    const area = useRef<HTMLTextAreaElement>(null)

    // Artikel baru yang berhasil disimpan pindah ke alamat ubah, supaya simpan berikutnya memperbarui, bukan menambah lagi.
    useEffect(() => {
        if (hasil?.ok) {
            setBerubah(false)
            if (!awal.id && hasil.id) router.replace(`/dashboard/panduan/kelola/artikel/${hasil.id}?disimpan=1`)
        }
    }, [hasil, awal.id, router])
    useEffect(() => {
        if (!berubah) return
        const cegah = (e: BeforeUnloadEvent) => e.preventDefault()
        window.addEventListener("beforeunload", cegah)
        return () => window.removeEventListener("beforeunload", cegah)
    }, [berubah])

    // Format inline (tebal, tautan) membungkus teks yang dipilih. Blok (judul, daftar, tabel, kotak) disisipkan di akhir
    // baris tempat kursor berada, supaya tidak memotong baris tabel atau paragraf.
    const sisipkan = ([sebelum, sesudah, contoh]: [string, string, string]) => {
        const el = area.current
        if (!el) return
        const { selectionStart: a, selectionEnd: b } = el
        let awal = a, akhir = b, pilih = isi.slice(a, b) || contoh
        if (sebelum.startsWith("\n\n")) {
            const ujung = isi.indexOf("\n", b)
            awal = akhir = ujung < 0 ? isi.length : ujung
            pilih = contoh
        }
        const baru = isi.slice(0, awal) + sebelum + pilih + sesudah + isi.slice(akhir)
        setIsi(baru)
        setBerubah(true)
        requestAnimationFrame(() => {
            el.focus()
            el.setSelectionRange(awal + sebelum.length, awal + sebelum.length + pilih.length)
        })
    }

    const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        const data = new FormData(e.currentTarget)
        data.set("isi", isi)
        startTransition(() => jalankan(data))
    }

    return (
        <form onSubmit={onSubmit} onChange={() => setBerubah(true)} className="space-y-5">
            {awal.id && <input type="hidden" name="id" value={awal.id} />}
            <div className="flex flex-wrap items-center gap-2">
                <Button asChild variant="outline" size="sm"><Link href="/dashboard/panduan/kelola"><ArrowLeft className="h-4 w-4" /> Daftar panduan</Link></Button>
                {awal.id && awal.terbit && (
                    <Button asChild variant="outline" size="sm"><Link href={`/dashboard/panduan/${awal.slug}`}>Lihat artikel</Link></Button>
                )}
                <span className="flex-1" />
                {awal.id && (
                    <Button type="button" variant="outline" size="sm" className="text-destructive"
                        onClick={() => {
                            if (!confirm(`Hapus artikel "${awal.judul}"? Tindakan ini tidak bisa dibatalkan.`)) return
                            startTransition(async () => {
                                const r = await hapusArtikelAction(awal.id!)
                                setHapus(r)
                                if (r?.ok && !r.pesan.startsWith("MODE UJI")) { setBerubah(false); router.push("/dashboard/panduan/kelola") }
                            })
                        }}>
                        <Trash2 className="h-4 w-4" /> Hapus
                    </Button>
                )}
                <Button type="submit" disabled={pending} className="bg-blue-600 hover:bg-blue-700 text-white">
                    {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Simpan
                </Button>
            </div>
            <Pesan hasil={hapus ?? hasil} />

            <div className="grid gap-4 md:grid-cols-2">
                <Field label="Judul" htmlFor="judul" className="md:col-span-2">
                    <Input id="judul" name="judul" required maxLength={200} value={judul} className="text-base"
                        onChange={(e) => { setJudul(e.target.value); if (!slugManual) setSlug(slugTeks(e.target.value)) }} />
                </Field>
                <Field label="Kategori" htmlFor="kategori_id">
                    <select id="kategori_id" name="kategori_id" required className={selectClass} defaultValue={awal.kategori_id ?? ""}>
                        <option value="" disabled>Pilih kategori</option>
                        {kategori.map((k) => <option key={k.id} value={k.id}>{k.nama}</option>)}
                    </select>
                </Field>
                <Field label="Slug (alamat artikel)" htmlFor="slug" hint={`/dashboard/panduan/${slug || "..."}`}>
                    <Input id="slug" name="slug" required maxLength={120} value={slug} className="font-mono"
                        onChange={(e) => { setSlug(e.target.value); setSlugManual(true) }} />
                </Field>
                <Field label="Ringkasan" htmlFor="ringkasan" className="md:col-span-2" hint="Satu-dua kalimat; tampil di bawah judul dan di hasil pencarian.">
                    <Input id="ringkasan" name="ringkasan" maxLength={500} defaultValue={awal.ringkasan} />
                </Field>
                <Field label="Halaman terkait" htmlFor="href_menu" hint="Tombol ? di halaman ini akan membuka artikel ini.">
                    <select id="href_menu" name="href_menu" className={selectClass} defaultValue={awal.href_menu}>
                        <option value="">Tidak ada</option>
                        {menu.map((g) => (
                            <optgroup key={g.grup} label={g.grup}>
                                {g.item.map((i) => <option key={i.href} value={i.href}>{i.label} ({i.href})</option>)}
                            </optgroup>
                        ))}
                    </select>
                </Field>
                <div className="grid grid-cols-2 gap-4">
                    <Field label="Urutan" htmlFor="urutan" hint="Kecil tampil lebih dulu">
                        <Input id="urutan" name="urutan" type="number" min={0} max={9999} defaultValue={awal.urutan} />
                    </Field>
                    <label className="flex items-center gap-2 pt-6 text-sm">
                        <input type="checkbox" name="terbit" defaultChecked={awal.terbit} /> Terbit
                    </label>
                </div>
            </div>

            <div className="rounded-lg border bg-background">
                <div className="flex flex-wrap items-center gap-1 border-b px-2 py-1.5">
                    <div role="tablist" className="flex gap-1 mr-2">
                        {(["tulis", "pratinjau"] as const).map((t) => (
                            <button key={t} type="button" role="tab" aria-selected={tab === t} onClick={() => setTab(t)}
                                className={cn("px-3 py-1.5 rounded-md text-sm capitalize", tab === t ? "bg-muted font-semibold" : "text-muted-foreground hover:bg-muted/60")}>
                                {t}
                            </button>
                        ))}
                    </div>
                    {tab === "tulis" && ALAT.map((a) => (
                        <Button key={a.label} type="button" variant="ghost" size="icon-sm" title={a.label} aria-label={a.label} onClick={() => sisipkan(a.sisip)}>
                            <a.ikon className="h-4 w-4" />
                        </Button>
                    ))}
                    <span className="ml-auto pr-2 text-xs text-muted-foreground tabular-nums">{isi.length.toLocaleString("id-ID")} karakter</span>
                </div>
                {tab === "tulis" ? (
                    <textarea ref={area} aria-label="Isi artikel" value={isi} spellCheck={false}
                        onChange={(e) => { setIsi(e.target.value); setBerubah(true) }}
                        className="block min-h-[28rem] w-full resize-y bg-transparent p-4 font-mono text-sm leading-6 focus:outline-none" />
                ) : (
                    <div className="min-h-[28rem] p-6">
                        {isi.trim() ? <IsiPanduan isi={isi} className="max-w-3xl" /> : <p className="text-sm text-muted-foreground">Isi masih kosong.</p>}
                    </div>
                )}
            </div>
            <p className="text-xs text-muted-foreground">
                Format: <code>## Judul bagian</code>, <code>**tebal**</code>, <code>- butir</code>, tabel dengan <code>|</code>,
                {" "}<code>&gt; **Penting:**</code> untuk kotak merah, <code>&gt; **Catatan:**</code> untuk kotak biru. Panduan lengkap ada di artikel <em>Mengelola Pusat Panduan</em>.
            </p>
        </form>
    )
}
