const rupiah = new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0, maximumFractionDigits: 0 })
const angka = new Intl.NumberFormat("id-ID", { minimumFractionDigits: 0, maximumFractionDigits: 0 })
const angka2 = new Intl.NumberFormat("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export const formatRupiah = (v: number | null | undefined) => rupiah.format(v ?? 0)
export const formatAngka = (v: number | null | undefined) => angka.format(Math.round(v ?? 0))
export const formatAngka2 = (v: number | null | undefined) => angka2.format(v ?? 0)

// Tanggal dari database berupa teks 'YYYY-MM-DD'; diurai sebagai tanggal lokal supaya tidak bergeser hari.
export function formatTanggal(v: string | null | undefined, month: "long" | "short" | "2-digit" = "short") {
    if (!v) return "-"
    const [y, m, d] = v.slice(0, 10).split("-").map(Number)
    if (!y || !m || !d) return v
    return new Date(y, m - 1, d).toLocaleDateString("id-ID", { day: "2-digit", month, year: "numeric" })
}

/** Hari ini sebagai 'YYYY-MM-DD' menurut jam lokal server/browser. */
export function hariIni() {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}
