"use client"

import React, { useActionState, useEffect, useState, useTransition } from "react"
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react"
import { Input } from "@/components/ui/input"
import { InputUangBebas } from "@/components/ui/InputUang"
import { Textarea } from "@/components/ui/textarea"
import { Field, selectClass } from "@/components/transaksi/common"
import type { HasilSimpan } from "@/app/actions/master"
import { cn } from "@/lib/utils"

export interface FieldSpec {
    name: string
    label: string
    type?: "text" | "number" | "uang" | "date" | "time" | "select" | "checkbox" | "textarea"
    options?: { value: string; label: string }[]
    required?: boolean
    hint?: string
    wide?: boolean
    step?: string
    hidden?: boolean
    /** Nama tab; form bertab bila ada field yang mengisinya. Semua isian tetap ikut terkirim. */
    tab?: string
}

/** Form ubah data master; nilai awal dari server, simpan lewat server action yang memvalidasi ulang. */
export function FormEdit({ fields, nilai, aksi, tombol = "Simpan", onSelesai, kolom = 2 }: {
    fields: FieldSpec[]
    nilai: Record<string, string | number | boolean | null>
    aksi: (prev: HasilSimpan, f: FormData) => Promise<HasilSimpan>
    tombol?: string
    onSelesai?: () => void
    kolom?: 1 | 2 | 3
}) {
    const [hasil, jalankan, pending] = useActionState(aksi, null)
    const [, startTransition] = useTransition()
    useEffect(() => { if (hasil?.ok) onSelesai?.() }, [hasil, onSelesai])
    const tabs = [...new Set(fields.flatMap((f) => (f.tab ? [f.tab] : [])))]
    const [tabAktif, setTabAktif] = useState(tabs[0])
    // Isian wajib di tab yang tertutup tidak bisa ditunjuk browser, jadi tab itu dibuka dulu.
    const onInvalid = (e: React.FormEvent<HTMLFormElement>) => {
        const f = fields.find((x) => x.name === (e.target as HTMLInputElement).name)
        if (f?.tab) setTabAktif(f.tab)
    }
    // Tanpa form action: React 19 mengosongkan isian setelah action, juga saat validasi server menolak (sama dengan useAksiForm).
    const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        const data = new FormData(e.currentTarget)
        startTransition(() => jalankan(data))
    }
    return (
        <form onSubmit={onSubmit} onInvalidCapture={onInvalid} className="space-y-4">
            {tabs.length > 0 && (
                <div role="tablist" className="flex gap-1 overflow-x-auto border-b [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                    {tabs.map((t) => (
                        <button key={t} type="button" role="tab" aria-selected={t === tabAktif} onClick={() => setTabAktif(t)}
                            className={cn("-mb-px shrink-0 whitespace-nowrap border-b-2 px-4 py-2 text-sm transition-colors", t === tabAktif ? "border-blue-600 font-semibold text-foreground" : "border-transparent text-muted-foreground hover:text-foreground")}>{t}</button>
                    ))}
                </div>
            )}
            {(tabs.length ? tabs : [undefined]).map((tab) => (
            <div key={tab ?? "semua"} hidden={tab !== undefined && tab !== tabAktif} className={cn("grid gap-4", kolom === 2 && "sm:grid-cols-2", kolom === 3 && "sm:grid-cols-3", tab !== undefined && tab !== tabAktif && "hidden")}>
                {fields.filter((f) => tab === undefined || f.tab === tab || (f.hidden && tab === tabs[0])).map((f) => {
                    const v = nilai[f.name]
                    const id = `f-${f.name}`
                    if (f.hidden) return <input key={f.name} type="hidden" name={f.name} value={v == null ? "" : String(v)} />
                    if (f.type === "checkbox") {
                        return (
                            <label key={f.name} className={cn("flex items-center gap-2 text-sm pt-6", f.wide && "sm:col-span-full")}>
                                <input id={id} type="checkbox" name={f.name} defaultChecked={Boolean(v)} /> {f.label}
                            </label>
                        )
                    }
                    return (
                        <Field key={f.name} label={f.label} htmlFor={id} hint={f.hint} className={f.wide ? "sm:col-span-full" : undefined}>
                            {f.type === "select" ? (
                                <select id={id} name={f.name} className={selectClass} defaultValue={v == null ? "" : String(v)} required={f.required}>
                                    {!f.required && <option value="">-</option>}
                                    {f.options?.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                                </select>
                            ) : f.type === "textarea" ? (
                                <Textarea id={id} name={f.name} defaultValue={v == null ? "" : String(v)} required={f.required} rows={3} />
                            ) : f.type === "uang" ? (
                                <InputUangBebas id={id} name={f.name} defaultValue={v == null ? "" : String(v)} required={f.required} />
                            ) : (
                                <Input id={id} name={f.name} type={f.type === "number" ? "number" : f.type === "date" || f.type === "time" ? f.type : "text"}
                                    step={f.type === "number" ? f.step ?? "any" : undefined}
                                    defaultValue={v == null ? "" : String(v)} required={f.required} />
                            )}
                        </Field>
                    )
                })}
            </div>
            ))}
            {hasil && (hasil.ok ? (
                <div role="status" className="flex items-center gap-2 rounded-md border border-green-300 bg-green-50 dark:bg-green-500/10 p-2.5 text-sm text-green-700 dark:text-green-400">
                    <CheckCircle2 className="h-4 w-4" /> {hasil.pesan}
                </div>
            ) : (
                <div role="alert" className="flex items-start gap-2 rounded-md border border-red-300 bg-red-50 dark:bg-red-500/10 p-2.5 text-sm text-red-700 dark:text-red-400">
                    <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" /> {hasil.error}
                </div>
            ))}
            <div className="flex justify-end">
                <button type="submit" disabled={pending}
                    className="inline-flex items-center gap-2 h-9 px-4 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold disabled:opacity-60">
                    {pending && <Loader2 className="h-4 w-4 animate-spin" />} {tombol}
                </button>
            </div>
        </form>
    )
}
