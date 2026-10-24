"use client"

import React, { useActionState, useCallback, useEffect, useState, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { AlertCircle, CheckCircle2, Eye, EyeOff, Loader2, Pencil, Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ModalForm } from "@/components/ui/Modal"
import { Input } from "@/components/ui/input"
import { Field } from "@/components/transaksi/common"
import { aturTerbitAction, hapusArtikelAction, hapusKategoriAction, simpanKategoriAction, type HasilPanduan } from "@/app/actions/panduan"
import { slugTeks } from "@/lib/panduan-teks"
import { formatTanggal } from "@/lib/format"
import { cn } from "@/lib/utils"

export interface KategoriKelola {
    id: number; slug: string; nama: string; keterangan: string | null; ikon: string | null; urutan: number
    artikel: { id: number; slug: string; judul: string; href_menu: string | null; urutan: number; terbit: boolean; diubah_pada: string; diubah_oleh: string | null }[]
}

export function Pesan({ hasil }: { hasil: HasilPanduan }) {
    if (!hasil) return null
    return hasil.ok ? (
        <div role="status" className="flex items-center gap-2 rounded-md border border-green-300 bg-green-50 dark:bg-green-500/10 p-2.5 text-sm text-green-700 dark:text-green-400">
            <CheckCircle2 className="h-4 w-4 shrink-0" /> {hasil.pesan}
        </div>
    ) : (
        <div role="alert" className="flex items-start gap-2 rounded-md border border-red-300 bg-red-50 dark:bg-red-500/10 p-2.5 text-sm text-red-700 dark:text-red-400">
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" /> {hasil.error}
        </div>
    )
}

/** Daftar artikel per kategori dengan aksi cepat (terbit/sembunyikan, hapus) dan pengelolaan kategori. */
export function KelolaPanduan({ kategori, namaMenu }: { kategori: KategoriKelola[]; namaMenu: Record<string, string> }) {
    const router = useRouter()
    const [hasil, setHasil] = useState<HasilPanduan>(null)
    const [sibuk, setSibuk] = useState<string | null>(null)
    const [, startTransition] = useTransition()
    const [ubahKategori, setUbahKategori] = useState<number | "baru" | null>(null)
    const tutupKategori = useCallback(() => setUbahKategori(null), [])

    const jalan = (kunci: string, fn: () => Promise<HasilPanduan>, tanya?: string) => {
        if (tanya && !confirm(tanya)) return
        setSibuk(kunci)
        startTransition(async () => {
            setHasil(await fn())
            setSibuk(null)
            router.refresh()
        })
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-center gap-2">
                <Button asChild className="bg-blue-600 hover:bg-blue-700 text-white">
                    <Link href="/dashboard/panduan/kelola/artikel/baru"><Plus className="h-4 w-4" /> Artikel Baru</Link>
                </Button>
                <Button variant="outline" onClick={() => setUbahKategori("baru")}><Plus className="h-4 w-4" /> Kategori Baru</Button>
                <Button asChild variant="outline"><Link href="/dashboard/panduan"><Eye className="h-4 w-4" /> Lihat Pusat Panduan</Link></Button>
            </div>
            <Pesan hasil={hasil} />
            <ModalForm open={ubahKategori !== null} onOpenChange={(buka) => { if (!buka) setUbahKategori(null) }} lebar="sm:max-w-2xl"
                judul={ubahKategori === "baru" ? "Kategori baru" : `Ubah kategori ${kategori.find((k) => k.id === ubahKategori)?.nama ?? ""}`}>
                {ubahKategori !== null && <FormKategori key={String(ubahKategori)} kategori={ubahKategori === "baru" ? undefined : kategori.find((k) => k.id === ubahKategori)}
                    onSelesai={tutupKategori} />}
            </ModalForm>

            {kategori.map((k) => (
                <section key={k.id} className="rounded-xl border bg-background">
                    <div className="flex flex-wrap items-center gap-3 border-b px-4 py-3">
                        <span className="material-symbols-outlined text-[22px] text-blue-600 dark:text-blue-400" aria-hidden>{k.ikon ?? "article"}</span>
                        <div className="min-w-0 flex-1">
                            <h2 className="font-semibold">{k.nama} <span className="text-xs font-normal text-muted-foreground">urutan {k.urutan} · {k.artikel.length} artikel</span></h2>
                            {k.keterangan && <p className="text-xs text-muted-foreground">{k.keterangan}</p>}
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => setUbahKategori(k.id)}><Pencil className="h-4 w-4" /> Ubah</Button>
                        <Button variant="ghost" size="sm" className="text-destructive" disabled={sibuk === `k${k.id}`}
                            onClick={() => jalan(`k${k.id}`, () => hapusKategoriAction(k.id), `Hapus kategori "${k.nama}"?`)}>
                            <Trash2 className="h-4 w-4" /> Hapus
                        </Button>
                    </div>
                    {k.artikel.length === 0 ? (
                        <p className="px-4 py-6 text-sm text-muted-foreground">Belum ada artikel di kategori ini.</p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-muted/50 text-xs text-muted-foreground">
                                    <tr>
                                        <th className="px-4 py-2 text-left">Judul</th>
                                        <th className="px-4 py-2 text-left">Halaman terkait</th>
                                        <th className="px-4 py-2 text-center w-16">Urutan</th>
                                        <th className="px-4 py-2 text-left">Status</th>
                                        <th className="px-4 py-2 text-left">Diubah</th>
                                        <th className="px-4 py-2 text-right">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {k.artikel.map((a) => (
                                        <tr key={a.id} className="border-t">
                                            <td className="px-4 py-2">
                                                <Link href={`/dashboard/panduan/kelola/artikel/${a.id}`} className="font-medium hover:underline">{a.judul}</Link>
                                                <div className="font-mono text-[11px] text-muted-foreground">{a.slug}</div>
                                            </td>
                                            <td className="px-4 py-2 text-muted-foreground">{a.href_menu ? (namaMenu[a.href_menu] ?? a.href_menu) : "-"}</td>
                                            <td className="px-4 py-2 text-center tabular-nums">{a.urutan}</td>
                                            <td className="px-4 py-2">
                                                <span className={cn("inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold",
                                                    a.terbit ? "bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-400" : "bg-muted text-muted-foreground")}>
                                                    {a.terbit ? "Terbit" : "Draf"}
                                                </span>
                                            </td>
                                            <td className="px-4 py-2 text-xs text-muted-foreground whitespace-nowrap">{formatTanggal(a.diubah_pada)}{a.diubah_oleh ? ` · ${a.diubah_oleh}` : ""}</td>
                                            <td className="px-4 py-2 text-right whitespace-nowrap">
                                                {sibuk === `a${a.id}` ? <Loader2 className="inline h-4 w-4 animate-spin" /> : (
                                                    <>
                                                        <Button variant="ghost" size="icon-sm" title={a.terbit ? "Sembunyikan dari pembaca" : "Terbitkan"} aria-label={a.terbit ? `Sembunyikan ${a.judul}` : `Terbitkan ${a.judul}`}
                                                            onClick={() => jalan(`a${a.id}`, () => aturTerbitAction(a.id, !a.terbit))}>
                                                            {a.terbit ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                                        </Button>
                                                        <Button asChild variant="ghost" size="icon-sm" title="Ubah" aria-label={`Ubah ${a.judul}`}>
                                                            <Link href={`/dashboard/panduan/kelola/artikel/${a.id}`}><Pencil className="h-4 w-4" /></Link>
                                                        </Button>
                                                        <Button variant="ghost" size="icon-sm" className="text-destructive" title="Hapus" aria-label={`Hapus ${a.judul}`}
                                                            onClick={() => jalan(`a${a.id}`, () => hapusArtikelAction(a.id), `Hapus artikel "${a.judul}"? Tindakan ini tidak bisa dibatalkan.`)}>
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </section>
            ))}
        </div>
    )
}

function FormKategori({ kategori, onSelesai }: { kategori?: KategoriKelola; onSelesai: () => void }) {
    const router = useRouter()
    const [hasil, jalankan, pending] = useActionState(simpanKategoriAction, null)
    const [, startTransition] = useTransition()
    const [nama, setNama] = useState(kategori?.nama ?? "")
    const [slug, setSlug] = useState(kategori?.slug ?? "")
    const [slugManual, setSlugManual] = useState(!!kategori)
    useEffect(() => { if (hasil?.ok) { router.refresh(); onSelesai() } }, [hasil, router, onSelesai])

    const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        const data = new FormData(e.currentTarget)
        startTransition(() => jalankan(data))
    }
    return (
        <form onSubmit={onSubmit} className="space-y-3">
            {kategori && <input type="hidden" name="id" value={kategori.id} />}
            <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Nama" htmlFor={`k-nama-${kategori?.id ?? "baru"}`}>
                    <Input id={`k-nama-${kategori?.id ?? "baru"}`} name="nama" required maxLength={100} value={nama}
                        onChange={(e) => { setNama(e.target.value); if (!slugManual) setSlug(slugTeks(e.target.value)) }} />
                </Field>
                <Field label="Slug" htmlFor={`k-slug-${kategori?.id ?? "baru"}`}>
                    <Input id={`k-slug-${kategori?.id ?? "baru"}`} name="slug" required maxLength={120} value={slug} className="font-mono"
                        onChange={(e) => { setSlug(e.target.value); setSlugManual(true) }} />
                </Field>
                <Field label="Ikon" htmlFor={`k-ikon-${kategori?.id ?? "baru"}`} hint="Nama Material Symbols, mis. savings">
                    <Input id={`k-ikon-${kategori?.id ?? "baru"}`} name="ikon" maxLength={40} defaultValue={kategori?.ikon ?? ""} className="font-mono" />
                </Field>
                <Field label="Urutan" htmlFor={`k-urut-${kategori?.id ?? "baru"}`}>
                    <Input id={`k-urut-${kategori?.id ?? "baru"}`} name="urutan" type="number" min={0} max={9999} defaultValue={kategori?.urutan ?? 0} />
                </Field>
            </div>
            <Field label="Keterangan" htmlFor={`k-ket-${kategori?.id ?? "baru"}`}>
                <Input id={`k-ket-${kategori?.id ?? "baru"}`} name="keterangan" maxLength={300} defaultValue={kategori?.keterangan ?? ""} />
            </Field>
            {hasil && !hasil.ok && <Pesan hasil={hasil} />}
            <Button type="submit" disabled={pending} className="bg-blue-600 hover:bg-blue-700 text-white">
                {pending && <Loader2 className="h-4 w-4 animate-spin" />} Simpan Kategori
            </Button>
        </form>
    )
}
