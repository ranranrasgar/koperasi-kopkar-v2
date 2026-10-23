"use client"

import { useEffect } from "react"
import { daftarkanPerangkat, mendukungPush } from "@/lib/push-klien"

const KUNCI_DITANYA = "kopkar-izin-notif-ditanya"
const JEDA_TANYA_MS = 7 * 24 * 60 * 60 * 1000 // izin yang diabaikan ditanya lagi paling cepat seminggu kemudian

/**
 * Notifikasi tanpa tombol aktif/nonaktif. Izin sudah ada: perangkat didaftarkan otomatis tiap sesi. Izin belum ditanya:
 * diminta sekali pada ketukan pertama setelah aplikasi dibuka (browser menolak permintaan tanpa tindakan pengguna, dan
 * iPhone hanya mendukungnya bila aplikasi dipasang ke layar utama). Diblokir: tidak melakukan apa-apa.
 */
export function NotifikasiOtomatis({ kunciPublik }: { kunciPublik: string | null }) {
    useEffect(() => {
        if (!kunciPublik || !mendukungPush()) return
        if (Notification.permission === "granted") {
            daftarkanPerangkat(kunciPublik).catch(() => undefined)
            return
        }
        if (Notification.permission !== "default") return
        try {
            if (Date.now() - Number(localStorage.getItem(KUNCI_DITANYA) ?? 0) < JEDA_TANYA_MS) return
        } catch { /* penyimpanan diblokir: tetap tanya */ }

        const minta = async () => {
            try { localStorage.setItem(KUNCI_DITANYA, String(Date.now())) } catch { /* abaikan */ }
            try {
                if ((await Notification.requestPermission()) === "granted") await daftarkanPerangkat(kunciPublik)
            } catch { /* tidak bisa diaktifkan di perangkat ini */ }
        }
        window.addEventListener("pointerdown", minta, { once: true })
        return () => window.removeEventListener("pointerdown", minta)
    }, [kunciPublik])
    return null
}
