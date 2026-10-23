"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Check, Loader2, X } from "lucide-react"
import type { PendaftaranBaru } from "@kopkar/backend/src/anggota/akun.ts"
import { putuskanPendaftaranAction, type HasilPendaftaran } from "@/app/actions/pendaftaran"
import { Button } from "@/components/ui/button"
import { FormCard } from "@/components/transaksi/common"

/** Pendaftaran akun baru dari aplikasi anggota yang menunggu persetujuan admin. */
export function DaftarPendaftaran({ data }: { data: PendaftaranBaru[] }) {
    const router = useRouter()
    const [hasil, setHasil] = useState<HasilPendaftaran | null>(null)
    const [sibuk, setSibuk] = useState<number | null>(null)
    const [, mulai] = useTransition()

    const putuskan = (p: PendaftaranBaru, setuju: boolean) => {
        if (!confirm(`${setuju ? "Setujui" : "Tolak"} pendaftaran ${p.nama ?? p.username}?`)) return
        setSibuk(p.id)
        mulai(async () => {
            setHasil(await putuskanPendaftaranAction(p.id, setuju))
            setSibuk(null)
            router.refresh()
        })
    }

    return (
        <FormCard title="Pendaftaran Baru" description="Akun baru dari aplikasi anggota aktif setelah Anda menyetujuinya. Email pendaftar harus sudah terverifikasi (kode email atau Google).">
            <div className="space-y-3">
                {hasil && (
                    <div role={hasil.ok ? "status" : "alert"} className={`rounded-md border p-2.5 text-sm ${hasil.ok
                        ? "border-green-300 bg-green-50 text-green-700 dark:bg-green-500/10" : "border-red-300 bg-red-50 text-red-700 dark:bg-red-500/10"}`}>
                        {hasil.ok ? hasil.pesan : hasil.error}
                    </div>
                )}
                {data.length === 0 ? (
                    <p className="rounded-md border p-6 text-center text-sm text-muted-foreground">Tidak ada pendaftaran yang menunggu.</p>
                ) : (
                    <div className="overflow-x-auto rounded-md border">
                        <table className="w-full text-sm">
                            <thead className="bg-muted text-muted-foreground text-xs">
                                <tr>
                                    <th className="px-3 py-2 text-left">Waktu</th>
                                    <th className="px-3 py-2 text-left">Nama</th>
                                    <th className="px-3 py-2 text-left">NIK</th>
                                    <th className="px-3 py-2 text-left">Username</th>
                                    <th className="px-3 py-2 text-left">Email</th>
                                    <th className="px-3 py-2 text-center">Keanggotaan</th>
                                    <th className="px-3 py-2 text-right">Aksi</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.map((p) => (
                                    <tr key={p.id} className="border-t">
                                        <td className="whitespace-nowrap px-3 py-2">{p.dibuat}</td>
                                        <td className="px-3 py-2 font-medium">{p.nama ?? "-"}</td>
                                        <td className="px-3 py-2 font-mono">{p.nik ?? "-"}</td>
                                        <td className="px-3 py-2">{p.username}</td>
                                        <td className="px-3 py-2">
                                            {p.email ?? "-"}
                                            <span className={`ml-2 rounded px-1.5 py-0.5 text-[11px] ${p.email_terverifikasi
                                                ? "bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-400"
                                                : "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400"}`}>
                                                {p.email_terverifikasi ? (p.google ? "Google" : "Terverifikasi") : "Belum diverifikasi"}
                                            </span>
                                        </td>
                                        <td className="px-3 py-2 text-center">{p.anggota ? "Anggota" : "Karyawan Mattel"}</td>
                                        <td className="whitespace-nowrap px-3 py-2 text-right">
                                            {sibuk === p.id ? <Loader2 className="ml-auto h-4 w-4 animate-spin" /> : (
                                                <div className="flex justify-end gap-1.5">
                                                    <Button type="button" size="sm" className="h-8" disabled={!p.email_terverifikasi} onClick={() => putuskan(p, true)}>
                                                        <Check className="mr-1 h-4 w-4" />Setujui
                                                    </Button>
                                                    <Button type="button" size="sm" variant="outline" className="h-8" onClick={() => putuskan(p, false)}>
                                                        <X className="mr-1 h-4 w-4" />Tolak
                                                    </Button>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </FormCard>
    )
}
