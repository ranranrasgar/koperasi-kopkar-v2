"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { FilePen, HandCoins, House, PiggyBank, UserRound, type LucideIcon } from "lucide-react"

const MENU: { href: string; label: string; ikon: LucideIcon }[] = [
    { href: "/beranda", label: "Beranda", ikon: House },
    { href: "/simpanan", label: "Simpanan", ikon: PiggyBank },
    { href: "/pinjaman", label: "Pinjaman", ikon: HandCoins },
    { href: "/ajukan", label: "Ajukan", ikon: FilePen },
    { href: "/akun", label: "Akun", ikon: UserRound },
]

/** Navigasi bawah, tetap di tempat; menyisakan ruang aman iPhone (home indicator). */
export function Navigasi() {
    const path = usePathname()
    return (
        <nav aria-label="Menu utama"
            className="fixed inset-x-0 bottom-0 z-20 border-t border-garis bg-permukaan/95 backdrop-blur pb-[env(safe-area-inset-bottom)]">
            <ul className="mx-auto grid max-w-md grid-cols-5">
                {MENU.map(({ href, label, ikon: Ikon }) => {
                    const aktif = path === href || path.startsWith(href + "/")
                    return (
                        <li key={href}>
                            <Link href={href} aria-current={aktif ? "page" : undefined}
                                className={`flex h-16 flex-col items-center justify-center gap-1 text-[0.6875rem] font-medium transition-colors
                                    ${aktif ? "text-utama" : "text-redup hover:text-teks"}`}>
                                <Ikon size={22} strokeWidth={aktif ? 2.1 : 1.75} />
                                {label}
                            </Link>
                        </li>
                    )
                })}
            </ul>
        </nav>
    )
}
