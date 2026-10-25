"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { ChevronDown, ChevronsDownUp, ChevronsUpDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { ThemeToggle } from "./ThemeToggle"
import { getMenuGroups } from "@/config/menu"
import { useSidebar } from "./SidebarContext"
import { logoutAction } from "@/app/actions/auth"

const KUNCI_TUTUP = "kopkar.menu.tertutup"

interface SidebarProps {
    className?: string
    onClose?: () => void
}

export function Sidebar({ className, onClose }: SidebarProps) {
    const pathname = usePathname()
    const { izin, koperasi, lencana } = useSidebar()

    const menuGroups = useMemo(() => {
        return getMenuGroups(pathname || "", izin)
    }, [pathname, izin])

    // Grup yang dikerutkan (diingat per perangkat). Awalnya semua terbuka supaya sama dengan hasil render server.
    const [tertutup, setTertutup] = useState<string[]>([])
    useEffect(() => {
        try {
            const v = JSON.parse(localStorage.getItem(KUNCI_TUTUP) ?? "[]")
            if (Array.isArray(v)) setTertutup(v.filter((x) => typeof x === "string"))
        } catch { /* penyimpanan tidak tersedia: tetap terbuka semua */ }
    }, [])
    const simpan = (daftar: string[]) => {
        setTertutup(daftar)
        try { localStorage.setItem(KUNCI_TUTUP, JSON.stringify(daftar)) } catch { /* abaikan */ }
    }
    const bisaDikerutkan = menuGroups.filter((g) => g.groupLabel !== "Main").map((g) => g.groupLabel)
    const aktifDi = menuGroups.find((g) => g.items.some((i) => i.active))?.groupLabel
    // Berpindah halaman membuka grup halaman itu, supaya lokasi sekarang selalu terlihat.
    useEffect(() => {
        if (aktifDi) setTertutup((t) => (t.includes(aktifDi) ? t.filter((x) => x !== aktifDi) : t))
    }, [aktifDi, pathname])
    const toggle = (label: string) => simpan(tertutup.includes(label) ? tertutup.filter((x) => x !== label) : [...tertutup, label])

    return (
        <aside className={cn("fixed left-0 top-0 h-screen w-64 bg-background z-50 flex flex-col transition-transform duration-300 md:translate-x-0 border-r border-outline-variant", className)}>
            <div className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto p-4">
                <div className="mb-lg px-sm">
                    <div className="flex items-center gap-2">
                        <img src={koperasi.logo} alt={`Logo ${koperasi.nama}`} className="h-10 w-10 shrink-0 object-contain" />
                        <div className="min-w-0">
                            <h1 className="font-headline-lg text-headline-lg font-black text-on-background dark:text-on-primary-container break-words">
                                {koperasi.nama}
                            </h1>
                            <p className="whitespace-nowrap text-[11px] leading-tight text-on-surface-variant">Management System</p>
                        </div>
                    </div>
                </div>
                
                <div className="flex items-center justify-between px-3 text-[11px] text-on-surface-variant/70">
                    <span className="font-semibold uppercase tracking-wider">Menu</span>
                    <span className="flex items-center gap-0.5">
                        <button type="button" onClick={() => simpan([])} title="Buka semua grup" aria-label="Buka semua grup"
                            className="rounded p-1 hover:bg-muted hover:text-foreground"><ChevronsUpDown className="h-4 w-4" /></button>
                        <button type="button" onClick={() => simpan(bisaDikerutkan)} title="Kerutkan semua grup" aria-label="Kerutkan semua grup"
                            className="rounded p-1 hover:bg-muted hover:text-foreground"><ChevronsDownUp className="h-4 w-4" /></button>
                    </span>
                </div>
                <nav className="flex flex-col gap-1">
                    {menuGroups.map((group) => {
                        const isMain = group.groupLabel === "Main"
                        const tutup = !isMain && tertutup.includes(group.groupLabel)
                        const jumlahLencana = group.items.reduce((t, i) => t + (lencana[i.href] ?? 0), 0)
                        return (
                            <div key={group.groupLabel} className={isMain ? "mb-2" : "mb-2"}>
                                {!isMain && (
                                    <button type="button" onClick={() => toggle(group.groupLabel)} aria-expanded={!tutup}
                                        className="mt-2 mb-1 flex w-full items-center gap-1 rounded px-3 py-1 text-left text-xs font-bold uppercase tracking-wider text-on-surface-variant/60 hover:bg-muted/50 hover:text-on-surface-variant">
                                        <span className="flex-1">{group.groupLabel}</span>
                                        {tutup && jumlahLencana > 0 && (
                                            <span className="rounded-full bg-red-600 px-1.5 py-0.5 text-[10px] font-bold leading-none text-white normal-case">{jumlahLencana > 99 ? "99+" : jumlahLencana}</span>
                                        )}
                                        <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", tutup && "-rotate-90")} />
                                    </button>
                                )}
                                <div className={cn("flex flex-col gap-1", tutup && "hidden")}>
                                    {group.items.map((item) => {
                                        if (item.locked) {
                                            return (
                                                <span
                                                    key={item.href}
                                                    title="Belum tersedia di versi web baru"
                                                    className="font-label-md text-label-md px-3 py-2 flex items-center gap-2 rounded-md text-muted-foreground/40 cursor-not-allowed"
                                                >
                                                    <span className="material-symbols-outlined text-[1rem]">{item.icon}</span>
                                                    {item.label}
                                                    <span className="ml-auto text-[9px] uppercase tracking-wider">segera</span>
                                                </span>
                                            )
                                        }
                                        return (
                                            <Link
                                                key={item.href}
                                                href={item.href}
                                                onClick={onClose}
                                                className={cn(
                                                    "font-label-md text-label-md px-3 py-2 flex items-center gap-2 transition-colors rounded-md",
                                                    item.active
                                                        ? "bg-muted font-bold text-foreground"
                                                        : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                                                )}
                                            >
                                                <span className="material-symbols-outlined text-[1rem]">{item.icon}</span>
                                                {item.label}
                                                {(lencana[item.href] ?? 0) > 0 && (
                                                    <span aria-label={`${lencana[item.href]} belum dibaca`}
                                                        className="ml-auto rounded-full bg-red-600 px-1.5 py-0.5 text-[10px] font-bold leading-none text-white">
                                                        {lencana[item.href] > 99 ? "99+" : lencana[item.href]}
                                                    </span>
                                                )}
                                            </Link>
                                        )
                                    })}
                                </div>
                            </div>
                        )
                    })}
                </nav>
            </div>

            {/* Footer tetap di bawah (tidak ikut bergulir): keluar dan mode tampilan satu baris */}
            <div className="flex shrink-0 items-center gap-1 border-t border-outline-variant p-3">
                <form action={logoutAction} className="min-w-0 flex-1">
                    <button type="submit"
                        className="flex w-full items-center gap-2 rounded-md px-3 py-2 font-label-md text-error transition-colors hover:bg-error/10">
                        <span className="material-symbols-outlined text-[1rem]">logout</span>
                        <span>Logout</span>
                    </button>
                </form>
                <ThemeToggle />
            </div>
        </aside>
    )
}
