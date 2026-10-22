-- Pengaturan khusus web (tidak ada di MySQL desktop), kunci/nilai. Aman dijalankan ulang.
-- mode_uji: '1' = mode uji (setiap simpan di-rollback), '0' = live. Diubah di Sistem & Pengaturan -> Mode Uji / Live.
CREATE TABLE IF NOT EXISTS pengaturan_web (
    kunci varchar(60) PRIMARY KEY,
    nilai text NOT NULL,
    diubah_pada timestamptz NOT NULL DEFAULT now(),
    diubah_oleh varchar(50)
);
