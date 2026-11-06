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
    // Khusus web; baris yang tampil dibatasi grup pinjaman yang boleh dilihat operator.
    bukuPinjaman: "Buku Pinjaman (web)",
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
    // Khusus web; superadmin dan grup admin. Hanya melihat, jadi tidak punya aksi C, U, D.
    aktivitasPengguna: "Aktivitas Pengguna (web)",
    // Khusus web; membatalkan transaksi yang sudah diposting. Awalnya hanya superadmin.
    batalTransaksi: "Batal Transaksi (web)",
    bukuBesarKas: "Buku Besar Kas (web)",
    neracaLajur: "Neraca Lajur (web)",
    gradeAnggota: "Grade Anggota (web)",
} as const

/**
 * Nama sub-baris di Kelola Hak Akses, untuk menu sidebar yang punya lebih dari satu izin (lihat AKSES_HALAMAN).
 * Menu berizin tunggal tampil memakai label sidebar saja, jadi tidak perlu entri di sini.
 */
export const LABEL_IZIN: Record<string, string> = {
    [MENU.auditData]: "Lihat audit",
    [MENU.batalTransaksi]: "Batalkan transaksi",
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
    "KPR": [MENU.lapPinjamanKpr, MENU.cairKpr, MENU.angsurKpr, MENU.lapTunggakanKpr],
}
/** Grup pinjaman yang boleh dilihat operator, untuk daftar lintas grup (Cari Pinjaman, Buku Pinjaman). */
export const grupPinjamanBoleh = (izin: readonly string[]) =>
    Object.entries(MENU_DETAIL_PINJAMAN_GRUP).filter(([, menu]) => menu.some((m) => izin.includes(m))).map(([g]) => g)

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
    "/dashboard/loans": [MENU.lapPinjamanKoperasi, MENU.lapPinjamanBank],
    "/dashboard/loans/kpr": [MENU.lapPinjamanKpr],
    "/dashboard/loans/ledger": [MENU.bukuPinjaman],
    "/dashboard/loans/kpr/[no]": MENU_DETAIL_PINJAMAN_GRUP["KPR"],
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
    "/dashboard/settings/audit": [MENU.auditData, MENU.batalTransaksi],
    "/dashboard/settings/aktivitas": [MENU.aktivitasPengguna],
    "/dashboard/settings/backup": [MENU.backupRestore],
    "/dashboard/notifikasi": [MENU.kirimNotifikasi],
    "/dashboard/himbauan": [MENU.kelolaPengumuman],
    "/dashboard/pesan": [MENU.pesanAnggota],
}

/** Menu yang memakai pencarian anggota di form transaksi. */
export const MENU_TRANSAKSI = [MENU.setoranSimpanan, MENU.pencairanSimpanan, MENU.cairKoperasi, MENU.cairBank, MENU.cairKpr,
    MENU.angsurKoperasi, MENU.angsurBank, MENU.angsurKpr, MENU.titipan]

export const punyaIzin = (izin: readonly string[], menu: readonly string[]) => menu.some((m) => izin.includes(m))

/** Rincian izin di bawah "boleh melihat". Pengguna sama seperti opr_hak_akses.boleh_tambah/ubah/hapus. */
export type AksiIzin = "tambah" | "ubah" | "hapus"
export const LABEL_AKSI: Record<AksiIzin, string> = { tambah: "Tambah", ubah: "Ubah", hapus: "Hapus" }
const TAMBAH = ["tambah"] as const, UBAH = ["ubah"] as const, UBAH_HAPUS = ["ubah", "hapus"] as const, SEMUA = ["tambah", "ubah", "hapus"] as const

/** Aksi yang bisa diatur per menu, hanya yang benar-benar ada di server action. Menu lain cukup izin lihat. Proses (tutup buku, hitung SHU, posting) dihitung tambah. */
export const AKSI_IZIN: Record<string, readonly AksiIzin[]> = {
    [MENU.daftarAnggota]: UBAH_HAPUS, [MENU.inputAnggota]: TAMBAH, [MENU.karyawanMattel]: UBAH_HAPUS, [MENU.daftarKaryawan]: UBAH_HAPUS, [MENU.user]: UBAH_HAPUS,
    [MENU.company]: UBAH, [MENU.jenisSimpanan]: UBAH, [MENU.jenisPinjaman]: SEMUA, [MENU.gradeAnggota]: SEMUA, [MENU.coa]: UBAH_HAPUS,
    [MENU.setoranSimpanan]: TAMBAH, [MENU.pencairanSimpanan]: TAMBAH, [MENU.pengajuan]: UBAH,
    [MENU.cairKoperasi]: TAMBAH, [MENU.cairBank]: TAMBAH, [MENU.cairKpr]: TAMBAH, [MENU.angsurKoperasi]: TAMBAH, [MENU.angsurBank]: TAMBAH, [MENU.angsurKpr]: TAMBAH,
    [MENU.titipan]: ["tambah", "hapus"], [MENU.jurnalUmum]: SEMUA, [MENU.jurnalPenyesuaian]: SEMUA, [MENU.bankBook]: SEMUA,
    [MENU.generatePotongan]: ["tambah", "ubah"], [MENU.tutupBuku]: TAMBAH, [MENU.hitungShu]: TAMBAH, [MENU.shu]: ["tambah", "hapus"],
}

/**
 * Menu sidebar yang terdiri dari beberapa izin desktop (per fungsi atau per grup pinjaman), di matriks digabung menjadi satu baris C R U D; kunci = izin pertama di
 * AKSES_HALAMAN. Izin desktop tetap tersimpan terpisah dan dibaca server action seperti biasa: R membuka semua izin `lihat`, tiap aksi membuka atau menutup
 * semua izin dalam daftarnya, jadi satu centang berlaku untuk semua grup pinjaman. Pembacaan: cukup salah satu izin yang boleh.
 */
const gabung = (semua: readonly string[], lihat: readonly string[] = semua, aksi: Partial<Record<AksiIzin, readonly string[]>> = {}) => ({ semua, lihat, aksi })
const ANGSUR = [MENU.angsurKoperasi, MENU.angsurBank, MENU.angsurKpr], CAIR = [MENU.cairKoperasi, MENU.cairBank]
const KARYAWAN = [MENU.karyawanMattel, MENU.daftarKaryawan], USER = [MENU.user, MENU.requestUser]
export const GABUNGAN_IZIN: Record<string, ReturnType<typeof gabung>> = {
    [MENU.daftarAnggota]: gabung([MENU.daftarAnggota, MENU.inputAnggota, MENU.lapDaftarAnggota], [MENU.lapDaftarAnggota],
        { tambah: [MENU.inputAnggota], ubah: [MENU.daftarAnggota], hapus: [MENU.daftarAnggota] }),
    [MENU.karyawanMattel]: gabung([...KARYAWAN, MENU.lapDaftarKaryawan], [MENU.lapDaftarKaryawan], { ubah: KARYAWAN, hapus: KARYAWAN }),
    [MENU.user]: gabung(USER, [MENU.user], { ubah: USER, hapus: [MENU.user] }),
    [MENU.angsurKoperasi]: gabung(ANGSUR, ANGSUR, { tambah: ANGSUR }),
    [MENU.cairKoperasi]: gabung(CAIR, CAIR, { tambah: CAIR }),
    [MENU.lapPinjamanKoperasi]: gabung([MENU.lapPinjamanKoperasi, MENU.lapPinjamanBank]),
    [MENU.lapTunggakanKoperasi]: gabung([MENU.lapTunggakanKoperasi, MENU.lapTunggakanBank, MENU.lapTunggakanKpr, MENU.jenisMacet]),
    [MENU.potonganSemua]: gabung([MENU.potonganSemua, MENU.potonganKoperasi, MENU.potonganBank, MENU.potonganKpr, MENU.potonganSimpanan]),
    [MENU.bukuBesar]: gabung([MENU.bukuBesar, MENU.bukuBesarKas]),
    [MENU.lapShu]: gabung([MENU.lapShu, MENU.shu, MENU.hitungShu], [MENU.lapShu], { tambah: [MENU.shu, MENU.hitungShu], hapus: [MENU.shu] }),
    [MENU.auditData]: gabung([MENU.auditData, MENU.batalTransaksi], [MENU.auditData], { hapus: [MENU.batalTransaksi] }),
}

/** `tolak` berisi "menu|aksi" yang dimatikan untuk grup operator. Cukup satu menu yang boleh. */
export const bolehAksi = (izin: readonly string[], tolak: readonly string[], menu: readonly string[], aksi: AksiIzin) =>
    menu.some((m) => izin.includes(m) && !tolak.includes(`${m}|${aksi}`))

export function bolehHalaman(href: string, izin: readonly string[]) {
    const perlu = AKSES_HALAMAN[href]
    return !perlu || punyaIzin(izin, perlu)
}
