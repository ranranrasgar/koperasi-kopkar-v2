"use client"

import { useCallback, useEffect, useMemo, useState } from "react"

// Pilihan kolom tabel yang disimpan per halaman di browser (localStorage), supaya saat tabel dibuka lagi kolomnya tetap sesuai
// pengaturan terakhir. Kolom baru (belum ada di simpanan) memakai nilai bawaan; kolom yang sudah tidak ada diabaikan.

const AWALAN = "kopkar.kolom:"

/**
 * @param halaman  pengenal halaman (biasanya pathname)
 * @param bawaan   kunci kolom -> tampil atau tidak, bila belum pernah diatur
 */
export function useKolomTersimpan(halaman: string, bawaan: Record<string, boolean>) {
    const kunciSimpan = AWALAN + halaman
    const bawaanJson = JSON.stringify(bawaan)
    const dasar = useMemo(() => JSON.parse(bawaanJson) as Record<string, boolean>, [bawaanJson])
    const [terlihat, setTerlihat] = useState<Record<string, boolean>>(dasar)

    // Dibaca setelah tampil pertama (bukan saat render server) supaya HTML server dan klien sama.
    useEffect(() => {
        try {
            const simpan = localStorage.getItem(kunciSimpan)
            const t = simpan ? (JSON.parse(simpan) as Record<string, unknown>) : {}
            setTerlihat(Object.fromEntries(Object.keys(dasar).map((k) => [k, typeof t[k] === "boolean" ? (t[k] as boolean) : dasar[k]])))
        } catch {
            setTerlihat(dasar)
        }
    }, [kunciSimpan, dasar])

    const ubah = useCallback((berikut: Record<string, boolean>) => {
        setTerlihat(berikut)
        try { localStorage.setItem(kunciSimpan, JSON.stringify(berikut)) } catch { /* penyimpanan tidak tersedia: berlaku untuk sesi ini saja */ }
    }, [kunciSimpan])

    const aturUlang = useCallback(() => {
        setTerlihat(dasar)
        try { localStorage.removeItem(kunciSimpan) } catch { /* abaikan */ }
    }, [kunciSimpan, dasar])

    const sudahDiubah = useMemo(() => Object.keys(dasar).some((k) => terlihat[k] !== dasar[k]), [terlihat, dasar])
    return { terlihat, ubah, aturUlang, sudahDiubah }
}
