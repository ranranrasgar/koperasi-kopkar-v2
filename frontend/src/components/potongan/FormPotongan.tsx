"use client"

import { useEffect, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { TombolModal, useTutupSetelahBerhasil } from "@/components/ui/Modal"
import { Field, HasilTransaksi, KasSelect, SubmitButton, selectClass, useAksiForm, type Akun } from "@/components/transaksi/common"
import { detailPotonganAction, generatePotonganAction, postingPotonganAction, setDipotongAction, ubahPotonganAction } from "@/app/actions/potongan"
import type { PinjamanPotongan } from "@/lib/queries/potongan-gaji"
import { formatAngka } from "@/lib/format"

const tombol = "inline-flex items-center justify-center gap-2 h-9 px-4 rounded-md text-sm font-semibold shadow-sm"

function FormGenerate({ periodeAwal, sudahAda, selesai }: { periodeAwal: string; sudahAda: string[]; selesai: () => void }) {
    const { hasil, onSubmit, pending } = useAksiForm(generatePotonganAction)
    const [periode, setPeriode] = useState(periodeAwal)
    const ulang = sudahAda.includes(periode)
    useTutupSetelahBerhasil(hasil?.ok, selesai)
    return (
        <form onSubmit={onSubmit} className="space-y-4">
            <Field label="Bulan potongan" htmlFor="periode">
                <Input id="periode" name="periode" type="month" required value={periode} onChange={(e) => setPeriode(e.target.value)} className="w-48" />
            </Field>
            {ulang && <p className="text-xs text-amber-700 dark:text-amber-400">
                Periode ini sudah ada. Generate ulang menghitung ulang semua nominal dari data terbaru; anggota yang dimatikan tetap tidak dipotong,
                tetapi nominal yang diubah manual kembali ke hasil hitung.</p>}
            <SubmitButton pending={pending}>{ulang ? "Generate ulang" : "Generate"}</SubmitButton>
            <HasilTransaksi hasil={hasil} />
        </form>
    )
}

export function ModalGenerate({ periodeAwal, sudahAda }: { periodeAwal: string; sudahAda: string[] }) {
    return (
        <TombolModal label="Generate potongan" judul="Generate Potongan Gaji"
            keterangan="Hitung potongan bulan ini untuk semua anggota aktif. Boleh diulang selama periode belum diposting.">
            {(selesai) => <FormGenerate periodeAwal={periodeAwal} sudahAda={sudahAda} selesai={selesai} />}
        </TombolModal>
    )
}

function FormPosting({ periode, akun, kasBawaan, tanggalBawaan, ringkas, selesai }: {
    periode: string; akun: Akun[]; kasBawaan?: number; tanggalBawaan: string; ringkas: string; selesai: () => void
}) {
    const { hasil, onSubmit, pending } = useAksiForm(postingPotonganAction)
    useTutupSetelahBerhasil(hasil?.ok, selesai)
    return (
        <form onSubmit={onSubmit} className="space-y-4">
            <input type="hidden" name="periode" value={periode} />
            <p className="rounded-md border bg-muted/40 p-3 text-sm">{ringkas}</p>
            <Field label="Tanggal posting" htmlFor="tanggal" hint="Bawaan akhir bulan, seperti desktop.">
                <Input id="tanggal" name="tanggal" type="date" required defaultValue={tanggalBawaan} min={`${periode}-01`} max={tanggalBawaan} />
            </Field>
            <Field label="Masuk ke akun kas/bank" htmlFor="kas" hint="Rekening tempat perusahaan menyetor potongan gaji.">
                <KasSelect akun={akun} defaultValue={kasBawaan} />
            </Field>
            <Field label={`Ketik ${periode} untuk konfirmasi`} htmlFor="konfirmasi">
                <Input id="konfirmasi" name="konfirmasi" required autoComplete="off" placeholder={periode} />
            </Field>
            <SubmitButton pending={pending}>{pending ? "Memposting, tunggu sampai selesai..." : "Posting potongan"}</SubmitButton>
            <HasilTransaksi hasil={hasil} />
        </form>
    )
}

export function ModalPosting(props: { periode: string; akun: Akun[]; kasBawaan?: number; tanggalBawaan: string; ringkas: string }) {
    return (
        <TombolModal label="Posting potongan" judul={`Posting Potongan ${props.periode}`} className={`${tombol} bg-green-600 hover:bg-green-700 text-white`}
            keterangan="Setoran simpanan dan angsuran pinjaman setiap anggota yang dipotong dibukukan sekaligus dalam satu transaksi (gagal satu, batal semua). Adm bank tidak dibukukan, sama seperti desktop. Periode yang sudah diposting tidak bisa diposting atau digenerate ulang.">
            {(selesai) => <FormPosting {...props} selesai={selesai} />}
        </TombolModal>
    )
}

/** Saklar Dipotong per baris grid; langsung tersimpan (pengganti centang di grid desktop). */
export function SaklarDipotong({ periode, kodeAgt, nama, dipotong, bisaUbah }: {
    periode: string; kodeAgt: string; nama: string; dipotong: boolean; bisaUbah: boolean
}) {
    const [nilai, setNilai] = useState(dipotong)
    const [galat, setGalat] = useState<string | null>(null)
    const [pending, startTransition] = useTransition()
    const router = useRouter()
    useEffect(() => setNilai(dipotong), [dipotong])
    const ubah = (v: boolean) => {
        setNilai(v)
        setGalat(null)
        startTransition(async () => {
            const r = await setDipotongAction(periode, kodeAgt, v)
            if (!r?.ok) { setNilai(!v); setGalat(r && !r.ok ? r.error : "Gagal menyimpan") }
            router.refresh()
        })
    }
    return (
        <div className="flex items-center justify-center gap-1.5" title={galat ?? (nilai ? "Dipotong" : "Tidak dipotong")}>
            <Switch checked={nilai} onCheckedChange={ubah} disabled={!bisaUbah || pending} aria-label={`Dipotong ${nama}`}
                className="data-[state=checked]:bg-green-600" />
            {pending && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
            {galat && <span className="text-[10px] text-red-600">gagal</span>}
        </div>
    )
}

const ANGKA = "w-32 text-right tabular-nums"

function FormUbah({ periode, kodeAgt, dipotong, alasan, sWajib, sSukarela, pinjaman, selesai }: {
    periode: string; kodeAgt: string; dipotong: boolean; alasan: string | null; sWajib: string; sSukarela: string
    pinjaman: PinjamanPotongan[]; selesai: () => void
}) {
    const { hasil, onSubmit, pending } = useAksiForm(ubahPotonganAction)
    const [potong, setPotong] = useState(dipotong)
    useTutupSetelahBerhasil(hasil?.ok, selesai)
    const angka = (v: string) => String(Number(v))
    return (
        <form onSubmit={onSubmit} className="space-y-5">
            <input type="hidden" name="periode" value={periode} />
            <input type="hidden" name="kodeAgt" value={kodeAgt} />
            <input type="hidden" name="pinjamanIds" value={pinjaman.map((p) => p.id).join(",")} />

            <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Status bulan ini" htmlFor="dipotong">
                    <select id="dipotong" name="dipotong" className={selectClass} value={potong ? "1" : "0"} onChange={(e) => setPotong(e.target.value === "1")}>
                        <option value="1">Dipotong</option>
                        <option value="0">Tidak dipotong (tidak ikut diposting)</option>
                    </select>
                </Field>
                {!potong && <Field label="Alasan (opsional)" htmlFor="alasan">
                    <Input id="alasan" name="alasan" maxLength={200} defaultValue={alasan ?? ""} placeholder="Mis. gaji tidak cukup, cuti, bayar manual" />
                </Field>}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Simpanan wajib" htmlFor="sWajib">
                    <Input id="sWajib" name="sWajib" type="number" min="0" step="any" defaultValue={angka(sWajib)} className={ANGKA} />
                </Field>
                <Field label="Simpanan sukarela" htmlFor="sSukarela">
                    <Input id="sSukarela" name="sSukarela" type="number" min="0" step="any" defaultValue={angka(sSukarela)} className={ANGKA} />
                </Field>
            </div>

            {pinjaman.length > 0 && (
                <div className="overflow-x-auto rounded-md border">
                    <table className="w-full text-sm">
                        <thead className="bg-muted text-muted-foreground text-xs">
                            <tr>
                                <th className="px-2 py-2 text-left">Pinjaman</th>
                                <th className="px-2 py-2 text-center">Angsuran ke</th>
                                <th className="px-2 py-2 text-right">Pokok</th>
                                <th className="px-2 py-2 text-right">Jasa</th>
                                <th className="px-2 py-2 text-right">Adm</th>
                                <th className="px-2 py-2 text-right">Provisi</th>
                            </tr>
                        </thead>
                        <tbody>
                            {pinjaman.map((p) => (
                                <tr key={p.id} className="border-t">
                                    <td className="px-2 py-1.5">
                                        <div className="font-mono text-xs">{p.no_pinjaman}</div>
                                        <div className="text-[11px] text-muted-foreground">{p.grup} · {p.nama_kredit ?? "-"}</div>
                                    </td>
                                    <td className="px-2 py-1.5 text-center">{p.angsuran_ke}{p.lama_angsuran ? ` / ${p.lama_angsuran}` : ""}</td>
                                    {(["pokok", "jasa", "adm", "provisi"] as const).map((k) => (
                                        <td key={k} className="px-2 py-1.5 text-right">
                                            {p.jenis === "kpr" && k !== "pokok"
                                                ? <input type="hidden" name={`${k}_${p.id}`} value="0" />
                                                : <Input name={`${k}_${p.id}`} type="number" min="0" step="any" defaultValue={angka(p[k])} aria-label={`${k} ${p.no_pinjaman}`} className={`${ANGKA} ml-auto`} />}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    <p className="px-3 py-2 text-[11px] text-muted-foreground border-t">
                        Isi semua nol untuk pinjaman yang tidak dipotong bulan ini. Pembagian pokok dan jasa boleh diubah mengikuti rincian dari bank.
                    </p>
                </div>
            )}

            <SubmitButton pending={pending}>Simpan</SubmitButton>
            <HasilTransaksi hasil={hasil} />
        </form>
    )
}

type Detail = NonNullable<Awaited<ReturnType<typeof detailPotonganAction>>>

/** Isi modal Ubah: rincian anggota dimuat saat modal dibuka. Periode yang sudah diposting hanya menampilkan nomor bukti. */
function IsiUbah({ periode, kodeAgt, selesai }: { periode: string; kodeAgt: string; selesai: () => void }) {
    const [d, setD] = useState<Detail | null | undefined>(undefined)
    useEffect(() => { detailPotonganAction(periode, kodeAgt).then(setD) }, [periode, kodeAgt])
    if (d === undefined) return <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Memuat...</div>
    if (d === null) return <p className="text-sm text-red-600">Data anggota tidak ditemukan.</p>
    const a = d.anggota
    if (d.status === "draf")
        return <FormUbah periode={periode} kodeAgt={a.kode_agt} dipotong={a.dipotong} alasan={a.alasan} sWajib={a.s_wajib} sSukarela={a.s_sukarela}
            pinjaman={d.pinjaman} selesai={selesai} />
    if (!a.dipotong) return <p className="text-sm">Tidak dipotong{a.alasan ? `: ${a.alasan}` : ""}.</p>
    return (
        <ul className="text-sm space-y-1">
            <li>Simpanan wajib Rp {formatAngka(Number(a.s_wajib))} <span className="font-mono text-xs text-muted-foreground">{a.bukti_wajib ?? "-"}</span></li>
            <li>Simpanan sukarela Rp {formatAngka(Number(a.s_sukarela))} <span className="font-mono text-xs text-muted-foreground">{a.bukti_sukarela ?? "-"}</span></li>
            {d.pinjaman.map((x) => (
                <li key={x.id}>{x.grup} {x.no_pinjaman} angsuran ke-{x.angsuran_ke}: Rp {formatAngka(Number(x.pokok) + Number(x.jasa) + Number(x.adm) + Number(x.provisi))}{" "}
                    <span className="font-mono text-xs text-muted-foreground">{x.no_bukti ?? "-"}</span></li>
            ))}
        </ul>
    )
}

export function ModalUbah({ periode, kodeAgt, nama, draf }: { periode: string; kodeAgt: string; nama: string; draf: boolean }) {
    return (
        <TombolModal label={nama} judul={`${nama} · ${kodeAgt}`} lebar="sm:max-w-3xl" className="font-medium text-left hover:underline"
            keterangan={draf ? "Ubah nominal atau status potongan anggota ini, seperti koreksi sebelum posting di desktop. Perubahan dicatat dengan nama operator." : "Transaksi yang dibukukan untuk anggota ini."}>
            {(selesai) => <IsiUbah periode={periode} kodeAgt={kodeAgt} selesai={selesai} />}
        </TombolModal>
    )
}
