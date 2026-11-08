"use client"

import { useState, useTransition } from "react"
import { CheckCircle2, Loader2, Mail, MailWarning, RefreshCw } from "lucide-react"
import { statusEmailAkunAction, ubahEmailAkunAction } from "@/app/actions/pendaftaran"
import { useBolehAksi } from "@/components/layout/SidebarContext"
import { MENU } from "@/config/akses"

type Status = "ya" | "belum" | "kosong"

/**
 * Status email akun aplikasi anggota pada tinjauan pengajuan. Notifikasi lewat email (keputusan pengajuan, pencairan) hanya sampai ke email
 * yang terverifikasi. Bila belum, petugas menanyakan email ke anggota, mengisinya di sini, dan mengirim verifikasi; anggota membuka emailnya
 * lalu memverifikasi sendiri. "Periksa lagi" menyegarkan status setelah anggota memverifikasi.
 */
export function EmailAnggotaPengajuan({ akunId, email, status }: { akunId: number | null; email: string | null; status: Status }) {
    const boleh = useBolehAksi()
    const [st, setSt] = useState<Status>(status)
    const [em, setEm] = useState(email ?? "")
    const [isian, setIsian] = useState(email ?? "")
    const [form, setForm] = useState(false)
    const [pesan, setPesan] = useState<{ ok: boolean; teks: string } | null>(null)
    const [sibuk, mulai] = useTransition()

    if (akunId === null) return <div className="text-sm text-muted-foreground">Anggota ini belum punya akun aplikasi, jadi belum ada email untuk notifikasi.</div>

    const bolehKirim = boleh([MENU.user, MENU.requestUser, MENU.pengajuan], "ubah")
    const kirim = () => mulai(async () => {
        const h = await ubahEmailAkunAction(akunId, isian)
        setPesan({ ok: h.ok, teks: h.ok ? h.pesan : h.error })
        if (h.ok && !h.pesan.startsWith("MODE UJI")) { setEm(isian.trim().toLowerCase()); setSt("belum"); setForm(false) }
    })
    const periksa = () => mulai(async () => {
        const r = await statusEmailAkunAction(akunId)
        if (r.ok) { setSt(r.status); setEm(r.email ?? ""); setPesan(null) } else setPesan({ ok: false, teks: r.error })
    })

    return (
        <div className="min-w-0 flex-1 space-y-2 text-sm" aria-label="Email anggota">
            <div className="flex flex-wrap items-center gap-2">
                {st === "ya" ? <CheckCircle2 className="h-4 w-4 shrink-0 text-green-600" /> : st === "belum" ? <MailWarning className="h-4 w-4 shrink-0 text-amber-600" /> : <Mail className="h-4 w-4 shrink-0 text-muted-foreground" />}
                <span className="break-all font-medium">{em || "Email belum diisi"}</span>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${st === "ya" ? "bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-400"
                    : st === "belum" ? "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400" : "bg-muted text-muted-foreground"}`}>
                    {st === "ya" ? "Terverifikasi" : st === "belum" ? "Belum diverifikasi" : "Belum ada"}
                </span>
                {st !== "ya" && bolehKirim && !form && (
                    <button type="button" onClick={() => { setIsian(em); setForm(true); setPesan(null) }}
                        className="inline-flex h-8 items-center gap-1.5 rounded-md border px-2.5 text-xs font-medium hover:bg-muted">
                        <Mail className="h-3.5 w-3.5" />{st === "belum" ? "Kirim ulang / ganti email" : "Isi email & kirim verifikasi"}
                    </button>
                )}
                {st === "belum" && (
                    <button type="button" onClick={periksa} disabled={sibuk} title="Periksa apakah anggota sudah memverifikasi"
                        className="inline-flex h-8 items-center gap-1.5 rounded-md px-2 text-xs text-muted-foreground hover:bg-muted disabled:opacity-50">
                        {sibuk ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}Periksa lagi
                    </button>
                )}
            </div>
            {form && (
                <div className="flex flex-wrap items-center gap-2">
                    <input type="email" value={isian} onChange={(e) => setIsian(e.target.value)} placeholder="Email yang disebut anggota" maxLength={100} aria-label="Email anggota"
                        className="h-9 min-w-[16rem] flex-1 rounded-md border bg-background px-2 text-sm" />
                    <button type="button" onClick={kirim} disabled={sibuk || !isian.trim()}
                        className="inline-flex h-9 items-center gap-1.5 rounded-md bg-blue-600 px-3 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
                        {sibuk ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}Kirim verifikasi
                    </button>
                    <button type="button" onClick={() => setForm(false)} disabled={sibuk} className="h-9 rounded-md px-2 text-sm text-muted-foreground hover:bg-muted">Batal</button>
                </div>
            )}
            {st !== "ya" && !form && !pesan && <p className="text-xs text-muted-foreground">Notifikasi lewat email hanya dikirim ke email yang sudah terverifikasi. Notifikasi di HP anggota tetap sampai.</p>}
            {pesan && <p role={pesan.ok ? "status" : "alert"} className={`text-xs ${pesan.ok ? "text-green-700" : "text-red-700"}`}>{pesan.teks}</p>}
        </div>
    )
}
