"use client"

import { RotateCcw, Settings2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
    DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

/**
 * Menu "Kolom": centang kolom yang ditampilkan. Menu tetap terbuka saat mencentang supaya beberapa kolom bisa diatur sekaligus.
 * Pengaturan disimpan oleh pemanggil (useKolomTersimpan).
 */
export function PilihKolom({ kolom, terlihat, onUbah, onAturUlang, sudahDiubah }: {
    kolom: { kunci: string; label: string }[]
    terlihat: Record<string, boolean>
    onUbah: (berikut: Record<string, boolean>) => void
    onAturUlang: () => void
    sudahDiubah: boolean
}) {
    const jumlah = kolom.filter((k) => terlihat[k.kunci]).length
    const semua = (nilai: boolean) => onUbah(Object.fromEntries(kolom.map((k) => [k.kunci, nilai])))
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-9 text-muted-foreground hover:text-foreground print:hidden">
                    <Settings2 className="mr-1.5 h-4 w-4" /> Kolom <span className="ml-1.5 text-xs text-muted-foreground">{jumlah}/{kolom.length}</span>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="max-h-[70vh] w-60 overflow-y-auto">
                <DropdownMenuLabel>Tampilkan Kolom</DropdownMenuLabel>
                <DropdownMenuItem onSelect={(e) => { e.preventDefault(); semua(true) }}>Pilih semua</DropdownMenuItem>
                <DropdownMenuItem onSelect={(e) => { e.preventDefault(); onAturUlang() }} disabled={!sudahDiubah}>
                    <RotateCcw className="h-4 w-4" /> Kembalikan bawaan
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {kolom.map((k) => (
                    <DropdownMenuCheckboxItem key={k.kunci} checked={!!terlihat[k.kunci]} onSelect={(e) => e.preventDefault()}
                        onCheckedChange={(v) => onUbah({ ...terlihat, [k.kunci]: v })}>
                        {k.label}
                    </DropdownMenuCheckboxItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
