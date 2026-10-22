"use client"

import { useEffect, useRef, useState } from "react"
import { Input } from "@/components/ui/input"
import { cairkanPinjamanAction, pratinjauPinjamanAction } from "@/app/actions/transaksi"
import type { AnggotaRingkas } from "@/lib/queries/anggota"
import { formatRupiah, formatAngka2 } from "@/lib/format"
import { AnggotaPicker, Field, FormCard, HasilTransaksi, JadwalTable, KasSelect, SubmitButton, selectClass, useAksiForm, type Akun } from "./common"

export interface JenisKreditOpsi {
    kode_kredit: string; nama_kredit: string; group_pinjaman: string; bunga_kredit: number; bunga_per: string
    mak_cicilan: number; persen_adm: number; persen_provisi: number; jatuh_tempo: number; hide: boolean
}

type Pratinjau = Awaited<ReturnType<typeof pratinjauPinjamanAction>>

/** Isi awal dari pengajuan kredit yang disetujui. */
export interface AwalPinjaman extends AnggotaRingkas { kode_kredit: string; pokok: string; lama: number; persen_bunga: string }

export function PinjamanForm({ jenis, akunKas, hariIni, awal }: { jenis: JenisKreditOpsi[]; akunKas: Akun[]; hariIni: string; awal?: AwalPinjaman }) {
    const { hasil, onSubmit, pending } = useAksiForm(cairkanPinjamanAction)
    const [anggota, setAnggota] = useState<AnggotaRingkas | null>(awal ?? null)
    const [kodeKredit, setKodeKredit] = useState(awal?.kode_kredit ?? jenis[0]?.kode_kredit ?? "")
    const [tanggal, setTanggal] = useState(hariIni)
    const [pokok, setPokok] = useState(awal ? String(Number(awal.pokok)) : "")
    const [lama, setLama] = useState(awal ? String(awal.lama) : "")
    const [persenBunga, setPersenBunga] = useState(awal ? String(Number(awal.persen_bunga)) : "")
    const [pratinjau, setPratinjau] = useState<Pratinjau>(null)
    const form = useRef<HTMLFormElement>(null)
    const jk = jenis.find((j) => j.kode_kredit === kodeKredit)

    useEffect(() => {
        let batal = false
        const t = setTimeout(() => {
            if (!pokok || !lama) { setPratinjau(null); return }
            pratinjauPinjamanAction({ kodeKredit, tglPinjaman: tanggal, pokok, lama: Number(lama), persenBunga: persenBunga || undefined })
                .then((p) => { if (!batal) setPratinjau(p) })
        }, 300)
        return () => { batal = true; clearTimeout(t) }
    }, [kodeKredit, tanggal, pokok, lama, persenBunga])

    useEffect(() => {
        if (hasil?.ok) { setPokok(""); setLama(""); setPersenBunga(""); setAnggota(null) }
    }, [hasil])

    return (
        <div className="grid gap-6 lg:grid-cols-5">
            <div className="lg:col-span-3 space-y-6">
                <FormCard title="Pencairan Pinjaman Tunai"
                    description="Mencatat header pinjaman, baris pencairan, jadwal tagih, dan jurnal (debit piutang, kredit kas) dalam satu transaksi.">
                    <form ref={form} onSubmit={onSubmit} className="space-y-4">
                        <Field label="Anggota" htmlFor="anggota">
                            <AnggotaPicker value={anggota} onChange={setAnggota} />
                        </Field>
                        <div className="grid gap-4 sm:grid-cols-2">
                            <Field label="Jenis Kredit" htmlFor="kodeKredit" className="sm:col-span-2">
                                <select id="kodeKredit" name="kodeKredit" required className={selectClass} value={kodeKredit} onChange={(e) => setKodeKredit(e.target.value)}>
                                    {jenis.map((j) => <option key={j.kode_kredit} value={j.kode_kredit}>{j.kode_kredit} - {j.nama_kredit} ({j.group_pinjaman}){j.hide ? " [disembunyikan]" : ""}</option>)}
                                </select>
                            </Field>
                            <Field label="Tanggal Pinjaman" htmlFor="tanggal">
                                <Input id="tanggal" name="tanggal" type="date" required value={tanggal} onChange={(e) => setTanggal(e.target.value)} />
                            </Field>
                            <Field label="Pokok Pinjaman (Rp)" htmlFor="pokok">
                                <Input id="pokok" name="pokok" type="number" min="1" step="any" required value={pokok} onChange={(e) => setPokok(e.target.value)} />
                            </Field>
                            <Field label="Lama Angsuran (kali)" htmlFor="lama"
                                hint={jk && jk.mak_cicilan > 0 ? `Maksimum ${jk.mak_cicilan} kali` : undefined}>
                                <Input id="lama" name="lama" type="number" min="1" step="1" max={jk && jk.mak_cicilan > 0 ? jk.mak_cicilan : undefined}
                                    required value={lama} onChange={(e) => setLama(e.target.value)} />
                            </Field>
                            <Field label="Bunga (%)" htmlFor="persenBunga"
                                hint={jk ? `Bawaan ${formatAngka2(jk.bunga_kredit)}% ${jk.bunga_per.toLowerCase()}; kosongkan untuk memakai bawaan` : undefined}>
                                <Input id="persenBunga" name="persenBunga" type="number" min="0" step="any" placeholder={jk ? String(jk.bunga_kredit) : ""}
                                    value={persenBunga} onChange={(e) => setPersenBunga(e.target.value)} />
                            </Field>
                            <Field label="Dibayar dari Kas/Bank" htmlFor="kas" className="sm:col-span-2">
                                <KasSelect akun={akunKas} />
                            </Field>
                        </div>
                        <HasilTransaksi hasil={hasil} />
                        <div className="flex justify-end">
                            <SubmitButton pending={pending}>Cairkan Pinjaman</SubmitButton>
                        </div>
                    </form>
                </FormCard>
            </div>
            <div className="lg:col-span-2">
                <FormCard title="Pratinjau Jadwal" description="Dihitung dengan rumus mesin posting; belum tersimpan.">
                    {pratinjau ? (
                        <div className="space-y-2 text-sm">
                            <div className="grid grid-cols-2 gap-1">
                                <span className="text-muted-foreground">Total jasa</span><span className="text-right font-semibold tabular-nums">{formatRupiah(pratinjau.jasaTotal)}</span>
                                <span className="text-muted-foreground">Adm (angsuran 1)</span><span className="text-right tabular-nums">{formatRupiah(pratinjau.adm)}</span>
                                <span className="text-muted-foreground">Provisi (angsuran 1)</span><span className="text-right tabular-nums">{formatRupiah(pratinjau.provisi)}</span>
                            </div>
                            <JadwalTable jadwal={pratinjau.jadwal} />
                        </div>
                    ) : <p className="text-sm text-muted-foreground">Isi pokok dan lama angsuran.</p>}
                </FormCard>
            </div>
        </div>
    )
}
