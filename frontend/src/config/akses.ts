// Hak akses web memakai opr_hak_akses (per grup, akses 'T') dengan nama menu aplikasi desktop.
// Halaman boleh dibuka bila salah satu menu desktop yang dipetakan berizin; menu yang tidak
// tercatat untuk grup dianggap tidak berizin.

export const MENU = {
    dashboard: "Dashboard",
    daftarAnggota: "Daftar Nama Anggota",
    lapDaftarAnggota: "Lap. Daftar Nama Anggota",
    inputAnggota: "Input Anggota Baru",
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
    // Khusus web; superadmin, atau grup yang diberi izin lewat Kelola Hak Akses. Memulihkan cadangan menimpa seluruh database.
    backupRestore: "Backup & Restore (web)",
    // Khusus web; superadmin, atau grup yang diberi izin lewat Kelola Hak Akses (kirim pengumuman/promo ke HP anggota).
    kirimNotifikasi: "Kirim Notifikasi (web)",
    // Khusus web; himbauan dan promo yang tampil di Beranda aplikasi anggota.
    kelolaPengumuman: "Kelola Himbauan & Promo (web)",
    // Khusus web; membaca dan membalas pesan anggota, serta menerima notifikasi pesan masuk. Harus sama dengan MENU_PESAN di backend.
    pesanAnggota: "Pesan Anggota (web)",
    // Khusus web; menu sidebar yang dulu berbagi izin dengan menu lain. Harus sama dengan PECAHAN_IZIN di database/postgres/pengaturan-pasang.mjs.
    kartuSimpanan: "Kartu Simpanan (web)",
    cariPinjaman: "Cari Pinjaman (web)",
    escrow: "Setoran Titipan Escrow (web)",
    generatePotongan: "Generate & Posting Potongan (web)",
    jurnalPenyesuaian: "Jurnal Penyesuaian (web)",
    jurnalBermasalah: "Jurnal Bermasalah (web)",
    auditData: "Audit Data (web)",
    bukuBesarKas: "Buku Besar Kas (web)",
    neracaLajur: "Neraca Lajur (web)",
    gradeAnggota: "Grade Anggota (web)",
} as const

/**
 * Nama sub-baris di Kelola Hak Akses, untuk menu sidebar yang punya lebih dari satu izin (lihat AKSES_HALAMAN).
 * Menu berizin tunggal tampil memakai label sidebar saja, jadi tidak perlu entri di sini.
 */
export const LABEL_IZIN: Record<string, string> = {
    [MENU.daftarAnggota]: "Kelola data",
    [MENU.inputAnggota]: "Tambah anggota baru",
    [MENU.lapDaftarAnggota]: "Lihat laporan",
    [MENU.karyawanMattel]: "Kelola Karyawan Mattel",
    [MENU.daftarKaryawan]: "Kelola daftar karyawan",
    [MENU.lapDaftarKaryawan]: "Lihat laporan",
    [MENU.user]: "Kelola user",
    [MENU.requestUser]: "Permintaan user & anggota baru",
    [MENU.angsurKoperasi]: "Koperasi",
    [MENU.angsurBank]: "Bank / pihak lain",
    [MENU.angsurKpr]: "KPR",
    [MENU.cairKoperasi]: "Koperasi",
    [MENU.cairBank]: "Bank / pihak lain",
    [MENU.lapPinjamanKoperasi]: "Koperasi",
    [MENU.lapPinjamanBank]: "Bank / pihak lain",
    [MENU.lapPinjamanKpr]: "KPR",
    [MENU.lapTunggakanKoperasi]: "Koperasi",
    [MENU.lapTunggakanBank]: "Bank / pihak lain",
    [MENU.lapTunggakanKpr]: "KPR",
    [MENU.jenisMacet]: "Jenis macet",
    [MENU.potonganSemua]: "Keseluruhan (bank)",
    [MENU.potonganKoperasi]: "Pinjaman koperasi",
    [MENU.potonganBank]: "Pinjaman bank",
    [MENU.potonganKpr]: "Pinjaman KPR",
    [MENU.potonganSimpanan]: "Simpanan anggota",
    [MENU.bukuBesar]: "Semua akun",
    [MENU.bukuBesarKas]: "Akun kas & bank saja",
    [MENU.neraca]: "Neraca",
    [MENU.rugiLaba]: "Rugi laba",
    [MENU.lapShu]: "Lihat laporan",
    [MENU.shu]: "Pencairan SHU",
    [MENU.hitungShu]: "Hitung SHU",
}

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

/**
 * Halaman web -> izin yang membukanya. Halaman tanpa entri tidak dibatasi (dashboard).
 * Satu izin hanya untuk satu menu sidebar, supaya baris di Kelola Hak Akses tidak saling memengaruhi.
 */
export const AKSES_HALAMAN: Record<string, string[]> = {
    "/dashboard/members": [MENU.daftarAnggota, MENU.inputAnggota, MENU.lapDaftarAnggota],
    "/dashboard/savings": [MENU.lapSimpanan],
    "/dashboard/savings/ledger": [MENU.lapBukuSimpanan],
    "/dashboard/savings/deposit": [MENU.setoranSimpanan],
    "/dashboard/savings/withdraw": [MENU.pencairanSimpanan],
    "/dashboard/loans": [MENU.lapPinjamanKoperasi, MENU.lapPinjamanBank, MENU.lapPinjamanKpr],
    "/dashboard/loans/cari": [MENU.cariPinjaman],
    // Detail pinjaman (bukan menu sidebar); izin per grup pinjaman diperiksa lagi di halamannya.
    "/dashboard/loans/[no]": [...new Set(Object.values(MENU_DETAIL_PINJAMAN_GRUP).flat())],
    "/dashboard/loans/create-cash": [MENU.cairKoperasi, MENU.cairBank],
    "/dashboard/loans/create-kpr": [MENU.cairKpr],
    "/dashboard/loans/payment": [MENU.angsurKoperasi, MENU.angsurBank, MENU.angsurKpr],
    "/dashboard/accounting/coa": [MENU.coa],
    "/dashboard/accounting/journal": [MENU.jurnalUmum],
    "/dashboard/accounting/journal/new": [MENU.jurnalUmum],
    "/dashboard/accounting/journal/tidak-seimbang": [MENU.jurnalBermasalah],
    "/dashboard/accounting/adjusting": [MENU.jurnalPenyesuaian],
    "/dashboard/settings": [MENU.company],
    "/dashboard/settings/jenis-pinjaman": [MENU.jenisPinjaman],
    "/dashboard/settings/jenis-simpanan": [MENU.jenisSimpanan],
    "/dashboard/settings/grade": [MENU.gradeAnggota],
    "/dashboard/members/karyawan-mattel": [MENU.karyawanMattel, MENU.daftarKaryawan, MENU.lapDaftarKaryawan],
    "/dashboard/members/mobile-users": [MENU.user, MENU.requestUser],
    "/dashboard/savings/cards": [MENU.kartuSimpanan],
    "/dashboard/savings/analytics": [MENU.lapGrafikSimpanan],
    "/dashboard/savings/time-deposits": [MENU.lapSimpananBerjangka],
    "/dashboard/loans/apply": [MENU.pengajuan],
    "/dashboard/loans/escrow": [MENU.escrow],
    "/dashboard/loans/titipan": [MENU.titipan],
    "/dashboard/loans/bad-debts": [MENU.lapTunggakanKoperasi, MENU.lapTunggakanBank, MENU.lapTunggakanKpr, MENU.jenisMacet],
    "/dashboard/deductions": [MENU.potonganSemua, MENU.potonganKoperasi, MENU.potonganBank, MENU.potonganKpr, MENU.potonganSimpanan],
    // Generate, ubah, dan posting potongan gaji bulanan.
    "/dashboard/deductions/periode": [MENU.generatePotongan],
    "/dashboard/accounting/ledger": [MENU.bukuBesar, MENU.bukuBesarKas],
    "/dashboard/accounting/bank-book": [MENU.bankBook],
    "/dashboard/accounting/trial-balance": [MENU.neracaSaldo],
    "/dashboard/accounting/worksheet": [MENU.neracaLajur],
    "/dashboard/accounting/reports": [MENU.neraca, MENU.rugiLaba],
    "/dashboard/accounting/closing": [MENU.tutupBuku],
    "/dashboard/shu": [MENU.lapShu, MENU.shu, MENU.hitungShu],
    "/dashboard/attendance": [MENU.absensi],
    "/dashboard/settings/akses": [MENU.kelolaAkses],
    "/dashboard/settings/operator": [MENU.kelolaAkses],
    // Pusat Panduan (/dashboard/panduan) sengaja tanpa entri: semua operator boleh membaca.
    "/dashboard/panduan/kelola": [MENU.kelolaPanduan],
    "/dashboard/settings/mode": [MENU.modeAplikasi],
    "/dashboard/settings/audit": [MENU.auditData],
    "/dashboard/settings/backup": [MENU.backupRestore],
    "/dashboard/notifikasi": [MENU.kirimNotifikasi],
    "/dashboard/himbauan": [MENU.kelolaPengumuman],
    "/dashboard/pesan": [MENU.pesanAnggota],
}

/** Menu yang memakai pencarian anggota di form transaksi. */
export const MENU_TRANSAKSI = [MENU.setoranSimpanan, MENU.pencairanSimpanan, MENU.cairKoperasi, MENU.cairBank, MENU.cairKpr,
    MENU.angsurKoperasi, MENU.angsurBank, MENU.angsurKpr, MENU.titipan]

export const punyaIzin = (izin: readonly string[], menu: readonly string[]) => menu.some((m) => izin.includes(m))

export function bolehHalaman(href: string, izin: readonly string[]) {
    const perlu = AKSES_HALAMAN[href]
    return !perlu || punyaIzin(izin, perlu)
}
