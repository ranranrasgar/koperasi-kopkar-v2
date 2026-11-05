const SATUAN = ["", "satu", "dua", "tiga", "empat", "lima", "enam", "tujuh", "delapan", "sembilan", "sepuluh", "sebelas"]

function kata(n: number): string {
    if (n < 12) return SATUAN[n]
    if (n < 20) return `${SATUAN[n - 10]} belas`
    if (n < 100) return `${SATUAN[Math.floor(n / 10)]} puluh ${SATUAN[n % 10]}`.trim()
    if (n < 200) return `seratus ${kata(n - 100)}`.trim()
    if (n < 1000) return `${SATUAN[Math.floor(n / 100)]} ratus ${kata(n % 100)}`.trim()
    if (n < 2000) return `seribu ${kata(n - 1000)}`.trim()
    if (n < 1e6) return `${kata(Math.floor(n / 1000))} ribu ${kata(n % 1000)}`.trim()
    if (n < 1e9) return `${kata(Math.floor(n / 1e6))} juta ${kata(n % 1e6)}`.trim()
    if (n < 1e12) return `${kata(Math.floor(n / 1e9))} miliar ${kata(n % 1e9)}`.trim()
    return `${kata(Math.floor(n / 1e12))} triliun ${kata(n % 1e12)}`.trim()
}

/** Nominal rupiah dalam huruf, dibulatkan ke rupiah penuh: 1250000 menjadi "Satu juta dua ratus lima puluh ribu rupiah". */
export function terbilang(nilai: number) {
    const n = Math.round(Math.abs(nilai))
    const teks = n === 0 ? "nol" : kata(n)
    return `${teks.charAt(0).toUpperCase()}${teks.slice(1)} rupiah`
}
