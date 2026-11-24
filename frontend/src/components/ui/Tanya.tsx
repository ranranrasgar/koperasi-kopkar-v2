"use client"

import { useEffect, useRef, useState } from "react"
import { AlertCircle, CheckCircle2 } from "lucide-react"
import { Input } from "@/components/ui/input"
import { ModalForm } from "@/components/ui/Modal"
import { cn } from "@/lib/utils"

// Pengganti confirm()/prompt()/alert() bawaan browser, yang diblokir di sebagian peramban (mis. panel browser aplikasi desktop: confirm langsung
// dianggap Batal, prompt melempar galat). Panggil dari komponen klien mana pun; <DialogTanya /> dipasang sekali di layout dashboard.
//   if (!(await tanyaYa("Hapus data ini?", { bahaya: true }))) return
//   const alasan = await tanyaIsian("Tulis alasannya:", { judul: "Batalkan nota" }); if (alasan === null) return
//   await beriTahu(h.ok ? h.pesan : h.error, { ok: h.ok })

interface Opsi { judul?: string; tombol?: string; bahaya?: boolean }
type Permintaan =
    | { jenis: "konfirmasi"; teks: string; opsi: Opsi; selesai: (v: boolean) => void }
    | { jenis: "isian"; teks: string; opsi: Opsi & { label?: string; wajib?: boolean; minimal?: number; awal?: string }; selesai: (v: string | null) => void }
    | { jenis: "info"; teks: string; opsi: Opsi & { ok?: boolean }; selesai: (v: void) => void }

let tampilkan: ((p: Permintaan) => void) | null = null

function minta<T>(buat: (selesai: (v: T) => void) => Permintaan, cadangan: T): Promise<T> {
    return new Promise<T>((selesai) => {
        if (!tampilkan) return selesai(cadangan) // belum terpasang: tidak pernah menjalankan aksi tanpa persetujuan
        tampilkan(buat(selesai))
    })
}

/** Ya/tidak. Mengembalikan true hanya bila tombol utama ditekan. */
export const tanyaYa = (teks: string, opsi: Opsi = {}) =>
    minta<boolean>((selesai) => ({ jenis: "konfirmasi", teks, opsi, selesai }), false)

/** Isian teks satu baris. null bila dibatalkan. `wajib` (bawaan true) dan `minimal` karakter diperiksa sebelum tombol bisa ditekan. */
export const tanyaIsian = (teks: string, opsi: Opsi & { label?: string; wajib?: boolean; minimal?: number; awal?: string } = {}) =>
    minta<string | null>((selesai) => ({ jenis: "isian", teks, opsi, selesai }), null)

/** Pemberitahuan dengan satu tombol Tutup. `ok` true/false menampilkan ikon berhasil/gagal. */
export const beriTahu = (teks: string, opsi: Opsi & { ok?: boolean } = {}) =>
    minta<void>((selesai) => ({ jenis: "info", teks, opsi, selesai }), undefined)

/** Pasang sekali di layout. Permintaan yang datang saat dialog terbuka diantre. */
export function DialogTanya() {
    const [aktif, setAktif] = useState<Permintaan | null>(null)
    const terbuka = useRef<Permintaan | null>(null)
    const antre = useRef<Permintaan[]>([])
    const [nilai, setNilai] = useState("")
    const buka = (p: Permintaan | null) => {
        terbuka.current = p
        setNilai(p?.jenis === "isian" ? p.opsi.awal ?? "" : "")
        setAktif(p)
    }
    useEffect(() => {
        tampilkan = (p) => { if (terbuka.current) antre.current.push(p); else buka(p) }
        return () => {
            tampilkan = null
            // Dialog hilang (pindah halaman, muat ulang): permintaan yang menunggu dianggap Batal, supaya pemanggil tidak menggantung.
            for (const p of [terbuka.current, ...antre.current]) {
                if (p?.jenis === "konfirmasi") p.selesai(false)
                else if (p?.jenis === "isian") p.selesai(null)
                else p?.selesai()
            }
            terbuka.current = null; antre.current = []
        }
    }, [])

    const tutup = (hasil: boolean) => {
        const p = terbuka.current
        if (!p) return
        if (p.jenis === "konfirmasi") p.selesai(hasil)
        else if (p.jenis === "isian") p.selesai(hasil ? nilai.trim() : null)
        else p.selesai()
        buka(antre.current.shift() ?? null)
    }

    const o = aktif?.opsi ?? {}
    const minimal = aktif?.jenis === "isian" ? (aktif.opsi.wajib === false ? 0 : Math.max(1, aktif.opsi.minimal ?? 1)) : 0
    const bisa = nilai.trim().length >= minimal
    const judul = o.judul ?? (aktif?.jenis === "info" ? "Pemberitahuan" : "Konfirmasi")
    const tombolUtama = cn("inline-flex h-9 items-center rounded-md px-4 text-sm font-semibold text-white disabled:opacity-50",
        o.bahaya ? "bg-red-600 hover:bg-red-700" : "bg-blue-600 hover:bg-blue-700")
    const okInfo = aktif?.jenis === "info" ? aktif.opsi.ok : undefined

    return (
        <ModalForm open={!!aktif} onOpenChange={(b) => { if (!b) tutup(false) }} kunci={false} judul={judul}>
            {aktif && <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); if (aktif.jenis !== "isian" || bisa) tutup(true) }}>
                <p className={cn("flex items-start gap-2 whitespace-pre-line text-sm", okInfo === false && "text-red-800", okInfo === true && "text-emerald-800")}>
                    {okInfo === true && <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />}
                    {okInfo === false && <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />}
                    {aktif.teks}
                </p>
                {aktif.jenis === "isian" && <Input autoFocus value={nilai} onChange={(e) => setNilai(e.target.value)} maxLength={255} aria-label={aktif.opsi.label ?? aktif.teks} placeholder={aktif.opsi.label} />}
                <div className="flex justify-end gap-2">
                    {aktif.jenis === "info"
                        ? <button type="submit" autoFocus className={tombolUtama}>{o.tombol ?? "Tutup"}</button>
                        : <>
                            {/* Fokus awal di Batal: Enter tidak langsung menjalankan aksi yang sering tidak bisa dibatalkan. */}
                            <button type="button" autoFocus={aktif.jenis === "konfirmasi"} onClick={() => tutup(false)} className="h-9 rounded-md border px-4 text-sm">Batal</button>
                            <button type="submit" disabled={aktif.jenis === "isian" && !bisa} className={tombolUtama}>{o.tombol ?? "Ya"}</button>
                        </>}
                </div>
            </form>}
        </ModalForm>
    )
}
