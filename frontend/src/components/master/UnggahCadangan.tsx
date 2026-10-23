"use client"

import { useRef, useState } from "react"
import { AlertCircle, CheckCircle2, Loader2, Upload, X } from "lucide-react"
import { cn } from "@/lib/utils"

const ukuranBaca = (b: number) =>
    b >= 1 << 30 ? `${(b / (1 << 30)).toFixed(2)} GB` : b >= 1 << 20 ? `${(b / (1 << 20)).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} kB`

interface Mulai { id: string; potongan: { nama: string; ukuran: number }[]; total: number; ukuranPotongan: number }
type Status = { jenis: "siap" | "jalan" | "periksa" | "ok" | "galat"; pesan?: string; keluaran?: string }

const ALAMAT = "/dashboard/settings/backup/unggah"

async function kirim(url: string, init: RequestInit) {
    const r = await fetch(url, init)
    const j = await r.json().catch(() => ({}))
    if (!r.ok) throw Object.assign(new Error(j.error ?? `Server membalas ${r.status}`), { keluaran: j.keluaran })
    return j
}

/**
 * Unggah cadangan dari komputer (mis. hasil Unduh di server lain) supaya bisa dipulihkan di server ini. Berkas dikirim
 * per potongan 8 MB karena proxy Next.js memotong isi permintaan di atas 10 MB tanpa galat. Setelah semua masuk, server
 * mencocokkan SHA-256 tiap berkas dengan manifest.
 */
export function UnggahCadangan({ sibuk, onSelesai }: { sibuk: boolean; onSelesai: (nama: string) => void }) {
    const input = useRef<HTMLInputElement>(null)
    const batal = useRef(false)
    const [berkas, setBerkas] = useState<File[]>([])
    const [ringkas, setRingkas] = useState<{ dibuat: string; database: string; perlu: { nama: string; ukuran: number; ada: boolean }[] } | null>(null)
    const [status, setStatus] = useState<Status | null>(null)
    const [kemajuan, setKemajuan] = useState({ terkirim: 0, total: 0, berkas: "" })
    const idAktif = useRef<string | null>(null)

    const cariManifest = (fs: File[]) => fs.find((f) => f.name.endsWith("manifest.json"))

    const pilih = async (daftar: FileList | null) => {
        const fs = [...(daftar ?? [])]
        setBerkas(fs)
        setStatus(null)
        setRingkas(null)
        const m = cariManifest(fs)
        if (!m) { setStatus({ jenis: "galat", pesan: "Pilih juga manifest.json (atau ...-manifest.json) dari folder cadangan." }); return }
        try {
            const isi = JSON.parse(await m.text())
            if (isi.format !== "kopkar-backup-1") throw new Error()
            const perlu = (isi.berkas as { potongan: { nama: string; ukuran: number }[] }[]).flatMap((b) => b.potongan)
                .map((p) => ({ ...p, ada: fs.some((f) => f.name === p.nama && f.size === p.ukuran) }))
            setRingkas({ dibuat: isi.dibuat, database: isi.database, perlu })
            const kurang = perlu.filter((p) => !p.ada)
            setStatus(kurang.length
                ? { jenis: "galat", pesan: `Berkas belum dipilih atau ukurannya berbeda: ${kurang.map((p) => p.nama).join(", ")}. Nama berkas jangan diubah (mis. "data (1).dump").` }
                : { jenis: "siap" })
        } catch {
            setStatus({ jenis: "galat", pesan: "manifest.json tidak bisa dibaca atau bukan cadangan aplikasi ini." })
        }
    }

    const unggah = async () => {
        const m = cariManifest(berkas)
        if (!m) return
        const teksManifest = await m.text()
        batal.current = false
        setStatus({ jenis: "jalan" })
        try {
            const mulai: Mulai = await kirim(`${ALAMAT}?aksi=mulai`, { method: "POST", body: teksManifest })
            idAktif.current = mulai.id
            let terkirim = 0
            for (const p of mulai.potongan) {
                const f = berkas.find((x) => x.name === p.nama && x.size === p.ukuran)
                if (!f) throw new Error(`${p.nama} tidak dipilih`)
                for (let posisi = 0; posisi < f.size; posisi += mulai.ukuranPotongan) {
                    if (batal.current) throw new Error("Dibatalkan")
                    const potong = f.slice(posisi, Math.min(f.size, posisi + mulai.ukuranPotongan))
                    const url = `${ALAMAT}?id=${mulai.id}&berkas=${encodeURIComponent(p.nama)}&posisi=${posisi}`
                    // Koneksi putus sesaat: coba lagi sampai 3 kali (server menerima kiriman ulang potongan yang sama).
                    for (let coba = 1; ; coba++) {
                        try { await kirim(url, { method: "PUT", body: potong, headers: { "Content-Type": "application/octet-stream" } }); break }
                        catch (e) { if (coba >= 3 || batal.current) throw e; await new Promise((r) => setTimeout(r, 1500 * coba)) }
                    }
                    terkirim += potong.size
                    setKemajuan({ terkirim, total: mulai.total, berkas: p.nama })
                }
            }
            setStatus({ jenis: "periksa" })
            const hasil = await kirim(`${ALAMAT}?aksi=selesai&id=${mulai.id}`, { method: "POST", body: teksManifest })
            idAktif.current = null
            setStatus({ jenis: "ok", pesan: `Cadangan diunggah dan utuh (SHA-256 cocok): ${hasil.nama}`, keluaran: hasil.keluaran })
            setBerkas([])
            if (input.current) input.current.value = ""
            onSelesai(hasil.nama)
        } catch (e) {
            if (idAktif.current) await fetch(`${ALAMAT}?id=${idAktif.current}`, { method: "DELETE" }).catch(() => undefined)
            idAktif.current = null
            setStatus({ jenis: "galat", pesan: e instanceof Error ? e.message : "Unggahan gagal", keluaran: (e as { keluaran?: string }).keluaran })
        }
    }

    const jalan = status?.jenis === "jalan" || status?.jenis === "periksa"
    const persen = kemajuan.total ? Math.round((kemajuan.terkirim / kemajuan.total) * 100) : 0

    return (
        <div className="space-y-3 rounded-lg border border-dashed p-4">
            <div>
                <p className="font-semibold">Unggah cadangan dari komputer</p>
                <p className="text-sm text-muted-foreground">
                    Pilih <b>semua</b> berkas satu cadangan sekaligus: <code className="font-mono">manifest.json</code>, <code className="font-mono">data.dump</code>
                    {" "}(atau semua potongannya), dan <code className="font-mono">media.dump</code>. Setelah terunggah dan diperiksa, cadangan bisa dipulihkan di server ini.
                </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
                <input ref={input} type="file" multiple accept=".dump,.json,.001,.002,.003,.004,.005,.006,.007,.008,.009,application/json,application/octet-stream"
                    disabled={jalan || sibuk} onChange={(e) => pilih(e.target.files)}
                    className="text-sm file:mr-3 file:h-9 file:rounded-md file:border file:bg-background file:px-3 file:text-sm file:font-medium hover:file:bg-muted" />
                <button type="button" disabled={status?.jenis !== "siap" || sibuk} onClick={unggah}
                    className="inline-flex h-9 items-center gap-2 rounded-md bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">
                    {jalan ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />} Unggah
                </button>
                {jalan && (
                    <button type="button" onClick={() => { batal.current = true }} className="inline-flex h-9 items-center gap-1.5 rounded-md border px-3 text-sm hover:bg-muted">
                        <X className="h-4 w-4" /> Batal
                    </button>
                )}
            </div>

            {ringkas && (
                <div className="rounded-md bg-muted/40 p-3 text-sm">
                    <p>Cadangan <b>{ringkas.database}</b>, dibuat {new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Jakarta" }).format(new Date(ringkas.dibuat))}</p>
                    <ul className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs">
                        {ringkas.perlu.map((p) => (
                            <li key={p.nama} className={p.ada ? "text-green-700 dark:text-green-400" : "text-red-600 dark:text-red-400"}>
                                {p.ada ? "✓" : "✗"} {p.nama} ({ukuranBaca(p.ukuran)})
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {status?.jenis === "jalan" && (
                <div>
                    <div className="h-2 overflow-hidden rounded-full bg-muted"><div className="h-full bg-blue-600 transition-all" style={{ width: `${persen}%` }} /></div>
                    <p className="mt-1 text-xs text-muted-foreground">{persen}% · {ukuranBaca(kemajuan.terkirim)} dari {ukuranBaca(kemajuan.total)} · {kemajuan.berkas} · jangan tutup halaman</p>
                </div>
            )}
            {status?.jenis === "periksa" && <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Memeriksa SHA-256 semua berkas...</p>}
            {(status?.jenis === "ok" || status?.jenis === "galat") && status.pesan && (
                <div role={status.jenis === "ok" ? "status" : "alert"} className={cn("rounded-md border p-3 text-sm",
                    status.jenis === "ok" ? "border-green-300 bg-green-50 text-green-800 dark:bg-green-500/10 dark:text-green-300"
                        : "border-red-300 bg-red-50 text-red-800 dark:bg-red-500/10 dark:text-red-300")}>
                    <p className="flex items-center gap-2 font-medium">
                        {status.jenis === "ok" ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <AlertCircle className="h-4 w-4 shrink-0" />}{status.pesan}
                    </p>
                    {status.keluaran && <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap font-mono text-xs">{status.keluaran}</pre>}
                </div>
            )}
        </div>
    )
}
