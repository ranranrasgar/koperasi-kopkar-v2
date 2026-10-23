"use client"

import { useRef, useState } from "react"
import { LoaderCircle, LogOut } from "lucide-react"
import { keluarAction } from "@/app/actions/auth"
import { lepasPerangkat } from "@/lib/push-klien"

/** Keluar: lepas langganan notifikasi perangkat ini dari akun lebih dulu, lalu keluar. Gagal melepas tidak menghalangi keluar. */
export function TombolKeluar() {
    const form = useRef<HTMLFormElement>(null)
    const [proses, setProses] = useState(false)

    const keluar = async () => {
        setProses(true)
        await lepasPerangkat().catch(() => undefined)
        form.current?.requestSubmit()
    }
    return (
        <form ref={form} action={keluarAction} className="mt-6">
            <button type="button" onClick={keluar} disabled={proses}
                className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-keluar-lembut font-semibold text-keluar transition-colors active:opacity-80 disabled:opacity-70">
                {proses ? <LoaderCircle size={19} className="animate-spin" /> : <LogOut size={19} strokeWidth={1.75} />}
                Keluar
            </button>
        </form>
    )
}
