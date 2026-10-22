// Hak akses web memakai opr_hak_akses (per grup, akses 'T') dengan nama menu aplikasi desktop.
// Halaman boleh dibuka bila salah satu menu desktop yang dipetakan berizin; menu yang tidak
// tercatat untuk grup dianggap tidak berizin.

export const MENU = {
    dashboard: "Dashboard",
    daftarAnggota: "Daftar Nama Anggota",
    lapDaftarAnggota: "Lap. Daftar Nama Anggota",
    lapSimpanan: "Lap. Simpanan",
    lapBukuSimpanan: "Lap. Buku Simpanan",
    setoranSimpanan: "Setoran Simpanan",
    pencairanSimpanan: "Pencairan Simpanan",
    lapPinjamanKoperasi: "Lap. Pinjaman Koperasi",
    lapPinjamanBank: "Lap. Pinjaman Bank / Pihak Lain",
    lapPinjamanKpr: "Lap. Pinjaman KPR",
    cairKoperasi: "Pencairan Pinjaman Koperasi",
    cairBank: "Pencairan Pinjaman Bank",
    cairKpr: "Pencairan Pinjaman KPR",
    angsurKoperasi: "Setoran Angsuran Pinjaman Koperasi",
    angsurBank: "Setoran Angsuran Pinjaman Bank",
    angsurKpr: "Setoran Angsuran Pinjaman KPR",
    coa: "Data Perkiraan (COA)",
    jurnalUmum: "Jurnal Umum",
    // Khusus web, tidak ada di desktop: hanya grup superadmin.
    kelolaAkses: "Kelola Akses (web)",
} as const

/** Grup yang lolos semua pemeriksaan izin dan boleh mengelola hak akses serta operator. */
export const GRUP_SUPERADMIN = "superadmin"

/** Menu pencairan dan angsuran pinjaman tunai menurut jenis_kredit.group_pinjaman. */
export const MENU_CAIR_GRUP: Record<string, string> = { "KOPERASI": MENU.cairKoperasi, "BANK / PIHAK LAIN": MENU.cairBank }
export const MENU_ANGSUR_GRUP: Record<string, string> = { "KOPERASI": MENU.angsurKoperasi, "BANK / PIHAK LAIN": MENU.angsurBank }

/** Halaman web -> menu desktop yang mengizinkannya. Halaman tanpa entri tidak dibatasi (dashboard). */
export const AKSES_HALAMAN: Record<string, string[]> = {
    "/dashboard/members": [MENU.daftarAnggota, MENU.lapDaftarAnggota],
    "/dashboard/savings": [MENU.lapSimpanan],
    "/dashboard/savings/ledger": [MENU.lapBukuSimpanan],
    "/dashboard/savings/deposit": [MENU.setoranSimpanan],
    "/dashboard/savings/withdraw": [MENU.pencairanSimpanan],
    "/dashboard/loans": [MENU.lapPinjamanKoperasi, MENU.lapPinjamanBank, MENU.lapPinjamanKpr],
    "/dashboard/loans/create-cash": [MENU.cairKoperasi, MENU.cairBank],
    "/dashboard/loans/create-kpr": [MENU.cairKpr],
    "/dashboard/loans/payment": [MENU.angsurKoperasi, MENU.angsurBank, MENU.angsurKpr],
    "/dashboard/accounting/coa": [MENU.coa],
    "/dashboard/accounting/journal": [MENU.jurnalUmum],
    "/dashboard/accounting/journal/new": [MENU.jurnalUmum],
    "/dashboard/settings/akses": [MENU.kelolaAkses],
    "/dashboard/settings/operator": [MENU.kelolaAkses],
}

/** Menu yang memakai pencarian anggota di form transaksi. */
export const MENU_TRANSAKSI = [MENU.setoranSimpanan, MENU.pencairanSimpanan, MENU.cairKoperasi, MENU.cairBank, MENU.cairKpr,
    MENU.angsurKoperasi, MENU.angsurBank, MENU.angsurKpr]

export const punyaIzin = (izin: readonly string[], menu: readonly string[]) => menu.some((m) => izin.includes(m))

export function bolehHalaman(href: string, izin: readonly string[]) {
    const perlu = AKSES_HALAMAN[href]
    return !perlu || punyaIzin(izin, perlu)
}
