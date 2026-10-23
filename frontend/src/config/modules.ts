// Konfigurasi tampilan tabel baca. Datanya diambil query SQL per halaman (src/lib/queries),
// bukan CRUD generik: transaksi hanya lewat mesin posting backend.

export interface ColumnConfig {
    key: string
    label: string
    type: "string" | "number" | "currency" | "date" | "boolean" | "badge"
    sortable?: boolean
    hidden?: boolean
    mono?: boolean
    // Untuk 'badge': nilai -> { label, color }
    badgeMap?: Record<string, { label: string; color: string }>
}

export interface FilterConfig {
    key: string
    label: string
    type: "select" | "text" | "date"
    options?: { label: string; value: string }[]
}

export interface ModuleConfig {
    title: string
    description: string
    rowKey: string
    columns: ColumnConfig[]
    filters?: FilterConfig[]
    searchPlaceholder?: string
}

export interface PageData<T = Record<string, unknown>> {
    items: T[]
    total: number
    page: number
    pageSize: number
    totalPages: number
}

const AKTIF = { "true": { label: "Aktif", color: "green" }, "false": { label: "Non-Aktif", color: "red" } }

export const membersConfig: ModuleConfig = {
    title: "Daftar Anggota Koperasi",
    description: "Data keanggotaan koperasi aktif dan non-aktif.",
    rowKey: "kode_agt",
    searchPlaceholder: "Kode, KPK, atau nama",
    filters: [
        { key: "aktif", label: "Status", type: "select", options: [{ label: "Aktif", value: "true" }, { label: "Non-Aktif", value: "false" }] },
        { key: "agt_non_agt", label: "Anggota", type: "select", options: [{ label: "Anggota", value: "true" }, { label: "Non Anggota", value: "false" }] },
        { key: "status_staff", label: "Staff", type: "select", options: [{ label: "Staff", value: "Staff" }, { label: "No Staff", value: "No Staff" }] },
        { key: "grade", label: "Grade", type: "text" },
    ],
    columns: [
        { key: "kode_agt", label: "Kode Anggota", type: "string", sortable: true, mono: true },
        { key: "nik", label: "KPK", type: "string", sortable: true },
        { key: "nama", label: "Nama Lengkap", type: "string", sortable: true },
        { key: "aktif", label: "Status", type: "badge", sortable: true, badgeMap: AKTIF },
        { key: "agt_non_agt", label: "Anggota", type: "badge", sortable: true, hidden: true,
            badgeMap: { "true": { label: "Anggota", color: "blue" }, "false": { label: "Non-Anggota", color: "gray" } } },
        { key: "status_staff", label: "Staff", type: "badge", sortable: true,
            badgeMap: { "Staff": { label: "STAFF", color: "indigo" }, "No Staff": { label: "NON-STAFF", color: "orange" } } },
        { key: "grade", label: "Grade", type: "string", sortable: true },
        { key: "rp_grade", label: "Grade (Rp)", type: "currency", sortable: true, hidden: true },
        // Kolom tersembunyi: tampil di jendela Detail, bisa dimunculkan lewat Kolom, dan ikut ekspor.
        // Dipilih dari kolom anggota yang terisi untuk sebagian besar anggota (telp_rmh 7%, status_acc 0% tidak dimuat).
        { key: "jns_kelamin", label: "Jenis Kelamin", type: "badge", hidden: true,
            badgeMap: { "L": { label: "Laki-laki", color: "blue" }, "P": { label: "Perempuan", color: "indigo" } } },
        { key: "status_kawin", label: "Status Perkawinan", type: "string", hidden: true },
        { key: "alamat", label: "Alamat", type: "string", hidden: true },
        { key: "kota", label: "Kota", type: "string", hidden: true },
        { key: "kodepos", label: "Kode Pos", type: "string", hidden: true },
        { key: "hp", label: "No. HP", type: "string", hidden: true },
        { key: "bank_nama", label: "Bank", type: "string", hidden: true },
        { key: "bank_no_rek", label: "No. Rekening", type: "string", hidden: true },
        { key: "bank_atas_nama", label: "Rekening Atas Nama", type: "string", hidden: true },
        { key: "simpanan_pokok", label: "Simpanan Pokok", type: "currency", hidden: true },
        { key: "simpanan_wajib", label: "Potongan Simp. Wajib / bulan", type: "currency", hidden: true },
        { key: "simpanan_sukarela", label: "Potongan Simp. Sukarela / bulan", type: "currency", hidden: true },
        { key: "tglpencatatan", label: "Tgl Daftar", type: "date", sortable: true },
        { key: "tgl_keluar", label: "Tgl Keluar", type: "date", hidden: true },
        { key: "alasan_keluar", label: "Alasan Keluar", type: "string", hidden: true },
        { key: "opr", label: "Dicatat Oleh", type: "string", hidden: true },
        { key: "saldo_simpanan", label: "Saldo Simpanan", type: "currency", sortable: true },
    ],
}

export const savingsLedgerConfig: ModuleConfig = {
    title: "Buku Simpanan",
    description: "Transaksi setoran dan pengambilan simpanan anggota.",
    rowKey: "no_bukti",
    searchPlaceholder: "No. bukti, kode, KPK, atau nama",
    filters: [
        { key: "jenis", label: "Jenis", type: "select", options: [] }, // diisi dari jenis_simpanan
        { key: "dari", label: "Dari Tanggal", type: "date" },
        { key: "sampai", label: "Sampai Tanggal", type: "date" },
    ],
    // Hanya Tanggal yang bisa diurutkan: Saldo adalah saldo berjalan (rekening koran), jadi baris harus tetap kronologis.
    columns: [
        { key: "tgl_transaksi", label: "Tanggal", type: "date", sortable: true },
        { key: "no_bukti", label: "No. Bukti", type: "string", mono: true },
        { key: "kode_agt", label: "Kode Agt", type: "string", mono: true },
        { key: "nik", label: "KPK", type: "string", hidden: true },
        { key: "nama", label: "Nama", type: "string" },
        { key: "nama_simpanan", label: "Jenis", type: "string" },
        { key: "rp_setoran", label: "Setoran", type: "currency" },
        { key: "rp_pengambilan", label: "Pengambilan", type: "currency" },
        { key: "rp_saldo", label: "Saldo", type: "currency" },
        { key: "deskripsi", label: "Keterangan", type: "string", hidden: true },
        { key: "opr", label: "Operator", type: "string", hidden: true },
    ],
}

export const coaConfig: ModuleConfig = {
    title: "Chart of Accounts (COA)",
    description: "Bagan akun klasifikasi pembukuan koperasi.",
    rowKey: "kode_perkiraan",
    searchPlaceholder: "Kode atau nama akun",
    filters: [
        { key: "d_k", label: "Saldo Normal", type: "select", options: [{ label: "Debet (D)", value: "D" }, { label: "Kredit (C)", value: "C" }] },
    ],
    columns: [
        { key: "kode_perkiraan", label: "Kode Akun", type: "string", sortable: true, mono: true },
        { key: "nama_perkiraan", label: "Nama Perkiraan", type: "string", sortable: true },
        { key: "nama_induk", label: "Induk", type: "string" },
        { key: "d_k", label: "D/K", type: "string", sortable: true },
        { key: "rp_saldo_awal", label: "Saldo Awal", type: "currency", sortable: true },
        { key: "keterangan", label: "Keterangan", type: "string", hidden: true },
    ],
}

export const journalConfig: ModuleConfig = {
    title: "Jurnal Umum",
    description: "Baris jurnal pembukuan dari semua transaksi.",
    rowKey: "urutan",
    searchPlaceholder: "No. bukti, akun, atau keterangan",
    filters: [
        { key: "dari", label: "Dari Tanggal", type: "date" },
        { key: "sampai", label: "Sampai Tanggal", type: "date" },
        { key: "sumber", label: "Sumber", type: "select", options: [
            { label: "Simpanan", value: "simpanan" },
            { label: "Pencairan Pinjaman", value: "pinjaman_tunai" },
            { label: "Angsuran Pinjaman", value: "pinjaman_tunai_rincian" },
            { label: "Angsuran KPR", value: "kpr_rincian" },
            { label: "SHU", value: "shu" },
            { label: "Jurnal Umum (web)", value: "jurnal" },
            { label: "Kas", value: "kas" },
            { label: "Tanpa sumber (data lama)", value: "lain" },
        ] },
    ],
    columns: [
        { key: "tanggal_jurnalumum", label: "Tanggal", type: "date", sortable: true },
        { key: "nomor_bukti", label: "No. Bukti", type: "string", sortable: true, mono: true },
        { key: "kode_perkiraan", label: "Kode Akun", type: "string", sortable: true, mono: true },
        { key: "nama_perkiraan", label: "Nama Akun", type: "string" },
        { key: "deskripsi", label: "Keterangan", type: "string" },
        { key: "debit_jurnalumum", label: "Debit", type: "currency", sortable: true },
        { key: "kredit_jurnalumum", label: "Kredit", type: "currency", sortable: true },
        { key: "sumber_tipe", label: "Sumber", type: "string", hidden: true },
        { key: "opr", label: "Operator", type: "string", hidden: true },
    ],
}

export const karyawanMattelConfig: ModuleConfig = {
    title: "Karyawan Mattel",
    description: "Data karyawan dari HR Mattel; kolom Anggota terisi bila karyawan sudah terdaftar sebagai anggota.",
    rowKey: "id",
    searchPlaceholder: "NIK, nama, departemen, atau seksi",
    filters: [
        { key: "anggota", label: "Keanggotaan", type: "select", options: [{ label: "Sudah anggota", value: "ya" }, { label: "Belum anggota", value: "tidak" }] },
    ],
    columns: [
        { key: "nik", label: "NIK", type: "string", sortable: true, mono: true },
        { key: "nama", label: "Nama", type: "string", sortable: true },
        { key: "deptname", label: "Departemen", type: "string", sortable: true },
        { key: "sectname", label: "Seksi", type: "string", sortable: true },
        { key: "grade", label: "Grade", type: "string", sortable: true },
        { key: "joindate", label: "Tgl Masuk", type: "date", sortable: true },
        { key: "tgl_lahir", label: "Tgl Lahir", type: "date", hidden: true },
        { key: "no_rek", label: "No. Rekening", type: "string", hidden: true },
        { key: "emphone", label: "Telepon", type: "string", hidden: true },
        { key: "plant", label: "Plant", type: "string", hidden: true },
        { key: "kode_agt", label: "Anggota", type: "string", mono: true },
    ],
}

export const userMobileConfig: ModuleConfig = {
    title: "User Mobile",
    description: "Akun aplikasi Android anggota (tabel app_user).",
    rowKey: "id",
    searchPlaceholder: "Username, kode anggota, nama, atau email",
    filters: [
        { key: "status", label: "Status", type: "select", options: [{ label: "Aktif", value: "true" }, { label: "Tidak aktif", value: "false" }] },
    ],
    columns: [
        { key: "username", label: "Username", type: "string", sortable: true },
        { key: "kode_agt", label: "Kode Anggota", type: "string", sortable: true, mono: true },
        { key: "nama", label: "Nama", type: "string", sortable: true },
        { key: "nik", label: "KPK", type: "string", hidden: true },
        { key: "email", label: "Email", type: "string" },
        { key: "status", label: "Status", type: "badge", sortable: true,
            badgeMap: { "true": { label: "Aktif", color: "green" }, "false": { label: "Tidak aktif", color: "gray" } } },
        { key: "punya_token", label: "Notifikasi", type: "boolean", hidden: true },
        { key: "dibuat", label: "Dibuat", type: "date", sortable: true },
        { key: "diubah", label: "Diubah", type: "date", hidden: true },
    ],
}
