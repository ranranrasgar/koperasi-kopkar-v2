"use client"

import { useActionState, useEffect, useState, useTransition } from "react"
import { AlertCircle, CheckCircle2, KeyRound, Loader2, Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import {
    resetPasswordAction, setAksesAction, tambahOperatorAction, ubahAktifOperatorAction, ubahGrupOperatorAction, type HasilKelola,
} from "@/app/actions/akses"
import { Field, FormCard, selectClass } from "@/components/transaksi/common"
import { cn } from "@/lib/utils"

interface Grup { id: number; nama_grup: string }

function Pesan({ hasil }: { hasil: HasilKelola | null }) {
    if (!hasil) return null
    if (!hasil.ok) {
        return (
            <div role="alert" className="flex items-start gap-2 rounded-md border border-red-300 bg-red-50 dark:bg-red-500/10 p-2.5 text-sm text-red-700 dark:text-red-400">
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" /> {hasil.error}
            </div>
        )
    }
    return (
        <div role="status" className="rounded-md border border-green-300 bg-green-50 dark:bg-green-500/10 p-2.5 text-sm">
            <div className="flex items-center gap-2 text-green-700 dark:text-green-400 font-semibold">
                <CheckCircle2 className="h-4 w-4" /> {hasil.pesan}
            </div>
            {hasil.passwordSementara && (
                <div className="mt-2 text-xs">
                    Password sementara (hanya tampil sekali, sampaikan langsung ke operator):{" "}
                    <code className="font-mono font-bold text-sm bg-background border rounded px-1.5 py-0.5 select-all">{hasil.passwordSementara}</code>
                </div>
            )}
        </div>
    )
}

// ---------- matriks grup x menu ----------

interface MenuBaris { nama: string; web: boolean; grupIzin: number[] }

export function MatriksAkses({ grup, menu }: { grup: Grup[]; menu: MenuBaris[] }) {
    const [data, setData] = useState(menu)
    const [cari, setCari] = useState("")
    const [hanyaWeb, setHanyaWeb] = useState(false)
    const [hasil, setHasil] = useState<HasilKelola | null>(null)
    const [sibuk, setSibuk] = useState<string | null>(null)
    const [, startTransition] = useTransition()

    const ubah = (m: string, g: Grup, boleh: boolean) => {
        const kunci = `${m}|${g.id}`
        setSibuk(kunci)
        startTransition(async () => {
            const r = await setAksesAction(g.id, m, boleh)
            setHasil(r)
            if (r.ok) setData((d) => d.map((x) => x.nama !== m ? x
                : { ...x, grupIzin: boleh ? [...x.grupIzin, g.id] : x.grupIzin.filter((id) => id !== g.id) }))
            setSibuk(null)
        })
    }

    const tampil = data.filter((m) => (!hanyaWeb || m.web) && m.nama.toLowerCase().includes(cari.toLowerCase()))
    return (
        <FormCard title="Matriks Hak Akses"
            description="Centang = grup boleh membuka menu (opr_hak_akses, akses T). Berlaku langsung tanpa login ulang. Grup superadmin selalu punya semua akses.">
            <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-3">
                    <div className="relative w-full sm:w-72">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input placeholder="Cari menu" value={cari} onChange={(e) => setCari(e.target.value)} className="pl-8" />
                    </div>
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                        <input type="checkbox" checked={hanyaWeb} onChange={(e) => setHanyaWeb(e.target.checked)} />
                        Hanya menu yang dipakai web
                    </label>
                </div>
                <Pesan hasil={hasil} />
                <div className="overflow-auto max-h-[65vh] rounded-md border">
                    <table className="w-full text-sm">
                        <thead className="sticky top-0 z-10 bg-muted text-muted-foreground text-xs">
                            <tr>
                                <th className="px-3 py-2 text-left">Menu</th>
                                {grup.map((g) => <th key={g.id} className="px-3 py-2 text-center whitespace-nowrap">{g.nama_grup}</th>)}
                            </tr>
                        </thead>
                        <tbody>
                            {tampil.map((m) => (
                                <tr key={m.nama} className="border-t hover:bg-muted/30">
                                    <td className="px-3 py-1.5">
                                        {m.nama}
                                        {m.web && <span className="ml-2 rounded bg-primary/10 text-primary text-[9px] font-bold uppercase px-1">web</span>}
                                    </td>
                                    {grup.map((g) => {
                                        const kunci = `${m.nama}|${g.id}`
                                        return (
                                            <td key={g.id} className="px-3 py-1.5 text-center">
                                                {sibuk === kunci ? <Loader2 className="h-4 w-4 animate-spin inline" /> : (
                                                    <input type="checkbox" aria-label={`${m.nama} untuk ${g.nama_grup}`} disabled={sibuk !== null}
                                                        checked={m.grupIzin.includes(g.id)} onChange={(e) => ubah(m.nama, g, e.target.checked)} />
                                                )}
                                            </td>
                                        )
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </FormCard>
    )
}

// ---------- operator ----------

interface OperatorBaris {
    id: number; nama: string; nama_lengkap: string | null; grup_id: number; nama_grup: string | null
    aktif: boolean; punya_password: boolean; wajib_ganti_password: boolean
}

export function KelolaOperator({ operator, grup, sayaId }: { operator: OperatorBaris[]; grup: Grup[]; sayaId: number }) {
    const [hasil, setHasil] = useState<HasilKelola | null>(null)
    const [sibuk, setSibuk] = useState<number | null>(null)
    const [, startTransition] = useTransition()
    const [hasilTambah, tambah, menambah] = useActionState(tambahOperatorAction, null)
    // Salinan terkontrol: berubah hanya bila aksi berhasil, dan ikut data baru dari server.
    const [daftar, setDaftar] = useState(operator)
    useEffect(() => setDaftar(operator), [operator])

    const jalankan = (id: number, fn: () => Promise<HasilKelola>, ubah?: Partial<OperatorBaris>) => {
        setSibuk(id)
        startTransition(async () => {
            const r = await fn()
            setHasil(r)
            if (r.ok && ubah) setDaftar((d) => d.map((o) => (o.id === id ? { ...o, ...ubah } : o)))
            setSibuk(null)
        })
    }

    return (
        <div className="space-y-6">
            <FormCard title="Operator" description="Atur grup, status aktif, dan password sementara. Perubahan berlaku pada request berikutnya operator.">
                <div className="space-y-3">
                    <Pesan hasil={hasil} />
                    <div className="overflow-x-auto rounded-md border">
                        <table className="w-full text-sm">
                            <thead className="bg-muted text-muted-foreground text-xs">
                                <tr>
                                    <th className="px-3 py-2 text-left">Nama Login</th>
                                    <th className="px-3 py-2 text-left">Nama Lengkap</th>
                                    <th className="px-3 py-2 text-left">Grup</th>
                                    <th className="px-3 py-2 text-center">Aktif</th>
                                    <th className="px-3 py-2 text-left">Password</th>
                                    <th className="px-3 py-2"></th>
                                </tr>
                            </thead>
                            <tbody>
                                {daftar.map((o) => (
                                    <tr key={o.id} className={cn("border-t", !o.aktif && "text-muted-foreground")}>
                                        <td className="px-3 py-2 font-mono text-xs">{o.nama}{o.id === sayaId && <span className="ml-1 text-primary">(Anda)</span>}</td>
                                        <td className="px-3 py-2">{o.nama_lengkap}</td>
                                        <td className="px-3 py-2">
                                            <select aria-label={`Grup ${o.nama}`} className={cn(selectClass, "h-8 w-40")} value={o.grup_id}
                                                disabled={sibuk !== null} onChange={(e) => {
                                                    const g = Number(e.target.value)
                                                    jalankan(o.id, () => ubahGrupOperatorAction(o.id, g), { grup_id: g })
                                                }}>
                                                {grup.map((g) => <option key={g.id} value={g.id}>{g.nama_grup}</option>)}
                                            </select>
                                        </td>
                                        <td className="px-3 py-2 text-center">
                                            <input type="checkbox" aria-label={`Aktif ${o.nama}`} checked={o.aktif} disabled={sibuk !== null}
                                                onChange={(e) => {
                                                    const aktif = e.target.checked
                                                    jalankan(o.id, () => ubahAktifOperatorAction(o.id, aktif), { aktif })
                                                }} />
                                        </td>
                                        <td className="px-3 py-2 text-xs">
                                            {!o.punya_password ? "Belum diset" : o.wajib_ganti_password ? "Sementara (wajib ganti)" : "Sudah diganti"}
                                        </td>
                                        <td className="px-3 py-2 text-right">
                                            {o.id !== sayaId && (
                                                <button type="button" disabled={sibuk !== null}
                                                    onClick={() => confirm(`Buat password sementara baru untuk ${o.nama}? Password lama tidak berlaku lagi.`)
                                                        && jalankan(o.id, () => resetPasswordAction(o.id), { punya_password: true, wajib_ganti_password: true })}
                                                    className="inline-flex items-center gap-1 text-xs text-primary hover:underline disabled:opacity-50">
                                                    {sibuk === o.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <KeyRound className="h-3.5 w-3.5" />}
                                                    Reset password
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </FormCard>

            <FormCard title="Tambah Operator" description="Operator baru mendapat password sementara yang wajib diganti saat login pertama.">
                <form action={tambah} className="grid gap-4 sm:grid-cols-4 items-end">
                    <Field label="Nama Login" htmlFor="nama">
                        <Input id="nama" name="nama" required pattern="[a-z0-9._\-]{3,30}" placeholder="huruf kecil, mis. budi" />
                    </Field>
                    <Field label="Nama Lengkap" htmlFor="namaLengkap">
                        <Input id="namaLengkap" name="namaLengkap" required />
                    </Field>
                    <Field label="Grup" htmlFor="grupId">
                        <select id="grupId" name="grupId" className={selectClass}>
                            {grup.map((g) => <option key={g.id} value={g.id}>{g.nama_grup}</option>)}
                        </select>
                    </Field>
                    <button type="submit" disabled={menambah}
                        className="inline-flex items-center justify-center gap-2 h-9 px-4 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold disabled:opacity-60">
                        {menambah && <Loader2 className="h-4 w-4 animate-spin" />} Tambah
                    </button>
                    <div className="sm:col-span-4"><Pesan hasil={hasilTambah} /></div>
                </form>
            </FormCard>
        </div>
    )
}
