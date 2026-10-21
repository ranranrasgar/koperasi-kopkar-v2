// Uang dihitung dalam satuan 1/10000 (bigint) agar tidak ada pembulatan float; kolom DB numeric(20,4).
export const toUnits = (v: string | number): bigint => {
    const [i, f = ''] = String(v).split('.');
    const neg = i.startsWith('-');
    const n = BigInt(i.replace('-', '') || '0') * 10000n + BigInt((f + '0000').slice(0, 4));
    return neg ? -n : n;
};
export const fromUnits = (n: bigint): string => {
    const neg = n < 0n;
    const a = neg ? -n : n;
    return `${neg ? '-' : ''}${a / 10000n}.${String(a % 10000n).padStart(4, '0')}`;
};
