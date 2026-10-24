"use client"

import { useEffect, useState } from "react"
import { Plus, Trash2 } from "lucide-react"
import { AkunBox } from "@/components/bankbook/AkunBox"
import { InputUang } from "@/components/ui/InputUang"
import { TombolModal, tombolModalUtama, useTutupSetelahBerhasil } from "@/components/ui/Modal"
import { Input } from "@/components/ui/input"
import { jurnalUmumAction } from "@/app/actions/transaksi"
import { formatRupiah } from "@/lib/format"
import { Field, HasilTransaksi, SubmitButton, useAksiForm, type Akun } from "./common"

interface Baris { id: number; akun: string; ket: string; debit: string; kredit: string }

let nextId = 1
const barisBaru = (): Baris => ({ id: nextId++, akun: "", ket: "", debit: "", kredit: "" })
const angka = (v: string) => Number(v.replace(",", ".")) || 0

function JurnalForm({ akun, hariIni, selesai }: { akun: Akun[]; hariIni: string; selesai: () => void }) {
    const { hasil, onSubmit, pending } = useAksiForm(jurnalUmumAction)
    useTutupSetelahBerhasil(hasil?.ok, selesai)
    const [baris, setBaris] = useState<Baris[]>(() => [barisBaru(), barisBaru()])
    const [deskripsi, setDeskripsi] = useState("")

    useEffect(() => {
        if (hasil?.ok) { setBaris([barisBaru(), barisBaru()]); setDeskripsi("") }
    }, [hasil])

    const ubah = (id: number, k: keyof Omit<Baris, "id">, v: string) =>
        setBaris((bs) => bs.map((b) => (b.id === id ? { ...b, [k]: v } : b)))
    // Nilai dibandingkan dalam sen supaya pecahan tidak salah dibulatkan float.
    const totalD = baris.reduce((s, b) => s + Math.round(angka(b.debit) * 100), 0)
    const totalK = baris.reduce((s, b) => s + Math.round(angka(b.kredit) * 100), 0)
    const seimbang = totalD > 0 && totalD === totalK

    return (
        <>
            <form onSubmit={onSubmit} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-4">
                    <Field label="Tanggal" htmlFor="tanggal">
                        <Input id="tanggal" name="tanggal" type="date" required defaultValue={hariIni} />
                    </Field>
                    <Field label="Keterangan Jurnal" htmlFor="deskripsi" className="sm:col-span-3">
                        <Input id="deskripsi" name="deskripsi" required maxLength={200} value={deskripsi} onChange={(e) => setDeskripsi(e.target.value)} />
                    </Field>
                </div>

                <div className="rounded-md border">
                    <table className="w-full text-sm">
                        <thead className="bg-muted/50 text-muted-foreground text-xs">
                            <tr>
                                <th className="px-2 py-2 text-left w-[34%]">Akun</th>
                                <th className="px-2 py-2 text-left">Keterangan baris (opsional)</th>
                                <th className="px-2 py-2 text-right w-36">Debit</th>
                                <th className="px-2 py-2 text-right w-36">Kredit</th>
                                <th className="w-10"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {baris.map((b, i) => (
                                <tr key={b.id} className="border-t">
                                    <td className="px-2 py-1.5">
                                        <AkunBox akun={akun} nilai={b.akun} onUbah={(k) => ubah(b.id, "akun", k)} dataF={`${b.id}:akun`} name="akun" label={`Akun baris ${i + 1}`} />
                                    </td>
                                    <td className="px-2 py-1.5">
                                        <Input name="ketBaris" aria-label={`Keterangan baris ${i + 1}`} maxLength={200} value={b.ket} onChange={(e) => ubah(b.id, "ket", e.target.value)} />
                                    </td>
                                    <td className="px-2 py-1.5">
                                        <InputUang name="debit" aria-label={`Debit baris ${i + 1}`} className="text-right" value={b.debit} readOnly={angka(b.kredit) > 0} onChange={(v) => ubah(b.id, "debit", v)} />
                                    </td>
                                    <td className="px-2 py-1.5">
                                        <InputUang name="kredit" aria-label={`Kredit baris ${i + 1}`} className="text-right" value={b.kredit} readOnly={angka(b.debit) > 0} onChange={(v) => ubah(b.id, "kredit", v)} />
                                    </td>
                                    <td className="px-1 text-center">
                                        <button type="button" title="Hapus baris" disabled={baris.length <= 2}
                                            onClick={() => setBaris((bs) => bs.filter((x) => x.id !== b.id))}
                                            className="p-1.5 rounded hover:bg-muted disabled:opacity-30">
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot className="border-t bg-muted/30 font-semibold">
                            <tr>
                                <td className="px-2 py-2">
                                    <button type="button" onClick={() => setBaris((bs) => [...bs, barisBaru()])}
                                        className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                                        <Plus className="h-3.5 w-3.5" /> Tambah baris
                                    </button>
                                </td>
                                <td className="px-2 py-2 text-right text-xs">
                                    {seimbang ? <span className="text-green-600">Seimbang</span>
                                        : <span className="text-error">Selisih {formatRupiah(Math.abs(totalD - totalK) / 100)}</span>}
                                </td>
                                <td className="px-2 py-2 text-right tabular-nums">{formatRupiah(totalD / 100)}</td>
                                <td className="px-2 py-2 text-right tabular-nums">{formatRupiah(totalK / 100)}</td>
                                <td></td>
                            </tr>
                        </tfoot>
                    </table>
                </div>

                <HasilTransaksi hasil={hasil} />
                <div className="flex justify-end">
                    <SubmitButton pending={pending} disabled={!seimbang}>Simpan Jurnal</SubmitButton>
                </div>
            </form>
        </>
    )
}

/** Tombol "Jurnal Baru" di daftar jurnal: form di modal. */
export function TombolJurnalBaru({ akun, hariIni }: { akun: Akun[]; hariIni: string }) {
    return (
        <TombolModal label={<><Plus className="h-4 w-4" /> Jurnal Baru</>} judul="Jurnal Umum Baru" lebar="sm:max-w-4xl" className={tombolModalUtama}
            keterangan="Jurnal memorial; nomor JU/yymmdd/n diberikan mesin posting. Debit dan kredit harus seimbang.">
            {(selesai) => <JurnalForm akun={akun} hariIni={hariIni} selesai={selesai} />}
        </TombolModal>
    )
}
