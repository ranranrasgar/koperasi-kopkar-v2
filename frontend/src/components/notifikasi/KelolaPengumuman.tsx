"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Pencil, Plus, Trash2 } from "lucide-react"
import { aturStatusPengumumanAction, hapusPengumumanAction, simpanPengumumanAction, type JenisPengumuman } from "@/app/actions/pengumuman"
import type { Hasil } from "@/app/actions/transaksi"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import type { Sasaran } from "@kopkar/backend/src/anggota/sasaran.ts"
import { PilihGambar } from "./PilihGambar"
import { PilihSasaran, ringkasSasaran, SASARAN_AWAL, type OpsiGrup, type OpsiStatus } from "./PilihSasaran"
import { Field, HasilTransaksi, SubmitButton, useAksiForm } from "@/components/transaksi/common"
import { ModalForm } from "@/components/ui/Modal"

export interface Pengumuman { id: number; judul: string; isi: string; aktif: boolean; gambar: string | null; sasaran: Sasaran }

const MAKS = 255

/** Form di modal; tersimpan: modal ditutup dan pesan berhasil tampil di atas daftar. */
function FormPengumuman({ jenis, awal, opsiStatus, opsiGrup, onSelesai }: {
    jenis: JenisPengumuman; awal: Pengumuman | null; opsiStatus: OpsiStatus[]; opsiGrup: OpsiGrup[]; onSelesai: (h?: Hasil) => void
}) {
    const router = useRouter()
    const { hasil, onSubmit, pending } = useAksiForm(async (p: Hasil, f: FormData) => {
        const h = await simpanPengumumanAction(p, f)
        if (h?.ok) { router.refresh(); onSelesai(h) }
        return h
    })
    const [isi, setIsi] = useState(awal?.isi ?? "")
    return (
        <form onSubmit={onSubmit} className="space-y-3">
            <input type="hidden" name="jenis" value={jenis} />
            {awal && <input type="hidden" name="id" value={awal.id} />}
            <Field label="Judul" htmlFor={`judul-${jenis}`}>
                <Input id={`judul-${jenis}`} name="judul" maxLength={MAKS} required defaultValue={awal?.judul ?? ""} />
            </Field>
            <Field label="Isi" htmlFor={`isi-${jenis}`} hint={`${isi.length}/${MAKS}`}>
                <Textarea id={`isi-${jenis}`} name="isi" rows={3} maxLength={MAKS} required value={isi} onChange={(e) => setIsi(e.target.value)} />
            </Field>
            <Field label="Gambar (opsional)" hint="Dikecilkan otomatis sebelum diunggah.">
                <PilihGambar gambarAda={awal?.gambar} />
            </Field>
            <PilihSasaran awal={awal?.sasaran ?? SASARAN_AWAL} opsiStatus={opsiStatus} opsiGrup={opsiGrup} />
            <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
                <label className="flex items-center gap-2"><input type="checkbox" name="aktif" defaultChecked={awal?.aktif ?? true} /> Tampilkan (aktif)</label>
                <label className="flex items-center gap-2"><input type="checkbox" name="kirim" /> Kirim juga sebagai notifikasi ke penerima di atas</label>
            </div>
            <HasilTransaksi hasil={hasil} />
            <div className="flex gap-2">
                <SubmitButton pending={pending}>{awal ? "Simpan" : "Tambahkan"}</SubmitButton>
                <button type="button" onClick={() => onSelesai()} className="h-9 rounded-md px-4 text-sm text-muted-foreground hover:bg-muted">Batal</button>
            </div>
        </form>
    )
}

export function KelolaPengumuman({ jenis, nama, daftar, opsiStatus, opsiGrup }: { jenis: JenisPengumuman; nama: string; daftar: Pengumuman[]; opsiStatus: OpsiStatus[]; opsiGrup: OpsiGrup[] }) {
    const router = useRouter()
    const [form, setForm] = useState<Pengumuman | "baru" | null>(null)
    const [hasil, setHasil] = useState<Hasil>(null)
    const [sibuk, mulai] = useTransition()

    const aksi = (fn: () => Promise<Hasil>) => mulai(async () => { const h = await fn(); setHasil(h); if (h?.ok) router.refresh() })

    return (
        <div className="space-y-3">
            <button type="button" onClick={() => { setHasil(null); setForm("baru") }}
                className="inline-flex h-9 items-center gap-2 rounded-md border px-3 text-sm font-semibold hover:bg-muted">
                <Plus className="h-4 w-4" /> Tambah {nama.toLowerCase()}
            </button>
            <ModalForm open={form !== null} onOpenChange={(buka) => { if (!buka) setForm(null) }} lebar="sm:max-w-2xl"
                judul={form === "baru" ? `Tambah ${nama.toLowerCase()}` : `Ubah ${nama.toLowerCase()}`}>
                {form !== null && <FormPengumuman key={form === "baru" ? "baru" : form.id} jenis={jenis} awal={form === "baru" ? null : form}
                    opsiStatus={opsiStatus} opsiGrup={opsiGrup} onSelesai={(h) => { if (h) setHasil(h); setForm(null) }} />}
            </ModalForm>
            <HasilTransaksi hasil={form === null ? hasil : null} />
            {daftar.length === 0 ? <p className="text-sm text-muted-foreground">Belum ada {nama.toLowerCase()}.</p> : (
                <ul className="divide-y rounded-lg border">
                    {daftar.map((d) => (
                        <li key={d.id} className="flex items-start gap-3 p-3">
                            {d.gambar && (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={`/dashboard/gambar/${d.gambar}`} alt="" className="h-14 w-20 shrink-0 rounded border object-cover" />
                            )}
                            <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                    <span className="font-semibold text-sm">{d.judul}</span>
                                    <span className={`rounded px-1.5 py-0.5 text-[11px] font-semibold ${d.aktif ? "bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-400" : "bg-muted text-muted-foreground"}`}>
                                        {d.aktif ? "Tampil" : "Tersembunyi"}
                                    </span>
                                </div>
                                <p className="mt-0.5 whitespace-pre-line text-sm text-muted-foreground">{d.isi}</p>
                                <p className="mt-1 text-xs font-medium text-blue-700 dark:text-blue-400">Untuk: {ringkasSasaran(d.sasaran, opsiGrup)}</p>
                            </div>
                            <div className="flex shrink-0 items-center gap-1">
                                <button type="button" disabled={sibuk} onClick={() => aksi(() => aturStatusPengumumanAction(jenis, d.id, !d.aktif))}
                                    className="h-8 rounded px-2 text-xs font-semibold hover:bg-muted disabled:opacity-50">{d.aktif ? "Sembunyikan" : "Tampilkan"}</button>
                                <button type="button" title="Ubah" onClick={() => { setHasil(null); setForm(d) }} className="grid h-8 w-8 place-items-center rounded hover:bg-muted"><Pencil className="h-4 w-4" /></button>
                                <button type="button" title="Hapus" disabled={sibuk}
                                    onClick={() => { if (window.confirm(`Hapus ${nama.toLowerCase()} "${d.judul}"?`)) aksi(() => hapusPengumumanAction(jenis, d.id)) }}
                                    className="grid h-8 w-8 place-items-center rounded text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10"><Trash2 className="h-4 w-4" /></button>
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    )
}
