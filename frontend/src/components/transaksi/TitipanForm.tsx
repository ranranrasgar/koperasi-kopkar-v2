"use client"

import { useCallback, useEffect, useState, useTransition } from "react"
import { Loader2, Trash2 } from "lucide-react"
import { TombolKwitansi } from "@/components/transaksi/TombolKwitansi"
import { Input } from "@/components/ui/input"
import { InputUangBebas } from "@/components/ui/InputUang"
import {
    bayarAngsuranAction, dataTitipanAction, hapusTitipanAction, infoAnggotaAction, tambahTitipanAction, type DataTitipan, type InfoAnggota,
} from "@/app/actions/transaksi"
import type { AnggotaRingkas } from "@/lib/queries/anggota"
import { formatRupiah, formatTanggal } from "@/lib/format"
import { AnggotaPicker, Field, FormCard, HasilTransaksi, KasSelect, SubmitButton, selectClass, useAksiForm, type Akun } from "./common"

/**
 * Titipan angsuran pinjaman tunai (pengganti form desktop "Setoran Titipan Angsuran"): anggota menitipkan uang sedikit demi sedikit,
 * dicatat tanpa jurnal; "Simpan ke Angsuran" memposting angsuran berikutnya dan menandai titipan POSTING dalam satu transaksi.
 */
export function TitipanForm({ akunKas, hariIni, bolehAngsur }: { akunKas: Akun[]; hariIni: string; bolehAngsur: boolean }) {
    const [anggota, setAnggota] = useState<AnggotaRingkas | null>(null)
    const [info, setInfo] = useState<InfoAnggota | null>(null)
    const [noPinjaman, setNoPinjaman] = useState("")
    const [semua, setSemua] = useState(false)
    const [data, setData] = useState<DataTitipan | null>(null)
    const [versi, setVersi] = useState(0)
    // Referensi stabil: efek anak memanggilnya setelah simpan berhasil, jadi tidak boleh berubah setiap render.
    const muatUlang = useCallback(() => setVersi((v) => v + 1), [])

    useEffect(() => {
        if (!anggota) { setInfo(null); setNoPinjaman(""); return }
        let batal = false
        infoAnggotaAction(anggota.kode_agt).then((i) => {
            if (batal) return
            setInfo(i)
            setNoPinjaman((n) => i.pinjaman.some((p) => p.no_pinjaman === n) ? n : i.pinjaman[0]?.no_pinjaman ?? "")
        })
        return () => { batal = true }
    }, [anggota, versi])
    useEffect(() => {
        if (!noPinjaman) { setData(null); return }
        let batal = false
        dataTitipanAction(noPinjaman, semua).then((d) => { if (!batal) setData(d) })
        return () => { batal = true }
    }, [noPinjaman, semua, versi])

    const p = info?.pinjaman.find((x) => x.no_pinjaman === noPinjaman)
    return (
        <div className="max-w-5xl space-y-6">
            <FormCard title="Titipan Angsuran" description="Uang titipan anggota untuk angsuran pinjaman tunai. Titipan belum masuk jurnal sampai disimpan ke angsuran.">
                <div className="space-y-4">
                    <Field label="Anggota" htmlFor="anggota">
                        <AnggotaPicker value={anggota} onChange={(a) => { setAnggota(a); setNoPinjaman("") }} />
                    </Field>
                    {info && info.pinjaman.length === 0 && <p className="text-sm text-muted-foreground">Tidak ada pinjaman tunai yang berjalan.</p>}
                    {info && info.pinjaman.length > 0 && (
                        <Field label="Pinjaman" htmlFor="noPinjaman">
                            <select id="noPinjaman" className={selectClass} value={noPinjaman} onChange={(e) => setNoPinjaman(e.target.value)}>
                                {info.pinjaman.map((x) => (
                                    <option key={x.no_pinjaman} value={x.no_pinjaman}>
                                        {x.no_pinjaman} | {x.nama_kredit ?? "-"} | {formatRupiah(x.rp_pinjaman_pokok)} | {x.jml_cicilan}/{x.lama_angsuran}
                                    </option>
                                ))}
                            </select>
                        </Field>
                    )}
                    {p && data && (
                        <div className="grid gap-3 rounded-md border bg-muted/30 p-3 text-sm sm:grid-cols-5">
                            <div><div className="text-[11px] uppercase text-muted-foreground">Tgl. realisasi</div><div>{formatTanggal(p.tgl_pinjaman)}</div></div>
                            <div><div className="text-[11px] uppercase text-muted-foreground">Lama</div><div>{p.jml_cicilan}/{p.lama_angsuran}x</div></div>
                            <div><div className="text-[11px] uppercase text-muted-foreground">Jumlah pinjaman</div><div className="tabular-nums">{formatRupiah(p.rp_pinjaman_pokok)}</div></div>
                            <div><div className="text-[11px] uppercase text-muted-foreground">Angsuran ke-{data.berikut?.ke ?? "-"}</div>
                                <div className="tabular-nums">{data.berikut ? formatRupiah(data.berikut.pokok + data.berikut.jasa + data.berikut.adm + data.berikut.provisi) : "-"}</div>
                                {data.berikut && <div className="text-[11px] text-muted-foreground">pokok {formatRupiah(data.berikut.pokok)} · jasa {formatRupiah(data.berikut.jasa)}</div>}</div>
                            <div><div className="text-[11px] uppercase text-muted-foreground">Titipan belum diposting</div><div className="text-lg font-bold tabular-nums text-red-600">{formatRupiah(data.belumPosting)}</div></div>
                        </div>
                    )}
                </div>
            </FormCard>
            {p && data && (
                <div className="grid gap-6 lg:grid-cols-2">
                    <FormCard title="Input titipan" description="Tanggal dan jumlah yang dititipkan anggota.">
                        <InputTitipan key={noPinjaman} noPinjaman={noPinjaman} hariIni={hariIni} onSelesai={muatUlang} />
                    </FormCard>
                    {bolehAngsur && (
                        <FormCard title="Simpan ke angsuran" description="Posting angsuran berikutnya (jurnal kas) dan tandai semua titipan di atas POSTING.">
                            <SimpanKeAngsuran key={noPinjaman} noPinjaman={noPinjaman} data={data} akunKas={akunKas} hariIni={hariIni} onSelesai={muatUlang} />
                        </FormCard>
                    )}
                    <div className="lg:col-span-2"><DaftarTitipan data={data} semua={semua} setSemua={setSemua} onHapus={muatUlang} /></div>
                </div>
            )}
        </div>
    )
}

function InputTitipan({ noPinjaman, hariIni, onSelesai }: { noPinjaman: string; hariIni: string; onSelesai: () => void }) {
    const { hasil, onSubmit, pending } = useAksiForm(tambahTitipanAction)
    useEffect(() => { if (hasil?.ok) onSelesai() }, [hasil, onSelesai])
    return (
        <form onSubmit={onSubmit} className="space-y-4">
            <input type="hidden" name="noPinjaman" value={noPinjaman} />
            <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Tanggal" htmlFor="tanggal-titipan"><Input id="tanggal-titipan" name="tanggal" type="date" required defaultValue={hariIni} /></Field>
                <Field label="Jumlah (Rp)" htmlFor="jumlah-titipan"><InputUangBebas id="jumlah-titipan" name="jumlah" required /></Field>
            </div>
            <HasilTransaksi hasil={hasil} />
            <div className="flex justify-end"><SubmitButton pending={pending}>Simpan Titipan</SubmitButton></div>
        </form>
    )
}

function SimpanKeAngsuran({ noPinjaman, data, akunKas, hariIni, onSelesai }: {
    noPinjaman: string; data: DataTitipan; akunKas: Akun[]; hariIni: string; onSelesai: () => void
}) {
    const { hasil, onSubmit, pending } = useAksiForm(bayarAngsuranAction)
    useEffect(() => { if (hasil?.ok) onSelesai() }, [hasil, onSelesai])
    const b = data.berikut
    const angsuran = b ? b.pokok + b.jasa + b.adm + b.provisi : 0
    return (
        <form onSubmit={onSubmit} className="space-y-4">
            <input type="hidden" name="noPinjaman" value={noPinjaman} />
            <input type="hidden" name="titipan" value="1" />
            {b && data.belumPosting < angsuran && (
                <p role="alert" className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                    Titipan {formatRupiah(data.belumPosting)} kurang {formatRupiah(angsuran - data.belumPosting)} dari angsuran ke-{b.ke} ({formatRupiah(angsuran)}). Angsuran tetap dibukukan penuh.
                </p>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Tanggal Bayar" htmlFor="tanggal-angsuran"><Input id="tanggal-angsuran" name="tanggal" type="date" required defaultValue={hariIni} /></Field>
                <Field label="Diterima di Kas/Bank" htmlFor="kas"><KasSelect akun={akunKas} /></Field>
            </div>
            <HasilTransaksi hasil={hasil} />
            <div className="flex justify-end">
                <SubmitButton pending={pending} disabled={!b || data.belumPosting <= 0}>Simpan ke Angsuran</SubmitButton>
            </div>
        </form>
    )
}

function DaftarTitipan({ data, semua, setSemua, onHapus }: { data: DataTitipan; semua: boolean; setSemua: (v: boolean) => void; onHapus: () => void }) {
    const [sibuk, mulai] = useTransition()
    const [pesan, setPesan] = useState<string | null>(null)
    const hapus = (id: number, jumlah: number) => {
        if (!confirm(`Hapus titipan ${formatRupiah(jumlah)}?`)) return
        mulai(async () => {
            const h = await hapusTitipanAction(id)
            setPesan(h && !h.ok ? h.error : null)
            onHapus()
        })
    }
    return (
        <section className="rounded-lg border bg-background shadow-sm" aria-label="Daftar titipan">
            <div className="flex items-center justify-between border-b px-4 py-3">
                <h2 className="font-semibold">{semua ? "Semua riwayat titipan" : "Titipan belum diposting"}</h2>
                <label className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
                    <input type="checkbox" checked={semua} onChange={(e) => setSemua(e.target.checked)} /> Tampilkan yang sudah POSTING
                </label>
            </div>
            {pesan && <p role="alert" className="border-b bg-red-50 px-4 py-2 text-sm text-red-700">{pesan}</p>}
            <table className="w-full text-sm">
                <thead className="bg-muted text-xs text-muted-foreground">
                    <tr><th className="px-3 py-2 text-left">Tanggal</th><th className="px-3 py-2 text-right">Jumlah</th><th className="px-3 py-2 text-left">No. Reff</th>
                        <th className="px-3 py-2 text-left">Status</th><th className="px-3 py-2"></th></tr>
                </thead>
                <tbody>
                    {data.daftar.length === 0 && <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">Belum ada titipan.</td></tr>}
                    {data.daftar.map((t) => (
                        <tr key={t.id} className="border-t">
                            <td className="px-3 py-1.5">{formatTanggal(t.tanggal)}</td>
                            <td className="px-3 py-1.5 text-right tabular-nums">{formatRupiah(t.rp_jumlah)}</td>
                            <td className="px-3 py-1.5 font-mono text-xs">{t.urut}</td>
                            <td className="px-3 py-1.5">{t.status === "POSTING"
                                ? <span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-bold text-green-700">POSTING</span>
                                : <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">BELUM</span>}</td>
                            <td className="px-3 py-1.5 text-right"><TombolKwitansi jenis="titipan" no={String(t.id)} ikon />{t.status !== "POSTING" && (
                                <button type="button" disabled={sibuk} onClick={() => hapus(t.id, t.rp_jumlah)} title="Hapus titipan"
                                    className="text-red-600 hover:text-red-700 disabled:opacity-50">{sibuk ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}</button>
                            )}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </section>
    )
}
