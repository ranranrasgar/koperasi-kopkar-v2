"use client"

import React, { createContext, useContext, useState } from "react"
import { bolehAksi, type AksiIzin } from "@/config/akses"

interface SidebarContextType {
    isOpen: boolean
    toggle: () => void
    close: () => void
    open: () => void
    /** Menu desktop yang berizin untuk grup operator (opr_hak_akses). */
    izin: string[]
    /** "menu|aksi" yang dimatikan untuk grup operator. */
    aksiTolak: string[]
    /** Nama dan URL logo dari Pengaturan Perusahaan. */
    koperasi: KoperasiTampil
    /** Angka penanda di samping menu (mis. pesan anggota belum dibalas), per alamat menu. */
    lencana: Record<string, number>
}

export interface KoperasiTampil { nama: string; logo: string }

const SidebarContext = createContext<SidebarContextType | undefined>(undefined)

export function SidebarProvider({ children, izin, aksiTolak, koperasi, lencana }: { children: React.ReactNode; izin: string[]; aksiTolak: string[]; koperasi: KoperasiTampil; lencana: Record<string, number> }) {
    const [isOpen, setIsOpen] = useState(true)

    const toggle = () => setIsOpen(prev => !prev)
    const close = () => setIsOpen(false)
    const open = () => setIsOpen(true)

    return (
        <SidebarContext.Provider value={{ isOpen, toggle, close, open, izin, aksiTolak, koperasi, lencana }}>
            {children}
        </SidebarContext.Provider>
    )
}

/** Untuk menyembunyikan tombol di komponen klien; penegakan sebenarnya tetap di server action (wajibAksi). */
export function useBolehAksi() {
    const { izin, aksiTolak } = useSidebar()
    return (menu: readonly string[], aksi: AksiIzin) => bolehAksi(izin, aksiTolak, menu, aksi)
}

export function useSidebar() {
    const context = useContext(SidebarContext)
    if (!context) throw new Error("useSidebar must be used within SidebarProvider")
    return context
}
