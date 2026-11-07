"use client"

import { useEffect, useState } from "react"

const KUNCI = "kopkar-sembunyi-saldo"

/** Nominal tersembunyi secara bawaan (mis. HP dilihat orang lain) sampai anggota membukanya; pilihan diingat di perangkat ini dan dipakai semua kartu saldo. */
export function useSembunyiSaldo() {
    const [sembunyi, setSembunyi] = useState(true)
    useEffect(() => {
        try { setSembunyi(localStorage.getItem(KUNCI) !== "0") } catch { /* penyimpanan diblokir: tetap tersembunyi */ }
    }, [])
    const ubah = () => {
        setSembunyi(!sembunyi)
        try { localStorage.setItem(KUNCI, sembunyi ? "0" : "1") } catch { /* abaikan */ }
    }
    return { sembunyi, ubah, tampil: (v: string) => (sembunyi ? "Rp ••••••" : v) }
}
