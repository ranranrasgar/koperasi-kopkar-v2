// Perhitungan pinjaman tunai tanpa akses database, supaya bisa diuji paritas terhadap data produksi.
// Semua uang dalam satuan 1/10000 (bigint), lihat money.ts.

export interface Terms {
    pokok: bigint;          // pokok bersih
    persenBunga: bigint;    // persen x 1_000_000 (1.5% = 1_500_000)
    perAngsuran: boolean;   // true: bunga dikali lama; false: bunga sekali
    lama: number;           // jumlah angsuran
    persenAdm: bigint;      // persen x 1_000_000
    persenProvisi: bigint;
}

export const ONE = 10000n;

/** Bagi dengan pembulatan setengah ke atas (nilai non-negatif). */
const divRound = (a: bigint, b: bigint) => (a * 2n + b) / (b * 2n);

/** Bulatkan ke kelipatan 10^(4-dp) satuan, yaitu dp angka di belakang koma. */
export const roundDp = (n: bigint, dp: number): bigint => {
    const step = 10n ** BigInt(4 - dp);
    return divRound(n, step) * step;
};

export const persenToMicro = (p: string | number): bigint => {
    const [i, f = ''] = String(p).split('.');
    return BigInt(i) * 1_000_000n + BigInt((f + '000000').slice(0, 6));
};

const pctOf = (amount: bigint, micro: bigint) => divRound(amount * micro, 100n * 1_000_000n);

export const jasaTotal = (t: Terms): bigint => pctOf(t.pokok, t.persenBunga) * (t.perAngsuran ? BigInt(t.lama) : 1n);
export const rpAdm = (t: Terms): bigint => roundDp(pctOf(t.pokok, t.persenAdm), 0);
export const rpProvisi = (t: Terms): bigint => roundDp(pctOf(t.pokok, t.persenProvisi), 0);

export interface Cicilan {
    ke: number;
    pokok: bigint;
    jasa: bigint;
    adm: bigint;
    provisi: bigint;
}

/**
 * Angsuran ke-`ke` (1..lama). Angsuran biasa memakai pecahan 4 angka desimal; angsuran terakhir
 * mengambil sisa persis sehingga saldo pokok dan jasa pas nol.
 * Adm dan provisi hanya ditagih pada angsuran pertama (aturan desktop: JML_CICILAN = 0).
 */
export function cicilan(t: Terms, ke: number): Cicilan {
    if (ke < 1 || ke > t.lama) throw new Error(`Angsuran ke-${ke} di luar 1..${t.lama}`);
    const n = BigInt(t.lama), jasa = jasaTotal(t);
    const pokok = ke === t.lama ? t.pokok - divRound(t.pokok, n) * (n - 1n) : divRound(t.pokok, n);
    const jasaK = ke === t.lama ? jasa - divRound(jasa, n) * (n - 1n) : divRound(jasa, n);
    return { ke, pokok, jasa: jasaK, adm: ke === 1 ? rpAdm(t) : 0n, provisi: ke === 1 ? rpProvisi(t) : 0n };
}

/** Baris jadwal (tabel tagih): pokok dan jasa dibulatkan ke rupiah penuh seperti desktop. */
export function jadwal(t: Terms): Cicilan[] {
    const n = BigInt(t.lama);
    const pk = roundDp(divRound(t.pokok, n), 0), js = roundDp(divRound(jasaTotal(t), n), 0);
    return Array.from({ length: t.lama }, (_, i) => ({
        ke: i + 1, pokok: pk, jasa: js,
        adm: i === 0 ? rpAdm(t) : 0n, provisi: i === 0 ? rpProvisi(t) : 0n,
    }));
}

/** Tanggal jatuh tempo angsuran ke-`ke`: bulan berikutnya dari tanggal pinjaman, hari = jatuhTempo (maks 28). */
export function jatuhTempo(tglPinjaman: string, hari: number, ke: number): string {
    const y = Number(tglPinjaman.slice(0, 4)), m = Number(tglPinjaman.slice(5, 7)) - 1 + ke;
    const yy = y + Math.floor(m / 12), mm = (m % 12) + 1;
    return `${yy}-${String(mm).padStart(2, '0')}-${String(Math.min(hari, 28)).padStart(2, '0')}`;
}
