"use client"

import { startTransition, useState } from "react"
import { CircleCheckBig, Eye, EyeOff, LoaderCircle, TriangleAlert } from "lucide-react"

// Komponen form bersama untuk halaman akun (daftar, lupa password, ganti password/email).

export const kelasKolom =
    "h-13 w-full rounded-xl border border-garis bg-permukaan px-4 text-base outline-none transition " +
    "placeholder:text-redup/70 focus:border-utama focus:ring-4 focus:ring-utama/15"

export function Kolom({ label, catatan, ...p }: React.InputHTMLAttributes<HTMLInputElement> & { label: string; catatan?: string; name: string }) {
    return (
        <div className="space-y-2">
            <label htmlFor={p.id ?? p.name} className="text-sm font-medium">{label}</label>
            <input id={p.id ?? p.name} className={kelasKolom} {...p} />
            {catatan && <p className="text-xs text-redup">{catatan}</p>}
        </div>
    )
}

export function KolomPassword({ label, catatan, ...p }: React.InputHTMLAttributes<HTMLInputElement> & { label: string; catatan?: string; name: string }) {
    const [lihat, setLihat] = useState(false)
    return (
        <div className="space-y-2">
            <label htmlFor={p.id ?? p.name} className="text-sm font-medium">{label}</label>
            <div className="relative">
                <input id={p.id ?? p.name} type={lihat ? "text" : "password"} className={`${kelasKolom} pr-13`} {...p} />
                <button type="button" onClick={() => setLihat(!lihat)} aria-label={lihat ? "Sembunyikan password" : "Tampilkan password"}
                    className="absolute inset-y-0 right-0 grid w-13 place-items-center text-redup hover:text-teks">
                    {lihat ? <EyeOff size={20} strokeWidth={1.75} /> : <Eye size={20} strokeWidth={1.75} />}
                </button>
            </div>
            {catatan && <p className="text-xs text-redup">{catatan}</p>}
        </div>
    )
}

export function Tombol({ proses, children, label = "Memproses…" }: { proses: boolean; children: React.ReactNode; label?: string }) {
    return (
        <button type="submit" disabled={proses}
            className="flex h-13 w-full items-center justify-center gap-2 rounded-xl bg-utama text-base font-semibold text-pada-utama
                transition hover:bg-utama-tekan active:scale-[0.99] disabled:opacity-70">
            {proses && <LoaderCircle size={18} className="animate-spin" />}
            {proses ? label : children}
        </button>
    )
}

export function PesanGalat({ pesan }: { pesan?: string | null }) {
    if (!pesan) return null
    return (
        <p role="alert" className="flex gap-2 rounded-xl bg-keluar-lembut px-4 py-3 text-sm font-medium text-keluar">
            <TriangleAlert size={18} strokeWidth={1.75} className="mt-px shrink-0" />{pesan}
        </p>
    )
}

export function PesanBerhasil({ judul, pesan, children }: { judul: string; pesan: string; children?: React.ReactNode }) {
    return (
        <div role="status" className="rounded-[var(--radius-kartu)] border border-garis bg-permukaan p-6 text-center">
            <CircleCheckBig size={40} strokeWidth={1.5} className="mx-auto text-masuk" />
            <p className="mt-3 text-lg font-bold">{judul}</p>
            <p className="mt-1 text-sm leading-relaxed text-redup">{pesan}</p>
            {children && <div className="mt-5">{children}</div>}
        </div>
    )
}

/**
 * Kirim form ke server action tanpa mengosongkan isian. Dengan <form action>, React mengosongkan form setelah action
 * selesai, sehingga isian hilang bila server menolak (mis. NIK salah).
 */
export function tanpaReset(kirim: (f: FormData) => void) {
    return (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        const f = new FormData(e.currentTarget)
        startTransition(() => kirim(f))
    }
}

export const ATURAN_PASSWORD = "Minimal 8 karakter, berisi huruf dan angka."
