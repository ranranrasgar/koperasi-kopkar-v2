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
    company: "Company",
    jenisPinjaman: "Jenis Pinjaman",
    jenisSimpanan: "Jenis Simpanan",
    karyawanMattel: "Karyawan Mattel",
    daftarKaryawan: "Daftar Nama Karyawan",
    lapDaftarKaryawan: "Lap. Daftar Nama Karyawan",
    user: "User",
    requestUser: "Request User && Anggota Baru",
    lapGrafikSimpanan: "Lap. Gafik Simpanan",
    lapSimpananBerjangka: "Lap. Simpanan Berjangka",
    pengajuan: "Pengajuan Pinjaman",
    titipan: "Setoran Titipan Angsuran Pinjaman",
    jenisMacet: "Jenis Macet",
    lapTunggakanKoperasi: "Lap. Tunggakan Pinjaman Koperasi",
    lapTunggakanBank: "Lap. Tunggakan Bank / Pihak Lain",
    lapTunggakanKpr: "Lap. Tunggakan KPR",
    potonganSemua: "Potongan Keseluruhan (Bank)",
    potonganKoperasi: "Potongan Pinjaman Koperasi",
    potonganBank: "Potongan Pinjaman Bank",
    potonganKpr: "Potongan Pinjaman KPR",
    potonganSimpanan: "Potongan Simpanan Anggota",
    bankBook: "Buku Kas && Bank (Bank Book)",
    bukuBesar: "Buku Besar",
    neracaSaldo: "Neraca Saldo",
    neraca: "Neraca",
    rugiLaba: "Rugi Laba",
    tutupBuku: "Tutup Buku Tahunan",
    lapShu: "Lap. Sisa Hasil Usaha",
    shu: "Sisa Hasil Usaha (SHU)",
    hitungShu: "Hitung SHU",
    absensi: "Absensi Karyawan",
    // Khusus web, tidak ada di desktop: hanya grup superadmin.
    kelolaAkses: "Kelola Akses (web)",
    // Khusus web; superadmin, atau grup yang diberi izin lewat Kelola Hak Akses.
    kelolaPanduan: "Kelola Panduan (web)",
    // Saklar mode uji/live; superadmin, dan grup admin (diberikan oleh npm run pengaturan:pasang).
    modeAplikasi: "Mode Aplikasi (web)",
    // Khusus web; superadmin, atau grup yang diberi izin lewat Kelola Hak Akses (kirim pengumuman/promo ke HP anggota).
    kirimNotifikasi: "Kirim Notifikasi (web)",
    // Khusus web; himbauan dan promo yang tampil di Beranda aplikasi anggota.
    kelolaPengumuman: "Kelola Himbauan & Promo (web)",
    // Khusus web; membaca dan membalas pesan anggota, serta menerima notifikasi pesan masuk. Harus sama dengan MENU_PESAN di backend.
    pesanAnggota: "Pesan Anggota (web)",
} as const

/** Grup yang lolos semua pemeriksaan izin dan boleh mengelola hak akses serta operator. */
export const GRUP_SUPERADMIN = "superadmin"

/** Menu pencairan dan angsuran pinjaman tunai menurut jenis_kredit.group_pinjaman. */
export const MENU_CAIR_GRUP: Record<string, string> = { "KOPERASI": MENU.cairKoperasi, "BANK / PIHAK LAIN": MENU.cairBank }
export const MENU_ANGSUR_GRUP: Record<string, string> = { "KOPERASI": MENU.angsurKoperasi, "BANK / PIHAK LAIN": MENU.angsurBank }
/**
 * Detail satu pinjaman (jadwal angsuran dan riwayat pembayaran) boleh dilihat operator yang menangani pinjaman grup itu lewat menu mana pun
 * (laporan, pencairan, angsuran, tunggakan, pengajuan), tanpa harus berizin Daftar Pinjaman.
 */
export const MENU_DETAIL_PINJAMAN_GRUP: Record<string, string[]> = {
    "KOPERASI": [MENU.lapPinjamanKoperasi, MENU.cairKoperasi, MENU.angsurKoperasi, MENU.lapTunggakanKoperasi, MENU.pengajuan],
    "BANK / PIHAK LAIN": [MENU.lapPinjamanBank, MENU.cairBank, MENU.angsurBank, MENU.lapTunggakanBank],
}

/** Halaman web -> menu desktop yang mengizinkannya. Halaman tanpa entri tidak dibatasi (dashboard). */
export const AKSES_HALAMAN: Record<string, string[]> = {
    "/dashboard/members": [MENU.daftarAnggota, MENU.lapDaftarAnggota],
    "/dashboard/savings": [MENU.lapSimpanan],
    "/dashboard/savings/ledger": [MENU.lapBukuSimpanan],
    "/dashboard/savings/deposit": [MENU.setoranSimpanan],
    "/dashboard/savings/withdraw": [MENU.pencairanSimpanan],
    "/dashboard/loans": [MENU.lapPinjamanKoperasi, MENU.lapPinjamanBank, MENU.lapPinjamanKpr],
    "/dashboard/loans/cari": [...new Set(Object.values(MENU_DETAIL_PINJAMAN_GRUP).flat())],
    "/dashboard/loans/create-cash": [MENU.cairKoperasi, MENU.cairBank],
    "/dashboard/loans/create-kpr": [MENU.cairKpr],
    "/dashboard/loans/payment": [MENU.angsurKoperasi, MENU.angsurBank, MENU.angsurKpr],
    "/dashboard/accounting/coa": [MENU.coa],
    "/dashboard/accounting/journal": [MENU.jurnalUmum],
    "/dashboard/accounting/journal/new": [MENU.jurnalUmum],
    "/dashboard/settings": [MENU.company],
    "/dashboard/settings/jenis-pinjaman": [MENU.jenisPinjaman],
    "/dashboard/settings/jenis-simpanan": [MENU.jenisSimpanan],
    "/dashboard/members/karyawan-mattel": [MENU.karyawanMattel, MENU.daftarKaryawan, MENU.lapDaftarKaryawan],
    "/dashboard/members/mobile-users": [MENU.user, MENU.requestUser],
    "/dashboard/savings/cards": [MENU.lapBukuSimpanan],
    "/dashboard/savings/analytics": [MENU.lapGrafikSimpanan],
    "/dashboard/savings/time-deposits": [MENU.lapSimpananBerjangka],
    "/dashboard/loans/apply": [MENU.pengajuan],
    "/dashboard/loans/escrow": [MENU.titipan],
    "/dashboard/loans/bad-debts": [MENU.lapTunggakanKoperasi, MENU.lapTunggakanBank, MENU.lapTunggakanKpr, MENU.jenisMacet],
    "/dashboard/deductions": [MENU.potonganSemua, MENU.potonganKoperasi, MENU.potonganBank, MENU.potonganKpr, MENU.potonganSimpanan],
    "/dashboard/accounting/ledger": [MENU.bankBook, MENU.bukuBesar],
    "/dashboard/accounting/trial-balance": [MENU.neracaSaldo],
    "/dashboard/accounting/reports": [MENU.neraca, MENU.rugiLaba],
    "/dashboard/accounting/closing": [MENU.tutupBuku],
    "/dashboard/shu": [MENU.lapShu, MENU.shu, MENU.hitungShu],
    "/dashboard/attendance": [MENU.absensi],
    "/dashboard/settings/akses": [MENU.kelolaAkses],
    "/dashboard/settings/operator": [MENU.kelolaAkses],
    // Pusat Panduan (/dashboard/panduan) sengaja tanpa entri: semua operator boleh membaca.
    "/dashboard/panduan/kelola": [MENU.kelolaPanduan],
    "/dashboard/settings/mode": [MENU.modeAplikasi],
    "/dashboard/notifikasi": [MENU.kirimNotifikasi],
    "/dashboard/himbauan": [MENU.kelolaPengumuman],
    "/dashboard/pesan": [MENU.pesanAnggota],
}

/** Menu yang memakai pencarian anggota di form transaksi. */
export const MENU_TRANSAKSI = [MENU.setoranSimpanan, MENU.pencairanSimpanan, MENU.cairKoperasi, MENU.cairBank, MENU.cairKpr,
    MENU.angsurKoperasi, MENU.angsurBank, MENU.angsurKpr]

export const punyaIzin = (izin: readonly string[], menu: readonly string[]) => menu.some((m) => izin.includes(m))

export function bolehHalaman(href: string, izin: readonly string[]) {
    const perlu = AKSES_HALAMAN[href]
    return !perlu || punyaIzin(izin, perlu)
}
