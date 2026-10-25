"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useTransition } from "react"
import { Paginasi } from "@/components/ui/Paginasi"

/** Paginasi untuk halaman server yang memakai parameter URL page dan pageSize (mis. laporan bertabel); parameter lain dipertahankan. */
export function PaginasiUrl({ page, totalPages, pageSize, total, className }: { page: number; totalPages: number; pageSize: number; total: number; className?: string }) {
    const router = useRouter(), pathname = usePathname(), sp = useSearchParams()
    const [pending, mulai] = useTransition()
    const ubah = (u: Record<string, string | number>) => {
        const p = new URLSearchParams(sp.toString())
        for (const [k, v] of Object.entries(u)) p.set(k, String(v))
        mulai(() => router.push(`${pathname}?${p.toString()}`))
    }
    return <Paginasi className={className} page={page} totalPages={totalPages} pageSize={pageSize} total={total} disabled={pending}
        onHalaman={(h) => ubah({ page: h })} onBaris={(v) => ubah({ pageSize: v, page: 1 })} />
}
