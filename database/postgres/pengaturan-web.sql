-- Pengaturan khusus web (tidak ada di MySQL desktop), kunci/nilai. Aman dijalankan ulang.
-- mode_uji: '1' = mode uji (setiap simpan di-rollback), '0' = live. Diubah di Sistem & Pengaturan -> Mode Uji / Live.
CREATE TABLE IF NOT EXISTS pengaturan_web (
    kunci varchar(60) PRIMARY KEY,
    nilai text NOT NULL,
    diubah_pada timestamptz NOT NULL DEFAULT now(),
    diubah_oleh varchar(50)
);

-- Maksimal plafond pinjaman per jenis kredit (rupiah; 0 = tidak dibatasi). Bila "Kunci jika melebihi grade" aktif dan anggota punya nominal grade,
-- grade yang diutamakan; maksimal ini berlaku untuk jenis tanpa kunci grade, atau anggota yang nominal gradenya belum diisi.
ALTER TABLE jenis_kredit ADD COLUMN IF NOT EXISTS maks_plafond numeric(18,2) NOT NULL DEFAULT 0;
