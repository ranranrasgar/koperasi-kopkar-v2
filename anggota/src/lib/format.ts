// Format angka dan tanggal Indonesia. Tanggal dari database berupa teks 'YYYY-MM-DD' (tanpa zona waktu).

const rp = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 })

/** "Rp 1.234.567"; pecahan dibulatkan ke rupiah. Negatif ditulis "-Rp 1.000". */
export function rupiah(n: number | null | undefined) {
    const v = Math.round(Number(n ?? 0))
    return `${v < 0 ? "-" : ""}Rp ${rp.format(Math.abs(v))}`
}

const BULAN = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"]
const BULAN_PANJANG = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"]

/** "12 Okt 2026" atau "12 Oktober 2026". */
export function tanggal(t: string | null | undefined, panjang = false) {
    if (!t) return "-"
    const [y, m, d] = t.slice(0, 10).split("-").map(Number)
    if (!y || !m || !d) return "-"
    return `${d} ${(panjang ? BULAN_PANJANG : BULAN)[m - 1]} ${y}`
}

/** "Oktober 2026" untuk tanggal hari ini di Jakarta. */
export function bulanIni() {
    const [y, m] = hariIni().split("-").map(Number)
    return `${BULAN_PANJANG[m - 1]} ${y}`
}

/** Tanggal hari ini di Jakarta, 'YYYY-MM-DD'. */
export function hariIni() {
    return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(new Date())
}

/** Nominal ringkas untuk label grafik: "29,27jt", "1,2M", "850rb". */
export function ringkasRupiah(n: number) {
    const v = Math.abs(n)
    const pecah = (x: number) => x.toLocaleString("id-ID", { maximumFractionDigits: 2 })
    const teks = v >= 1e9 ? `${pecah(v / 1e9)}M` : v >= 1e6 ? `${pecah(v / 1e6)}jt` : v >= 1e3 ? `${pecah(v / 1e3)}rb` : String(Math.round(v))
    return `${n < 0 ? "-" : ""}${teks}`
}

/** Selisih hari (b - a) untuk dua tanggal 'YYYY-MM-DD'. */
export function selisihHari(a: string, b: string) {
    return Math.round((Date.parse(`${b.slice(0, 10)}T00:00:00Z`) - Date.parse(`${a.slice(0, 10)}T00:00:00Z`)) / 86400000)
}
