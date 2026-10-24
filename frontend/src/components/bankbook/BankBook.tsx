"use client"

import { useEffect, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react"
import { bacaBankBookAction, bankBookAction, hapusBankBookAction } from "@/app/actions/transaksi"
import { Input } from "@/components/ui/input"
import { TombolModal, tombolModalUtama, useTutupSetelahBerhasil } from "@/components/ui/Modal"
import { Field, HasilTransaksi, SubmitButton, selectClass, useAksiForm, type Akun } from "@/components/transaksi/common"
import { formatRupiah } from "@/lib/format"
import type { BuktiBankBook } from "@kopkar/backend/src/posting/bankbook.ts"

interface Baris { id: number; kode: string; ket: string; jumlah: string }
let nextId = 1
const barisBaru = (b?: Partial<Baris>): Baris => ({ id: nextId++, kode: "", ket: "", jumlah: "", ...b })
const angka = (v: string) => Number(v.replace(",", ".")) || 0

interface Props { akunBank: Akun[]; akunBankDipilih: string; semuaAkun: Akun[]; hariIni: string }

function FormBukti({ akunBank, akunBankDipilih, semuaAkun, hariIni, awal, selesai }: Props & { awal?: BuktiBankBook; selesai: () => void }) {
    const { hasil, onSubmit, pending } = useAksiForm(bankBookAction)
    useTutupSetelahBerhasil(hasil?.ok, selesai)
    const [arah, setArah] = useState<"masuk" | "keluar">(awal?.arah ?? "masuk")
    const [baris, setBaris] = useState<Baris[]>(() =>
        awal?.lawan.length ? awal.lawan.map((l) => barisBaru({ kode: l.kodePerkiraan, ket: l.deskripsi, jumlah: String(Number(l.jumlah)) })) : [barisBaru()])
    const ubah = (id: number, k: keyof Omit<Baris, "id">, v: string) => setBaris((bs) => bs.map((b) => (b.id === id ? { ...b, [k]: v } : b)))
    const total = baris.reduce((s, b) => s + Math.round(angka(b.jumlah) * 100), 0)
    const lawanAkun = semuaAkun.filter((a) => a.kode_perkiraan !== (awal?.akunBank ?? akunBankDipilih))
    const edit = Boolean(awal)

    return (
        <form onSubmit={onSubmit} className="space-y-4">
            {edit && <input type="hidden" name="nomorBukti" value={awal!.nomorBukti} />}
            <div className="grid gap-4 sm:grid-cols-3">
                <Field label="Akun kas / bank" htmlFor="akunBank" className="sm:col-span-2">
                    {edit
                        ? <>
                            <input type="hidden" name="akunBank" value={awal!.akunBank} />
                            <select id="akunBank" className={selectClass} value={awal!.akunBank} disabled onChange={() => {}}>
                                {akunBank.map((a) => <option key={a.id} value={a.kode_perkiraan}>{a.kode_perkiraan} {a.nama_perkiraan}</option>)}
                            </select>
                        </>
                        : <select id="akunBank" name="akunBank" required className={selectClass} defaultValue={akunBankDipilih}>
                            {akunBank.map((a) => <option key={a.id} value={a.kode_perkiraan}>{a.kode_perkiraan} {a.nama_perkiraan}</option>)}
                        </select>}
                </Field>
                <Field label="Tanggal" htmlFor="tanggal" hint={edit ? "Tanggal bagian dari nomor bukti; tidak bisa diubah." : undefined}>
                    <Input id="tanggal" name="tanggal" type="date" required defaultValue={awal?.tanggal ?? hariIni} readOnly={edit} />
                </Field>
            </div>
            <fieldset className="flex gap-3">
                {([["masuk", "Uang masuk (debit kas/bank)"], ["keluar", "Uang keluar (kredit kas/bank)"]] as const).map(([v, l]) => (
                    <label key={v} className={`flex-1 cursor-pointer rounded-md border px-3 py-2 text-sm font-semibold ${arah === v ? (v === "masuk" ? "border-green-500 bg-green-50 text-green-700" : "border-red-500 bg-red-50 text-red-700") : "text-muted-foreground"}`}>
                        <input type="radio" name="arah" value={v} checked={arah === v} onChange={() => setArah(v)} className="mr-2" />{l}
                    </label>
                ))}
            </fieldset>
            <Field label="Keterangan" htmlFor="deskripsi">
                <Input id="deskripsi" name="deskripsi" required maxLength={200} defaultValue={awal?.deskripsi} />
            </Field>
            <div className="overflow-x-auto rounded-md border">
                <table className="w-full text-sm">
                    <thead className="bg-muted/50 text-muted-foreground text-xs">
                        <tr>
                            <th className="px-2 py-2 text-left w-[40%]">Akun lawan</th>
                            <th className="px-2 py-2 text-left">Keterangan baris (opsional)</th>
                            <th className="px-2 py-2 text-right w-36">Nominal</th>
                            <th className="w-10"></th>
                        </tr>
                    </thead>
                    <tbody>
                        {baris.map((b, i) => (
                            <tr key={b.id} className="border-t">
                                <td className="px-2 py-1.5">
                                    <select name="lawan" aria-label={`Akun lawan baris ${i + 1}`} className={selectClass} value={b.kode} onChange={(e) => ubah(b.id, "kode", e.target.value)}>
                                        <option value="">Pilih akun...</option>
                                        {lawanAkun.map((a) => <option key={a.id} value={a.kode_perkiraan}>{a.kode_perkiraan} {a.nama_perkiraan}</option>)}
                                    </select>
                                </td>
                                <td className="px-2 py-1.5"><Input name="ketBaris" aria-label={`Keterangan baris ${i + 1}`} maxLength={200} value={b.ket} onChange={(e) => ubah(b.id, "ket", e.target.value)} /></td>
                                <td className="px-2 py-1.5"><Input name="jumlah" aria-label={`Nominal baris ${i + 1}`} type="number" min="0" step="any" className="text-right" value={b.jumlah} onChange={(e) => ubah(b.id, "jumlah", e.target.value)} /></td>
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
                            <td className="px-2 py-2 text-right tabular-nums">{formatRupiah(total / 100)}</td>
                            <td></td>
                        </tr>
                    </tfoot>
                </table>
            </div>
            <p className="text-xs text-muted-foreground">Sisi kas/bank diisi otomatis sebesar total nominal, sehingga jurnal selalu seimbang.</p>
            <HasilTransaksi hasil={hasil} />
            <div className="flex justify-end"><SubmitButton pending={pending} disabled={total <= 0}>{edit ? "Simpan Perubahan" : "Simpan Bukti"}</SubmitButton></div>
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
    useEffect(() => { void bacaBankBookAction(nomorBukti, props.akunBankDipilih).then(setData) }, [nomorBukti, props.akunBankDipilih])
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
