"use client"

import { Printer } from "lucide-react"

export function TombolCetak({ label = "Cetak" }: { label?: string }) {
    return (
        <button type="button" onClick={() => window.print()}
            className="h-9 px-3 inline-flex items-center gap-1.5 rounded-md border text-sm font-medium hover:bg-muted print:hidden">
            <Printer className="h-4 w-4" /> {label}
        </button>
    )
}
