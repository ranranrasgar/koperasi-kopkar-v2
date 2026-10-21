-- Skema PostgreSQL Koperasi Kopkar Mattel MJS 2000
-- DIBUAT OTOMATIS oleh generate-schema.mjs dari MySQL kopkar_mjs_2000 + mapping.mjs. Jangan diedit tangan; ubah mapping.mjs lalu jalankan ulang.
-- 42 tabel dibawa; 16 tabel sengaja tidak dibawa (lihat README.md).
-- Kolom lama dibiarkan apa adanya (huruf kecil); kolom baru: id (PK) dan <induk>_id (FK).

-- @@ section: tables
CREATE TABLE anggota (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    urut integer NOT NULL DEFAULT 0,
    status_staff varchar(15) NOT NULL DEFAULT '',
    aktif boolean NOT NULL DEFAULT true,
    agt_non_agt boolean NOT NULL DEFAULT true,
    grade varchar(15) NOT NULL DEFAULT '',
    rp_grade numeric(20,4) NOT NULL DEFAULT 0,
    kode_agt varchar(15) NOT NULL DEFAULT '0',
    nik varchar(25) NOT NULL DEFAULT '',
    nama varchar(50) NOT NULL DEFAULT '',
    jns_kelamin varchar(1) NOT NULL DEFAULT '',
    status varchar(15) NOT NULL DEFAULT '',
    alamat varchar(100) NOT NULL DEFAULT '',
    kota varchar(50) NOT NULL DEFAULT '',
    kodepos integer NOT NULL DEFAULT 0,
    hp varchar(20) NOT NULL DEFAULT '',
    telp_rmh varchar(20) NOT NULL DEFAULT '',
    bank_nama varchar(15) NOT NULL DEFAULT '',
    bank_no_rek varchar(15) NOT NULL DEFAULT '',
    bank_atas_nama varchar(50) NOT NULL DEFAULT '',
    tglpencatatan date,
    simpanan_pokok numeric(20,4) NOT NULL DEFAULT 0,
    simpanan_wajib numeric(20,4) NOT NULL DEFAULT 0,
    simpanan_sukarela numeric(20,4) NOT NULL DEFAULT 0,
    opr varchar(15) NOT NULL DEFAULT '',
    tgl_keluar date,
    alasan_keluar varchar(100) NOT NULL DEFAULT '',
    status_acc varchar(15) NOT NULL DEFAULT '',
    keterangan_acc varchar(15) NOT NULL DEFAULT '',
    karyawan_mattel_id bigint,
    operator_id bigint
);
COMMENT ON TABLE anggota IS 'Legacy MySQL: anggota';

CREATE TABLE anggota_detail (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    urut integer NOT NULL,
    kode_agt varchar(15) NOT NULL DEFAULT '0',
    foto_anggota varchar(75) NOT NULL DEFAULT '',
    foto_tempat_tinggal varchar(100) NOT NULL DEFAULT '',
    foto_tempat_usaha varchar(100) NOT NULL DEFAULT '',
    no_pengajuan varchar(15) NOT NULL DEFAULT '',
    tgl_pengajuan date,
    guna_pengajuan varchar(15) NOT NULL DEFAULT '',
    blangko_permohonan varchar(15) NOT NULL DEFAULT '',
    foto_copy_identitas_pribadi varchar(15) NOT NULL DEFAULT '',
    foto_copy_ktp varchar(15) NOT NULL DEFAULT '',
    foto_copy_sim varchar(15) NOT NULL DEFAULT '',
    no_sim varchar(15) NOT NULL DEFAULT '',
    foto_copy_kk varchar(15) NOT NULL DEFAULT '',
    foto_copy_rek_tabungan varchar(15) NOT NULL DEFAULT '',
    foto_copy_struk_gaji varchar(15) NOT NULL DEFAULT '',
    jaminan varchar(15) NOT NULL DEFAULT '',
    jaminan_a varchar(15) NOT NULL DEFAULT '',
    jaminan_b varchar(15) NOT NULL DEFAULT '',
    lainnya varchar(15) NOT NULL DEFAULT '',
    lainnya_a varchar(15) NOT NULL DEFAULT '',
    lainnya_b varchar(15) NOT NULL DEFAULT '',
    status_tempat_tinggal varchar(15) NOT NULL DEFAULT '',
    bidang_usaha varchar(15) NOT NULL DEFAULT '',
    siup varchar(15) NOT NULL DEFAULT '',
    rencana_lama_pinjaman_tahun varchar(15) NOT NULL DEFAULT '',
    rencana_lama_pinjaman_bulan varchar(15) NOT NULL DEFAULT '',
    pelaksanaan_angsuran varchar(15) NOT NULL DEFAULT '',
    sumber_pelunasan varchar(15) NOT NULL DEFAULT '',
    bpkb varchar(15) NOT NULL DEFAULT '',
    bpkb_kepemilikan varchar(15) NOT NULL DEFAULT '',
    bpkb_merk_tahun varchar(4) NOT NULL DEFAULT '',
    bpkb_no_pol varchar(15) NOT NULL DEFAULT '',
    bpkb_no_rangka varchar(15) NOT NULL DEFAULT '',
    bpkb_kondisi_barang varchar(15) NOT NULL DEFAULT '',
    bpkb_harga_jual numeric(20,4) NOT NULL DEFAULT 0,
    sertifikat varchar(25) NOT NULL DEFAULT '',
    sertifikat_kepemilikan varchar(25) NOT NULL DEFAULT '',
    sertifikat_lokasi_jaminan varchar(25) NOT NULL DEFAULT '',
    sertifikat_luas_jaminan varchar(25) NOT NULL DEFAULT '',
    sertifikat_harga_jual numeric(20,4) NOT NULL DEFAULT 0,
    tempat_tinggal varchar(25) NOT NULL DEFAULT '',
    tempat_usaha varchar(25) NOT NULL DEFAULT '',
    nama_surveyor varchar(25) NOT NULL DEFAULT '',
    no_ktp_sim varchar(25) NOT NULL DEFAULT '',
    fasilitas_listrik varchar(25) NOT NULL DEFAULT '',
    fasilitas_pdam varchar(25) NOT NULL DEFAULT '',
    fasilitas_lain_lain varchar(25) NOT NULL DEFAULT '',
    ket_pot1 varchar(25) NOT NULL DEFAULT '',
    ket_pot2 varchar(25) NOT NULL DEFAULT '',
    ket_pot3 varchar(25) NOT NULL DEFAULT '',
    ket_tunjangan1 varchar(25) NOT NULL DEFAULT '',
    ket_tunjangan2 varchar(25) NOT NULL DEFAULT '',
    ket_tunjangan3 varchar(25) NOT NULL DEFAULT '',
    rp_deposito numeric(20,4) NOT NULL DEFAULT 0,
    tgl_jatuh_tempo date,
    rp_potgaji_1 numeric(20,4) NOT NULL DEFAULT 0,
    rp_potgaji_2 numeric(20,4) NOT NULL DEFAULT 0,
    rp_potgaji_3 numeric(20,4) NOT NULL DEFAULT 0,
    rp_biaya_rumah_tangga numeric(20,4) NOT NULL DEFAULT 0,
    rp_biaya_sekolah numeric(20,4) NOT NULL DEFAULT 0,
    rp_biaya_lain1 numeric(20,4) NOT NULL DEFAULT 0,
    rp_biaya_lain2 numeric(20,4) NOT NULL DEFAULT 0,
    rp_tunjangan_1 numeric(20,4) NOT NULL DEFAULT 0,
    rp_tunjangan_2 numeric(20,4) NOT NULL DEFAULT 0,
    rp_tunjangan_3 numeric(20,4) NOT NULL DEFAULT 0,
    potong_gaji varchar(25) NOT NULL DEFAULT '',
    departemen varchar(15) NOT NULL DEFAULT '',
    rp_gaji_pokok numeric(20,4) NOT NULL DEFAULT 0,
    rp_hak_plafond numeric(20,4) NOT NULL DEFAULT 0,
    npwp varchar(25) NOT NULL DEFAULT '',
    jabatan varchar(25) NOT NULL DEFAULT '',
    lama_menempati_tahun varchar(3) NOT NULL DEFAULT '',
    lama_menempati_bulan varchar(3) NOT NULL DEFAULT '',
    nama_istri_suami varchar(25) NOT NULL DEFAULT '',
    jml_tanggungan varchar(2) NOT NULL DEFAULT '',
    jml_anak varchar(2) NOT NULL DEFAULT '',
    pekerjaan varchar(15) NOT NULL DEFAULT '',
    alamat_kerja varchar(84) NOT NULL DEFAULT '',
    nama_perusahaan varchar(25) NOT NULL DEFAULT '',
    lama_bekerja_tahun varchar(10) NOT NULL DEFAULT '',
    lama_bekerja_bulan varchar(10) NOT NULL DEFAULT '',
    telp_ktr varchar(20) NOT NULL DEFAULT '',
    anggota_id bigint
);
COMMENT ON TABLE anggota_detail IS 'Legacy MySQL: anggota_detail';

CREATE TABLE himbauan (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    judul_himbauan varchar(255),
    isi_himbauan varchar(255),
    image varchar(255),
    status boolean DEFAULT true
);
COMMENT ON TABLE himbauan IS 'Legacy MySQL: himbauan (id lama dipertahankan)';

CREATE TABLE jenis_kredit (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    group_pinjaman varchar(35) NOT NULL DEFAULT '',
    jenis_pinjaman varchar(25) NOT NULL DEFAULT '',
    jatuh_tempo integer NOT NULL DEFAULT 0,
    kunci_jika_sisa integer NOT NULL DEFAULT 0,
    kunci_jika_melebihi_grade integer NOT NULL DEFAULT 0,
    kunci_hanya_untuk_staff integer NOT NULL DEFAULT 0,
    pakai_adm integer NOT NULL DEFAULT 0,
    pakai_um integer NOT NULL DEFAULT 0,
    type_angsuran varchar(100) NOT NULL DEFAULT '',
    persen_adm numeric(12,6) NOT NULL DEFAULT 0,
    persen_provisi numeric(12,6) NOT NULL DEFAULT 0,
    kode_kredit varchar(100) NOT NULL DEFAULT '',
    nama_kredit varchar(100) NOT NULL DEFAULT '',
    bunga_kredit numeric(12,6) NOT NULL DEFAULT 0,
    bunga_per varchar(100) NOT NULL DEFAULT '',
    mak_cicilan integer NOT NULL DEFAULT 0,
    coa_kredit integer NOT NULL DEFAULT 0,
    coa_jasa integer NOT NULL DEFAULT 0,
    coa_adm integer NOT NULL DEFAULT 0,
    coa_provisi integer NOT NULL DEFAULT 0,
    pakai_denda integer NOT NULL DEFAULT 0,
    persen_denda numeric(12,6) NOT NULL DEFAULT 0,
    hitung_shu integer NOT NULL DEFAULT 0,
    hide boolean NOT NULL DEFAULT false,
    coa_kredit_id bigint,
    coa_jasa_id bigint,
    coa_adm_id bigint,
    coa_provisi_id bigint
);
COMMENT ON TABLE jenis_kredit IS 'Legacy MySQL: jenis_kredit';

CREATE TABLE jenis_macet (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    urut integer NOT NULL,
    nama_macet varchar(100),
    lama integer,
    denda numeric(20,4)
);
COMMENT ON TABLE jenis_macet IS 'Legacy MySQL: jenis_macet';

CREATE TABLE jenis_pos_shu (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    urut integer NOT NULL,
    nama_pos_shu varchar(100),
    kode_coa varchar(25),
    prosentase numeric(12,6),
    rp_nominal numeric(20,4),
    perkiraan_id bigint
);
COMMENT ON TABLE jenis_pos_shu IS 'Legacy MySQL: jenis_pos_shu';

CREATE TABLE jenis_simpanan (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    kode_simpanan varchar(2) NOT NULL DEFAULT '',
    nama_simpanan varchar(100) NOT NULL DEFAULT '',
    persen_laba numeric(12,6) NOT NULL DEFAULT 0,
    coa_simpanan integer NOT NULL DEFAULT 0,
    endapan integer NOT NULL DEFAULT 0,
    up_persen numeric(12,6) NOT NULL DEFAULT 0,
    coa_id bigint
);
COMMENT ON TABLE jenis_simpanan IS 'Legacy MySQL: jenis_simpanan';

CREATE TABLE jurnal_umum (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    urutan integer NOT NULL,
    tanggal_jurnalumum date,
    nomor_bukti varchar(50) NOT NULL DEFAULT '0',
    no_bukti_transaksi varchar(100) NOT NULL DEFAULT '',
    tahun varchar(100) NOT NULL DEFAULT '',
    kode_perkiraan varchar(25) NOT NULL DEFAULT '0',
    urut integer NOT NULL DEFAULT 0,
    temp numeric(20,4) NOT NULL DEFAULT 0.00,
    urut_bb integer NOT NULL DEFAULT 0,
    kode_rekening_bankbook varchar(100) NOT NULL DEFAULT '',
    jns_rc varchar(100) NOT NULL DEFAULT '',
    tgl_transaksi date,
    kode_rekening_tujuan varchar(100) NOT NULL DEFAULT '',
    nama_rekening_tujuan varchar(100) NOT NULL DEFAULT '',
    tgl_rekonsiliasi date,
    status varchar(100) NOT NULL DEFAULT '',
    debit_jurnalumum numeric(20,4) NOT NULL DEFAULT 0.00,
    kredit_jurnalumum numeric(20,4) NOT NULL DEFAULT 0.00,
    deskripsi varchar(100) NOT NULL DEFAULT '',
    opr varchar(50),
    sumber_tipe varchar(30),
    sumber_id bigint,
    perkiraan_id bigint,
    operator_id bigint
);
COMMENT ON TABLE jurnal_umum IS 'Legacy MySQL: jurnal_umum';
COMMENT ON COLUMN jurnal_umum.sumber_tipe IS 'Diturunkan saat migrasi dari nomor_bukti; NULL jika tidak ada dokumen sumber yang cocok.';

CREATE TABLE karyawan_mattel (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    plant varchar(25) NOT NULL,
    nik varchar(25) NOT NULL,
    nama varchar(50),
    sts varchar(10),
    dept varchar(5),
    deptname varchar(50),
    sect varchar(5),
    sectname varchar(50),
    grade varchar(5),
    emadd1 varchar(100),
    emadd2 varchar(100),
    emadd3 varchar(100),
    emphone varchar(50),
    joindate date,
    tgl_lahir date,
    no_rek varchar(50),
    emsext varchar(10),
    emmrst varchar(10),
    emreli varchar(10)
);
COMMENT ON TABLE karyawan_mattel IS 'Legacy MySQL: karyawan_mattel';

CREATE TABLE kas (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    warna integer NOT NULL DEFAULT 0,
    urutan integer NOT NULL DEFAULT 0,
    urut integer NOT NULL DEFAULT 0,
    untuk_dari varchar(100) NOT NULL DEFAULT '',
    opr varchar(100) NOT NULL DEFAULT '',
    tgl_kas date,
    no_bukti varchar(100) NOT NULL DEFAULT '',
    no_bukti_transaksi varchar(100) NOT NULL DEFAULT '',
    kelompok varchar(100) NOT NULL DEFAULT '',
    deskripsi varchar(255) NOT NULL DEFAULT '',
    rp_saldo numeric(20,4) NOT NULL DEFAULT 0,
    rp_debet numeric(20,4) NOT NULL DEFAULT 0,
    rp_kredit numeric(20,4) NOT NULL DEFAULT 0,
    operator_id bigint
);
COMMENT ON TABLE kas IS 'Legacy MySQL: kas';

CREATE TABLE klasifikasi_perkiraan (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    kode_klasifikasi integer NOT NULL,
    nama_klasifikasi varchar(100) NOT NULL DEFAULT ''
);
COMMENT ON TABLE klasifikasi_perkiraan IS 'Legacy MySQL: klasifikasi_perkiraan';

CREATE TABLE kolektor (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    urut integer NOT NULL DEFAULT 0,
    id_kolektor varchar(100) NOT NULL DEFAULT '',
    jabatan varchar(100) NOT NULL DEFAULT '',
    nama_kolektor varchar(100) NOT NULL DEFAULT '',
    alamat_kolektor varchar(100) NOT NULL DEFAULT '',
    kota_kolektor varchar(100) NOT NULL DEFAULT '',
    telp_kolektor varchar(100) NOT NULL DEFAULT '',
    tgl_catat date NOT NULL
);
COMMENT ON TABLE kolektor IS 'Legacy MySQL: kolektor';

CREATE TABLE kpr (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    rp_angsuran_per_bulan numeric(20,4) NOT NULL DEFAULT 0,
    no_debitur varchar(100) NOT NULL DEFAULT '',
    nama_bank_debitur varchar(100) NOT NULL DEFAULT '',
    nama_developer varchar(100) NOT NULL DEFAULT '',
    tgl_akhir_bayar date,
    kode_agt varchar(100) NOT NULL DEFAULT '',
    kode_kredit varchar(20) NOT NULL DEFAULT '',
    no_pinjaman varchar(30) NOT NULL DEFAULT '',
    tgl_pinjaman date,
    tgl_catat date,
    jatuh_tempo integer NOT NULL DEFAULT 0,
    jatuh_tempo_tgl date,
    deskripsi varchar(100) NOT NULL DEFAULT '',
    rp_pinjaman_pokok numeric(20,4) NOT NULL DEFAULT 0,
    rp_pinjaman_bunga numeric(20,4) NOT NULL DEFAULT 0,
    rp_bayar_pokok numeric(20,4) NOT NULL DEFAULT 0,
    rp_bayar_bunga numeric(20,4) NOT NULL DEFAULT 0,
    rp_saldo_pokok numeric(20,4) NOT NULL DEFAULT 0,
    rp_saldo_bunga numeric(20,4) NOT NULL DEFAULT 0,
    lama_angsuran integer NOT NULL DEFAULT 0,
    jml_cicilan integer NOT NULL DEFAULT 0,
    jml_tunggakan integer NOT NULL DEFAULT 0,
    no_pinjaman_urut integer NOT NULL DEFAULT 0,
    coa_kas integer NOT NULL DEFAULT 0,
    anggota_id bigint,
    jenis_kredit_id bigint,
    kas_perkiraan_id bigint
);
COMMENT ON TABLE kpr IS 'Legacy MySQL: kpr';

CREATE TABLE kpr_rincian (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    no_bukti varchar(100) NOT NULL DEFAULT '',
    urut integer NOT NULL,
    jumlah_pembiayaan numeric(20,4) NOT NULL DEFAULT 0,
    no_pinjaman varchar(50) NOT NULL DEFAULT '',
    deskripsi varchar(100) NOT NULL DEFAULT '',
    debit_pokok numeric(20,4) NOT NULL DEFAULT 0,
    kredit_pokok numeric(20,4) NOT NULL DEFAULT 0,
    saldo_pokok numeric(20,4) NOT NULL DEFAULT 0,
    debit_bunga numeric(20,4) NOT NULL DEFAULT 0,
    kredit_bunga numeric(20,4) NOT NULL DEFAULT 0,
    saldo_bunga numeric(20,4) NOT NULL DEFAULT 0,
    angsuran_ke integer NOT NULL DEFAULT 0,
    tanggal_angsuran date NOT NULL,
    coa_kas integer,
    kpr_id bigint,
    kas_perkiraan_id bigint
);
COMMENT ON TABLE kpr_rincian IS 'Legacy MySQL: kpr_rincian';

CREATE TABLE kpr_rincian_tagih (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    urut integer NOT NULL,
    no_pinjaman varchar(50) NOT NULL DEFAULT '',
    no_bukti varchar(100) NOT NULL DEFAULT '',
    tgl_bayar date,
    bayar_pokok numeric(20,4) NOT NULL DEFAULT 0,
    bayar_bunga numeric(20,4) NOT NULL DEFAULT 0,
    jumlah_pembiayaan numeric(20,4) NOT NULL DEFAULT 0,
    deskripsi varchar(100) NOT NULL DEFAULT '',
    debit_pokok numeric(20,4) NOT NULL DEFAULT 0,
    kredit_pokok numeric(20,4) NOT NULL DEFAULT 0,
    saldo_pokok numeric(20,4) NOT NULL DEFAULT 0,
    debit_bunga numeric(20,4) NOT NULL DEFAULT 0,
    kredit_bunga numeric(20,4) NOT NULL DEFAULT 0,
    saldo_bunga numeric(20,4) NOT NULL DEFAULT 0,
    angsuran_ke integer NOT NULL DEFAULT 0,
    tanggal_angsuran date NOT NULL,
    coa_kas integer,
    kpr_id bigint,
    kas_perkiraan_id bigint
);
COMMENT ON TABLE kpr_rincian_tagih IS 'Legacy MySQL: kpr_rincian_tagih';

CREATE TABLE log_notifikasi (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    urut integer NOT NULL,
    kode_agt varchar(25),
    title varchar(50),
    pesan text,
    datetimes timestamp DEFAULT now(),
    anggota_id bigint
);
COMMENT ON TABLE log_notifikasi IS 'Legacy MySQL: log_notifikasi';

CREATE TABLE opr (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    pertanyaan varchar(100) NOT NULL DEFAULT '',
    jawaban_hash varchar(255),
    status_aktif varchar(100) NOT NULL DEFAULT '',
    id_opr integer DEFAULT 0,
    logo bytea,
    status varchar(10) DEFAULT 'operator',
    nama_lengkap varchar(50) DEFAULT '',
    nama varchar(50) NOT NULL DEFAULT '',
    alamat varchar(100),
    telp varchar(17),
    urut_grup integer,
    password_hash varchar(255),
    wajib_ganti_password boolean NOT NULL DEFAULT true,
    grup_id bigint
);
COMMENT ON TABLE opr IS 'Legacy MySQL: opr';
COMMENT ON COLUMN opr.password_hash IS 'NULL sampai operator menetapkan password baru.';

CREATE TABLE opr_grup (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    urut integer NOT NULL,
    nama_grup varchar(50)
);
COMMENT ON TABLE opr_grup IS 'Legacy MySQL: opr_grup';

CREATE TABLE opr_hak_akses (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    urut integer NOT NULL DEFAULT 0,
    id_opr integer NOT NULL DEFAULT 0,
    menu varchar(100) NOT NULL DEFAULT '',
    akses varchar(3) NOT NULL DEFAULT '',
    grup_id bigint
);
COMMENT ON TABLE opr_hak_akses IS 'Legacy MySQL: opr_hak_akses';

CREATE TABLE opr_history (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    urut integer NOT NULL,
    opr varchar(50),
    tanggal date,
    datetime timestamp,
    jam time,
    ket varchar(255),
    no_faktur varchar(50),
    jns_trx varchar(50),
    opr_edit varchar(50),
    operator_id bigint
);
COMMENT ON TABLE opr_history IS 'Legacy MySQL: opr_history';

CREATE TABLE pengajuan_pinjaman (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    tgl_realisasi date,
    kd_anggota varchar(50),
    kd_kredit varchar(50),
    persen_bunga numeric(12,6),
    lama_angsuran integer,
    rp_pinjaman_pokok numeric(20,4),
    keterangan varchar(100),
    status text DEFAULT 'P',
    persen_adm numeric(12,6),
    persen_provisi numeric(12,6),
    persen_denda numeric(12,6),
    anggota_id bigint,
    jenis_kredit_id bigint
);
COMMENT ON TABLE pengajuan_pinjaman IS 'Legacy MySQL: pengajuan_pinjaman (id lama dipertahankan)';

CREATE TABLE perkiraan (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    rp_budget numeric(20,4) NOT NULL DEFAULT 0,
    pr_id integer NOT NULL,
    rp_saldo_awal numeric(20,4) NOT NULL DEFAULT 0.00,
    tgl_saldo_awal date,
    pr_parent integer NOT NULL DEFAULT 0,
    image integer NOT NULL DEFAULT 0,
    keterangan varchar(100) NOT NULL DEFAULT '',
    kode_klasifikasi integer NOT NULL DEFAULT 0,
    d_k varchar(1) NOT NULL DEFAULT '',
    kode_perkiraan varchar(100) NOT NULL DEFAULT '',
    nama_perkiraan varchar(100) NOT NULL DEFAULT '',
    klasifikasi_id bigint,
    parent_id bigint
);
COMMENT ON TABLE perkiraan IS 'Legacy MySQL: perkiraan';

CREATE TABLE pertanyaan (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    urut bigint NOT NULL,
    pertanyaan varchar(100) NOT NULL DEFAULT '0'
);
COMMENT ON TABLE pertanyaan IS 'Legacy MySQL: pertanyaan';

CREATE TABLE perusahaan (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nama_manager varchar(100) NOT NULL DEFAULT '',
    kode_company varchar(100) NOT NULL DEFAULT '',
    login_full_screen integer NOT NULL DEFAULT 0,
    cetak_faktur integer NOT NULL DEFAULT 0,
    cetak_struk integer NOT NULL DEFAULT 0,
    cetak_langsung integer NOT NULL DEFAULT 0,
    cetak_penjualan_kasir integer NOT NULL DEFAULT 0,
    pesan_jika_stock_kurang integer NOT NULL DEFAULT 0,
    ppn_faktur_penjualan integer NOT NULL DEFAULT 0,
    disc_faktur_penjualan integer NOT NULL DEFAULT 0,
    disc_faktur_readonly integer NOT NULL DEFAULT 0,
    disc_rincian_readonly integer NOT NULL DEFAULT 0,
    cash_drawer integer NOT NULL DEFAULT 0,
    nama_perusahaan varchar(100) NOT NULL DEFAULT 'NONAME',
    alamat_perusahaan1 varchar(255) NOT NULL DEFAULT '',
    alamat_perusahaan2 varchar(255) NOT NULL DEFAULT '',
    kota_perusahaan varchar(100) NOT NULL DEFAULT '',
    ket_nota text NOT NULL,
    ket_nota2 text NOT NULL,
    email varchar(100) NOT NULL DEFAULT '',
    http varchar(100) NOT NULL DEFAULT '',
    npwp varchar(100) NOT NULL DEFAULT '',
    siup varchar(100) NOT NULL DEFAULT '',
    tdp varchar(100) NOT NULL DEFAULT '',
    logo bytea NOT NULL,
    update_app integer NOT NULL DEFAULT 0,
    rp_adm_bank numeric(20,4) NOT NULL DEFAULT 2000,
    persen_pajak_pendapatan numeric(12,6) NOT NULL DEFAULT 2000
);
COMMENT ON TABLE perusahaan IS 'Legacy MySQL: perusahaan';

CREATE TABLE pinjaman_tunai (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    no_debitur varchar(15) NOT NULL DEFAULT '',
    nama_bank_debitur varchar(15) NOT NULL DEFAULT '',
    nama_developer varchar(15) NOT NULL DEFAULT '',
    nama_bank varchar(15) NOT NULL DEFAULT '',
    atas_nama varchar(15) NOT NULL DEFAULT '',
    persen_adm numeric(12,6) NOT NULL DEFAULT 0,
    rp_adm numeric(20,4) NOT NULL DEFAULT 0,
    persen_provisi numeric(12,6) NOT NULL DEFAULT 0,
    rp_provisi numeric(20,4) NOT NULL DEFAULT 0,
    persen_denda numeric(12,6) NOT NULL DEFAULT 0,
    rp_denda numeric(20,4) NOT NULL DEFAULT 0,
    status varchar(15) NOT NULL DEFAULT '',
    jml_hari integer NOT NULL DEFAULT 0,
    rp_uang_muka numeric(20,4) NOT NULL DEFAULT 0,
    id_kolektor varchar(5) NOT NULL DEFAULT '',
    id_surveyor varchar(5) NOT NULL DEFAULT '',
    id_supervisor varchar(5) NOT NULL DEFAULT '',
    id_sales varchar(5) NOT NULL DEFAULT '',
    no_rek varchar(20) NOT NULL DEFAULT '',
    jaminan varchar(25) NOT NULL DEFAULT '',
    jaminan2 varchar(25) NOT NULL DEFAULT '',
    jaminan3 varchar(25) NOT NULL DEFAULT '',
    jaminan4 varchar(25) NOT NULL DEFAULT '',
    tgl_akhir_bayar date,
    rp_gaji_bruto numeric(20,4) NOT NULL DEFAULT 0,
    ket_pot1 varchar(25) NOT NULL DEFAULT '',
    ket_pot2 varchar(25) NOT NULL DEFAULT '',
    ket_pot3 varchar(25) NOT NULL DEFAULT '',
    ket_pot4 varchar(25) NOT NULL DEFAULT '',
    ket_pot5 varchar(25) NOT NULL DEFAULT '',
    rp_pot1 numeric(20,4) NOT NULL DEFAULT 0,
    rp_pot2 numeric(20,4) NOT NULL DEFAULT 0,
    rp_pot3 numeric(20,4) NOT NULL DEFAULT 0,
    rp_pot4 numeric(20,4) NOT NULL DEFAULT 0,
    rp_pot5 numeric(20,4) NOT NULL DEFAULT 0,
    rp_hak_plafond numeric(20,4) NOT NULL DEFAULT 0,
    kode_agt varchar(15) NOT NULL DEFAULT '',
    kode_kredit varchar(5) NOT NULL DEFAULT '',
    no_pinjaman varchar(15) NOT NULL DEFAULT '',
    tgl_pinjaman date,
    tgl_catat date,
    jatuh_tempo integer NOT NULL DEFAULT 0,
    jatuh_tempo_tgl date,
    deskripsi varchar(25) NOT NULL DEFAULT '',
    persen_bunga numeric(12,6) NOT NULL DEFAULT 0,
    bunga_per integer NOT NULL DEFAULT 1,
    rp_pinjaman_pokok numeric(20,4) NOT NULL DEFAULT 0,
    rp_pinjaman_bunga numeric(20,4) NOT NULL DEFAULT 0,
    rp_bayar_pokok numeric(20,4) NOT NULL DEFAULT 0,
    rp_bayar_bunga numeric(20,4) NOT NULL DEFAULT 0,
    rp_saldo_pokok numeric(20,4) NOT NULL DEFAULT 0,
    rp_saldo_bunga numeric(20,4) NOT NULL DEFAULT 0,
    lama_angsuran integer NOT NULL DEFAULT 0,
    jml_cicilan integer NOT NULL DEFAULT 0,
    sisa_cicilan integer NOT NULL DEFAULT 0,
    jml_tunggakan integer NOT NULL DEFAULT 0,
    no_pinjaman_urut integer NOT NULL DEFAULT 0,
    coa_kas integer NOT NULL DEFAULT 0,
    opr varchar(50) NOT NULL DEFAULT '',
    anggota_id bigint,
    jenis_kredit_id bigint,
    kas_perkiraan_id bigint,
    kolektor_id bigint,
    sales_id bigint,
    operator_id bigint
);
COMMENT ON TABLE pinjaman_tunai IS 'Legacy MySQL: pinjaman_tunai';
COMMENT ON COLUMN pinjaman_tunai.bunga_per IS '1 = bunga per angsuran (jasa dikali lama angsuran); selain itu = lama angsuran (jasa sekali).';
COMMENT ON COLUMN pinjaman_tunai.rp_bayar_pokok IS 'LEGACY: berisi SISA pokok setelah angsuran terakhir, bukan jumlah terbayar. Jangan dipakai; hitung dari pinjaman_tunai_rincian.';
COMMENT ON COLUMN pinjaman_tunai.rp_bayar_bunga IS 'LEGACY: berisi SISA bunga setelah angsuran terakhir, bukan jumlah terbayar. Jangan dipakai; hitung dari pinjaman_tunai_rincian.';
COMMENT ON COLUMN pinjaman_tunai.rp_saldo_pokok IS 'LEGACY: tidak sinkron dengan rincian. Saldo yang benar = SUM(kredit_pokok - debit_pokok) di pinjaman_tunai_rincian.';
COMMENT ON COLUMN pinjaman_tunai.rp_saldo_bunga IS 'LEGACY: tidak sinkron dengan rincian. Saldo yang benar = SUM(kredit_bunga - debit_bunga) di pinjaman_tunai_rincian.';

CREATE TABLE pinjaman_tunai_rincian (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    no_bukti varchar(25) NOT NULL DEFAULT '',
    jumlah_pembiayaan numeric(20,4) NOT NULL DEFAULT 0,
    urut integer NOT NULL,
    no_pinjaman varchar(15) NOT NULL DEFAULT '',
    deskripsi varchar(100) NOT NULL DEFAULT '',
    debit_pokok numeric(20,4) NOT NULL DEFAULT 0,
    kredit_pokok numeric(20,4) NOT NULL DEFAULT 0,
    saldo_pokok numeric(20,4) NOT NULL DEFAULT 0,
    debit_bunga numeric(20,4) NOT NULL DEFAULT 0,
    kredit_bunga numeric(20,4) NOT NULL DEFAULT 0,
    saldo_bunga numeric(20,4) NOT NULL DEFAULT 0,
    rp_adm numeric(20,4) NOT NULL DEFAULT 0,
    rp_provisi numeric(20,4) NOT NULL DEFAULT 0,
    angsuran_ke integer NOT NULL DEFAULT 0,
    tanggal_angsuran date NOT NULL,
    coa_kas integer NOT NULL DEFAULT 0,
    pinjaman_tunai_id bigint,
    kas_perkiraan_id bigint
);
COMMENT ON TABLE pinjaman_tunai_rincian IS 'Legacy MySQL: pinjaman_tunai_rincian';

CREATE TABLE pinjaman_tunai_rincian_tagih (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    tgl_bayar date,
    urut integer NOT NULL,
    bayar_pokok numeric(20,4) NOT NULL DEFAULT 0,
    bayar_bunga numeric(20,4) NOT NULL DEFAULT 0,
    no_bukti varchar(25) NOT NULL DEFAULT '',
    jumlah_pembiayaan numeric(20,4) NOT NULL DEFAULT 0,
    no_pinjaman varchar(15) NOT NULL DEFAULT '',
    deskripsi varchar(100) NOT NULL DEFAULT '',
    debit_pokok numeric(20,4) NOT NULL DEFAULT 0,
    kredit_pokok numeric(20,4) NOT NULL DEFAULT 0,
    saldo_pokok numeric(20,4) NOT NULL DEFAULT 0,
    debit_bunga numeric(20,4) NOT NULL DEFAULT 0,
    kredit_bunga numeric(20,4) NOT NULL DEFAULT 0,
    saldo_bunga numeric(20,4) NOT NULL DEFAULT 0,
    rp_adm numeric(20,4) NOT NULL DEFAULT 0,
    rp_provisi numeric(20,4) NOT NULL DEFAULT 0,
    angsuran_ke integer NOT NULL DEFAULT 0,
    tanggal_angsuran date NOT NULL,
    pinjaman_tunai_id bigint
);
COMMENT ON TABLE pinjaman_tunai_rincian_tagih IS 'Legacy MySQL: pinjaman_tunai_rincian_tagih';

CREATE TABLE pinjaman_tunai_titipan (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    no_pinjaman varchar(100) NOT NULL DEFAULT '',
    urut integer NOT NULL,
    tanggal date NOT NULL,
    rp_jumlah numeric(20,4) NOT NULL DEFAULT 0,
    status varchar(100) NOT NULL DEFAULT '',
    pinjaman_tunai_id bigint
);
COMMENT ON TABLE pinjaman_tunai_titipan IS 'Legacy MySQL: pinjaman_tunai_titipan';

CREATE TABLE promo (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    judul varchar(255),
    isi varchar(255),
    image varchar(255),
    status boolean DEFAULT true
);
COMMENT ON TABLE promo IS 'Legacy MySQL: promo (id lama dipertahankan)';

CREATE TABLE saldo_perkiraan (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    pr_id integer NOT NULL,
    rp_debit_last_year numeric(20,4) NOT NULL DEFAULT 0,
    rp_debit_in_year numeric(20,4) NOT NULL DEFAULT 0,
    rp_kredit_last_year numeric(20,4) NOT NULL DEFAULT 0,
    rp_kredit_in_year numeric(20,4) NOT NULL DEFAULT 0,
    rp_saldo_last_year numeric(20,4) NOT NULL DEFAULT 0,
    rp_saldo_in_year numeric(20,4) NOT NULL DEFAULT 0,
    tgl_saldo_awal date,
    rp_saldo_awal numeric(20,4) NOT NULL DEFAULT 0,
    pr_parent integer NOT NULL DEFAULT 0,
    image integer NOT NULL DEFAULT 0,
    keterangan varchar(100) NOT NULL DEFAULT '',
    kode_klasifikasi integer NOT NULL DEFAULT 0,
    d_k varchar(1) NOT NULL DEFAULT '',
    kode_perkiraan varchar(15) NOT NULL DEFAULT '',
    nama_perkiraan varchar(100) NOT NULL DEFAULT '',
    opr varchar(25) NOT NULL DEFAULT '',
    perkiraan_id bigint,
    operator_id bigint
);
COMMENT ON TABLE saldo_perkiraan IS 'Legacy MySQL: saldo_perkiraan';

CREATE TABLE sales (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    urut integer NOT NULL DEFAULT 0,
    id_sales varchar(100) NOT NULL DEFAULT '',
    nama_sales varchar(100) NOT NULL DEFAULT '',
    alamat_sales varchar(100) NOT NULL DEFAULT '',
    telp_sales varchar(100) NOT NULL DEFAULT '',
    rp_fe_kg numeric(20,4) NOT NULL DEFAULT 0,
    jns_data varchar(50),
    status varchar(50) DEFAULT 'Aktif',
    id_dept integer,
    rp_uang_harian numeric(20,4),
    rp_tambahan1 numeric(20,4),
    ceklis boolean NOT NULL DEFAULT true
);
COMMENT ON TABLE sales IS 'Legacy MySQL: sales';

CREATE TABLE simpanan (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    urut integer,
    no_bukti varchar(50) NOT NULL,
    jenis_simpanan varchar(5) NOT NULL,
    kode_agt varchar(15) NOT NULL,
    tgl_transaksi date,
    jam_transaksi time,
    deskripsi varchar(100),
    persen_laba numeric(12,6) DEFAULT 0,
    rp_laba numeric(20,4) DEFAULT 0,
    rp_setoran numeric(20,4) DEFAULT 0,
    rp_pengambilan numeric(20,4) DEFAULT 0,
    rp_saldo numeric(20,4) DEFAULT 0,
    opr varchar(15) DEFAULT '0',
    jangka_waktu integer DEFAULT 0,
    coa_kas integer DEFAULT 0,
    anggota_id bigint,
    jenis_simpanan_id bigint,
    kas_perkiraan_id bigint,
    operator_id bigint
);
COMMENT ON TABLE simpanan IS 'Legacy MySQL: simpanan';
COMMENT ON COLUMN simpanan.coa_kas IS 'LEGACY: kolom asal bertipe TINYINT sehingga akun 177/179 tersimpan -79/-77. Pakai kas_perkiraan_id.';

CREATE TABLE temp_potongan_all (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    kode_agt varchar(15) NOT NULL DEFAULT '',
    no_rek varchar(15) NOT NULL DEFAULT '',
    nama_bank varchar(25) NOT NULL DEFAULT '',
    atas_nama_rek varchar(35) NOT NULL DEFAULT '',
    cara_bayar varchar(5) NOT NULL DEFAULT '',
    nik varchar(10) NOT NULL DEFAULT '',
    nama varchar(35) NOT NULL DEFAULT '',
    kota varchar(15) NOT NULL DEFAULT '',
    s_pokok numeric(20,4) NOT NULL DEFAULT 0,
    s_wajib numeric(20,4) NOT NULL DEFAULT 0,
    s_sukarela numeric(20,4) NOT NULL DEFAULT 0,
    rp_koperasi numeric(20,4) NOT NULL DEFAULT 0,
    rp_bank numeric(20,4) NOT NULL DEFAULT 0,
    rp_kpr numeric(20,4) NOT NULL DEFAULT 0,
    rp_adm_bank numeric(20,4) NOT NULL DEFAULT 0,
    keterangan varchar(50) NOT NULL DEFAULT '',
    tmp boolean NOT NULL DEFAULT true,
    anggota_id bigint
);
COMMENT ON TABLE temp_potongan_all IS 'Legacy MySQL: temp_potongan_all';

CREATE TABLE temp_potongan_bank (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    kode_agt varchar(15) NOT NULL DEFAULT '',
    no_rek varchar(15) NOT NULL DEFAULT '',
    nama_bank varchar(25) NOT NULL DEFAULT '',
    atas_nama_rek varchar(35) NOT NULL DEFAULT '',
    cara_bayar varchar(5) NOT NULL DEFAULT '',
    nik varchar(10) NOT NULL DEFAULT '',
    nama varchar(35) NOT NULL DEFAULT '',
    kota varchar(15) NOT NULL DEFAULT '',
    rp_pokok numeric(20,4) NOT NULL DEFAULT 0,
    rp_bunga numeric(20,4) NOT NULL DEFAULT 0,
    rp_adm numeric(20,4) NOT NULL DEFAULT 0,
    rp_provisi numeric(20,4) NOT NULL DEFAULT 0,
    rp_adm_bank numeric(20,4) NOT NULL DEFAULT 0,
    keterangan varchar(50) NOT NULL DEFAULT '',
    tmp integer NOT NULL DEFAULT 1,
    anggota_id bigint
);
COMMENT ON TABLE temp_potongan_bank IS 'Legacy MySQL: temp_potongan_bank';

CREATE TABLE temp_potongan_koperasi (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    kode_agt varchar(15) NOT NULL DEFAULT '',
    no_rek varchar(15) NOT NULL DEFAULT '',
    nama_bank varchar(25) NOT NULL DEFAULT '',
    atas_nama_rek varchar(35) NOT NULL DEFAULT '',
    cara_bayar varchar(5) NOT NULL DEFAULT '',
    nik varchar(10) NOT NULL DEFAULT '',
    nama varchar(35) NOT NULL DEFAULT '',
    kota varchar(15) NOT NULL DEFAULT '',
    rp_pokok numeric(20,4) NOT NULL DEFAULT 0,
    rp_bunga numeric(20,4) NOT NULL DEFAULT 0,
    rp_adm numeric(20,4) NOT NULL DEFAULT 0,
    rp_provisi numeric(20,4) NOT NULL DEFAULT 0,
    rp_adm_bank numeric(20,4) NOT NULL DEFAULT 0,
    keterangan varchar(50) NOT NULL DEFAULT '',
    tmp integer NOT NULL DEFAULT 1,
    anggota_id bigint
);
COMMENT ON TABLE temp_potongan_koperasi IS 'Legacy MySQL: temp_potongan_koperasi';

CREATE TABLE temp_potongan_kpr (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    kode_agt varchar(15) NOT NULL DEFAULT '',
    no_rek varchar(15) NOT NULL DEFAULT '',
    nama_bank varchar(25) NOT NULL DEFAULT '',
    atas_nama_rek varchar(35) NOT NULL DEFAULT '',
    cara_bayar varchar(5) NOT NULL DEFAULT '',
    nik varchar(10) NOT NULL DEFAULT '',
    nama varchar(35) NOT NULL DEFAULT '',
    kota varchar(15) NOT NULL DEFAULT '',
    rp_pokok numeric(20,4) NOT NULL DEFAULT 0,
    rp_bunga numeric(20,4) NOT NULL DEFAULT 0,
    rp_adm numeric(20,4) NOT NULL DEFAULT 0,
    rp_provisi numeric(20,4) NOT NULL DEFAULT 0,
    rp_adm_bank numeric(20,4) NOT NULL DEFAULT 0,
    keterangan varchar(50) NOT NULL DEFAULT '',
    tmp integer NOT NULL DEFAULT 1,
    anggota_id bigint
);
COMMENT ON TABLE temp_potongan_kpr IS 'Legacy MySQL: temp_potongan_kpr';

CREATE TABLE temp_shu (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    kode_agt varchar(15) NOT NULL DEFAULT '',
    tgl_masuk date,
    no_rek varchar(15) NOT NULL DEFAULT '',
    status_staff varchar(15) NOT NULL DEFAULT '',
    nik varchar(10) NOT NULL DEFAULT '',
    nama varchar(35) NOT NULL DEFAULT '',
    tgl_tutup_buku date,
    rp_labaditahan numeric(20,4) NOT NULL DEFAULT 0,
    rp_sukarela numeric(20,4) NOT NULL DEFAULT 0,
    rp_jasa_uang numeric(20,4) NOT NULL DEFAULT 0,
    rp_jasa_barang numeric(20,4) NOT NULL DEFAULT 0,
    lama_agt integer NOT NULL DEFAULT 0,
    opr varchar(25) NOT NULL DEFAULT '0',
    status integer NOT NULL DEFAULT 0,
    urut integer NOT NULL,
    no_reff varchar(50),
    rp_pencairan numeric(20,4) DEFAULT 0,
    anggota_id bigint
);
COMMENT ON TABLE temp_shu IS 'Legacy MySQL: temp_shu';

CREATE TABLE temp_shu_backup (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    kode_agt varchar(15) NOT NULL DEFAULT '',
    tgl_masuk date,
    no_rek varchar(15) NOT NULL DEFAULT '',
    status_staff varchar(15) NOT NULL DEFAULT '',
    nik varchar(10) NOT NULL DEFAULT '',
    nama varchar(35) NOT NULL DEFAULT '',
    tgl_tutup_buku date NOT NULL,
    rp_labaditahan numeric(20,4) NOT NULL DEFAULT 0,
    rp_sukarela numeric(20,4) NOT NULL DEFAULT 0,
    rp_jasa_uang numeric(20,4) NOT NULL DEFAULT 0,
    rp_jasa_barang numeric(20,4) NOT NULL DEFAULT 0,
    lama_agt integer NOT NULL DEFAULT 0,
    opr varchar(25) NOT NULL DEFAULT '0',
    status integer NOT NULL DEFAULT 0,
    urut integer NOT NULL,
    no_reff varchar(50) DEFAULT '-',
    rp_pencairan numeric(20,4) DEFAULT 0,
    anggota_id bigint
);
COMMENT ON TABLE temp_shu_backup IS 'Legacy MySQL: temp_shu_backup';
COMMENT ON COLUMN temp_shu_backup.no_reff IS 'Menunjuk ke jurnal_umum.nomor_bukti (jurnal pengambilan SHU), bukan ke simpanan.';

CREATE TABLE temp_simpanan (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    kode_agt varchar(100) NOT NULL DEFAULT '',
    nik varchar(15) NOT NULL DEFAULT '',
    nama varchar(35) NOT NULL DEFAULT '',
    cara_bayar varchar(5) NOT NULL DEFAULT '',
    no_rek varchar(15) NOT NULL DEFAULT '',
    nama_bank varchar(25) NOT NULL DEFAULT '',
    atas_nama_rek varchar(35) NOT NULL DEFAULT '',
    kota varchar(25) NOT NULL DEFAULT '',
    keterangan varchar(50) NOT NULL DEFAULT '',
    s_pokok numeric(20,4) NOT NULL DEFAULT 0,
    s_wajib numeric(20,4) NOT NULL DEFAULT 0,
    s_sukarela numeric(20,4) NOT NULL DEFAULT 0,
    tmp integer NOT NULL DEFAULT 1,
    anggota_id bigint
);
COMMENT ON TABLE temp_simpanan IS 'Legacy MySQL: temp_simpanan';

CREATE TABLE app_user (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    username varchar(70) NOT NULL,
    password_hash varchar(255) NOT NULL,
    kode_agt varchar(15) NOT NULL,
    status boolean NOT NULL DEFAULT false,
    created_at timestamp NOT NULL,
    updated_at timestamp,
    nikk varchar(50),
    id_pertanyaan bigint,
    jawaban_hash varchar(255),
    foto varchar(255),
    email varchar(100),
    fcm_token varchar(255),
    anggota_id bigint,
    karyawan_mattel_id bigint,
    pertanyaan_id bigint
);
COMMENT ON TABLE app_user IS 'Legacy MySQL: user (id lama dipertahankan)';
COMMENT ON COLUMN app_user.password_hash IS 'bcrypt ($2y$) atau MD5 (akun lama; di-rehash saat login).';
COMMENT ON COLUMN app_user.kode_agt IS 'LEGACY: berisi kode anggota, atau NIK karyawan Mattel bagi yang belum menjadi anggota. Pakai anggota_id / karyawan_mattel_id.';
COMMENT ON COLUMN app_user.jawaban_hash IS 'scrypt$<salt hex>$<hash hex> dari jawaban (trim + huruf kecil). Lihat README.';

CREATE TABLE variable_akun (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    urut integer NOT NULL DEFAULT 0,
    nama_items varchar(100) NOT NULL DEFAULT '',
    kode_akun varchar(100) NOT NULL DEFAULT '',
    nama_akun varchar(100) NOT NULL DEFAULT '',
    debet_kredit varchar(100) NOT NULL DEFAULT '',
    perkiraan_id bigint
);
COMMENT ON TABLE variable_akun IS 'Legacy MySQL: variable_akun';

CREATE TABLE variable_akun_jenis_transaksi (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    urut integer NOT NULL,
    jenis_transaksi varchar(100) NOT NULL DEFAULT ''
);
COMMENT ON TABLE variable_akun_jenis_transaksi IS 'Legacy MySQL: variable_akun_jenis_transaksi';

CREATE TABLE migration_report (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    step text NOT NULL,
    item text NOT NULL,
    detail jsonb,
    created_at timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE migration_report IS 'Hasil setiap proses migrasi: jumlah baris per tabel, baris yatim per relasi, analisis, dan verifikasi terhadap MySQL.';

-- @@ section: indexes
CREATE UNIQUE INDEX uq_anggota_kode_agt ON anggota (kode_agt);
CREATE INDEX ix_anggota_karyawan_mattel_id ON anggota (karyawan_mattel_id);
CREATE INDEX ix_anggota_operator_id ON anggota (operator_id);
CREATE UNIQUE INDEX uq_anggota_detail_urut ON anggota_detail (urut);
CREATE INDEX ix_anggota_detail_anggota_id ON anggota_detail (anggota_id);
CREATE UNIQUE INDEX uq_jenis_kredit_kode_kredit ON jenis_kredit (kode_kredit);
CREATE INDEX ix_jenis_kredit_coa_kredit_id ON jenis_kredit (coa_kredit_id);
CREATE INDEX ix_jenis_kredit_coa_jasa_id ON jenis_kredit (coa_jasa_id);
CREATE INDEX ix_jenis_kredit_coa_adm_id ON jenis_kredit (coa_adm_id);
CREATE INDEX ix_jenis_kredit_coa_provisi_id ON jenis_kredit (coa_provisi_id);
CREATE UNIQUE INDEX uq_jenis_macet_urut ON jenis_macet (urut);
CREATE UNIQUE INDEX uq_jenis_pos_shu_urut ON jenis_pos_shu (urut);
CREATE INDEX ix_jenis_pos_shu_perkiraan_id ON jenis_pos_shu (perkiraan_id);
CREATE UNIQUE INDEX uq_jenis_simpanan_kode_simpanan ON jenis_simpanan (kode_simpanan);
CREATE INDEX ix_jenis_simpanan_coa_id ON jenis_simpanan (coa_id);
CREATE UNIQUE INDEX uq_jurnal_umum_urutan ON jurnal_umum (urutan);
CREATE INDEX ix_jurnal_umum_perkiraan_id ON jurnal_umum (perkiraan_id);
CREATE INDEX ix_jurnal_umum_operator_id ON jurnal_umum (operator_id);
CREATE UNIQUE INDEX uq_karyawan_mattel_nik ON karyawan_mattel (nik);
CREATE UNIQUE INDEX uq_kas_urutan ON kas (urutan);
CREATE INDEX ix_kas_operator_id ON kas (operator_id);
CREATE UNIQUE INDEX uq_klasifikasi_perkiraan_kode_klasifikasi ON klasifikasi_perkiraan (kode_klasifikasi);
CREATE UNIQUE INDEX uq_kolektor_id_kolektor ON kolektor (id_kolektor);
CREATE UNIQUE INDEX uq_kpr_no_pinjaman ON kpr (no_pinjaman);
CREATE INDEX ix_kpr_anggota_id ON kpr (anggota_id);
CREATE INDEX ix_kpr_jenis_kredit_id ON kpr (jenis_kredit_id);
CREATE INDEX ix_kpr_kas_perkiraan_id ON kpr (kas_perkiraan_id);
CREATE UNIQUE INDEX uq_kpr_rincian_urut ON kpr_rincian (urut);
CREATE INDEX ix_kpr_rincian_kpr_id ON kpr_rincian (kpr_id);
CREATE INDEX ix_kpr_rincian_kas_perkiraan_id ON kpr_rincian (kas_perkiraan_id);
CREATE UNIQUE INDEX uq_kpr_rincian_tagih_urut ON kpr_rincian_tagih (urut);
CREATE INDEX ix_kpr_rincian_tagih_kpr_id ON kpr_rincian_tagih (kpr_id);
CREATE INDEX ix_kpr_rincian_tagih_kas_perkiraan_id ON kpr_rincian_tagih (kas_perkiraan_id);
CREATE UNIQUE INDEX uq_log_notifikasi_urut ON log_notifikasi (urut);
CREATE INDEX ix_log_notifikasi_anggota_id ON log_notifikasi (anggota_id);
CREATE UNIQUE INDEX uq_opr_nama ON opr (nama);
CREATE INDEX ix_opr_grup_id ON opr (grup_id);
CREATE UNIQUE INDEX uq_opr_grup_urut ON opr_grup (urut);
CREATE UNIQUE INDEX uq_opr_hak_akses_id_opr_menu ON opr_hak_akses (id_opr, menu);
CREATE INDEX ix_opr_hak_akses_grup_id ON opr_hak_akses (grup_id);
CREATE UNIQUE INDEX uq_opr_history_urut ON opr_history (urut);
CREATE INDEX ix_opr_history_operator_id ON opr_history (operator_id);
CREATE INDEX ix_pengajuan_pinjaman_anggota_id ON pengajuan_pinjaman (anggota_id);
CREATE INDEX ix_pengajuan_pinjaman_jenis_kredit_id ON pengajuan_pinjaman (jenis_kredit_id);
CREATE UNIQUE INDEX uq_perkiraan_kode_perkiraan ON perkiraan (kode_perkiraan);
CREATE UNIQUE INDEX uq_perkiraan_pr_id ON perkiraan (pr_id);
CREATE INDEX ix_perkiraan_klasifikasi_id ON perkiraan (klasifikasi_id);
CREATE INDEX ix_perkiraan_parent_id ON perkiraan (parent_id);
CREATE UNIQUE INDEX uq_pertanyaan_urut ON pertanyaan (urut);
CREATE UNIQUE INDEX uq_perusahaan_nama_perusahaan ON perusahaan (nama_perusahaan);
CREATE UNIQUE INDEX uq_pinjaman_tunai_no_pinjaman ON pinjaman_tunai (no_pinjaman);
CREATE INDEX ix_pinjaman_tunai_anggota_id ON pinjaman_tunai (anggota_id);
CREATE INDEX ix_pinjaman_tunai_jenis_kredit_id ON pinjaman_tunai (jenis_kredit_id);
CREATE INDEX ix_pinjaman_tunai_kas_perkiraan_id ON pinjaman_tunai (kas_perkiraan_id);
CREATE INDEX ix_pinjaman_tunai_kolektor_id ON pinjaman_tunai (kolektor_id);
CREATE INDEX ix_pinjaman_tunai_sales_id ON pinjaman_tunai (sales_id);
CREATE INDEX ix_pinjaman_tunai_operator_id ON pinjaman_tunai (operator_id);
CREATE UNIQUE INDEX uq_pinjaman_tunai_rincian_urut ON pinjaman_tunai_rincian (urut);
CREATE INDEX ix_pinjaman_tunai_rincian_pinjaman_tunai_id ON pinjaman_tunai_rincian (pinjaman_tunai_id);
CREATE INDEX ix_pinjaman_tunai_rincian_kas_perkiraan_id ON pinjaman_tunai_rincian (kas_perkiraan_id);
CREATE UNIQUE INDEX uq_pinjaman_tunai_rincian_tagih_urut ON pinjaman_tunai_rincian_tagih (urut);
CREATE INDEX ix_pinjaman_tunai_rincian_tagih_pinjaman_tunai_id ON pinjaman_tunai_rincian_tagih (pinjaman_tunai_id);
CREATE UNIQUE INDEX uq_pinjaman_tunai_titipan_urut ON pinjaman_tunai_titipan (urut);
CREATE INDEX ix_pinjaman_tunai_titipan_pinjaman_tunai_id ON pinjaman_tunai_titipan (pinjaman_tunai_id);
CREATE UNIQUE INDEX uq_saldo_perkiraan_pr_id ON saldo_perkiraan (pr_id);
CREATE INDEX ix_saldo_perkiraan_perkiraan_id ON saldo_perkiraan (perkiraan_id);
CREATE INDEX ix_saldo_perkiraan_operator_id ON saldo_perkiraan (operator_id);
CREATE UNIQUE INDEX uq_sales_id_sales ON sales (id_sales);
CREATE UNIQUE INDEX uq_simpanan_no_bukti ON simpanan (no_bukti);
CREATE INDEX ix_simpanan_anggota_id ON simpanan (anggota_id);
CREATE INDEX ix_simpanan_jenis_simpanan_id ON simpanan (jenis_simpanan_id);
CREATE INDEX ix_simpanan_kas_perkiraan_id ON simpanan (kas_perkiraan_id);
CREATE INDEX ix_simpanan_operator_id ON simpanan (operator_id);
CREATE UNIQUE INDEX uq_temp_potongan_all_kode_agt ON temp_potongan_all (kode_agt);
CREATE INDEX ix_temp_potongan_all_anggota_id ON temp_potongan_all (anggota_id);
CREATE UNIQUE INDEX uq_temp_potongan_bank_kode_agt ON temp_potongan_bank (kode_agt);
CREATE INDEX ix_temp_potongan_bank_anggota_id ON temp_potongan_bank (anggota_id);
CREATE UNIQUE INDEX uq_temp_potongan_koperasi_kode_agt ON temp_potongan_koperasi (kode_agt);
CREATE INDEX ix_temp_potongan_koperasi_anggota_id ON temp_potongan_koperasi (anggota_id);
CREATE UNIQUE INDEX uq_temp_potongan_kpr_kode_agt ON temp_potongan_kpr (kode_agt);
CREATE INDEX ix_temp_potongan_kpr_anggota_id ON temp_potongan_kpr (anggota_id);
CREATE UNIQUE INDEX uq_temp_shu_urut_opr ON temp_shu (urut, opr);
CREATE INDEX ix_temp_shu_anggota_id ON temp_shu (anggota_id);
CREATE UNIQUE INDEX uq_temp_shu_backup_urut_opr ON temp_shu_backup (urut, opr);
CREATE INDEX ix_temp_shu_backup_anggota_id ON temp_shu_backup (anggota_id);
CREATE UNIQUE INDEX uq_temp_simpanan_kode_agt ON temp_simpanan (kode_agt);
CREATE INDEX ix_temp_simpanan_anggota_id ON temp_simpanan (anggota_id);
CREATE UNIQUE INDEX uq_app_user_kode_agt ON app_user (kode_agt);
CREATE INDEX ix_app_user_anggota_id ON app_user (anggota_id);
CREATE INDEX ix_app_user_karyawan_mattel_id ON app_user (karyawan_mattel_id);
CREATE INDEX ix_app_user_pertanyaan_id ON app_user (pertanyaan_id);
CREATE UNIQUE INDEX uq_variable_akun_nama_items ON variable_akun (nama_items);
CREATE INDEX ix_variable_akun_perkiraan_id ON variable_akun (perkiraan_id);
CREATE UNIQUE INDEX uq_variable_akun_jenis_transaksi_urut ON variable_akun_jenis_transaksi (urut);
CREATE INDEX ix_anggota_nik ON anggota (nik);
CREATE INDEX ix_anggota_aktif ON anggota (aktif);
CREATE INDEX ix_app_user_lowerusername ON app_user (lower(username));
CREATE INDEX ix_simpanan_anggota_id_jenis_simpanan_id_tgl_transaksi ON simpanan (anggota_id, jenis_simpanan_id, tgl_transaksi);
CREATE INDEX ix_pinjaman_tunai_tgl_pinjaman ON pinjaman_tunai (tgl_pinjaman);
CREATE INDEX ix_pinjaman_tunai_rincian_pinjaman_tunai_id_tanggal_angsuran ON pinjaman_tunai_rincian (pinjaman_tunai_id, tanggal_angsuran);
CREATE INDEX ix_pinjaman_tunai_rincian_no_bukti ON pinjaman_tunai_rincian (no_bukti);
CREATE INDEX ix_pinjaman_tunai_rincian_tagih_pinjaman_tunai_id_angsuran_ke ON pinjaman_tunai_rincian_tagih (pinjaman_tunai_id, angsuran_ke);
CREATE INDEX ix_kpr_rincian_kpr_id_tanggal_angsuran ON kpr_rincian (kpr_id, tanggal_angsuran);
CREATE INDEX ix_kpr_rincian_no_bukti ON kpr_rincian (no_bukti);
CREATE INDEX ix_kpr_rincian_tagih_kpr_id_angsuran_ke ON kpr_rincian_tagih (kpr_id, angsuran_ke);
CREATE INDEX ix_jurnal_umum_nomor_bukti ON jurnal_umum (nomor_bukti);
CREATE INDEX ix_jurnal_umum_tanggal_jurnalumum ON jurnal_umum (tanggal_jurnalumum);
CREATE INDEX ix_jurnal_umum_perkiraan_id_tanggal_jurnalumum ON jurnal_umum (perkiraan_id, tanggal_jurnalumum);
CREATE INDEX ix_jurnal_umum_sumber_tipe_sumber_id ON jurnal_umum (sumber_tipe, sumber_id);
CREATE INDEX ix_kas_tgl_kas ON kas (tgl_kas);
CREATE INDEX ix_kas_no_bukti ON kas (no_bukti);
CREATE INDEX ix_log_notifikasi_anggota_id_datetimes ON log_notifikasi (anggota_id, datetimes);
CREATE INDEX ix_pengajuan_pinjaman_anggota_id_tgl_realisasi ON pengajuan_pinjaman (anggota_id, tgl_realisasi);
CREATE INDEX ix_temp_shu_backup_anggota_id_tgl_tutup_buku ON temp_shu_backup (anggota_id, tgl_tutup_buku);
CREATE INDEX ix_temp_shu_backup_no_reff ON temp_shu_backup (no_reff);

-- @@ section: foreign_keys
-- Kolom berikut dijadikan NOT NULL oleh migrate.mjs hanya bila tidak ada baris yatim:
--   anggota_detail.anggota_id
--   kpr.anggota_id
--   kpr.jenis_kredit_id
--   kpr_rincian.kpr_id
--   opr.grup_id
--   opr_hak_akses.grup_id
--   pengajuan_pinjaman.anggota_id
--   pengajuan_pinjaman.jenis_kredit_id
--   perkiraan.klasifikasi_id
--   pinjaman_tunai.anggota_id
--   pinjaman_tunai.jenis_kredit_id
--   pinjaman_tunai_rincian.pinjaman_tunai_id
--   pinjaman_tunai_rincian_tagih.pinjaman_tunai_id
--   pinjaman_tunai_titipan.pinjaman_tunai_id
--   saldo_perkiraan.perkiraan_id
--   simpanan.anggota_id
--   simpanan.jenis_simpanan_id
--   temp_potongan_all.anggota_id
--   temp_potongan_bank.anggota_id
--   temp_potongan_koperasi.anggota_id
--   temp_potongan_kpr.anggota_id
--   temp_shu.anggota_id
--   temp_shu_backup.anggota_id
--   temp_simpanan.anggota_id
ALTER TABLE anggota ADD CONSTRAINT fk_anggota_karyawan_mattel_id FOREIGN KEY (karyawan_mattel_id) REFERENCES karyawan_mattel (id) ON DELETE RESTRICT;
ALTER TABLE anggota ADD CONSTRAINT fk_anggota_operator_id FOREIGN KEY (operator_id) REFERENCES opr (id) ON DELETE RESTRICT;
ALTER TABLE anggota_detail ADD CONSTRAINT fk_anggota_detail_anggota_id FOREIGN KEY (anggota_id) REFERENCES anggota (id) ON DELETE CASCADE;
ALTER TABLE jenis_kredit ADD CONSTRAINT fk_jenis_kredit_coa_kredit_id FOREIGN KEY (coa_kredit_id) REFERENCES perkiraan (id) ON DELETE RESTRICT;
ALTER TABLE jenis_kredit ADD CONSTRAINT fk_jenis_kredit_coa_jasa_id FOREIGN KEY (coa_jasa_id) REFERENCES perkiraan (id) ON DELETE RESTRICT;
ALTER TABLE jenis_kredit ADD CONSTRAINT fk_jenis_kredit_coa_adm_id FOREIGN KEY (coa_adm_id) REFERENCES perkiraan (id) ON DELETE RESTRICT;
ALTER TABLE jenis_kredit ADD CONSTRAINT fk_jenis_kredit_coa_provisi_id FOREIGN KEY (coa_provisi_id) REFERENCES perkiraan (id) ON DELETE RESTRICT;
ALTER TABLE jenis_pos_shu ADD CONSTRAINT fk_jenis_pos_shu_perkiraan_id FOREIGN KEY (perkiraan_id) REFERENCES perkiraan (id) ON DELETE RESTRICT;
ALTER TABLE jenis_simpanan ADD CONSTRAINT fk_jenis_simpanan_coa_id FOREIGN KEY (coa_id) REFERENCES perkiraan (id) ON DELETE RESTRICT;
ALTER TABLE jurnal_umum ADD CONSTRAINT fk_jurnal_umum_perkiraan_id FOREIGN KEY (perkiraan_id) REFERENCES perkiraan (id) ON DELETE RESTRICT;
ALTER TABLE jurnal_umum ADD CONSTRAINT fk_jurnal_umum_operator_id FOREIGN KEY (operator_id) REFERENCES opr (id) ON DELETE RESTRICT;
ALTER TABLE kas ADD CONSTRAINT fk_kas_operator_id FOREIGN KEY (operator_id) REFERENCES opr (id) ON DELETE RESTRICT;
ALTER TABLE kpr ADD CONSTRAINT fk_kpr_anggota_id FOREIGN KEY (anggota_id) REFERENCES anggota (id) ON DELETE RESTRICT;
ALTER TABLE kpr ADD CONSTRAINT fk_kpr_jenis_kredit_id FOREIGN KEY (jenis_kredit_id) REFERENCES jenis_kredit (id) ON DELETE RESTRICT;
ALTER TABLE kpr ADD CONSTRAINT fk_kpr_kas_perkiraan_id FOREIGN KEY (kas_perkiraan_id) REFERENCES perkiraan (id) ON DELETE RESTRICT;
ALTER TABLE kpr_rincian ADD CONSTRAINT fk_kpr_rincian_kpr_id FOREIGN KEY (kpr_id) REFERENCES kpr (id) ON DELETE RESTRICT;
ALTER TABLE kpr_rincian ADD CONSTRAINT fk_kpr_rincian_kas_perkiraan_id FOREIGN KEY (kas_perkiraan_id) REFERENCES perkiraan (id) ON DELETE RESTRICT;
ALTER TABLE kpr_rincian_tagih ADD CONSTRAINT fk_kpr_rincian_tagih_kpr_id FOREIGN KEY (kpr_id) REFERENCES kpr (id) ON DELETE RESTRICT;
ALTER TABLE kpr_rincian_tagih ADD CONSTRAINT fk_kpr_rincian_tagih_kas_perkiraan_id FOREIGN KEY (kas_perkiraan_id) REFERENCES perkiraan (id) ON DELETE RESTRICT;
ALTER TABLE log_notifikasi ADD CONSTRAINT fk_log_notifikasi_anggota_id FOREIGN KEY (anggota_id) REFERENCES anggota (id) ON DELETE RESTRICT;
ALTER TABLE opr ADD CONSTRAINT fk_opr_grup_id FOREIGN KEY (grup_id) REFERENCES opr_grup (id) ON DELETE RESTRICT;
ALTER TABLE opr_hak_akses ADD CONSTRAINT fk_opr_hak_akses_grup_id FOREIGN KEY (grup_id) REFERENCES opr_grup (id) ON DELETE CASCADE;
ALTER TABLE opr_history ADD CONSTRAINT fk_opr_history_operator_id FOREIGN KEY (operator_id) REFERENCES opr (id) ON DELETE RESTRICT;
ALTER TABLE pengajuan_pinjaman ADD CONSTRAINT fk_pengajuan_pinjaman_anggota_id FOREIGN KEY (anggota_id) REFERENCES anggota (id) ON DELETE RESTRICT;
ALTER TABLE pengajuan_pinjaman ADD CONSTRAINT fk_pengajuan_pinjaman_jenis_kredit_id FOREIGN KEY (jenis_kredit_id) REFERENCES jenis_kredit (id) ON DELETE RESTRICT;
ALTER TABLE perkiraan ADD CONSTRAINT fk_perkiraan_klasifikasi_id FOREIGN KEY (klasifikasi_id) REFERENCES klasifikasi_perkiraan (id) ON DELETE RESTRICT;
ALTER TABLE perkiraan ADD CONSTRAINT fk_perkiraan_parent_id FOREIGN KEY (parent_id) REFERENCES perkiraan (id) ON DELETE RESTRICT;
ALTER TABLE pinjaman_tunai ADD CONSTRAINT fk_pinjaman_tunai_anggota_id FOREIGN KEY (anggota_id) REFERENCES anggota (id) ON DELETE RESTRICT;
ALTER TABLE pinjaman_tunai ADD CONSTRAINT fk_pinjaman_tunai_jenis_kredit_id FOREIGN KEY (jenis_kredit_id) REFERENCES jenis_kredit (id) ON DELETE RESTRICT;
ALTER TABLE pinjaman_tunai ADD CONSTRAINT fk_pinjaman_tunai_kas_perkiraan_id FOREIGN KEY (kas_perkiraan_id) REFERENCES perkiraan (id) ON DELETE RESTRICT;
ALTER TABLE pinjaman_tunai ADD CONSTRAINT fk_pinjaman_tunai_kolektor_id FOREIGN KEY (kolektor_id) REFERENCES kolektor (id) ON DELETE RESTRICT;
ALTER TABLE pinjaman_tunai ADD CONSTRAINT fk_pinjaman_tunai_sales_id FOREIGN KEY (sales_id) REFERENCES sales (id) ON DELETE RESTRICT;
ALTER TABLE pinjaman_tunai ADD CONSTRAINT fk_pinjaman_tunai_operator_id FOREIGN KEY (operator_id) REFERENCES opr (id) ON DELETE RESTRICT;
ALTER TABLE pinjaman_tunai_rincian ADD CONSTRAINT fk_pinjaman_tunai_rincian_pinjaman_tunai_id FOREIGN KEY (pinjaman_tunai_id) REFERENCES pinjaman_tunai (id) ON DELETE RESTRICT;
ALTER TABLE pinjaman_tunai_rincian ADD CONSTRAINT fk_pinjaman_tunai_rincian_kas_perkiraan_id FOREIGN KEY (kas_perkiraan_id) REFERENCES perkiraan (id) ON DELETE RESTRICT;
ALTER TABLE pinjaman_tunai_rincian_tagih ADD CONSTRAINT fk_pinjaman_tunai_rincian_tagih_pinjaman_tunai_id FOREIGN KEY (pinjaman_tunai_id) REFERENCES pinjaman_tunai (id) ON DELETE RESTRICT;
ALTER TABLE pinjaman_tunai_titipan ADD CONSTRAINT fk_pinjaman_tunai_titipan_pinjaman_tunai_id FOREIGN KEY (pinjaman_tunai_id) REFERENCES pinjaman_tunai (id) ON DELETE RESTRICT;
ALTER TABLE saldo_perkiraan ADD CONSTRAINT fk_saldo_perkiraan_perkiraan_id FOREIGN KEY (perkiraan_id) REFERENCES perkiraan (id) ON DELETE RESTRICT;
ALTER TABLE saldo_perkiraan ADD CONSTRAINT fk_saldo_perkiraan_operator_id FOREIGN KEY (operator_id) REFERENCES opr (id) ON DELETE RESTRICT;
ALTER TABLE simpanan ADD CONSTRAINT fk_simpanan_anggota_id FOREIGN KEY (anggota_id) REFERENCES anggota (id) ON DELETE RESTRICT;
ALTER TABLE simpanan ADD CONSTRAINT fk_simpanan_jenis_simpanan_id FOREIGN KEY (jenis_simpanan_id) REFERENCES jenis_simpanan (id) ON DELETE RESTRICT;
ALTER TABLE simpanan ADD CONSTRAINT fk_simpanan_kas_perkiraan_id FOREIGN KEY (kas_perkiraan_id) REFERENCES perkiraan (id) ON DELETE RESTRICT;
ALTER TABLE simpanan ADD CONSTRAINT fk_simpanan_operator_id FOREIGN KEY (operator_id) REFERENCES opr (id) ON DELETE RESTRICT;
ALTER TABLE temp_potongan_all ADD CONSTRAINT fk_temp_potongan_all_anggota_id FOREIGN KEY (anggota_id) REFERENCES anggota (id) ON DELETE RESTRICT;
ALTER TABLE temp_potongan_bank ADD CONSTRAINT fk_temp_potongan_bank_anggota_id FOREIGN KEY (anggota_id) REFERENCES anggota (id) ON DELETE RESTRICT;
ALTER TABLE temp_potongan_koperasi ADD CONSTRAINT fk_temp_potongan_koperasi_anggota_id FOREIGN KEY (anggota_id) REFERENCES anggota (id) ON DELETE RESTRICT;
ALTER TABLE temp_potongan_kpr ADD CONSTRAINT fk_temp_potongan_kpr_anggota_id FOREIGN KEY (anggota_id) REFERENCES anggota (id) ON DELETE RESTRICT;
ALTER TABLE temp_shu ADD CONSTRAINT fk_temp_shu_anggota_id FOREIGN KEY (anggota_id) REFERENCES anggota (id) ON DELETE RESTRICT;
ALTER TABLE temp_shu_backup ADD CONSTRAINT fk_temp_shu_backup_anggota_id FOREIGN KEY (anggota_id) REFERENCES anggota (id) ON DELETE RESTRICT;
ALTER TABLE temp_simpanan ADD CONSTRAINT fk_temp_simpanan_anggota_id FOREIGN KEY (anggota_id) REFERENCES anggota (id) ON DELETE RESTRICT;
ALTER TABLE app_user ADD CONSTRAINT fk_app_user_anggota_id FOREIGN KEY (anggota_id) REFERENCES anggota (id) ON DELETE RESTRICT;
ALTER TABLE app_user ADD CONSTRAINT fk_app_user_karyawan_mattel_id FOREIGN KEY (karyawan_mattel_id) REFERENCES karyawan_mattel (id) ON DELETE RESTRICT;
ALTER TABLE app_user ADD CONSTRAINT fk_app_user_pertanyaan_id FOREIGN KEY (pertanyaan_id) REFERENCES pertanyaan (id) ON DELETE SET NULL;
ALTER TABLE variable_akun ADD CONSTRAINT fk_variable_akun_perkiraan_id FOREIGN KEY (perkiraan_id) REFERENCES perkiraan (id) ON DELETE RESTRICT;

-- @@ section: optional_unique
-- Dicoba satu per satu. Gagal berarti ada duplikat data yang perlu dibereskan (dicatat di migration_report).
CREATE UNIQUE INDEX uq_app_user_anggota_id ON app_user (anggota_id) WHERE anggota_id IS NOT NULL;
CREATE UNIQUE INDEX uq_anggota_detail_anggota_id ON anggota_detail (anggota_id) WHERE anggota_id IS NOT NULL;
CREATE UNIQUE INDEX uq_opr_hak_akses_grup_id_menu ON opr_hak_akses (grup_id, menu);
