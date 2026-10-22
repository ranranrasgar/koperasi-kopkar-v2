"use client"

import { useMemo } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { ThemeToggle } from "./ThemeToggle"
import { getMenuGroups } from "@/config/menu"
import { useSidebar } from "./SidebarContext"
import { logoutAction } from "@/app/actions/auth"

interface SidebarProps {
    className?: string
    onClose?: () => void
}

export function Sidebar({ className, onClose }: SidebarProps) {
    const pathname = usePathname()
    const { izin, koperasi } = useSidebar()

    const menuGroups = useMemo(() => {
        return getMenuGroups(pathname || "", izin)
    }, [pathname, izin])

    return (
        <aside className={cn("fixed left-0 top-0 h-screen w-64 bg-background z-50 flex flex-col justify-between overflow-y-auto transition-transform duration-300 md:translate-x-0 border-r border-outline-variant", className)}>
            <div className="flex flex-col gap-1 p-4">
                <div className="mb-lg px-sm">
                    <div className="flex items-center gap-2">
                        <img src={koperasi.logo} alt={`Logo ${koperasi.nama}`} className="h-10 w-10 shrink-0 object-contain" />
                        <div className="min-w-0">
                            <h1 className="font-headline-lg text-headline-lg font-black text-on-background dark:text-on-primary-container break-words">
                                {koperasi.nama}
                            </h1>
                            <p className="font-label-md text-label-md text-on-surface-variant">Management System</p>
                        </div>
                    </div>
                </div>
                
                <nav className="flex flex-col gap-1">
                    {menuGroups.map((group) => {
                        const isMain = group.groupLabel === "Main"
                        return (
                            <div key={group.groupLabel} className={isMain ? "mb-2" : "mb-2"}>
                                {!isMain && (
                                    <div className="px-3 py-1 text-xs font-bold uppercase tracking-wider text-on-surface-variant/50 mt-2 mb-1">
                                        {group.groupLabel}
                                    </div>
                                )}
                                <div className="flex flex-col gap-1">
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
                                            </Link>
                                        )
                                    })}
                                </div>
                            </div>
                        )
                    })}
                </nav>
            </div>

            {/* Footer / Theme Toggle */}
            <div className="p-4 border-t border-outline-variant space-y-2">
                <div className="flex items-center justify-between px-3 py-1">
                    <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-on-surface-variant/50">
                        Tampilan
                    </span>
                    <div className="flex items-center gap-1">
                        <ThemeToggle />
                    </div>
                </div>
                <form action={logoutAction}>
                    <button
                        type="submit"
                        className="flex w-full items-center gap-2 rounded-md px-3 py-1.5 font-label-md text-error hover:bg-error/10 transition-colors"
                    >
                        <span className="material-symbols-outlined text-[1rem]">logout</span>
                        <span>Logout</span>
                    </button>
                </form>
            </div>
        </aside>
    )
}
