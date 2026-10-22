"use client"

import { useEffect, useRef, useState } from "react"
import { Input } from "@/components/ui/input"
import { ambilSimpananAction, infoAnggotaAction, setorSimpananAction, type InfoAnggota } from "@/app/actions/transaksi"
import type { AnggotaRingkas } from "@/lib/queries/anggota"
import { formatRupiah } from "@/lib/format"
import { AnggotaPicker, Field, FormCard, HasilTransaksi, KasSelect, SubmitButton, selectClass, useAksiForm, type Akun } from "./common"

interface Props {
    tipe: "setor" | "ambil"
    jenis: { kode_simpanan: string; nama_simpanan: string }[]
    akunKas: Akun[]
    hariIni: string
}

export function SimpananForm({ tipe, jenis, akunKas, hariIni }: Props) {
    const { hasil, onSubmit, pending } = useAksiForm(tipe === "setor" ? setorSimpananAction : ambilSimpananAction)
    const [anggota, setAnggota] = useState<AnggotaRingkas | null>(null)
    const [info, setInfo] = useState<InfoAnggota | null>(null)
    const form = useRef<HTMLFormElement>(null)

    useEffect(() => {
        if (!anggota) { setInfo(null); return }
        let batal = false
        infoAnggotaAction(anggota.kode_agt).then((i) => { if (!batal) setInfo(i) })
        return () => { batal = true }
    }, [anggota, hasil])

    // Setelah berhasil, kosongkan jumlah dan keterangan supaya tidak terkirim dua kali.
    useEffect(() => {
        if (hasil?.ok && form.current) {
            for (const k of ["jumlah", "deskripsi"]) (form.current.elements.namedItem(k) as HTMLInputElement).value = ""
        }
    }, [hasil])

    const judul = tipe === "setor" ? "Setoran Simpanan" : "Pengambilan Simpanan"
    return (
        <div className="grid gap-6 lg:grid-cols-5">
            <div className="lg:col-span-3">
                <FormCard title={judul} description={tipe === "setor"
                    ? "Setoran dicatat ke buku simpanan dan dijurnal: debit kas, kredit simpanan."
                    : "Pengambilan dicatat ke buku simpanan dan dijurnal: debit simpanan, kredit kas. Ditolak bila saldo kurang."}>
                    <form ref={form} onSubmit={onSubmit} className="space-y-4">
                        <Field label="Anggota" htmlFor="anggota">
                            <AnggotaPicker value={anggota} onChange={setAnggota} />
                        </Field>
                        <div className="grid gap-4 sm:grid-cols-2">
                            <Field label="Jenis Simpanan" htmlFor="jenisSimpanan">
                                <select id="jenisSimpanan" name="jenisSimpanan" required className={selectClass} defaultValue="03">
                                    {jenis.map((j) => <option key={j.kode_simpanan} value={j.kode_simpanan}>{j.nama_simpanan}</option>)}
                                </select>
                            </Field>
                            <Field label="Tanggal" htmlFor="tanggal">
                                <Input id="tanggal" name="tanggal" type="date" required defaultValue={hariIni} />
                            </Field>
                            <Field label="Jumlah (Rp)" htmlFor="jumlah">
                                <Input id="jumlah" name="jumlah" type="number" min="1" step="any" required inputMode="decimal" />
                            </Field>
                            <Field label={tipe === "setor" ? "Masuk ke Kas/Bank" : "Keluar dari Kas/Bank"} htmlFor="kas">
                                <KasSelect akun={akunKas} />
                            </Field>
                        </div>
                        <Field label="Keterangan (opsional)" htmlFor="deskripsi">
                            <Input id="deskripsi" name="deskripsi" maxLength={200} />
                        </Field>
                        <HasilTransaksi hasil={hasil} />
                        <div className="flex justify-end">
                            <SubmitButton pending={pending}>{tipe === "setor" ? "Simpan Setoran" : "Simpan Pengambilan"}</SubmitButton>
                        </div>
                    </form>
                </FormCard>
            </div>
            <div className="lg:col-span-2">
                <FormCard title="Saldo Simpanan" description={anggota ? `${anggota.nama} (${anggota.kode_agt})` : "Pilih anggota untuk melihat saldo."}>
                    {info ? (
                        <table className="w-full text-sm">
                            <tbody>
                                {info.saldo.map((s) => (
                                    <tr key={s.kode_simpanan} className="border-b last:border-0">
                                        <td className="py-2">{s.nama_simpanan}</td>
                                        <td className="py-2 text-right tabular-nums font-semibold">{formatRupiah(s.saldo)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : <p className="text-sm text-muted-foreground">-</p>}
                </FormCard>
            </div>
        </div>
    )
}
