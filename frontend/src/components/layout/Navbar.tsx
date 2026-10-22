"use client"

import { useState, useEffect } from "react"
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

export function Navbar({ operator }: { operator: OperatorTampil }) {
    const pathname = usePathname()
    const { toggle } = useSidebar()
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
    const [isMounted, setIsMounted] = useState(false)

    useEffect(() => {
        setIsMounted(true)
    }, [])

    const menuGroups = getMenuGroups(pathname || "")
    const activeItem = menuGroups.flatMap(g => g.items).find(item => item.active)

    return (
        <header className="h-16 px-4 md:px-6 flex items-center justify-between border-b border-outline-variant bg-surface/80 backdrop-blur-md sticky top-0 z-30">
            <div className="flex items-center gap-4">
                {/* Mobile Menu Toggle */}
                {isMounted && (
                    <button 
                        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} 
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

                <h2 className="font-headline-md text-headline-md font-semibold text-on-surface hidden md:flex items-center gap-2">
                    {activeItem ? activeItem.label : "Dashboard"}
                </h2>
            </div>

            {/* Right Profile Controls */}
            <div className="flex items-center gap-3">
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

            {/* Mobile Drawer (Simulation) */}
            {isMobileMenuOpen && (
                <div className="fixed inset-0 z-50 md:hidden flex">
                    <div className="fixed inset-0 bg-black/50" onClick={() => setIsMobileMenuOpen(false)}></div>
                    <div className="relative z-50 w-64 h-full bg-background shadow-xl">
                        <Sidebar onClose={() => setIsMobileMenuOpen(false)} />
                    </div>
                </div>
            )}
        </header>
    )
}
