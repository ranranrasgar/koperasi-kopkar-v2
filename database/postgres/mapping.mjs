// Sumber tunggal aturan pemetaan MySQL (kopkar_mjs_2000) -> PostgreSQL.
// Dipakai oleh generate-schema.mjs (membuat schema.sql) dan migrate.mjs (memuat data).
// Nama kolom/tabel di sini memakai nama BARU (huruf kecil); nama lama ditulis apa adanya dari MySQL.

// Tabel yang tidak dibawa: tabel hasil olahan/laporan, tabel sementara yang dibuat ulang tiap proses,
// dan modul lama yang kosong atau tidak dipakai. Alasan lengkap ada di README.md.
export const SKIP_TABLES = [
    'absen', 'absensi', 'karyawan', 'bukti_transaksi', 'tabel_jatuh_tempo', 'set_tgl_angsuran', // modul lama (kosong/tidak dipakai)
    'simpanan_buku', 'log_notifikasi_io',                                                       // 2 baris / kosong
    'bukubesar', 'laba_rugi', 'jurnal_temp', 'income_statement', 'neraca_saldo', 'tunggakan_per_sp', // laporan olahan
    'temp_potongan_agt', 'temp_potongan_pinjaman',                                              // tabel kerja potongan
];

export const RENAME_TABLE = { user: 'app_user' }; // `user` adalah kata cadangan di PostgreSQL

// Kolom lama yang sengaja tidak dipindahkan (rahasia atau token sementara).
export const DROP_COLUMNS = {
    user: ['token'],     // dipakai ganda: token login acak dan token FCM; diganti token bertanda tangan + fcm_token
    opr: ['PASSWORD'],   // password operator tersimpan sebagai teks biasa; tidak dibawa, operator set password baru
};

// Tabel yang `id` lamanya sudah berupa surrogate key (auto increment). Nilainya dipertahankan sebagai `id` baru.
export const KEEP_LEGACY_ID = ['himbauan', 'promo', 'pengajuan_pinjaman', 'user'];

// Kolom tambahan (tidak ada di MySQL). Kolom FK baru dibuat otomatis dari FKS di bawah.
export const EXTRA_COLUMNS = {
    user: [{ name: 'fcm_token', type: 'varchar(255)' }],
    opr: [
        { name: 'password_hash', type: 'varchar(255)' },
        { name: 'wajib_ganti_password', type: 'boolean NOT NULL DEFAULT true' },
    ],
    jurnal_umum: [
        { name: 'sumber_tipe', type: 'varchar(30)' }, // asal transaksi: pinjaman_tunai, kpr, simpanan, pinjaman_tunai_rincian, kpr_rincian, shu, kas
        { name: 'sumber_id', type: 'bigint' },
    ],
};

// Kolom yang isinya diubah saat dipindahkan: 'hash-jawaban' = scrypt (lihat migrate.mjs)
export const TRANSFORMS = {
    'user.jawaban': 'hash-jawaban',
    'opr.jawaban': 'hash-jawaban',
};

// Ganti nama kolom (selain huruf kecil otomatis)
export const RENAME_COLUMN = {
    'user.jawaban': 'jawaban_hash',
    'opr.jawaban': 'jawaban_hash',
    'user.password': 'password_hash',
};

// Komentar kolom penting (muncul di database sebagai dokumentasi)
export const COLUMN_COMMENTS = {
    'pinjaman_tunai.rp_bayar_pokok': 'LEGACY: berisi SISA pokok setelah angsuran terakhir, bukan jumlah terbayar. Jangan dipakai; hitung dari pinjaman_tunai_rincian.',
    'pinjaman_tunai.rp_bayar_bunga': 'LEGACY: berisi SISA bunga setelah angsuran terakhir, bukan jumlah terbayar. Jangan dipakai; hitung dari pinjaman_tunai_rincian.',
    'pinjaman_tunai.rp_saldo_pokok': 'LEGACY: tidak sinkron dengan rincian. Saldo yang benar = SUM(kredit_pokok - debit_pokok) di pinjaman_tunai_rincian.',
    'pinjaman_tunai.rp_saldo_bunga': 'LEGACY: tidak sinkron dengan rincian. Saldo yang benar = SUM(kredit_bunga - debit_bunga) di pinjaman_tunai_rincian.',
    'pinjaman_tunai.bunga_per': '1 = bunga per angsuran (jasa dikali lama angsuran); selain itu = lama angsuran (jasa sekali).',
    'jurnal_umum.sumber_tipe': 'Diturunkan saat migrasi dari nomor_bukti; NULL jika tidak ada dokumen sumber yang cocok.',
    'temp_shu_backup.no_reff': 'Menunjuk ke jurnal_umum.nomor_bukti (jurnal pengambilan SHU), bukan ke simpanan.',
    'simpanan.coa_kas': 'LEGACY: kolom asal bertipe TINYINT sehingga akun 177/179 tersimpan -79/-77. Pakai kas_perkiraan_id.',
    'app_user.kode_agt': 'LEGACY: berisi kode anggota, atau NIK karyawan Mattel bagi yang belum menjadi anggota. Pakai anggota_id / karyawan_mattel_id.',
    'app_user.password_hash': 'bcrypt ($2y$) atau MD5 (akun lama; di-rehash saat login).',
    'app_user.jawaban_hash': 'scrypt$<salt hex>$<hash hex> dari jawaban (trim + huruf kecil). Lihat README.',
    'opr.password_hash': 'NULL sampai operator menetapkan password baru.',
};

// Relasi baru. col = kolom FK baru; ref = tabel induk (nama baru); from = kolom lama di anak; to = kolom lama di induk.
//  - required: NOT NULL dipasang otomatis hanya jika tidak ada baris yatim.
//  - ci: bandingkan tanpa peduli huruf besar/kecil dan spasi tepi (MySQL memang begitu).
//  - fromExpr: ekspresi SQL pengganti `c.<from>` di sisi anak.
//  - where: syarat tambahan.
//  - onDelete: perilaku hapus induk (default RESTRICT agar data keuangan tidak terhapus berantai).
const rel = (col, ref, from, to, o = {}) => ({ col, ref, from, to, required: false, onDelete: 'RESTRICT', ...o });
const op = (from = 'opr') => rel('operator_id', 'opr', from, 'nama', { ci: true });

export const FKS = {
    anggota: [rel('karyawan_mattel_id', 'karyawan_mattel', 'nik', 'nik', { expectMiss: true }), op()], // hanya anggota yang daftar lewat jalur karyawan Mattel yang cocok
    anggota_detail: [rel('anggota_id', 'anggota', 'kode_agt', 'kode_agt', { required: true, onDelete: 'CASCADE' })],
    user: [
        rel('anggota_id', 'anggota', 'kode_agt', 'kode_agt'),
        rel('karyawan_mattel_id', 'karyawan_mattel', 'kode_agt', 'nik', { where: 'c.anggota_id IS NULL' }),
        rel('pertanyaan_id', 'pertanyaan', 'id_pertanyaan', 'urut', { onDelete: 'SET NULL' }),
    ],
    log_notifikasi: [rel('anggota_id', 'anggota', 'kode_agt', 'kode_agt')],

    jenis_simpanan: [rel('coa_id', 'perkiraan', 'coa_simpanan', 'pr_id')],
    jenis_kredit: [
        rel('coa_kredit_id', 'perkiraan', 'coa_kredit', 'pr_id'),
        rel('coa_jasa_id', 'perkiraan', 'coa_jasa', 'pr_id'),
        rel('coa_adm_id', 'perkiraan', 'coa_adm', 'pr_id'),
        rel('coa_provisi_id', 'perkiraan', 'coa_provisi', 'pr_id'),
    ],
    jenis_pos_shu: [rel('perkiraan_id', 'perkiraan', 'kode_coa', 'kode_perkiraan')],

    perkiraan: [
        rel('klasifikasi_id', 'klasifikasi_perkiraan', 'kode_klasifikasi', 'kode_klasifikasi', { required: true }),
        // akun induk (root) menunjuk dirinya sendiri di MySQL; di sini root = NULL
        rel('parent_id', 'perkiraan', 'pr_parent', 'pr_id', { where: 'p.id <> c.id', orphanWhere: 'c.pr_parent <> c.pr_id' }),
    ],
    saldo_perkiraan: [rel('perkiraan_id', 'perkiraan', 'kode_perkiraan', 'kode_perkiraan', { required: true }), op()],
    variable_akun: [rel('perkiraan_id', 'perkiraan', 'kode_akun', 'kode_perkiraan')],

    simpanan: [
        rel('anggota_id', 'anggota', 'kode_agt', 'kode_agt', { required: true }),
        rel('jenis_simpanan_id', 'jenis_simpanan', 'jenis_simpanan', 'kode_simpanan', { required: true }),
        // coa_kas bertipe TINYINT di MySQL: 177 tersimpan -79, 179 tersimpan -77
        rel('kas_perkiraan_id', 'perkiraan', 'coa_kas', 'pr_id', { fromExpr: 'CASE WHEN c.coa_kas < 0 THEN c.coa_kas + 256 ELSE c.coa_kas END' }),
        op(),
    ],
    pinjaman_tunai: [
        rel('anggota_id', 'anggota', 'kode_agt', 'kode_agt', { required: true }),
        rel('jenis_kredit_id', 'jenis_kredit', 'kode_kredit', 'kode_kredit', { required: true }),
        rel('kas_perkiraan_id', 'perkiraan', 'coa_kas', 'pr_id'),
        rel('kolektor_id', 'kolektor', 'id_kolektor', 'id_kolektor'),
        rel('sales_id', 'sales', 'id_sales', 'id_sales'),
        op(),
    ],
    pinjaman_tunai_rincian: [
        rel('pinjaman_tunai_id', 'pinjaman_tunai', 'no_pinjaman', 'no_pinjaman', { required: true }),
        rel('kas_perkiraan_id', 'perkiraan', 'coa_kas', 'pr_id'),
    ],
    pinjaman_tunai_rincian_tagih: [rel('pinjaman_tunai_id', 'pinjaman_tunai', 'no_pinjaman', 'no_pinjaman', { required: true })],
    pinjaman_tunai_titipan: [rel('pinjaman_tunai_id', 'pinjaman_tunai', 'no_pinjaman', 'no_pinjaman', { required: true })],
    kpr: [
        rel('anggota_id', 'anggota', 'kode_agt', 'kode_agt', { required: true }),
        rel('jenis_kredit_id', 'jenis_kredit', 'kode_kredit', 'kode_kredit', { required: true }),
        rel('kas_perkiraan_id', 'perkiraan', 'coa_kas', 'pr_id'),
    ],
    kpr_rincian: [
        rel('kpr_id', 'kpr', 'no_pinjaman', 'no_pinjaman', { required: true }),
        rel('kas_perkiraan_id', 'perkiraan', 'coa_kas', 'pr_id'),
    ],
    kpr_rincian_tagih: [
        // 1.242 jadwal untuk 36 nomor pinjaman milik pinjaman_tunai: sengaja dibiarkan tanpa induk (keputusan 22 Okt 2026)
        rel('kpr_id', 'kpr', 'no_pinjaman', 'no_pinjaman', { expectMiss: true }),
        rel('kas_perkiraan_id', 'perkiraan', 'coa_kas', 'pr_id'),
    ],
    pengajuan_pinjaman: [
        rel('anggota_id', 'anggota', 'kd_anggota', 'kode_agt', { required: true }),
        rel('jenis_kredit_id', 'jenis_kredit', 'kd_kredit', 'kode_kredit', { required: true }),
    ],

    jurnal_umum: [rel('perkiraan_id', 'perkiraan', 'kode_perkiraan', 'kode_perkiraan'), op()],
    kas: [op()],

    opr: [rel('grup_id', 'opr_grup', 'urut_grup', 'urut', { required: true })],
    opr_hak_akses: [rel('grup_id', 'opr_grup', 'id_opr', 'urut', { required: true, onDelete: 'CASCADE' })],
    opr_history: [op()],

    temp_shu: [rel('anggota_id', 'anggota', 'kode_agt', 'kode_agt', { required: true })],
    temp_shu_backup: [rel('anggota_id', 'anggota', 'kode_agt', 'kode_agt', { required: true })],
    temp_potongan_all: [rel('anggota_id', 'anggota', 'kode_agt', 'kode_agt', { required: true })],
    temp_potongan_bank: [rel('anggota_id', 'anggota', 'kode_agt', 'kode_agt', { required: true })],
    temp_potongan_koperasi: [rel('anggota_id', 'anggota', 'kode_agt', 'kode_agt', { required: true })],
    temp_potongan_kpr: [rel('anggota_id', 'anggota', 'kode_agt', 'kode_agt', { required: true })],
    temp_simpanan: [rel('anggota_id', 'anggota', 'kode_agt', 'kode_agt', { required: true })],
};

// Indeks tambahan untuk pola query aplikasi (nama tabel baru, kolom baru).
// Indeks untuk setiap kolom FK dibuat otomatis; indeks MySQL lama yang berlebihan tidak dibawa.
export const EXTRA_INDEXES = [
    ['anggota', ['nik']],
    ['anggota', ['aktif']],
    ['app_user', ['lower(username)']],
    ['simpanan', ['anggota_id', 'jenis_simpanan_id', 'tgl_transaksi']],
    ['simpanan', ['tgl_transaksi', 'urut', 'id']], // urut kronologis Buku Simpanan, dasbor, grafik per tahun
    ['simpanan', ['kode_agt', 'tgl_transaksi']], // Kartu Simpanan
    ['pinjaman_tunai', ['tgl_pinjaman']],
    ['pinjaman_tunai_rincian', ['pinjaman_tunai_id', 'tanggal_angsuran']],
    ['pinjaman_tunai_rincian', ['no_bukti']],
    ['pinjaman_tunai_rincian_tagih', ['pinjaman_tunai_id', 'angsuran_ke']],
    ['kpr_rincian', ['kpr_id', 'tanggal_angsuran']],
    ['kpr_rincian', ['no_bukti']],
    ['kpr_rincian_tagih', ['kpr_id', 'angsuran_ke']],
    ['jurnal_umum', ['nomor_bukti']],
    ['jurnal_umum', ['tanggal_jurnalumum']],
    ['jurnal_umum', ['perkiraan_id', 'tanggal_jurnalumum']],
    ['jurnal_umum', ['sumber_tipe', 'sumber_id']],
    // Jurnal pembuka tahun (TBT/...): dicari setiap laporan saldo; LIKE 'TBT/%' tidak bisa memakai indeks biasa.
    ['jurnal_umum', ['tanggal_jurnalumum'], { nama: 'tbt', where: "nomor_bukti LIKE 'TBT/%'" }],
    ['kas', ['tgl_kas']],
    ['kas', ['no_bukti']],
    ['log_notifikasi', ['anggota_id', 'datetimes']],
    ['pengajuan_pinjaman', ['anggota_id', 'tgl_realisasi']],
    ['temp_shu_backup', ['anggota_id', 'tgl_tutup_buku']],
    ['temp_shu_backup', ['no_reff']],
];

// Kolom FK yang harus unik bila terisi (indeks unik parsial)
export const UNIQUE_WHEN_SET = [
    ['app_user', 'anggota_id'],
    ['anggota_detail', 'anggota_id'], // dipasang hanya jika tidak ada duplikat; lihat laporan
    ['opr_hak_akses', ['grup_id', 'menu']],
];
