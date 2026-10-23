"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { AlertCircle, CheckCircle2, ChevronDown, DatabaseBackup, Download, Loader2, RotateCcw, ShieldCheck, Trash2 } from "lucide-react"
import { buatCadanganAction, hapusCadanganAction, periksaCadanganAction, pulihkanCadanganAction, type HasilCadangan } from "@/app/actions/cadangan"
import type { Cadangan } from "@/lib/cadangan"
import { cn } from "@/lib/utils"

const ukuranBaca = (b: number) =>
    b >= 1 << 30 ? `${(b / (1 << 30)).toFixed(2)} GB` : b >= 1 << 20 ? `${(b / (1 << 20)).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} kB`

const waktu = (iso: string) =>
    new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Jakarta" }).format(new Date(iso))

const tombol = "inline-flex h-8 items-center gap-1.5 rounded-md border px-2.5 text-xs font-medium hover:bg-muted disabled:opacity-50 disabled:pointer-events-none"

/** Buat, periksa, unduh, hapus, dan pulihkan cadangan. Semua aksi dijalankan di server (database/postgres/backup.mjs, restore.mjs). */
export function KelolaCadangan({ daftar, folder, ruangKosong, ukuranDatabase, database, sedang }: {
    daftar: Cadangan[]; folder: string; ruangKosong: number | null; ukuranDatabase: number; database: string; sedang: string | null
}) {
    const router = useRouter()
    const [pending, startTransition] = useTransition()
    const [aksi, setAksi] = useState<string | null>(null)
    const [hasil, setHasil] = useState<HasilCadangan | null>(null)
    const [tanpaMedia, setTanpaMedia] = useState(false)
    const [buka, setBuka] = useState<string | null>(null)
    const [pulih, setPulih] = useState<Cadangan | null>(null)
    const [ketik, setKetik] = useState("")

    const jalankan = (label: string, fn: () => Promise<HasilCadangan>) => {
        setAksi(label)
        setHasil(null)
        startTransition(async () => {
            setHasil(await fn())
            setAksi(null)
            router.refresh()
        })
    }
    const sibuk = pending || !!sedang
    // Perkiraan kebutuhan ruang cadangan baru: sama dengan backup.mjs (60% ukuran database + 200 MB).
    const cukup = ruangKosong === null || ruangKosong >= ukuranDatabase * 0.6 + 200 * 1024 * 1024

    return (
        <div className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-3">
                {[["Database", `${database} · ${ukuranBaca(ukuranDatabase)}`], ["Folder cadangan di server", folder],
                    ["Ruang kosong", ruangKosong === null ? "tidak terbaca" : ukuranBaca(ruangKosong)]].map(([l, v]) => (
                    <div key={l} className="rounded-lg border bg-muted/30 px-3 py-2.5">
                        <p className="text-xs text-muted-foreground">{l}</p>
                        <p className="mt-0.5 break-all text-sm font-medium">{v}</p>
                    </div>
                ))}
            </div>

            <div className="flex flex-wrap items-center gap-3">
                <button type="button" disabled={sibuk || !cukup} onClick={() => jalankan("Membuat cadangan...", () => buatCadanganAction(tanpaMedia))}
                    className="inline-flex h-9 items-center gap-2 rounded-md bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">
                    {aksi?.startsWith("Membuat") ? <Loader2 className="h-4 w-4 animate-spin" /> : <DatabaseBackup className="h-4 w-4" />}
                    Buat cadangan sekarang
                </button>
                <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={tanpaMedia} onChange={(e) => setTanpaMedia(e.target.checked)} className="h-4 w-4" />
                    Tanpa media (gambar)
                </label>
                {!cukup && <span className="text-sm text-red-600 dark:text-red-400">Ruang disk tidak cukup untuk cadangan baru; hapus cadangan lama.</span>}
            </div>

            {(aksi || sedang) && (
                <p className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" /> {aksi ?? `Sedang ${sedang}...`} Jangan tutup halaman ini.
                </p>
            )}
            {hasil && (
                <div role={hasil.ok ? "status" : "alert"} className={cn("rounded-md border p-3 text-sm",
                    hasil.ok ? "border-green-300 bg-green-50 text-green-800 dark:bg-green-500/10 dark:text-green-300"
                        : "border-red-300 bg-red-50 text-red-800 dark:bg-red-500/10 dark:text-red-300")}>
                    <p className="flex items-center gap-2 font-medium">
                        {hasil.ok ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <AlertCircle className="h-4 w-4 shrink-0" />}
                        {hasil.ok ? hasil.pesan : hasil.error}
                    </p>
                    {hasil.keluaran && <pre className="mt-2 max-h-56 overflow-auto whitespace-pre-wrap rounded bg-black/5 p-2 font-mono text-xs dark:bg-white/5">{hasil.keluaran}</pre>}
                </div>
            )}

            <div className="overflow-x-auto rounded-lg border">
                <table className="w-full text-sm">
                    <thead className="bg-muted/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
                        <tr>
                            <th className="px-3 py-2">Dibuat</th><th className="px-3 py-2">Database</th><th className="px-3 py-2 text-right">Ukuran</th>
                            <th className="px-3 py-2">Isi</th><th className="px-3 py-2 text-right">Aksi</th>
                        </tr>
                    </thead>
                    <tbody>
                        {daftar.length === 0 && (
                            <tr><td colSpan={5} className="px-3 py-8 text-center text-muted-foreground">Belum ada cadangan di folder ini.</td></tr>
                        )}
                        {daftar.map((c) => (
                            <FragmenBaris key={c.nama} c={c} buka={buka === c.nama} sibuk={sibuk}
                                onBuka={() => setBuka(buka === c.nama ? null : c.nama)}
                                onPeriksa={() => jalankan(`Memeriksa ${c.nama}...`, () => periksaCadanganAction(c.nama))}
                                onHapus={() => { if (confirm(`Hapus cadangan ${c.nama}?\n\nBerkasnya dihapus dari server dan tidak bisa dikembalikan.`)) jalankan(`Menghapus ${c.nama}...`, () => hapusCadanganAction(c.nama)) }}
                                onPulihkan={() => { setPulih(c); setKetik("") }} />
                        ))}
                    </tbody>
                </table>
            </div>

            {pulih && (
                <div role="dialog" aria-modal="true" aria-labelledby="judul-pulih" className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4">
                    <div className="w-full max-w-md rounded-xl border bg-background p-5 shadow-xl">
                        <h3 id="judul-pulih" className="text-lg font-bold">Pulihkan dari cadangan?</h3>
                        <p className="mt-2 text-sm text-muted-foreground">
                            Seluruh isi database <b>{database}</b> diganti dengan cadangan <b>{waktu(pulih.dibuat)}</b> ({pulih.database}, {pulih.jumlahTabel} tabel).
                            Transaksi setelah waktu itu <b>hilang</b>. Semua pengguna sebaiknya keluar dulu; buat cadangan terbaru sebelum memulihkan bila ragu.
                        </p>
                        <label className="mt-4 block text-sm font-medium" htmlFor="ketik-db">Ketik <code className="font-mono">{database}</code> untuk melanjutkan</label>
                        <input id="ketik-db" value={ketik} onChange={(e) => setKetik(e.target.value)} autoComplete="off" spellCheck={false}
                            className="mt-1.5 h-9 w-full rounded-md border bg-background px-3 font-mono text-sm" />
                        <div className="mt-5 flex justify-end gap-2">
                            <button type="button" className="h-9 rounded-md border px-4 text-sm font-medium hover:bg-muted" onClick={() => setPulih(null)}>Batal</button>
                            <button type="button" disabled={ketik.trim() !== database}
                                className="inline-flex h-9 items-center gap-2 rounded-md bg-red-600 px-4 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
                                onClick={() => { const c = pulih; setPulih(null); jalankan(`Memulihkan ${c.nama}... (beberapa menit)`, () => pulihkanCadanganAction(c.nama, ketik)) }}>
                                <RotateCcw className="h-4 w-4" /> Pulihkan
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

function FragmenBaris({ c, buka, sibuk, onBuka, onPeriksa, onHapus, onPulihkan }: {
    c: Cadangan; buka: boolean; sibuk: boolean; onBuka: () => void; onPeriksa: () => void; onHapus: () => void; onPulihkan: () => void
}) {
    return (
        <>
            <tr className="border-t align-top">
                <td className="px-3 py-2.5">
                    <p className="font-medium">{waktu(c.dibuat)}</p>
                    <p className="font-mono text-xs text-muted-foreground">{c.nama}</p>
                </td>
                <td className="px-3 py-2.5">
                    <p>{c.database}</p>
                    <p className="text-xs text-muted-foreground">PostgreSQL {c.versiPg}{c.commit ? ` · commit ${c.commit}` : ""}</p>
                </td>
                <td className="px-3 py-2.5 text-right tabular-nums">
                    <p className="font-medium">{ukuranBaca(c.ukuran)}</p>
                    <p className="text-xs text-muted-foreground">dari {ukuranBaca(c.ukuranDatabase)}</p>
                </td>
                <td className="px-3 py-2.5">
                    <p>{c.jumlahTabel} tabel</p>
                    <p className="text-xs text-muted-foreground">{c.tanpaMedia ? "tanpa media" : "dengan media"} · {c.jumlahBerkas} berkas</p>
                </td>
                <td className="px-3 py-2.5">
                    <div className="flex flex-wrap justify-end gap-1.5">
                        <button type="button" className={tombol} onClick={onBuka} aria-expanded={buka}>
                            <Download className="h-3.5 w-3.5" /> Unduh <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", buka && "rotate-180")} />
                        </button>
                        <button type="button" className={tombol} disabled={sibuk} onClick={onPeriksa}><ShieldCheck className="h-3.5 w-3.5" /> Periksa</button>
                        <button type="button" className={cn(tombol, "text-red-600 dark:text-red-400")} disabled={sibuk} onClick={onPulihkan}><RotateCcw className="h-3.5 w-3.5" /> Pulihkan</button>
                        <button type="button" className={tombol} disabled={sibuk} onClick={onHapus} aria-label={`Hapus ${c.nama}`}><Trash2 className="h-3.5 w-3.5" /></button>
                    </div>
                </td>
            </tr>
            {buka && (
                <tr className="bg-muted/20">
                    <td colSpan={5} className="px-3 py-2.5">
                        <p className="mb-2 text-xs text-muted-foreground">Unduh semua berkas ke satu folder, jangan diganti namanya.</p>
                        <div className="flex flex-wrap gap-2">
                            {c.berkas.map((b) => (
                                <a key={b.nama} href={`/dashboard/settings/backup/unduh?nama=${encodeURIComponent(c.nama)}&berkas=${encodeURIComponent(b.nama)}`}
                                    className={tombol} download>
                                    <Download className="h-3.5 w-3.5" /> {b.nama}{b.ukuran ? ` (${ukuranBaca(b.ukuran)})` : ""}
                                </a>
                            ))}
                        </div>
                    </td>
                </tr>
            )}
        </>
    )
}
