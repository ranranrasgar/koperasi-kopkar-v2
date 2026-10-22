"use client"

import React, { useActionState, useEffect, useRef, useState, useTransition } from "react"
import { AlertCircle, CheckCircle2, ImageUp, Loader2, RotateCcw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { simpanLogoAction } from "@/app/actions/master"

/** Unggah logo koperasi: tampil di sidebar, halaman login, dan ikon tab browser. */
export function FormLogo({ logo, logoSendiri }: { logo: string; logoSendiri: boolean }) {
    const [hasil, jalankan, pending] = useActionState(simpanLogoAction, null)
    const [, startTransition] = useTransition()
    const [pratinjau, setPratinjau] = useState<string | null>(null)
    const berkas = useRef<HTMLInputElement>(null)

    // Lepas URL pratinjau lama supaya tidak bocor memori.
    useEffect(() => () => { if (pratinjau) URL.revokeObjectURL(pratinjau) }, [pratinjau])
    useEffect(() => {
        if (hasil?.ok) {
            setPratinjau(null)
            if (berkas.current) berkas.current.value = ""
        }
    }, [hasil])

    const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        const tombol = (e.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null
        if (tombol?.value === "hapus" && !confirm("Hapus logo dan kembali memakai logo bawaan?")) return
        const data = new FormData(e.currentTarget, tombol)
        startTransition(() => jalankan(data))
    }

    return (
        <form onSubmit={onSubmit} className="flex flex-col sm:flex-row gap-5 sm:items-center">
            <div className="h-28 w-28 shrink-0 rounded-lg border bg-muted/40 flex items-center justify-center p-2">
                <img src={pratinjau ?? logo} alt="Pratinjau logo" className="max-h-full max-w-full object-contain" />
            </div>
            <div className="space-y-3 min-w-0 flex-1">
                <p className="text-sm text-muted-foreground">
                    {pratinjau ? "Pratinjau logo baru, belum disimpan." : logoSendiri ? "Logo koperasi saat ini." : "Belum ada logo; aplikasi memakai logo bawaan."}
                    {" "}PNG, JPG, WebP, atau GIF, maksimal 500 KB. Gambar persegi dengan latar transparan paling cocok untuk mode terang dan gelap.
                </p>
                <input ref={berkas} type="file" name="logo" accept="image/png,image/jpeg,image/webp,image/gif" aria-label="File logo"
                    onChange={(e) => {
                        const f = e.target.files?.[0]
                        setPratinjau(f ? URL.createObjectURL(f) : null)
                    }}
                    className="block w-full text-sm text-muted-foreground file:mr-3 file:rounded-md file:border file:border-input file:bg-background file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-foreground hover:file:bg-accent" />
                <div className="flex flex-wrap gap-2">
                    <button type="submit" name="aksi" value="simpan" disabled={pending || !pratinjau}
                        className="inline-flex items-center gap-2 h-9 px-4 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold disabled:opacity-60">
                        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImageUp className="h-4 w-4" />} Simpan Logo
                    </button>
                    {logoSendiri && (
                        <Button type="submit" name="aksi" value="hapus" variant="outline" disabled={pending} className="h-9">
                            <RotateCcw className="h-4 w-4" /> Pakai logo bawaan
                        </Button>
                    )}
                </div>
                {hasil && (hasil.ok ? (
                    <div role="status" className="flex items-center gap-2 rounded-md border border-green-300 bg-green-50 dark:bg-green-500/10 p-2.5 text-sm text-green-700 dark:text-green-400">
                        <CheckCircle2 className="h-4 w-4" /> {hasil.pesan}
                    </div>
                ) : (
                    <div role="alert" className="flex items-start gap-2 rounded-md border border-red-300 bg-red-50 dark:bg-red-500/10 p-2.5 text-sm text-red-700 dark:text-red-400">
                        <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" /> {hasil.error}
                    </div>
                ))}
            </div>
        </form>
    )
}
