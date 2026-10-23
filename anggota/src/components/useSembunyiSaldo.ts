"use client"

import { useEffect, useState } from "react"

const KUNCI = "kopkar-sembunyi-saldo"

/** Pilihan sembunyikan nominal (mis. HP dilihat orang lain), diingat di perangkat ini dan dipakai bersama semua kartu saldo. */
export function useSembunyiSaldo() {
    const [sembunyi, setSembunyi] = useState(false)
    useEffect(() => {
        try { setSembunyi(localStorage.getItem(KUNCI) === "1") } catch { /* penyimpanan diblokir: tampilkan */ }
    }, [])
    const ubah = () => {
        setSembunyi(!sembunyi)
        try { localStorage.setItem(KUNCI, sembunyi ? "0" : "1") } catch { /* abaikan */ }
    }
    return { sembunyi, ubah, tampil: (v: string) => (sembunyi ? "Rp ••••••" : v) }
}
