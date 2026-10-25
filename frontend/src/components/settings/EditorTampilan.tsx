"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { AlertTriangle, Loader2, RotateCcw, Save } from "lucide-react"
import { toast } from "sonner"
import { KUNCI_TEMA, LABEL_TEMA, PRESET, TEMA_BAWAAN, peringatanKontras, teksDiAtas, temaSah, temaSama, type Tema } from "@kopkar/backend/src/tampilan.ts"
import { resetTampilanAction, simpanTampilanAction } from "@/app/actions/tampilan"
import { cn } from "@/lib/utils"

/** Pratinjau mini: menu samping, header, kartu, dan tombol dengan warna tema yang sedang diedit. */
function Pratinjau({ t }: { t: Tema }) {
    return (
        <div className="flex h-44 overflow-hidden rounded-md border text-[10px]" style={{ background: t.kanvas }}>
            <div className="flex w-1/4 flex-col gap-1 border-r p-2" style={{ background: t.sidebar, color: t.sidebarTeks }}>
                <div className="font-bold" style={{ color: teksDiAtas(t.sidebar) }}>Koperasi</div>
                <div className="rounded px-1.5 py-1 font-bold" style={{ background: `color-mix(in srgb, ${t.sidebarTeks} 18%, transparent)`, color: teksDiAtas(t.sidebar) }}>Dashboard</div>
                <div className="px-1.5 py-1">Anggota</div>
                <div className="px-1.5 py-1">Simpanan</div>
                <div className="px-1.5 py-1">Pinjaman</div>
            </div>
            <div className="flex flex-1 flex-col">
                <div className="flex items-center justify-between border-b px-2 py-1.5" style={{ background: t.header, color: "#24292f" }}><b>Dashboard</b><span>Admin</span></div>
                <div className="flex-1 space-y-2 p-2">
                    <div className="space-y-1 rounded border p-2" style={{ background: t.kartu, color: "#24292f" }}>
                        <div className="font-semibold">Daftar Anggota</div>
                        <div className="flex gap-1.5">
                            <span className="rounded px-2 py-0.5 font-medium" style={{ background: t.aksen, color: teksDiAtas(t.aksen) }}>Simpan</span>
                            <span className="rounded border px-2 py-0.5" style={{ color: t.aksen, borderColor: t.aksen }}>Cetak</span>
                        </div>
                        <div className="h-1.5 rounded bg-black/10" /><div className="h-1.5 w-2/3 rounded bg-black/10" />
                    </div>
                </div>
            </div>
        </div>
    )
}

export function EditorTampilan({ awal, adaTersimpan }: { awal: Tema; adaTersimpan: boolean }) {
    const router = useRouter()
    const [t, setT] = useState<Tema>(awal)
    const [tersimpan, setTersimpan] = useState(awal)
    const [ada, setAda] = useState(adaTersimpan)
    const [sibuk, mulai] = useTransition()
    const peringatan = peringatanKontras(t)
    const berubah = !temaSama(t, tersimpan)

    const ubah = (k: keyof Tema, v: string) => setT((x) => ({ ...x, [k]: v }))
    const simpan = () => mulai(async () => {
        const h = await simpanTampilanAction(t)
        if (!h.ok) { toast.error(h.error); return }
        toast.success(h.pesan); setTersimpan(t); setAda(true); router.refresh()
    })
    const reset = () => {
        if (!confirm("Kembalikan tampilan ke pengaturan awal aplikasi?")) return
        mulai(async () => {
            const h = await resetTampilanAction()
            if (!h.ok) { toast.error(h.error); return }
            toast.success(h.pesan); setT(TEMA_BAWAAN); setTersimpan(TEMA_BAWAAN); setAda(false); router.refresh()
        })
    }

    return (
        <div className="space-y-5">
            <section className="space-y-2">
                <h3 className="text-sm font-semibold">Tema siap pakai</h3>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    {PRESET.map((p) => (
                        <button key={p.id} type="button" onClick={() => setT(p.tema)}
                            className={cn("rounded-lg border p-2 text-left transition hover:shadow-md", temaSama(t, p.tema) && "ring-2 ring-[var(--aksen,#2563eb)]")}>
                            <div className="mb-2 flex h-12 overflow-hidden rounded border" style={{ background: p.tema.kanvas }}>
                                <div className="w-1/4" style={{ background: p.tema.sidebar }} />
                                <div className="flex flex-1 flex-col gap-1 p-1.5">
                                    <div className="h-2 rounded-sm" style={{ background: p.tema.header, border: "1px solid #0001" }} />
                                    <div className="flex-1 rounded-sm" style={{ background: p.tema.kartu, border: "1px solid #0001" }} />
                                </div>
                                <div className="m-1.5 w-3 self-end rounded-sm" style={{ background: p.tema.aksen, height: 10 }} />
                            </div>
                            <div className="text-sm font-semibold">{p.nama}</div>
                            <div className="text-xs text-muted-foreground">{p.keterangan}</div>
                        </button>
                    ))}
                </div>
            </section>

            <div className="grid gap-5 lg:grid-cols-2">
                <section className="space-y-3 rounded-lg border p-4">
                    <h3 className="text-sm font-semibold">Atur warna sendiri</h3>
                    <div className="space-y-2.5">
                        {KUNCI_TEMA.map((k) => (
                            <div key={k} className="flex items-center gap-3">
                                <input type="color" value={t[k]} onChange={(e) => ubah(k, e.target.value)} aria-label={LABEL_TEMA[k]}
                                    className="h-9 w-12 shrink-0 cursor-pointer rounded border bg-transparent p-0.5" />
                                <label className="flex-1 text-sm">{LABEL_TEMA[k]}</label>
                                <input value={t[k]} onChange={(e) => { const v = e.target.value.trim(); setT((x) => ({ ...x, [k]: v })) }}
                                    maxLength={7} spellCheck={false}
                                    className="h-9 w-24 rounded-md border bg-background px-2 font-mono text-sm uppercase" />
                            </div>
                        ))}
                    </div>
                    <p className="text-xs text-muted-foreground">Latar halaman, kartu, header, dan menu samping berlaku di mode terang. Mode gelap tetap memakai palet gelap bawaan; warna aksen berlaku di keduanya.</p>
                </section>

                <section className="space-y-3 rounded-lg border p-4">
                    <h3 className="text-sm font-semibold">Pratinjau</h3>
                    {temaSah(t) ? <Pratinjau t={t} /> : <div className="grid h-44 place-items-center rounded-md border text-sm text-muted-foreground">Isi semua warna dengan format #rrggbb</div>}
                    {peringatan.length > 0 && (
                        <ul className="space-y-1 rounded-md border border-amber-300 bg-amber-50 p-2 text-xs text-amber-900">
                            {peringatan.map((w) => <li key={w} className="flex gap-1.5"><AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />{w}</li>)}
                        </ul>
                    )}
                </section>
            </div>

            <div className="flex flex-wrap items-center gap-2 border-t pt-4">
                <button type="button" onClick={simpan} disabled={sibuk || !temaSah(t) || !berubah}
                    className="inline-flex h-9 items-center gap-1.5 rounded-md bg-blue-600 px-4 text-sm font-medium text-white shadow-sm hover:bg-blue-700 disabled:opacity-50">
                    {sibuk ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Simpan tampilan
                </button>
                <button type="button" onClick={reset} disabled={sibuk || (!ada && !berubah)}
                    className="inline-flex h-9 items-center gap-1.5 rounded-md border px-3 text-sm font-medium shadow-sm hover:bg-muted disabled:opacity-50">
                    <RotateCcw className="h-4 w-4" /> Reset ke pengaturan awal
                </button>
                {berubah && <span className="text-xs text-muted-foreground">Ada perubahan yang belum disimpan.</span>}
            </div>
        </div>
    )
}
