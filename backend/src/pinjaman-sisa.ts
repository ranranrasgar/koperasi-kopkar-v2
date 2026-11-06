// Sisa pokok tampilan pinjaman tunai, rumus aplikasi desktop dan API Android lama: plafond dikurangi (plafond / lama x jumlah cicilan).
// Buku pinjaman (pinjaman_tunai_rincian) bisa membagi uang yang sama secara berbeda, mis. BRI: pokok 3.301.200 + jasa 661.656 padahal jadwal
// 3.951.200 + 11.656, jadi saldo buku lebih besar daripada kewajiban anggota. Jurnal dan audit tetap memakai angka buku.

const plafond = (p: string) => `(${p}.rp_pinjaman_pokok - ${p}.rp_uang_muka)`;

export const sqlBayarPokokJadwal = (p = 'p') =>
    `ROUND(${plafond(p)} * LEAST(${p}.jml_cicilan, ${p}.lama_angsuran)::numeric / NULLIF(${p}.lama_angsuran, 0))`;

export const sqlSisaPokokJadwal = (p = 'p') => `GREATEST(ROUND(${plafond(p)}) - COALESCE(${sqlBayarPokokJadwal(p)}, 0), 0)`;
