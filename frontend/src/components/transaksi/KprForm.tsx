"use client"

import { useEffect, useState } from "react"
import { Input } from "@/components/ui/input"
import { cairkanKprAction } from "@/app/actions/transaksi"
import type { AnggotaRingkas } from "@/lib/queries/anggota"
import { formatRupiah } from "@/lib/format"
import { AnggotaPicker, Field, FormCard, HasilTransaksi, KasSelect, SubmitButton, selectClass, useAksiForm, type Akun } from "./common"
import type { JenisKreditOpsi } from "./PinjamanForm"

export function KprForm({ jenis, akunKas, hariIni }: { jenis: JenisKreditOpsi[]; akunKas: Akun[]; hariIni: string }) {
    const { hasil, onSubmit, pending } = useAksiForm(cairkanKprAction)
    const [anggota, setAnggota] = useState<AnggotaRingkas | null>(null)
    const [kodeKredit, setKodeKredit] = useState(jenis[0]?.kode_kredit ?? "")
    const [pokok, setPokok] = useState("")
    const [lama, setLama] = useState("")
    const [angsuran, setAngsuran] = useState("")
    const jk = jenis.find((j) => j.kode_kredit === kodeKredit)
    // Bawaan mesin posting: pokok / lama dibulatkan ke rupiah.
    const bawaan = Number(pokok) > 0 && Number(lama) > 0 ? Math.round(Number(pokok) / Number(lama)) : null

    useEffect(() => {
        if (hasil?.ok) { setPokok(""); setLama(""); setAngsuran(""); setAnggota(null) }
    }, [hasil])

    return (
        <div className="max-w-3xl">
            <FormCard title="Input Pinjaman KPR"
                description="KPR dipotong dari gaji dan diteruskan ke bank (titipan, tanpa bunga). Pencairan hanya mencatat rincian; jurnal dibuat saat angsuran.">
                <form onSubmit={onSubmit} className="space-y-4">
                    <Field label="Anggota" htmlFor="anggota">
                        <AnggotaPicker value={anggota} onChange={setAnggota} />
                    </Field>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <Field label="Jenis KPR" htmlFor="kodeKredit" className="sm:col-span-2">
                            <select id="kodeKredit" name="kodeKredit" required className={selectClass} value={kodeKredit} onChange={(e) => setKodeKredit(e.target.value)}>
                                {jenis.map((j) => <option key={j.kode_kredit} value={j.kode_kredit}>{j.kode_kredit} - {j.nama_kredit}{j.hide ? " [disembunyikan]" : ""}</option>)}
                            </select>
                        </Field>
                        <Field label="Tanggal" htmlFor="tanggal">
                            <Input id="tanggal" name="tanggal" type="date" required defaultValue={hariIni} />
                        </Field>
                        <Field label="Pokok KPR (Rp)" htmlFor="pokok">
                            <Input id="pokok" name="pokok" type="number" min="1" step="any" required value={pokok} onChange={(e) => setPokok(e.target.value)} />
                        </Field>
                        <Field label="Lama Angsuran (bulan)" htmlFor="lama" hint={jk && jk.mak_cicilan > 0 ? `Maksimum ${jk.mak_cicilan} bulan` : undefined}>
                            <Input id="lama" name="lama" type="number" min="1" step="1" required value={lama} onChange={(e) => setLama(e.target.value)} />
                        </Field>
                        <Field label="Angsuran per Bulan (Rp)" htmlFor="angsuran"
                            hint={bawaan !== null ? `Kosongkan untuk memakai ${formatRupiah(bawaan)} (pokok / lama)` : "Kosongkan untuk memakai pokok / lama"}>
                            <Input id="angsuran" name="angsuran" type="number" min="1" step="any" value={angsuran} onChange={(e) => setAngsuran(e.target.value)} />
                        </Field>
                        <Field label="Kas/Bank" htmlFor="kas" className="sm:col-span-2">
                            <KasSelect akun={akunKas} />
                        </Field>
                    </div>
                    <HasilTransaksi hasil={hasil} />
                    <div className="flex justify-end">
                        <SubmitButton pending={pending}>Simpan KPR</SubmitButton>
                    </div>
                </form>
            </FormCard>
        </div>
    )
}
