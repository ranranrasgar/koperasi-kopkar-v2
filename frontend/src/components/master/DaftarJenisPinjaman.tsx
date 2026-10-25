"use client"

import React, { useActionState, useEffect, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { AlertCircle, CheckCircle2, Loader2, Pencil, Plus, Trash2 } from "lucide-react"
import { batasPlafon } from "@kopkar/backend/src/posting/plafon.ts"
import { hapusJenisPinjamanAction, simpanJenisPinjamanAction, type HasilSimpan } from "@/app/actions/master"
import { AkunBox } from "@/components/bankbook/AkunBox"
import { Field, SubmitButton, selectClass, type Akun } from "@/components/transaksi/common"
import { InputUang } from "@/components/ui/InputUang"
import { Input } from "@/components/ui/input"
import { ModalForm } from "@/components/ui/Modal"
import { formatAngka } from "@/lib/format"
import { cn } from "@/lib/utils"

export interface JenisPinjaman {
    id: number; kode_kredit: string; nama_kredit: string; group_pinjaman: string; jenis_pinjaman: string
    bunga_kredit: number; bunga_per: string; persen_adm: number; persen_provisi: number; persen_denda: number
    mak_cicilan: number; jatuh_tempo: number; hide: boolean
    pakai_adm: number; pakai_denda: number; pakai_um: number; kunci_jika_melebihi_grade: number; kunci_hanya_untuk_staff: number
    kunci_jika_sisa: number; hitung_shu: number; maks_plafond: number
    coa_kredit: string | null; coa_jasa: string | null; coa_adm: string | null; coa_provisi: string | null
}
export interface GradeAnggota { rp_grade: number; n: number }

const GRUP = ["KOPERASI", "BANK / PIHAK LAIN", "KPR"]
const JENIS = ["Pinjaman Uang", "Pinjaman Barang"]
const PER = ["PER ANGSURAN", "PER LAMA ANGSURAN"]
const persen = (n: number) => `${Number(n).toLocaleString("id-ID", { maximumFractionDigits: 4 })}%`

/** Tombol/kotak centang dengan penjelasan singkat di bawahnya. */
function Centang({ name, label, ket, checked, onChange }: { name: string; label: string; ket: string; checked: boolean; onChange: (v: boolean) => void }) {
    return (
        <label className="flex cursor-pointer items-start gap-2.5 rounded-md px-2 py-1.5 hover:bg-muted/50">
            <input type="checkbox" name={name} checked={checked} onChange={(e) => onChange(e.target.checked)} className="mt-0.5 h-4 w-4" />
            <span className="leading-tight"><span className="block text-sm font-medium">{label}</span><span className="block text-xs text-muted-foreground">{ket}</span></span>
        </label>
    )
}

/** Biaya (provisi, adm, denda): kotak centang menyalakan isian persen; tidak dicentang berarti tidak dipungut (disimpan 0). */
function Biaya({ nama, label, aktif, setAktif, nilai, setNilai }: { nama: string; label: string; aktif: boolean; setAktif: (v: boolean) => void; nilai: string; setNilai: (v: string) => void }) {
    return (
        <div className="flex items-center gap-2">
            <label className="flex w-28 shrink-0 items-center gap-2 text-sm"><input type="checkbox" name={`pakai_${nama}`} checked={aktif} onChange={(e) => setAktif(e.target.checked)} className="h-4 w-4" />{label}</label>
            <Input name={`persen_${nama}`} type="number" min="0" max="100" step="any" disabled={!aktif} value={aktif ? nilai : ""} onChange={(e) => setNilai(e.target.value)} className="w-24 text-right" aria-label={`${label} (%)`} />
            <span className="text-sm text-muted-foreground">%</span>
        </div>
    )
}

/** Pesan hasil simpan; isian tidak dikosongkan saat server menolak (submit lewat transition, bukan form action). */
function PesanSimpan({ hasil }: { hasil: HasilSimpan }) {
    if (!hasil) return null
    return hasil.ok
        ? <div role="status" className="flex items-center gap-2 rounded-md border border-green-300 bg-green-50 p-3 text-sm font-semibold text-green-700"><CheckCircle2 className="h-4 w-4" />{hasil.pesan}</div>
        : <div role="alert" className="flex items-start gap-2 rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />{hasil.error}</div>
}

function FormJenis({ awal, akun, grade, selesai }: { awal: JenisPinjaman | null; akun: Akun[]; grade: GradeAnggota[]; selesai: () => void }) {
    const [hasil, jalankan, pending] = useActionState(simpanJenisPinjamanAction, null)
    const [, mulai] = useTransition()
    useEffect(() => { if (hasil?.ok) { const t = setTimeout(selesai, 1200); return () => clearTimeout(t) } }, [hasil, selesai])
    const onSubmit = (e: React.FormEvent<HTMLFormElement>) => { e.preventDefault(); const d = new FormData(e.currentTarget); mulai(() => jalankan(d)) }
    const router = useRouter()
    const [hapus, mulaiHapus] = useTransition()
    const baru = awal === null
    const [adm, setAdm] = useState(baru ? false : awal.pakai_adm === 1 || awal.persen_adm > 0)
    const [provisi, setProvisi] = useState(baru ? false : awal.persen_provisi > 0)
    const [denda, setDenda] = useState(baru ? false : awal.pakai_denda === 1 || awal.persen_denda > 0)
    const [pAdm, setPAdm] = useState(String(awal?.persen_adm ?? 0))
    const [pProvisi, setPProvisi] = useState(String(awal?.persen_provisi ?? 0))
    const [pDenda, setPDenda] = useState(String(awal?.persen_denda ?? 0))
    const [um, setUm] = useState(awal?.pakai_um === 1)
    const [kunciGrade, setKunciGrade] = useState(awal?.kunci_jika_melebihi_grade === 1)
    const [staff, setStaff] = useState(awal?.kunci_hanya_untuk_staff === 1)
    const [sisa, setSisa] = useState(awal?.kunci_jika_sisa === 1)
    const [shu, setShu] = useState(awal?.hitung_shu === 1)
    const [sembunyi, setSembunyi] = useState(awal?.hide ?? false)
    const [maks, setMaks] = useState(String(awal?.maks_plafond ?? 0).replace(/\.0+$/, "").replace(/^0$/, ""))
    const [coa, setCoa] = useState({ kredit: awal?.coa_kredit ?? "", jasa: awal?.coa_jasa ?? "", adm: awal?.coa_adm ?? "", provisi: awal?.coa_provisi ?? "" })

    const hapusIni = () => {
        if (!awal || !confirm(`Hapus jenis pinjaman ${awal.kode_kredit} ${awal.nama_kredit}? Hanya bisa bila belum pernah dipakai.`)) return
        mulaiHapus(async () => {
            const h = await hapusJenisPinjamanAction(awal.id)
            if (h) alert(h.ok ? h.pesan : h.error)
            if (h?.ok) { router.refresh(); selesai() }
        })
    }

    return (
        <form onSubmit={onSubmit} className="space-y-4">
            {awal && <input type="hidden" name="id" value={awal.id} />}
            <div className="grid gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
                <div className="space-y-3">
                    <div className="grid gap-3 sm:grid-cols-2">
                        <Field label="Group Pinjaman" htmlFor="group_pinjaman">
                            <select id="group_pinjaman" name="group_pinjaman" required defaultValue={awal?.group_pinjaman ?? GRUP[0]} className={selectClass}>{GRUP.map((g) => <option key={g}>{g}</option>)}</select>
                        </Field>
                        <Field label="Jenis Pinjaman" htmlFor="jenis_pinjaman">
                            <select id="jenis_pinjaman" name="jenis_pinjaman" required defaultValue={awal?.jenis_pinjaman ?? JENIS[0]} className={selectClass}>{JENIS.map((g) => <option key={g}>{g}</option>)}</select>
                        </Field>
                        <Field label="Kode Kredit" htmlFor="kode_kredit" hint={baru ? "2-10 huruf/angka, mis. C37" : "Kode tidak bisa diubah"}>
                            <Input id="kode_kredit" name="kode_kredit" required={baru} readOnly={!baru} defaultValue={awal?.kode_kredit} maxLength={10} className={baru ? "uppercase" : "bg-muted/50"} />
                        </Field>
                        <Field label="Nama Kredit" htmlFor="nama_kredit"><Input id="nama_kredit" name="nama_kredit" required maxLength={50} defaultValue={awal?.nama_kredit} /></Field>
                        <Field label="Max. Lama Cicilan (x)" htmlFor="mak_cicilan" hint="0 = tidak dibatasi"><Input id="mak_cicilan" name="mak_cicilan" type="number" min="0" step="1" required defaultValue={awal?.mak_cicilan ?? 12} className="text-right" /></Field>
                        <Field label="Tgl. Jatuh Tempo" htmlFor="jatuh_tempo" hint="Tanggal tagihan tiap bulan (1-31)"><Input id="jatuh_tempo" name="jatuh_tempo" type="number" min="1" max="31" step="1" required defaultValue={awal?.jatuh_tempo ?? 10} className="text-right" /></Field>
                        <Field label="Jasa Pinjaman (%)" htmlFor="bunga_kredit"><Input id="bunga_kredit" name="bunga_kredit" type="number" min="0" max="100" step="any" required defaultValue={awal?.bunga_kredit ?? 0} className="text-right" /></Field>
                        <Field label="Per" htmlFor="bunga_per">
                            <select id="bunga_per" name="bunga_per" required defaultValue={awal?.bunga_per ?? PER[0]} className={selectClass}>{PER.map((g) => <option key={g}>{g}</option>)}</select>
                        </Field>
                    </div>

                    <div className="space-y-2 rounded-md border p-3">
                        <Biaya nama="provisi" label="Biaya Provisi" aktif={provisi} setAktif={setProvisi} nilai={pProvisi} setNilai={setPProvisi} />
                        <Biaya nama="adm" label="Biaya ADM" aktif={adm} setAktif={setAdm} nilai={pAdm} setNilai={setPAdm} />
                        <Biaya nama="denda" label="Denda" aktif={denda} setAktif={setDenda} nilai={pDenda} setNilai={setPDenda} />
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                        {([["kredit", "COA Kredit", "Akun piutang / titipan"], ["jasa", "COA Jasa", "Pendapatan jasa"], ["adm", "COA Adm", "Pendapatan administrasi"], ["provisi", "COA Provisi", "Pendapatan provisi"]] as const).map(([k, label, ket]) => (
                            <Field key={k} label={label} hint={ket}>
                                <AkunBox akun={akun} nilai={coa[k]} onUbah={(v) => setCoa((c) => ({ ...c, [k]: v }))} dataF={`coa_${k}`} name={`coa_${k}`} label={label} />
                            </Field>
                        ))}
                    </div>
                </div>

                <div className="space-y-3">
                    <fieldset className="rounded-md border p-2">
                        <legend className="px-1 text-xs font-semibold text-muted-foreground">Pengaturan Umum</legend>
                        <Centang name="pakai_um" label="UM jika melebihi Grade" ket="Uang muka bila pinjaman melebihi grade anggota" checked={um} onChange={setUm} />
                        <Centang name="kunci_jika_melebihi_grade" label="Kunci jika melebihi grade" ket="Pinjaman tidak boleh melebihi plafon grade anggota" checked={kunciGrade} onChange={setKunciGrade} />
                        <Centang name="kunci_hanya_untuk_staff" label="Staff" ket="Hanya untuk anggota Staff (tidak dicentang: hanya non-staff)" checked={staff} onChange={setStaff} />
                        <Centang name="kunci_jika_sisa" label="Kunci jika ada tunggakan" ket="Tidak bisa diajukan selama pinjaman jenis ini masih berjalan" checked={sisa} onChange={setSisa} />
                        <Centang name="hitung_shu" label="Hitung SHU" ket="Jasa pinjaman ikut dihitung dalam pembagian SHU" checked={shu} onChange={setShu} />
                        <Centang name="hide" label="Tidak untuk mobile" ket="Disembunyikan dari pengajuan di aplikasi anggota" checked={sembunyi} onChange={setSembunyi} />
                    </fieldset>

                    <fieldset className="space-y-2 rounded-md border p-3">
                        <legend className="px-1 text-xs font-semibold text-muted-foreground">Plafond pinjaman</legend>
                        <Field label="Maksimal Plafond (Rp)" htmlFor="maks_plafond" hint="Kosong atau 0 = tidak dibatasi">
                            <InputUang id="maks_plafond" name="maks_plafond" value={maks} onChange={setMaks} className="text-right" />
                        </Field>
                        <p className="text-xs leading-relaxed text-muted-foreground">
                            Bila <b>Kunci jika melebihi grade</b> dicentang dan anggota punya nominal grade, <b>grade yang diutamakan</b> (maksimal plafond diabaikan).
                            Maksimal plafond berlaku bila grade tidak dikunci, atau nominal grade anggota belum diisi.
                        </p>
                        <div className="overflow-hidden rounded-md border text-xs">
                            <table className="w-full">
                                <thead className="bg-muted text-muted-foreground"><tr><th className="px-2 py-1 text-right">Grade anggota</th><th className="px-2 py-1 text-right">Anggota</th><th className="px-2 py-1 text-right">Batas pinjaman</th></tr></thead>
                                <tbody>
                                    {grade.map((g) => {
                                        const b = batasPlafon({ kunciGrade, maksPlafond: Number(maks.replace(/\D/g, "")) || 0 }, g.rp_grade)
                                        return (
                                            <tr key={g.rp_grade} className="border-t">
                                                <td className="px-2 py-1 text-right tabular-nums">{formatAngka(g.rp_grade)}</td>
                                                <td className="px-2 py-1 text-right tabular-nums">{formatAngka(g.n)}</td>
                                                <td className={cn("px-2 py-1 text-right tabular-nums font-medium", b?.batas === 0 && "text-red-600")}>
                                                    {b === null ? "Tidak dibatasi" : b.batas === 0 ? "Tidak bisa" : `${formatAngka(b.batas)} (${b.sumber === "grade" ? "grade" : "maksimal"})`}
                                                </td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </fieldset>
                </div>
            </div>

            <PesanSimpan hasil={hasil} />
            <div className="flex items-center justify-between gap-2">
                <div>{awal && (
                    <button type="button" onClick={hapusIni} disabled={hapus} className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md border text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50">
                        {hapus ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />} Hapus
                    </button>
                )}</div>
                <SubmitButton pending={pending}>Simpan</SubmitButton>
            </div>
        </form>
    )
}

const lencana = "rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground"

/** Daftar jenis pinjaman (seperti grid desktop) dengan form tambah/ubah di modal. */
export function DaftarJenisPinjaman({ baris, akun, grade }: { baris: JenisPinjaman[]; akun: Akun[]; grade: GradeAnggota[] }) {
    const router = useRouter()
    const [edit, setEdit] = useState<JenisPinjaman | "baru" | null>(null)
    const selesai = () => { router.refresh(); setEdit(null) }
    return (
        <div className="space-y-4">
            <div className="flex flex-col gap-1">
                <h1 className="text-2xl font-semibold tracking-tight text-foreground">Jenis Pinjaman (Credit)</h1>
                <p className="text-sm text-muted-foreground">Bunga, biaya, akun, dan aturan pengajuan tiap jenis pinjaman. Berlaku untuk pencairan di web dan pengajuan di aplikasi anggota.</p>
            </div>
            <div className="rounded-lg border bg-background shadow-sm overflow-clip">
                <div className="flex justify-end border-b p-3">
                    <button type="button" onClick={() => setEdit("baru")} className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold"><Plus className="h-4 w-4" /> Tambah</button>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-muted text-muted-foreground text-xs">
                            <tr>
                                <th className="px-3 py-2 text-left">Kode</th><th className="px-3 py-2 text-left">Nama Kredit</th><th className="px-3 py-2 text-left">Grup</th>
                                <th className="px-3 py-2 text-right">Max. Cicilan</th><th className="px-3 py-2 text-right">Jasa</th><th className="px-3 py-2 text-right">Adm</th>
                                <th className="px-3 py-2 text-right">Provisi</th><th className="px-3 py-2 text-right">Maks. Plafond</th><th className="px-3 py-2 text-left">COA Kredit</th>
                                <th className="px-3 py-2 text-left">Jenis</th><th className="px-3 py-2 text-left">Aturan</th><th className="w-12"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {baris.map((b) => (
                                <tr key={b.id} className={cn("border-t hover:bg-muted/30", b.hide && "text-muted-foreground")}>
                                    <td className="px-3 py-1.5 font-mono text-xs">{b.kode_kredit}</td>
                                    <td className="px-3 py-1.5 font-medium">{b.nama_kredit}</td>
                                    <td className="px-3 py-1.5 whitespace-nowrap">{b.group_pinjaman}</td>
                                    <td className="px-3 py-1.5 text-right tabular-nums">{b.mak_cicilan || "-"}</td>
                                    <td className="px-3 py-1.5 text-right tabular-nums">{persen(b.bunga_kredit)}</td>
                                    <td className="px-3 py-1.5 text-right tabular-nums">{b.persen_adm ? persen(b.persen_adm) : "-"}</td>
                                    <td className="px-3 py-1.5 text-right tabular-nums">{b.persen_provisi ? persen(b.persen_provisi) : "-"}</td>
                                    <td className="px-3 py-1.5 text-right tabular-nums">{b.maks_plafond > 0 ? formatAngka(b.maks_plafond) : "-"}</td>
                                    <td className="px-3 py-1.5 font-mono text-xs">{b.coa_kredit}</td>
                                    <td className="px-3 py-1.5 whitespace-nowrap">{b.jenis_pinjaman}</td>
                                    <td className="px-3 py-1.5"><span className="flex flex-wrap gap-1">
                                        {b.kunci_hanya_untuk_staff === 1 ? <span className={lencana}>Staff</span> : null}
                                        {b.kunci_jika_melebihi_grade === 1 ? <span className={lencana}>Kunci grade</span> : null}
                                        {b.pakai_um === 1 ? <span className={lencana}>UM</span> : null}
                                        {b.kunci_jika_sisa === 1 ? <span className={lencana}>Kunci tunggakan</span> : null}
                                        {b.hitung_shu === 1 ? <span className={lencana}>SHU</span> : null}
                                        {b.hide ? <span className={lencana}>Tanpa mobile</span> : null}
                                    </span></td>
                                    <td className="px-2 py-1 text-right"><button type="button" title="Ubah" onClick={() => setEdit(b)} className="p-1.5 rounded hover:bg-muted"><Pencil className="h-4 w-4" /></button></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
            <ModalForm open={edit !== null} onOpenChange={(buka) => { if (!buka) setEdit(null) }} lebar="sm:max-w-[68rem]"
                judul={edit === "baru" ? "Tambah Jenis Pinjaman" : "Ubah Jenis Pinjaman"} keterangan="Perubahan berlaku untuk pencairan dan pengajuan berikutnya.">
                {edit && <FormJenis key={edit === "baru" ? "baru" : edit.id} awal={edit === "baru" ? null : edit} akun={akun} grade={grade} selesai={selesai} />}
            </ModalForm>
        </div>
    )
}
