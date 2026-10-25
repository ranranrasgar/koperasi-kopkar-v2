"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Input } from "@/components/ui/input"
import { batasPlafon, pesanPlafon } from "@kopkar/backend/src/posting/plafon.ts"
import { cairkanPinjamanAction, pratinjauPinjamanAction, riwayatAnggotaAction } from "@/app/actions/transaksi"
import type { RiwayatAnggota } from "@/lib/queries/pinjaman-riwayat"
import { RiwayatAnggotaPanel, RingkasRisiko } from "./RiwayatAnggota"
import type { AnggotaRingkas } from "@/lib/queries/anggota"
import { formatRupiah, formatAngka2 } from "@/lib/format"
import { AnggotaPicker, Field, FormCard, HasilTransaksi, JadwalTable, KasSelect, SubmitButton, selectClass, useAksiForm, type Akun } from "./common"

export interface JenisKreditOpsi {
    kode_kredit: string; nama_kredit: string; group_pinjaman: string; bunga_kredit: number; bunga_per: string
    mak_cicilan: number; persen_adm: number; persen_provisi: number; jatuh_tempo: number; hide: boolean
    kunci_staff: boolean; kunci_sisa: boolean; kunci_grade: boolean; maks_plafond: number
}

type Pratinjau = Awaited<ReturnType<typeof pratinjauPinjamanAction>>

/** Isi awal dari pengajuan kredit yang disetujui. */
export interface AwalPinjaman extends AnggotaRingkas { kode_kredit: string; pokok: string; lama: number; persen_bunga: string }

export function PinjamanForm({ jenis, akunKas, hariIni, awal, bolehUbahBunga = false }: { jenis: JenisKreditOpsi[]; akunKas: Akun[]; hariIni: string; awal?: AwalPinjaman; bolehUbahBunga?: boolean }) {
    const { hasil, onSubmit, pending } = useAksiForm(cairkanPinjamanAction)
    const [anggota, setAnggota] = useState<AnggotaRingkas | null>(awal ?? null)
    const [kodeKredit, setKodeKredit] = useState(awal?.kode_kredit ?? jenis[0]?.kode_kredit ?? "")
    const [tanggal, setTanggal] = useState(hariIni)
    const [pokok, setPokok] = useState(awal ? String(Number(awal.pokok)) : "")
    const [lama, setLama] = useState(awal ? String(awal.lama) : "")
    const [persenBunga, setPersenBunga] = useState(awal ? String(Number(awal.persen_bunga)) : "")
    const [pratinjau, setPratinjau] = useState<Pratinjau>(null)
    const form = useRef<HTMLFormElement>(null)
    const [riwayat, setRiwayat] = useState<RiwayatAnggota | null>(null)
    const [memuat, setMemuat] = useState(false)
    const jk = jenis.find((j) => j.kode_kredit === kodeKredit)

    useEffect(() => {
        if (!anggota) { setRiwayat(null); return }
        let batal = false
        setMemuat(true)
        riwayatAnggotaAction(anggota.kode_agt).then((r) => { if (!batal) { setRiwayat(r); setMemuat(false) } })
        return () => { batal = true }
    }, [anggota])

    /*
     * Jenis kredit menurut aturan di Pengaturan Jenis Pinjaman dan status anggota, sama dengan aplikasi anggota (PWA): staff dan non-staff
     * hanya melihat jenisnya, jenis yang mengunci tunggakan tidak tersedia selama pinjaman jenis itu masih berjalan, dan jenis berplafon grade
     * tidak tersedia bila grade anggota belum diisi. Jenis bertanda "Tidak untuk mobile" tetap boleh dipilih operator tetapi dipisah.
     */
    const kelompok = useMemo(() => {
        const tersedia: JenisKreditOpsi[] = [], operator: JenisKreditOpsi[] = [], tidak: { j: JenisKreditOpsi; alasan: string }[] = []
        if (!riwayat) return { tersedia, operator, tidak }
        const staff = (riwayat.anggota.status_staff ?? "").trim() === "Staff"
        for (const j of jenis) {
            const b = batasPlafon({ kunciGrade: j.kunci_grade, maksPlafond: j.maks_plafond }, riwayat.anggota.rp_grade)
            if (j.kunci_staff !== staff) tidak.push({ j, alasan: j.kunci_staff ? "hanya untuk anggota Staff" : "bukan untuk anggota Staff" })
            else if (j.kunci_sisa && riwayat.daftar.some((p) => p.jenis === "tunai" && p.kode_kredit === j.kode_kredit && p.status !== "Lunas")) tidak.push({ j, alasan: "masih ada pinjaman jenis ini yang berjalan" })
            else if (b?.batas === 0) tidak.push({ j, alasan: "grade anggota belum diisi" })
            else if (j.hide) operator.push(j)
            else tersedia.push(j)
        }
        return { tersedia, operator, tidak }
    }, [jenis, riwayat])
    // Pilihan awal dari pengajuan yang disetujui dipertahankan; selain itu pindah ke jenis pertama yang tersedia bila pilihan sekarang tidak berlaku.
    useEffect(() => {
        if (!riwayat) return
        const boleh = [...kelompok.tersedia, ...kelompok.operator]
        if (boleh.some((j) => j.kode_kredit === kodeKredit) || (awal && kodeKredit === awal.kode_kredit)) return
        setKodeKredit(boleh[0]?.kode_kredit ?? "")
    }, [riwayat, kelompok, kodeKredit, awal])
    const batas = jk && riwayat ? batasPlafon({ kunciGrade: jk.kunci_grade, maksPlafond: jk.maks_plafond }, riwayat.anggota.rp_grade) : null
    const pesanBatas = batas && Number(pokok) > 0 ? pesanPlafon(Number(pokok), batas, "anggota") : null

    useEffect(() => {
        let batal = false
        const t = setTimeout(() => {
            if (!pokok || !lama) { setPratinjau(null); return }
            pratinjauPinjamanAction({ kodeKredit, tglPinjaman: tanggal, pokok, lama: Number(lama), persenBunga: bolehUbahBunga ? persenBunga || undefined : undefined })
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
                        <RingkasRisiko data={riwayat} memuat={memuat} />
                        <div className="grid gap-4 sm:grid-cols-2">
                            <Field label="Jenis Kredit" htmlFor="kodeKredit" className="sm:col-span-2">
                                <select id="kodeKredit" name="kodeKredit" required className={selectClass} value={kodeKredit} disabled={!riwayat}
                                    onChange={(e) => setKodeKredit(e.target.value)}>
                                    {!riwayat && <option value="">{anggota ? "Memuat jenis kredit anggota…" : "Pilih anggota dulu"}</option>}
                                    {riwayat && kelompok.tersedia.length === 0 && kelompok.operator.length === 0 && <option value="">Tidak ada jenis kredit yang tersedia</option>}
                                    {kelompok.tersedia.length > 0 && (
                                        <optgroup label="Tersedia (sama seperti di aplikasi anggota)">
                                            {kelompok.tersedia.map((j) => <option key={j.kode_kredit} value={j.kode_kredit}>{j.kode_kredit} - {j.nama_kredit} ({j.group_pinjaman})</option>)}
                                        </optgroup>)}
                                    {kelompok.operator.length > 0 && (
                                        <optgroup label="Khusus operator (tidak tampil di aplikasi anggota)">
                                            {kelompok.operator.map((j) => <option key={j.kode_kredit} value={j.kode_kredit}>{j.kode_kredit} - {j.nama_kredit} ({j.group_pinjaman})</option>)}
                                        </optgroup>)}
                                    {kelompok.tidak.length > 0 && (
                                        <optgroup label="Tidak tersedia untuk anggota ini">
                                            {kelompok.tidak.map(({ j, alasan }) => <option key={j.kode_kredit} value={j.kode_kredit} disabled>{j.kode_kredit} - {j.nama_kredit}: {alasan}</option>)}
                                        </optgroup>)}
                                </select>
                            </Field>
                            <Field label="Tanggal Pinjaman" htmlFor="tanggal">
                                <Input id="tanggal" name="tanggal" type="date" required value={tanggal} onChange={(e) => setTanggal(e.target.value)} />
                            </Field>
                            <Field label="Pokok Pinjaman (Rp)" htmlFor="pokok"
                                hint={batas ? `Maksimal ${formatRupiah(batas.batas)} (${batas.sumber === "grade" ? "grade anggota" : "maksimal plafond jenis ini"})` : undefined}>
                                <Input id="pokok" name="pokok" type="number" min="1" step="any" required value={pokok} onChange={(e) => setPokok(e.target.value)} />
                            </Field>
                            <Field label="Lama Angsuran (kali)" htmlFor="lama"
                                hint={jk && jk.mak_cicilan > 0 ? `Maksimum ${jk.mak_cicilan} kali` : undefined}>
                                <Input id="lama" name="lama" type="number" min="1" step="1" max={jk && jk.mak_cicilan > 0 ? jk.mak_cicilan : undefined}
                                    required value={lama} onChange={(e) => setLama(e.target.value)} />
                            </Field>
                            <Field label="Bunga (%)" htmlFor="persenBunga"
                                hint={bolehUbahBunga
                                    ? (jk ? `Bawaan ${formatAngka2(jk.bunga_kredit)}% ${jk.bunga_per.toLowerCase()}; kosongkan untuk memakai bawaan` : undefined)
                                    : "Mengikuti pengaturan jenis kredit; hanya admin yang boleh mengubah bunga"}>
                                <Input id="persenBunga" name="persenBunga" type="number" min="0" step="any" placeholder={jk ? String(jk.bunga_kredit) : ""}
                                    value={bolehUbahBunga ? persenBunga : ""} onChange={(e) => setPersenBunga(e.target.value)}
                                    readOnly={!bolehUbahBunga} disabled={!bolehUbahBunga} className={bolehUbahBunga ? undefined : "bg-muted/50"} />
                            </Field>
                            <Field label="Dibayar dari Kas/Bank" htmlFor="kas" className="sm:col-span-2">
                                <KasSelect akun={akunKas} />
                            </Field>
                        </div>
                        {pesanBatas && <p role="alert" className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">{pesanBatas}</p>}
                        <HasilTransaksi hasil={hasil} />
                        <div className="flex justify-end">
                            <SubmitButton pending={pending} disabled={!anggota || !kodeKredit || Boolean(pesanBatas)}>Cairkan Pinjaman</SubmitButton>
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
            {riwayat && <div className="lg:col-span-5"><RiwayatAnggotaPanel data={riwayat} batas={batas} /></div>}
        </div>
    )
}
