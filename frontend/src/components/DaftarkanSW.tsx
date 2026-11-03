"use client"

import { useEffect } from "react"

/**
 * Daftarkan service worker admin (public/sw.js) di setiap kunjungan, supaya aplikasi bisa dipasang sebagai PWA dan Web Push
 * siap dipakai. Pendaftaran yang sama juga dilakukan saat mengaktifkan notifikasi (AktifkanNotifikasiAdmin); mendaftar ulang aman.
 */
export function DaftarkanSW() {
    useEffect(() => {
        if (!("serviceWorker" in navigator)) return
        navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" }).catch((e) => console.warn("service worker gagal didaftarkan:", e))
    }, [])
    return null
}
