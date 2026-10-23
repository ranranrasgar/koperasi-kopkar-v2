"use client"

import { aktifkanPushAction, matikanPushAction } from "@/app/actions/push"

// Pembantu Web Push di browser: izin, langganan perangkat, dan sinkron ke server. Dipakai NotifikasiOtomatis,
// kartu izin di halaman Notifikasi, dan tombol Keluar.

const KUNCI_SINKRON = "kopkar-push-sinkron"

export const mendukungPush = () =>
    typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window

function kunciKeBytes(b64: string) {
    const pad = "=".repeat((4 - (b64.length % 4)) % 4)
    const bin = atob((b64 + pad).replace(/-/g, "+").replace(/_/g, "/"))
    return Uint8Array.from(bin, (c) => c.charCodeAt(0))
}

/**
 * Pastikan perangkat ini punya langganan push dan tercatat untuk akun yang login. Sekali per sesi tab (sinkron ulang
 * setelah keluar/masuk akun lain, karena Keluar menghapus penanda). Izin notifikasi harus sudah diberikan.
 */
export async function daftarkanPerangkat(kunciPublik: string, paksa = false) {
    if (!paksa && sessionStorage.getItem(KUNCI_SINKRON)) return true
    const reg = await navigator.serviceWorker.ready
    const sub = (await reg.pushManager.getSubscription())
        ?? await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: kunciKeBytes(kunciPublik) })
    const h = await aktifkanPushAction(sub.toJSON())
    if (h.ok) sessionStorage.setItem(KUNCI_SINKRON, "1")
    return h.ok
}

/** Lepas perangkat ini dari akun (saat Keluar), supaya pengguna berikutnya di HP yang sama tidak menerima notifikasi akun lama. */
export async function lepasPerangkat() {
    sessionStorage.removeItem(KUNCI_SINKRON)
    if (!mendukungPush()) return
    const reg = await navigator.serviceWorker.getRegistration()
    const sub = await reg?.pushManager.getSubscription()
    if (sub) {
        await matikanPushAction(sub.endpoint)
        await sub.unsubscribe()
    }
}
