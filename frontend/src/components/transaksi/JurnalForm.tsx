"use client"

import { useBolehAksi } from "@/components/layout/SidebarContext"
import { MENU } from "@/config/akses"
import { useEffect, useState } from "react"
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react"
import { AkunBox } from "@/components/bankbook/AkunBox"
import { InputUang } from "@/components/ui/InputUang"
import { TombolModal, tombolModalUtama, useTutupSetelahBerhasil } from "@/components/ui/Modal"
import { Input } from "@/components/ui/input"
import { bacaJurnalAction, jurnalUmumAction, nomorJurnalBerikutAction } from "@/app/actions/transaksi"
import type { BuktiJurnal } from "@kopkar/backend/src/posting/jurnal-umum.ts"
import { formatRupiah } from "@/lib/format"
import { Field, HasilTransaksi, SubmitButton, useAksiForm, type Akun } from "./common"

interface Baris { id: number; akun: string; ket: string; debit: string; kredit: string }

let nextId = 1
const barisBaru = (): Baris => ({ id: nextId++, akun: "", ket: "", debit: "", kredit: "" })
const angka = (v: string) => Number(v.replace(",", ".")) || 0

function JurnalForm({ akun, hariIni, selesai, awal, penyesuaian = false }: { akun: Akun[]; hariIni: string; selesai: () => void; awal?: BuktiJurnal; penyesuaian?: boolean }) {
    const { hasil, onSubmit, pending } = useAksiForm(jurnalUmumAction)
    useTutupSetelahBerhasil(hasil?.ok, selesai)
    const [baris, setBaris] = useState<Baris[]>(() => awal
        ? awal.baris.map((b) => ({ id: nextId++, akun: b.kodePerkiraan, ket: b.deskripsi === awal.deskripsi ? "" : b.deskripsi,
            debit: Number(b.debit) ? String(Number(b.debit)) : "", kredit: Number(b.kredit) ? String(Number(b.kredit)) : "" }))
        : [barisBaru(), barisBaru()])
    const [deskripsi, setDeskripsi] = useState(awal?.deskripsi ?? "")
    const [tanggal, setTanggal] = useState(awal?.tanggal ?? hariIni)
    // Nomor bukti final diberikan saat simpan; di sini pratinjau dari nomor urut berikutnya dan tanggal.
    const [urutBerikut, setUrutBerikut] = useState(0)
    useEffect(() => { if (!awal) void nomorJurnalBerikutAction(penyesuaian).then(setUrutBerikut) }, [awal, penyesuaian, hasil])
    const nomorBukti = awal?.nomorBukti ?? (urutBerikut ? `${penyesuaian ? "JP" : "JU"}/${tanggal.slice(2, 4)}${tanggal.slice(5, 7)}${tanggal.slice(8, 10)}/${urutBerikut}` : "")
    // null = mengikuti nomor bukti; kolom ini hanya terkirim bila diganti pengguna.
    const [noReff, setNoReff] = useState<string | null>(awal && awal.noReff !== awal.nomorBukti ? awal.noReff : null)

    useEffect(() => {
        if (hasil?.ok && !awal) { setBaris([barisBaru(), barisBaru()]); setDeskripsi("") }
    }, [hasil])

    const ubah = (id: number, k: keyof Omit<Baris, "id">, v: string) =>
        setBaris((bs) => bs.map((b) => (b.id === id ? { ...b, [k]: v } : b)))
    // Keterangan baris mengikuti nama akun, kecuali sudah diketik sendiri oleh pengguna.
    const namaAkun = (kode: string) => akun.find((a) => a.kode_perkiraan === kode)?.nama_perkiraan ?? ""
    const pilihAkun = (id: number, kode: string) => setBaris((bs) => bs.map((b) => b.id !== id ? b
        : { ...b, akun: kode, ket: !b.ket || b.ket === namaAkun(b.akun) ? namaAkun(kode) : b.ket }))
    // Nilai dibandingkan dalam sen supaya pecahan tidak salah dibulatkan float.
    const totalD = baris.reduce((s, b) => s + Math.round(angka(b.debit) * 100), 0)
    const totalK = baris.reduce((s, b) => s + Math.round(angka(b.kredit) * 100), 0)
    const seimbang = totalD > 0 && totalD === totalK

    return (
        <>
            <form onSubmit={onSubmit} className="space-y-4">
                {awal && <input type="hidden" name="nomorBukti" value={awal.nomorBukti} />}
                {(penyesuaian || awal?.penyesuaian) && <input type="hidden" name="penyesuaian" value="1" />}
                <input type="hidden" name="noReff" value={noReff ?? ""} />
                <div className="grid gap-4 sm:grid-cols-3">
                    <Field label="Tanggal" htmlFor="tanggal" hint={awal ? "Bagian dari nomor bukti; tidak bisa diubah." : undefined}>
                        <Input id="tanggal" name="tanggal" type="date" required value={tanggal} onChange={(e) => setTanggal(e.target.value)} readOnly={Boolean(awal)} />
                    </Field>
                    <Field label="No. Bukti" htmlFor="tampil-bukti" hint={awal ? undefined : "Otomatis; nomor final diberikan saat disimpan."}>
                        <Input id="tampil-bukti" value={nomorBukti} readOnly tabIndex={-1} className="bg-muted/40 font-mono text-xs" />
                    </Field>
                    <Field label="No. Reff" htmlFor="tampil-reff" hint="Bawaan sama dengan No. Bukti; bisa diganti.">
                        <Input id="tampil-reff" maxLength={100} className="font-mono text-xs" value={noReff ?? nomorBukti} onChange={(e) => setNoReff(e.target.value)} />
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
                                <th className="px-2 py-2 text-left">Keterangan baris</th>
                                <th className="px-2 py-2 text-right w-36">Debit</th>
                                <th className="px-2 py-2 text-right w-36">Kredit</th>
                                <th className="w-10"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {baris.map((b, i) => (
                                <tr key={b.id} className="border-t">
                                    <td className="px-2 py-1.5">
                                        <AkunBox akun={akun} nilai={b.akun} onUbah={(k) => pilihAkun(b.id, k)} dataF={`${b.id}:akun`} name="akun" label={`Akun baris ${i + 1}`} />
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
                    <SubmitButton pending={pending} disabled={!seimbang}>{awal ? "Simpan Perubahan" : "Simpan Jurnal"}</SubmitButton>
                </div>
            </form>
        </>
    )
}

/** Tombol "Jurnal Baru" di daftar jurnal: form di modal. */
export function TombolJurnalBaru({ akun, hariIni, penyesuaian = false }: { akun: Akun[]; hariIni: string; penyesuaian?: boolean }) {
    const boleh = useBolehAksi()
    if (!boleh([penyesuaian ? MENU.jurnalPenyesuaian : MENU.jurnalUmum], "tambah")) return null
    return (
        <TombolModal label={<><Plus className="h-4 w-4" /> {penyesuaian ? "Penyesuaian Baru" : "Jurnal Baru"}</>} judul={penyesuaian ? "Jurnal Penyesuaian Baru" : "Jurnal Umum Baru"} lebar="sm:max-w-4xl" className={tombolModalUtama}
            keterangan={penyesuaian ? "Jurnal penyesuaian akhir periode; nomor JP/yymmdd/n dan status Penyesuaian diberikan mesin posting. Debit dan kredit harus seimbang."
                : "Jurnal memorial; nomor JU/yymmdd/n diberikan mesin posting. Debit dan kredit harus seimbang."}>
            {(selesai) => <JurnalForm akun={akun} hariIni={hariIni} selesai={selesai} penyesuaian={penyesuaian} />}
        </TombolModal>
    )
}

function MuatUbah({ nomorBukti, hariIni, selesai, catatan }: { nomorBukti: string; hariIni: string; selesai: () => void; catatan?: string }) {
    const [data, setData] = useState<Awaited<ReturnType<typeof bacaJurnalAction>> | null>(null)
    useEffect(() => { void bacaJurnalAction(nomorBukti).then(setData) }, [nomorBukti])
    if (!data) return <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" />
    if ("error" in data) return <p role="alert" className="text-sm text-red-700">{data.error}</p>
    if (data.bukti.terkunci) return <p role="alert" className="text-sm text-amber-700">{data.bukti.terkunci}</p>
    return (
        <>
            {catatan && <p role="note" className="mb-3 rounded-md bg-amber-50 p-2 text-sm text-amber-800">{catatan}</p>}
            <JurnalForm akun={data.akun} hariIni={hariIni} awal={data.bukti} selesai={selesai} />
        </>
    )
}

/** Ikon ubah di baris daftar jurnal: form ubah di modal, isinya dibaca saat dibuka. */
export function TombolJurnalUbah({ nomorBukti, hariIni, catatan }: { nomorBukti: string; hariIni: string; catatan?: string }) {
    return (
        <TombolModal label={<Pencil className="h-4 w-4" />} judul={`Ubah ${nomorBukti}`} lebar="sm:max-w-4xl" className="grid h-8 w-8 place-items-center rounded-md text-blue-600 hover:bg-muted/50">
            {(selesai) => <MuatUbah nomorBukti={nomorBukti} hariIni={hariIni} selesai={selesai} catatan={catatan} />}
        </TombolModal>
    )
}
