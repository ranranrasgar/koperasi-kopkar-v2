import { unstable_isUnrecognizedActionError } from "next/navigation"

const KUNCI = "kopkar-muat-ulang-versi"

/**
 * Untuk `.catch()` pada server action yang dipanggil berkala (lonceng, header, percakapan). Setelah aplikasi diperbarui,
 * tab yang masih memuat versi lama memanggil ID aksi yang sudah tidak ada ("Failed to find Server Action" di log server,
 * berulang tiap putaran). Halaman dimuat ulang supaya kode klien ikut baru; paling sering sekali per menit.
 * Galat lain (mis. koneksi putus sebentar) diabaikan dan hasilnya null.
 */
export function tanganiVersiLama(e: unknown): null {
    if (!unstable_isUnrecognizedActionError(e)) return null
    try {
        if (Date.now() - Number(sessionStorage.getItem(KUNCI) ?? 0) < 60_000) return null
        sessionStorage.setItem(KUNCI, String(Date.now()))
    } catch { /* sessionStorage tidak tersedia: tetap muat ulang */ }
    location.reload()
    return null
}
