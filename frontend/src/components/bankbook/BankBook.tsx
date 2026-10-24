"use client"

import { useEffect, useRef, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react"
import { bacaBankBookAction, bankBookAction, hapusBankBookAction } from "@/app/actions/transaksi"
import { Input } from "@/components/ui/input"
import { AkunBox } from "@/components/bankbook/AkunBox"
import { InputUang } from "@/components/ui/InputUang"
import { TombolModal, tombolModalUtama, useTutupSetelahBerhasil } from "@/components/ui/Modal"
import { Field, HasilTransaksi, SubmitButton, selectClass, useAksiForm, type Akun } from "@/components/transaksi/common"
import { formatRupiah } from "@/lib/format"
import type { BuktiBankBook } from "@kopkar/backend/src/posting/bankbook.ts"

interface Baris { id: number; kode: string; ket: string; debit: string; kredit: string }
let nextId = 1
const barisBaru = (b?: Partial<Baris>): Baris => ({ id: nextId++, kode: "", ket: "", debit: "", kredit: "", ...b })
const angka = (v: string) => Number(v.replace(",", ".")) || 0

interface Props { akunBank: Akun; semuaAkun: Akun[]; hariIni: string }

function FormBukti({ akunBank, semuaAkun, hariIni, awal, selesai }: Props & { awal?: BuktiBankBook; selesai: () => void }) {
    const { hasil, onSubmit, pending } = useAksiForm(bankBookAction)
    useTutupSetelahBerhasil(hasil?.ok, selesai)
    const [baris, setBaris] = useState<Baris[]>(() =>
        awal?.lawan.length ? awal.lawan.map((l) => barisBaru({ kode: l.kodePerkiraan, ket: l.deskripsi, debit: Number(l.debit) ? String(Number(l.debit)) : "", kredit: Number(l.kredit) ? String(Number(l.kredit)) : "" })) : [barisBaru()])
    const ubah = (id: number, k: keyof Omit<Baris, "id">, v: string) => setBaris((bs) => bs.map((b) => (b.id === id ? { ...b, [k]: v } : b)))
    const totalD = baris.reduce((s, b) => s + Math.round(angka(b.debit) * 100), 0)
    const totalK = baris.reduce((s, b) => s + Math.round(angka(b.kredit) * 100), 0)
    const bersih = totalK - totalD // >0 uang masuk, <0 uang keluar
    const lawanAkun = semuaAkun.filter((a) => a.kode_perkiraan !== akunBank.kode_perkiraan)
    const edit = Boolean(awal)

    // Papan ketik: Enter pindah isian (akun -> keterangan -> debit -> kredit -> baris berikutnya, baris baru otomatis), Ctrl+S simpan.
    const formRef = useRef<HTMLFormElement>(null)
    const [fokus, setFokus] = useState<string | null>(null)
    useEffect(() => {
        if (!fokus) return
        formRef.current?.querySelector<HTMLElement>(`[data-f="${fokus}"]`)?.focus()
        setFokus(null)
    }, [fokus, baris])
    const barisBerikut = (id: number) => {
        const i = baris.findIndex((b) => b.id === id)
        if (i < baris.length - 1) return setFokus(`${baris[i + 1].id}:akun`)
        if (!baris[i].kode) return
        const baru = barisBaru()
        setBaris((bs) => [...bs, baru])
        setFokus(`${baru.id}:akun`)
    }
    const onKeyDown = (e: React.KeyboardEvent<HTMLFormElement>) => {
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
            e.preventDefault()
            if (bersih !== 0 && !pending) e.currentTarget.requestSubmit()
            return
        }
        const t = e.target as HTMLInputElement
        const f = t.dataset?.f
        if (e.key !== "Enter" || t.tagName !== "INPUT") return
        e.preventDefault() // Enter tidak menyimpan; simpan hanya lewat tombol atau Ctrl+S
        if (!f) return setFokus("deskripsi")
        if (f === "deskripsi") return setFokus(`${baris[0].id}:akun`)
        const [id, kolom] = [Number(f.split(":")[0]), f.split(":")[1]]
        if (kolom === "ket") setFokus(`${id}:debit`)
        else if (kolom === "debit") { if (angka(baris.find((b) => b.id === id)?.debit ?? "") > 0) barisBerikut(id); else setFokus(`${id}:kredit`) }
        else if (kolom === "kredit") barisBerikut(id)
    }

    return (
        <form ref={formRef} onSubmit={onSubmit} onKeyDown={onKeyDown} className="space-y-4">
            {edit && <input type="hidden" name="nomorBukti" value={awal!.nomorBukti} />}
            <input type="hidden" name="akunBank" value={akunBank.kode_perkiraan} />
            <div className="grid gap-4 sm:grid-cols-3">
                <Field label="Kas / bank" className="sm:col-span-2">
                    <div className="flex h-9 items-center rounded-md border bg-muted/40 px-3 text-sm font-semibold">{akunBank.kode_perkiraan} {akunBank.nama_perkiraan}</div>
                </Field>
                <Field label="Tanggal" htmlFor="tanggal" hint={edit ? "Tanggal bagian dari nomor bukti; tidak bisa diubah." : undefined}>
                    <Input id="tanggal" name="tanggal" type="date" required defaultValue={awal?.tanggal ?? hariIni} readOnly={edit} />
                </Field>
            </div>
            <Field label="Keterangan" htmlFor="deskripsi">
                <Input id="deskripsi" data-f="deskripsi" autoFocus name="deskripsi" required maxLength={200} defaultValue={awal?.deskripsi} />
            </Field>
            <div className="rounded-md border">
                <table className="w-full text-sm">
                    <thead className="bg-muted/50 text-muted-foreground text-xs">
                        <tr>
                            <th className="px-2 py-2 text-left w-[34%]">Akun</th>
                            <th className="px-2 py-2 text-left">Keterangan baris (opsional)</th>
                            <th className="px-2 py-2 text-right w-32">Debit</th>
                            <th className="px-2 py-2 text-right w-32">Kredit</th>
                            <th className="w-10"></th>
                        </tr>
                    </thead>
                    <tbody>
                        {baris.map((b, i) => (
                            <tr key={b.id} className="border-t">
                                <td className="px-2 py-1.5">
                                    <AkunBox akun={lawanAkun} nilai={b.kode} onUbah={(k) => ubah(b.id, "kode", k)} dataF={`${b.id}:akun`} name="lawan" label={`Akun baris ${i + 1}`}
                                        onSelesai={() => setFokus(`${b.id}:ket`)} />
                                </td>
                                <td className="px-2 py-1.5"><Input data-f={`${b.id}:ket`} name="ketBaris" aria-label={`Keterangan baris ${i + 1}`} maxLength={200} value={b.ket} onChange={(e) => ubah(b.id, "ket", e.target.value)} /></td>
                                <td className="px-2 py-1.5"><InputUang data-f={`${b.id}:debit`} name="debit" aria-label={`Debit baris ${i + 1}`} className="text-right" value={b.debit} readOnly={angka(b.kredit) > 0} onChange={(v) => ubah(b.id, "debit", v)} /></td>
                                <td className="px-2 py-1.5"><InputUang data-f={`${b.id}:kredit`} name="kredit" aria-label={`Kredit baris ${i + 1}`} className="text-right" value={b.kredit} readOnly={angka(b.debit) > 0} onChange={(v) => ubah(b.id, "kredit", v)} /></td>
                                <td className="px-1 text-center">
                                    <button type="button" title="Hapus baris" disabled={baris.length <= 1} onClick={() => setBaris((bs) => bs.filter((x) => x.id !== b.id))} className="p-1.5 rounded hover:bg-muted disabled:opacity-30">
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                    <tfoot className="border-t bg-muted/30 font-semibold">
                        <tr>
                            <td className="px-2 py-2" colSpan={2}>
                                <button type="button" onClick={() => setBaris((bs) => [...bs, barisBaru()])} className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                                    <Plus className="h-3.5 w-3.5" /> Tambah baris
                                </button>
                            </td>
                            <td className="px-2 py-2 text-right tabular-nums">{formatRupiah(totalD / 100)}</td>
                            <td className="px-2 py-2 text-right tabular-nums">{formatRupiah(totalK / 100)}</td>
                            <td></td>
                        </tr>
                    </tfoot>
                </table>
            </div>
            <p className="text-xs text-muted-foreground">{bersih === 0 ? "Sisi kas/bank diisi otomatis dari selisih kredit dan debit." : bersih > 0 ? `Uang masuk ${formatRupiah(bersih / 100)} ke ${akunBank.nama_perkiraan}.` : `Uang keluar ${formatRupiah(-bersih / 100)} dari ${akunBank.nama_perkiraan}.`}</p>
            <HasilTransaksi hasil={hasil} />
            <div className="flex justify-end"><SubmitButton pending={pending} disabled={bersih === 0}>{edit ? "Simpan Perubahan" : "Simpan Bukti"} (Ctrl+S)</SubmitButton></div>
        </form>
    )
}

export function TombolBankBookBaru(props: Props) {
    return (
        <TombolModal label={<><Plus className="h-4 w-4" /> Entri Baru</>} judul="Entri Bank Book" lebar="sm:max-w-3xl" className={tombolModalUtama}
            keterangan="Satu akun kas/bank melawan satu atau lebih akun. Nomor bukti BB/yymmdd/NNN diberikan otomatis.">
            {(selesai) => <FormBukti {...props} selesai={selesai} />}
        </TombolModal>
    )
}

/** Isi form ubah dibaca dari server saat modal dibuka. */
function MuatUbah({ nomorBukti, props, selesai }: { nomorBukti: string; props: Props; selesai: () => void }) {
    const [data, setData] = useState<{ bukti: BuktiBankBook } | { error: string } | null>(null)
    useEffect(() => { void bacaBankBookAction(nomorBukti, props.akunBank.kode_perkiraan).then(setData) }, [nomorBukti, props.akunBank.kode_perkiraan])
    if (!data) return <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" />
    if ("error" in data) return <p role="alert" className="text-sm text-red-700">{data.error}</p>
    if (data.bukti.terkunci) return <p role="alert" className="text-sm text-amber-700">{data.bukti.terkunci}</p>
    return <FormBukti {...props} awal={data.bukti} selesai={selesai} />
}

export function TombolBankBookUbah({ nomorBukti, ...props }: Props & { nomorBukti: string }) {
    return (
        <TombolModal label={<Pencil className="h-4 w-4" />} judul={`Ubah ${nomorBukti}`} lebar="sm:max-w-3xl" className="p-1.5 rounded hover:bg-muted text-blue-600">
            {(selesai) => <MuatUbah nomorBukti={nomorBukti} props={props} selesai={selesai} />}
        </TombolModal>
    )
}

export function TombolBankBookHapus({ nomorBukti }: { nomorBukti: string }) {
    const router = useRouter()
    const [sibuk, mulai] = useTransition()
    const hapus = () => {
        if (!confirm(`Hapus bukti ${nomorBukti}? Semua baris jurnalnya ikut terhapus dan tidak bisa dibatalkan.`)) return
        mulai(async () => {
            const h = await hapusBankBookAction(nomorBukti)
            if (h) alert(h.ok ? h.pesan : h.error)
            router.refresh()
        })
    }
    return (
        <button type="button" title="Hapus bukti" onClick={hapus} disabled={sibuk} className="p-1.5 rounded hover:bg-muted text-red-600 disabled:opacity-50">
            {sibuk ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
        </button>
    )
}
