"use client"

import { TombolKirimInfo } from "./TombolKirimInfo"
import { useCallback, useEffect, useState } from "react"
import { Input } from "@/components/ui/input"
import { InputUang, InputUangBebas } from "@/components/ui/InputUang"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
    angsuranBerikutnyaAction, bayarAngsuranAction, bayarAngsuranKprAction, infoAnggotaAction, type InfoAnggota,
} from "@/app/actions/transaksi"
import type { AnggotaRingkas } from "@/lib/queries/anggota"
import { formatAngka, formatRupiah, formatTanggal } from "@/lib/format"
import { AnggotaPicker, Field, FormCard, HasilTransaksi, KasSelect, SubmitButton, selectClass, useAksiForm, type Akun } from "./common"

type Berikutnya = Awaited<ReturnType<typeof angsuranBerikutnyaAction>>
type KomponenAngsuran = "pokok" | "jasa" | "adm" | "provisi"

function AngsuranTunai({ info, akunKas, hariIni, onSelesai, pilih }: { info: InfoAnggota; akunKas: Akun[]; hariIni: string; onSelesai: () => void; pilih?: string }) {
    const { hasil, onSubmit, pending } = useAksiForm(bayarAngsuranAction)
    const [noPinjaman, setNoPinjaman] = useState(pilih ?? info.pinjaman[0]?.no_pinjaman ?? "")
    const [berikut, setBerikut] = useState<Berikutnya>(null)
    const [ubah, setUbah] = useState(false)
    const [isian, setIsian] = useState<Record<KomponenAngsuran, string>>({ pokok: "", jasa: "", adm: "", provisi: "" })

    useEffect(() => {
        if (!info.pinjaman.some((p) => p.no_pinjaman === noPinjaman)) setNoPinjaman(info.pinjaman[0]?.no_pinjaman ?? "")
    }, [info, noPinjaman])
    useEffect(() => {
        let batal = false
        if (!noPinjaman) { setBerikut(null); return }
        angsuranBerikutnyaAction(noPinjaman).then((b) => { if (!batal) setBerikut(b) })
        return () => { batal = true }
    }, [noPinjaman, hasil])
    useEffect(() => { if (hasil?.ok) { setUbah(false); onSelesai() } }, [hasil, onSelesai])
    useEffect(() => {
        if (!berikut) return
        // Angsuran terakhir: bawaan isian pokok adalah sisanya, supaya pinjaman yang pokoknya pernah diubah bisa pas lunas.
        const akhir = berikut.ke === berikut.lama
        setIsian({ pokok: String(akhir ? berikut.sisa : berikut.pokok), jasa: String(berikut.jasa), adm: String(berikut.adm), provisi: String(berikut.provisi) })
    }, [berikut])

    if (info.pinjaman.length === 0) return <><p className="text-sm text-muted-foreground">Tidak ada pinjaman tunai yang berjalan.</p><HasilTransaksi hasil={hasil} /></>
    const nilai = (k: KomponenAngsuran) => !berikut ? 0 : ubah ? Number(isian[k] || 0) : berikut[k]
    const total = nilai("pokok") + nilai("jasa") + nilai("adm") + nilai("provisi")
    // Kirim pokok hanya bila benar-benar diubah: nilai jadwal punya 4 desimal, sedangkan isian dibulatkan.
    const pokokDiubah = !!berikut && ubah && Number(isian.pokok || 0) !== berikut.pokok
    const sisaBeda = !!berikut && berikut.ke === berikut.lama && Math.abs(berikut.sisa - berikut.pokok) > 1
    // Jasa di bawah jadwal (selisih lebih dari Rp 1): server mewajibkan alasan, yang ikut tercatat di keterangan angsuran.
    const jasaKurang = !!berikut && ubah && Number(isian.jasa || 0) < berikut.jasa - 1
    return (
        <form onSubmit={onSubmit} className="space-y-4">
            <Field label="Pinjaman" htmlFor="noPinjaman">
                <select id="noPinjaman" name="noPinjaman" className={selectClass} value={noPinjaman} onChange={(e) => setNoPinjaman(e.target.value)}>
                    {info.pinjaman.map((p) => (
                        <option key={p.no_pinjaman} value={p.no_pinjaman}>
                            {p.no_pinjaman} | {p.nama_kredit ?? "-"} | {formatRupiah(p.rp_pinjaman_pokok)} | {p.jml_cicilan}/{p.lama_angsuran}
                        </option>
                    ))}
                </select>
            </Field>
            {berikut && (
                <div className="rounded-md border bg-muted/30 p-3 text-sm">
                    <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
                        <span className="font-semibold">Angsuran ke-{berikut.ke} dari {berikut.lama}</span>
                        <span className="text-xs text-muted-foreground">Sisa pokok <b className="tabular-nums text-foreground">{formatRupiah(berikut.sisa)}</b></span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                        {(["pokok", "jasa", "adm", "provisi"] as const).map((k) => (
                            <div key={k}>
                                <div className="text-[11px] uppercase text-muted-foreground">{k}</div>
                                {ubah ? (
                                    <InputUang name={k === "pokok" ? "isianPokok" : k} value={isian[k]} onChange={(v) => setIsian((x) => ({ ...x, [k]: v }))} className="h-8" />
                                ) : <div className="tabular-nums font-semibold">{formatRupiah(berikut[k])}</div>}
                            </div>
                        ))}
                        <div>
                            <div className="text-[11px] uppercase text-muted-foreground">Total</div>
                            <div className="tabular-nums font-bold text-primary">{formatRupiah(total)}</div>
                        </div>
                    </div>
                    <label className="mt-2 flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
                        <input type="checkbox" checked={ubah} onChange={(e) => setUbah(e.target.checked)} />
                        Ubah pokok/jasa/adm/provisi (mis. adm dibebaskan)
                    </label>
                    {pokokDiubah && <input type="hidden" name="pokok" value={isian.pokok} />}
                    {pokokDiubah && <p className="mt-2 text-xs text-amber-700 dark:text-amber-400">Pokok berbeda dengan jadwal. Jadwal angsuran berikutnya tidak berubah, dan angsuran ini tetap dihitung satu cicilan.</p>}
                    {jasaKurang && (
                        <div className="mt-2 space-y-1">
                            <label htmlFor="alasanJasa" className="block text-xs font-semibold text-amber-700 dark:text-amber-400">
                                Jasa di bawah jadwal ({formatRupiah(berikut.jasa)}). Alasan jasa tidak ditagih (wajib, minimal 10 karakter)
                            </label>
                            <Input id="alasanJasa" name="alasanJasa" required minLength={10} maxLength={50} className="h-8"
                                placeholder="mis. pelunasan dipercepat, jasa dibebaskan pengurus" />
                            <p className="text-xs text-muted-foreground">Alasan tercatat di keterangan angsuran dan muncul di Audit Data. Bila anggota membatalkan pinjaman, pakai Batalkan Pencairan, bukan angsuran.</p>
                        </div>
                    )}
                    {sisaBeda && <p className="mt-2 text-xs text-amber-700 dark:text-amber-400">Ini angsuran terakhir dan sisa pokok berbeda dengan jadwal. Centang ubah supaya pokoknya sama dengan sisa, kalau tidak pinjaman selesai dengan saldo tersisa.</p>}
                </div>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Tanggal Bayar" htmlFor="tanggal-tunai">
                    <Input id="tanggal-tunai" name="tanggal" type="date" required defaultValue={hariIni} />
                </Field>
                <Field label="Diterima di Kas/Bank" htmlFor="kas">
                    <KasSelect akun={akunKas} />
                </Field>
            </div>
            <HasilTransaksi hasil={hasil} />
            <div className="flex justify-end">
                <SubmitButton pending={pending}>Simpan Angsuran</SubmitButton>
            </div>
        </form>
    )
}

function AngsuranKpr({ info, akunKas, hariIni, onSelesai, pilih }: { info: InfoAnggota; akunKas: Akun[]; hariIni: string; onSelesai: () => void; pilih?: string }) {
    const { hasil, onSubmit, pending } = useAksiForm(bayarAngsuranKprAction)
    const [noPinjaman, setNoPinjaman] = useState(pilih ?? info.kpr[0]?.no_pinjaman ?? "")
    useEffect(() => {
        if (!info.kpr.some((k) => k.no_pinjaman === noPinjaman)) setNoPinjaman(info.kpr[0]?.no_pinjaman ?? "")
    }, [info, noPinjaman])
    useEffect(() => { if (hasil?.ok) onSelesai() }, [hasil, onSelesai])

    if (info.kpr.length === 0) return <><p className="text-sm text-muted-foreground">Tidak ada KPR dengan sisa pokok.</p><HasilTransaksi hasil={hasil} /></>
    const k = info.kpr.find((x) => x.no_pinjaman === noPinjaman)
    const bawaan = k ? Math.min(k.rp_angsuran_per_bulan, k.sisa_pokok) : 0
    return (
        <form onSubmit={onSubmit} className="space-y-4">
            <Field label="KPR" htmlFor="noKpr">
                <select id="noKpr" name="noPinjaman" className={selectClass} value={noPinjaman} onChange={(e) => setNoPinjaman(e.target.value)}>
                    {info.kpr.map((x) => (
                        <option key={x.no_pinjaman} value={x.no_pinjaman}>
                            {x.no_pinjaman} | {x.nama_kredit ?? "-"} | sisa {formatRupiah(x.sisa_pokok)} | {x.jml_cicilan}/{x.lama_angsuran}
                        </option>
                    ))}
                </select>
            </Field>
            {k && (
                <div className="rounded-md border bg-muted/30 p-3 text-sm grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <div><div className="text-[11px] uppercase text-muted-foreground">Tanggal KPR</div>{formatTanggal(k.tgl_pinjaman)}</div>
                    <div><div className="text-[11px] uppercase text-muted-foreground">Angsuran ke</div>{k.jml_cicilan + 1} dari {k.lama_angsuran}</div>
                    <div><div className="text-[11px] uppercase text-muted-foreground">Angsuran/bulan</div>{formatRupiah(k.rp_angsuran_per_bulan)}</div>
                    <div><div className="text-[11px] uppercase text-muted-foreground">Sisa pokok</div>{formatRupiah(k.sisa_pokok)}</div>
                    <div className="col-span-full"><TombolKirimInfo noPinjaman={k.no_pinjaman} kecil /></div>
                </div>
            )}
            <div className="grid gap-4 sm:grid-cols-3">
                <Field label="Jumlah (Rp)" htmlFor="jumlah-kpr" hint={`Kosongkan untuk ${formatRupiah(bawaan)}; angsuran terakhir mengambil sisa pokok`}>
                    <InputUangBebas id="jumlah-kpr" name="jumlah" placeholder={formatAngka(bawaan)} />
                </Field>
                <Field label="Tanggal Bayar" htmlFor="tanggal-kpr">
                    <Input id="tanggal-kpr" name="tanggal" type="date" required defaultValue={hariIni} />
                </Field>
                <Field label="Diterima di Kas/Bank" htmlFor="kas-kpr">
                    <KasSelect akun={akunKas} name="kas" />
                </Field>
            </div>
            <HasilTransaksi hasil={hasil} />
            <div className="flex justify-end">
                <SubmitButton pending={pending}>Simpan Angsuran KPR</SubmitButton>
            </div>
        </form>
    )
}

export function AngsuranForm({ akunKas, hariIni, izin, anggotaAwal = null }: { akunKas: Akun[]; hariIni: string; izin: { tunai: boolean; kpr: boolean }; anggotaAwal?: AnggotaRingkas | null }) {
    const [anggota, setAnggota] = useState<AnggotaRingkas | null>(anggotaAwal)
    const [info, setInfo] = useState<InfoAnggota | null>(null)
    const [versi, setVersi] = useState(0)
    const [tab, setTab] = useState(anggotaAwal?.jenis_pinjaman === "kpr" && izin.kpr ? "kpr" : izin.tunai ? "tunai" : "kpr")
    // Muat ulang daftar pinjaman setelah angsuran tersimpan (referensi stabil supaya efek anak tidak berulang).
    const selesai = useCallback(() => setVersi((v) => v + 1), [])

    useEffect(() => {
        if (!anggota) { setInfo(null); return }
        let batal = false
        infoAnggotaAction(anggota.kode_agt).then((i) => {
            if (batal) return
            setInfo(i)
            if (versi === 0 && izin.kpr && i.pinjaman.length === 0 && i.kpr.length > 0) setTab("kpr")
        })
        return () => { batal = true }
    }, [anggota, versi, izin.kpr])

    return (
        <div className="max-w-4xl space-y-6">
            <FormCard title="Setoran Angsuran" description="Angsuran pinjaman tunai (pokok, jasa, adm, provisi) atau KPR (titipan). Nomor bukti dari mesin posting.">
                <div className="space-y-4">
                    <Field label="Anggota" htmlFor="anggota">
                        <AnggotaPicker cariPinjaman pindai value={anggota} onChange={(a) => {
                            // info dikosongkan supaya form pinjaman dibuat ulang dengan pinjaman yang dipilih dari pencarian.
                            setInfo(null); setAnggota(a); setVersi(0)
                            if (a?.jenis_pinjaman === "tunai" && izin.tunai) setTab("tunai")
                            if (a?.jenis_pinjaman === "kpr" && izin.kpr) setTab("kpr")
                        }} />
                    </Field>
                    {info && (
                        <Tabs value={tab} onValueChange={setTab}>
                            <TabsList>
                                <TabsTrigger value="tunai" disabled={!izin.tunai}>Pinjaman Tunai ({info.pinjaman.length})</TabsTrigger>
                                <TabsTrigger value="kpr" disabled={!izin.kpr}>KPR ({info.kpr.length})</TabsTrigger>
                            </TabsList>
                            <TabsContent value="tunai" className="pt-4">
                                <AngsuranTunai info={info} akunKas={akunKas} hariIni={hariIni} onSelesai={selesai} pilih={anggota?.jenis_pinjaman === "tunai" ? anggota.no_pinjaman : undefined} />
                            </TabsContent>
                            <TabsContent value="kpr" className="pt-4">
                                <AngsuranKpr info={info} akunKas={akunKas} hariIni={hariIni} onSelesai={selesai} pilih={anggota?.jenis_pinjaman === "kpr" ? anggota.no_pinjaman : undefined} />
                            </TabsContent>
                        </Tabs>
                    )}
                </div>
            </FormCard>
        </div>
    )
}
