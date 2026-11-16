// Sisa pokok tampilan pinjaman tunai, rumus aplikasi desktop dan API Android lama: plafond dikurangi (plafond / lama x jumlah cicilan).
// Buku pinjaman (pinjaman_tunai_rincian) bisa membagi uang yang sama secara berbeda, mis. BRI: pokok 3.301.200 + jasa 661.656 padahal jadwal
// 3.951.200 + 11.656, jadi saldo buku lebih besar daripada kewajiban anggota. Jurnal dan audit tetap memakai angka buku.

const plafond = (p: string) => `(${p}.rp_pinjaman_pokok - ${p}.rp_uang_muka)`;

export const sqlBayarPokokJadwal = (p = 'p') =>
    `ROUND(${plafond(p)} * LEAST(${p}.jml_cicilan, ${p}.lama_angsuran)::numeric / NULLIF(${p}.lama_angsuran, 0))`;

export const sqlSisaPokokJadwal = (p = 'p') => `GREATEST(ROUND(${plafond(p)}) - COALESCE(${sqlBayarPokokJadwal(p)}, 0), 0)`;

// Status lunas pinjaman tunai (keputusan pengguna 16 November 2026).
// - Grup KOPERASI: lunas bila total bayar pokok + total bayar jasa sudah mencapai pokok + jasa kontrak pencairan (sisa tagihan <= SISA_LUNAS).
//   Pokok/jasa per setoran boleh berbeda dari jadwal; jasa yang kurang dibayar tetap tertagih, jadi cicilan penuh saja belum berarti lunas.
//   Jasa kontrak dihitung dari ketentuan pinjaman (rumus Daftar Pinjaman), bukan dari kredit_bunga pencairan: pinjaman desktop lama tidak mengisinya.
// - Grup lain (BANK / PIHAK LAIN): aturan lama, karena operator membagi angsuran bank (BRI) berbeda dari jadwal dan jasanya sering tidak diisi:
//   cicilan penuh ATAU sisa pokok buku <= SISA_LUNAS.
// - Pinjaman yang ditutup lewat Tutup Pinjaman (pinjaman_penutupan aktif) selalu lunas.
export const SISA_LUNAS = 100;

export const sqlJasaKontrak = (p = 'p') =>
    `(${plafond(p)} * ${p}.persen_bunga / 100 * (${p}.lama_angsuran::numeric / NULLIF(${p}.bunga_per, 0)))`;

/**
 * Sisa tagihan kontrak (pokok + jasa) pinjaman tunai menurut buku pinjaman. Pinjaman tanpa rincian: seluruh pokok + jasa.
 * Pencairan yang dibatalkan (SUM kredit_pokok tidak positif) tidak punya jasa kontrak lagi.
 */
export const sqlSisaTagihan = (p = 'p') => `(COALESCE((SELECT SUM(r.kredit_pokok - r.debit_pokok - r.debit_bunga)
            + CASE WHEN SUM(r.kredit_pokok) > 0 THEN COALESCE(${sqlJasaKontrak(p)}, 0) ELSE 0 END
        FROM pinjaman_tunai_rincian r WHERE r.pinjaman_tunai_id = ${p}.id HAVING count(*) > 0), ${plafond(p)} + COALESCE(${sqlJasaKontrak(p)}, 0)))`;

const sqlSisaPokokBuku = (p: string) => `COALESCE((SELECT SUM(r.kredit_pokok - r.debit_pokok) FROM pinjaman_tunai_rincian r
        WHERE r.pinjaman_tunai_id = ${p}.id HAVING count(*) > 0), ${plafond(p)})`;

/**
 * Ekspresi boolean: pinjaman tunai alias `p` masih menerima setoran angsuran (form Setoran Angsuran, Titipan). KOPERASI: belum lunas
 * (termasuk cicilan penuh yang jasanya kurang, untuk pelunasan sisa). Grup lain tetap seperti dulu: cicilan belum penuh.
 */
export const sqlMasihDitagih = (p = 'p') => `(CASE WHEN (SELECT jk.group_pinjaman FROM jenis_kredit jk WHERE jk.id = ${p}.jenis_kredit_id) = 'KOPERASI'
             THEN NOT ${sqlLunasTunai(p)} ELSE ${p}.jml_cicilan < ${p}.lama_angsuran END)`;

/** Ekspresi boolean: pinjaman tunai alias `p` sudah lunas. */
export const sqlLunasTunai = (p = 'p') => `(EXISTS (SELECT 1 FROM pinjaman_penutupan tp WHERE tp.pinjaman_tunai_id = ${p}.id AND tp.dibatalkan_pada IS NULL)
     OR CASE WHEN (SELECT jk.group_pinjaman FROM jenis_kredit jk WHERE jk.id = ${p}.jenis_kredit_id) = 'KOPERASI'
             THEN ${sqlSisaTagihan(p)} <= ${SISA_LUNAS}
             ELSE ${p}.jml_cicilan >= ${p}.lama_angsuran OR ${sqlSisaPokokBuku(p)} <= ${SISA_LUNAS} END)`;
