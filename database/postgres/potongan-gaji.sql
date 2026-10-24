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

-- Posting per bagian, seperti empat form posting desktop (Simpanan dengan centang Pokok/Wajib/Sukarela, Koperasi, Bank, KPR):
-- tiap bagian diposting sekali dengan tanggal dan akun kasnya sendiri. Status periode: draf (belum ada yang diposting, boleh
-- diubah dan digenerate ulang), sebagian (sudah ada bagian yang diposting, data terkunci), diposting (semua bagian wajib selesai).
ALTER TABLE potongan_gaji DROP CONSTRAINT IF EXISTS potongan_gaji_status_check;
ALTER TABLE potongan_gaji ADD CONSTRAINT potongan_gaji_status_check CHECK (status IN ('draf', 'sebagian', 'diposting'));
-- Simpanan pokok dari data anggota (temp_simpanan desktop); hanya diposting bila bagian Pokok dicentang, tidak masuk total potongan.
ALTER TABLE potongan_gaji_anggota ADD COLUMN IF NOT EXISTS s_pokok numeric(20,4) NOT NULL DEFAULT 0;
ALTER TABLE potongan_gaji_anggota ADD COLUMN IF NOT EXISTS bukti_pokok varchar(30);

CREATE TABLE IF NOT EXISTS potongan_gaji_posting (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    potongan_gaji_id bigint NOT NULL REFERENCES potongan_gaji (id) ON DELETE CASCADE,
    bagian varchar(10) NOT NULL CHECK (bagian IN ('pokok', 'wajib', 'sukarela', 'koperasi', 'bank', 'kpr')),
    tgl_posting date NOT NULL,
    kas_perkiraan_id bigint NOT NULL REFERENCES perkiraan (id),
    transaksi integer NOT NULL,
    jumlah numeric(20,4) NOT NULL,
    diposting_oleh varchar(50) NOT NULL,
    diposting_pada timestamptz NOT NULL DEFAULT now(),
    UNIQUE (potongan_gaji_id, bagian)
);
-- Periode yang diposting sebelum ada posting per bagian: catat bagiannya dari transaksi yang sudah dibuat.
INSERT INTO potongan_gaji_posting (potongan_gaji_id, bagian, tgl_posting, kas_perkiraan_id, transaksi, jumlah, diposting_oleh, diposting_pada)
SELECT p.id, b.bagian, p.tgl_posting, p.kas_perkiraan_id, b.n, b.rp, p.diposting_oleh, p.diposting_pada
  FROM potongan_gaji p
  CROSS JOIN LATERAL (
      SELECT 'wajib' bagian, COUNT(*) n, COALESCE(SUM(s_wajib), 0) rp FROM potongan_gaji_anggota WHERE potongan_gaji_id = p.id AND bukti_wajib IS NOT NULL
      UNION ALL SELECT 'sukarela', COUNT(*), COALESCE(SUM(s_sukarela), 0) FROM potongan_gaji_anggota WHERE potongan_gaji_id = p.id AND bukti_sukarela IS NOT NULL
      UNION ALL SELECT CASE grup WHEN 'KOPERASI' THEN 'koperasi' WHEN 'KPR' THEN 'kpr' ELSE 'bank' END, COUNT(*), SUM(pokok + jasa + adm + provisi)
        FROM potongan_gaji_pinjaman WHERE potongan_gaji_id = p.id AND no_bukti IS NOT NULL GROUP BY grup) b
 WHERE p.status = 'diposting' AND p.tgl_posting IS NOT NULL AND b.n > 0
ON CONFLICT (potongan_gaji_id, bagian) DO NOTHING;
