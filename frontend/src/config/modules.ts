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
        { key: "kota", label: "Kota", type: "string", hidden: true },
        { key: "hp", label: "No. HP", type: "string", hidden: true },
        { key: "bank_nama", label: "Bank", type: "string", hidden: true },
        { key: "bank_no_rek", label: "No. Rekening", type: "string", hidden: true },
        { key: "tglpencatatan", label: "Tgl Daftar", type: "date", sortable: true },
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
    columns: [
        { key: "tgl_transaksi", label: "Tanggal", type: "date", sortable: true },
        { key: "no_bukti", label: "No. Bukti", type: "string", sortable: true, mono: true },
        { key: "kode_agt", label: "Kode Agt", type: "string", sortable: true, mono: true },
        { key: "nik", label: "KPK", type: "string", hidden: true },
        { key: "nama", label: "Nama", type: "string", sortable: true },
        { key: "nama_simpanan", label: "Jenis", type: "string" },
        { key: "rp_setoran", label: "Setoran", type: "currency", sortable: true },
        { key: "rp_pengambilan", label: "Pengambilan", type: "currency", sortable: true },
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
        { key: "d_k", label: "Saldo Normal", type: "select", options: [{ label: "Debet (D)", value: "D" }, { label: "Kredit (K)", value: "K" }] },
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
