"use client"

import { useActionState, useState } from "react"
import { AlertCircle, Loader2 } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { gantiPasswordAction, loginAction, logoutAction, type HasilAuth } from "@/app/actions/auth"

export function AuthCard({ title, description, koperasi, children }: {
    title: string; description: string; koperasi: { nama: string; logo: string }; children: React.ReactNode
}) {
    return (
        <div className="min-h-screen flex items-center justify-center bg-surface-low px-4">
            <div className="w-full max-w-[24rem] rounded-xl border border-outline-variant bg-background p-6 shadow-sm">
                <div className="flex items-center gap-3 mb-6">
                    <img src={koperasi.logo} alt={`Logo ${koperasi.nama}`} className="h-12 w-12 shrink-0 object-contain" />
                    <div className="min-w-0">
                        <h1 className="text-lg font-black tracking-tight break-words">{koperasi.nama}</h1>
                        <p className="text-xs text-muted-foreground">Management System</p>
                    </div>
                </div>
                <h2 className="text-base font-bold">{title}</h2>
                <p className="text-sm text-muted-foreground mb-4">{description}</p>
                {children}
            </div>
        </div>
    )
}

function Galat({ hasil }: { hasil: HasilAuth }) {
    if (!hasil) return null
    return (
        <div role="alert" className="flex items-start gap-2 rounded-md border border-red-300 bg-red-50 dark:bg-red-500/10 dark:border-red-500/40 p-2.5 text-sm text-red-700 dark:text-red-400">
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" /> <span>{hasil.error}</span>
        </div>
    )
}

function Tombol({ pending, children }: { pending: boolean; children: React.ReactNode }) {
    return (
        <button type="submit" disabled={pending}
            className="w-full inline-flex items-center justify-center gap-2 h-9 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold disabled:opacity-60">
            {pending && <Loader2 className="h-4 w-4 animate-spin" />} {children}
        </button>
    )
}

export function LoginForm({ next }: { next: string }) {
    const [hasil, aksi, pending] = useActionState(loginAction, null)
    // Nama dipertahankan saat login gagal (React mengosongkan isian form setelah action).
    const [nama, setNama] = useState("")
    return (
        <form action={aksi} className="space-y-4">
            <input type="hidden" name="next" value={next} />
            <div className="space-y-1.5">
                <Label htmlFor="nama">Nama Operator</Label>
                <Input id="nama" name="nama" autoComplete="username" required autoFocus value={nama} onChange={(e) => setNama(e.target.value)} />
            </div>
            <div className="space-y-1.5">
                <Label htmlFor="password">Password</Label>
                <Input id="password" name="password" type="password" autoComplete="current-password" required />
            </div>
            <Galat hasil={hasil} />
            <Tombol pending={pending}>Masuk</Tombol>
            <p className="text-xs text-muted-foreground">Belum punya password atau lupa? Minta admin mengeset password sementara.</p>
        </form>
    )
}

export function GantiPasswordForm({ wajib }: { wajib: boolean }) {
    const [hasil, aksi, pending] = useActionState(gantiPasswordAction, null)
    return (
        <div className="space-y-3">
            <form action={aksi} className="space-y-4">
                <div className="space-y-1.5">
                    <Label htmlFor="lama">{wajib ? "Password Sementara" : "Password Lama"}</Label>
                    <Input id="lama" name="lama" type="password" autoComplete="current-password" required />
                </div>
                <div className="space-y-1.5">
                    <Label htmlFor="baru">Password Baru</Label>
                    <Input id="baru" name="baru" type="password" autoComplete="new-password" required minLength={8} />
                    <p className="text-[11px] text-muted-foreground">Minimal 8 karakter, berisi huruf dan angka.</p>
                </div>
                <div className="space-y-1.5">
                    <Label htmlFor="ulang">Ulangi Password Baru</Label>
                    <Input id="ulang" name="ulang" type="password" autoComplete="new-password" required minLength={8} />
                </div>
                <Galat hasil={hasil} />
                <Tombol pending={pending}>Simpan Password</Tombol>
            </form>
            {wajib && (
                <form action={logoutAction}>
                    <button type="submit" className="w-full text-xs text-muted-foreground hover:underline">Keluar</button>
                </form>
            )}
        </div>
    )
}
