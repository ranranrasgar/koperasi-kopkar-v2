"use client"

import { useState, useEffect } from "react"
import { createPortal } from "react-dom"
import { usePathname } from "next/navigation"
import { useSidebar } from "./SidebarContext"
import { Sidebar } from "./Sidebar"
import { getMenuGroups } from "@/config/menu"
import Link from "next/link"
import { logoutAction } from "@/app/actions/auth"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger
} from "@/components/ui/dropdown-menu"
import type { OperatorTampil } from "./DashboardShell"
import { Lonceng } from "./Lonceng"

export function Navbar({ operator }: { operator: OperatorTampil }) {
    const pathname = usePathname()
    const { toggle, izin } = useSidebar()
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
    const [isMounted, setIsMounted] = useState(false)

    useEffect(() => {
        setIsMounted(true)
    }, [])
    // Laci menu HP: tutup saat pindah halaman atau Esc, dan halaman di belakangnya tidak ikut bergulir selama terbuka.
    useEffect(() => { setIsMobileMenuOpen(false) }, [pathname])
    useEffect(() => {
        if (!isMobileMenuOpen) return
        const tutup = (e: KeyboardEvent) => { if (e.key === "Escape") setIsMobileMenuOpen(false) }
        const awal = document.body.style.overflow
        document.body.style.overflow = "hidden"
        window.addEventListener("keydown", tutup)
        return () => { document.body.style.overflow = awal; window.removeEventListener("keydown", tutup) }
    }, [isMobileMenuOpen])

    const menuGroups = getMenuGroups(pathname || "", izin)
    const activeItem = menuGroups.flatMap(g => g.items).find(item => item.active)

    return (
        <header className="h-16 px-4 md:px-6 flex items-center justify-between border-b border-outline-variant bg-surface/80 backdrop-blur-md sticky top-0 z-30">
            <div className="flex items-center gap-4">
                {/* Mobile Menu Toggle */}
                {isMounted && (
                    <button
                        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                        aria-label="Buka menu" aria-expanded={isMobileMenuOpen}
                        className="md:hidden text-on-surface hover:bg-surface-variant p-2 rounded-md transition-colors"
                    >
                        <span className="material-symbols-outlined text-[1.5rem]">menu</span>
                    </button>
                )}

                {/* Desktop Menu Toggle */}
                <button 
                    onClick={toggle} 
                    className="hidden md:block text-on-surface hover:bg-surface-variant p-2 rounded-md transition-colors"
                >
                    <span className="material-symbols-outlined text-[1.5rem]">menu</span>
                </button>

                <h2 className="min-w-0 truncate font-headline-md text-base md:text-headline-md font-semibold text-on-surface flex items-center gap-2">
                    {activeItem ? activeItem.label : "Dashboard"}
                </h2>
            </div>

            {/* Right Profile Controls */}
            <div className="flex items-center gap-3">
                <Lonceng />
                {/* Bantuan: buka panduan yang terkait dengan halaman ini (atau Pusat Panduan bila belum ada). */}
                {!pathname.startsWith("/dashboard/panduan") && (
                    <Link href={`/dashboard/panduan?untuk=${encodeURIComponent(pathname)}`} title="Panduan halaman ini" aria-label="Panduan halaman ini"
                        className="flex h-9 w-9 items-center justify-center rounded-full text-on-surface-variant hover:bg-surface-variant hover:text-on-surface transition-colors print:hidden">
                        <span className="material-symbols-outlined text-[1.35rem]">help</span>
                    </Link>
                )}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <button className="flex items-center gap-2 px-3 py-1.5 rounded-full hover:bg-surface-variant transition-all outline-none">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-container text-on-primary-container font-bold">
                                {operator.namaLengkap.charAt(0).toUpperCase()}
                            </div>
                            <div className="hidden lg:flex flex-col items-start leading-none pr-1">
                                <span className="text-xs font-bold text-on-surface">{operator.namaLengkap}</span>
                                <span className="text-[9px] uppercase tracking-wider text-on-surface-variant mt-0.5">{operator.grup ?? operator.nama}</span>
                            </div>
                            <span className="material-symbols-outlined text-[1.2rem] text-on-surface-variant">expand_more</span>
                        </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuLabel className="text-xs">Login sebagai {operator.nama}</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem asChild>
                            <Link href="/ganti-password">Ganti Password</Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive" onSelect={() => logoutAction()}>
                            Keluar
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>

            {/* Laci menu HP. Lewat portal ke body: header memakai backdrop-blur, yang membuat elemen fixed di dalamnya
                terkurung di area header (tidak bisa menutupi layar penuh). */}
            {isMounted && isMobileMenuOpen && createPortal(
                <div className="fixed inset-0 z-[60] flex md:hidden" role="dialog" aria-modal="true" aria-label="Menu">
                    <div className="absolute inset-0 bg-black/50 animate-in fade-in duration-200" onClick={() => setIsMobileMenuOpen(false)} />
                    <div className="relative h-[100dvh] w-[85vw] max-w-[20rem] shadow-2xl animate-in slide-in-from-left duration-200">
                        <Sidebar className="relative h-full w-full border-r-0 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]" onClose={() => setIsMobileMenuOpen(false)} />
                        <button type="button" onClick={() => setIsMobileMenuOpen(false)} aria-label="Tutup menu"
                            className="absolute right-2 top-[calc(env(safe-area-inset-top)+0.75rem)] z-10 grid h-9 w-9 place-items-center rounded-full ikon-sidebar">
                            <span className="material-symbols-outlined text-[1.25rem]">close</span>
                        </button>
                    </div>
                </div>,
                document.body,
            )}
        </header>
    )
}
