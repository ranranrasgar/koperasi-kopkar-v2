-- Potongan gaji bulanan (khusus web, pengganti Generate dan Posting potongan di aplikasi desktop). Aman dijalankan ulang.
-- Satu periode per bulan: Generate menyimpan hasil hitung per anggota dan per pinjaman (status draf, boleh diulang),
-- operator mengecualikan anggota yang tidak terpotong, lalu Posting membukukan setoran simpanan dan angsuran
-- lewat mesin posting (status diposting, tidak bisa diulang). Riwayat tiap bulan tetap tersimpan.

CREATE TABLE IF NOT EXISTS potongan_gaji (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    periode char(7) NOT NULL UNIQUE CHECK (periode ~ '^\d{4}-(0[1-9]|1[0-2])$'), -- YYYY-MM
    status varchar(10) NOT NULL DEFAULT 'draf' CHECK (status IN ('draf', 'diposting')),
    dibuat_oleh varchar(50) NOT NULL,
    dibuat_pada timestamptz NOT NULL DEFAULT now(),
    digenerate_pada timestamptz NOT NULL DEFAULT now(),
    tgl_posting date,
    kas_perkiraan_id bigint REFERENCES perkiraan (id),
    diposting_oleh varchar(50),
    diposting_pada timestamptz
);

-- Per anggota aktif saat generate. Data anggota disalin supaya laporan periode tetap sama walau data anggota berubah.
CREATE TABLE IF NOT EXISTS potongan_gaji_anggota (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    potongan_gaji_id bigint NOT NULL REFERENCES potongan_gaji (id) ON DELETE CASCADE,
    anggota_id bigint NOT NULL REFERENCES anggota (id),
    kode_agt varchar(15) NOT NULL,
    nik varchar(25) NOT NULL DEFAULT '',
    nama varchar(50) NOT NULL DEFAULT '',
    status_staff varchar(15) NOT NULL DEFAULT '',
    bank_nama varchar(15) NOT NULL DEFAULT '',
    bank_no_rek varchar(15) NOT NULL DEFAULT '',
    bank_atas_nama varchar(50) NOT NULL DEFAULT '',
    s_wajib numeric(20,4) NOT NULL DEFAULT 0,
    s_sukarela numeric(20,4) NOT NULL DEFAULT 0,
    koperasi numeric(20,4) NOT NULL DEFAULT 0,
    bank numeric(20,4) NOT NULL DEFAULT 0,
    kpr numeric(20,4) NOT NULL DEFAULT 0,
    adm numeric(20,4) NOT NULL DEFAULT 0,
    -- false = tidak terpotong bulan ini (gaji tidak cukup, cuti, keluar, dibayar manual): tidak ikut diposting.
    dipotong boolean NOT NULL DEFAULT true,
    alasan varchar(200),
    diubah_oleh varchar(50),
    diubah_pada timestamptz,
    bukti_wajib varchar(30),
    bukti_sukarela varchar(30),
    UNIQUE (potongan_gaji_id, anggota_id)
);

-- Angsuran yang dipotong per pinjaman (angsuran ke berapa dan nominalnya), supaya posting membayar angsuran yang sama
-- persis dengan hasil generate.
CREATE TABLE IF NOT EXISTS potongan_gaji_pinjaman (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    potongan_gaji_id bigint NOT NULL REFERENCES potongan_gaji (id) ON DELETE CASCADE,
    anggota_id bigint NOT NULL REFERENCES anggota (id),
    jenis varchar(5) NOT NULL CHECK (jenis IN ('tunai', 'kpr')),
    pinjaman_id bigint NOT NULL, -- pinjaman_tunai.id atau kpr.id
    no_pinjaman varchar(30) NOT NULL,
    grup varchar(30) NOT NULL, -- KOPERASI, BANK / PIHAK LAIN, KPR
    angsuran_ke integer NOT NULL,
    pokok numeric(20,4) NOT NULL DEFAULT 0,
    jasa numeric(20,4) NOT NULL DEFAULT 0,
    adm numeric(20,4) NOT NULL DEFAULT 0,
    provisi numeric(20,4) NOT NULL DEFAULT 0,
    no_bukti varchar(30),
    UNIQUE (potongan_gaji_id, jenis, pinjaman_id)
);
CREATE INDEX IF NOT EXISTS ix_potongan_gaji_pinjaman_anggota ON potongan_gaji_pinjaman (potongan_gaji_id, anggota_id);
