-- Pusat Panduan (khusus web, tidak ada di MySQL desktop). Aman dijalankan ulang.
-- Isi awal: database/panduan/<kategori>/<artikel>.md, dipasang oleh panduan-pasang.mjs.
CREATE TABLE IF NOT EXISTS panduan_kategori (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    slug varchar(80) NOT NULL UNIQUE,
    nama varchar(100) NOT NULL,
    keterangan text,
    ikon varchar(40),                -- nama ikon Material Symbols, mis. 'savings'
    urutan integer NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS panduan (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    kategori_id bigint NOT NULL REFERENCES panduan_kategori (id) ON DELETE RESTRICT,
    slug varchar(120) NOT NULL UNIQUE,
    judul varchar(200) NOT NULL,
    ringkasan text,
    isi text NOT NULL DEFAULT '',     -- Markdown (GFM: tabel, daftar)
    href_menu varchar(200),           -- halaman aplikasi yang dijelaskan; dipakai tombol bantuan di navbar
    urutan integer NOT NULL DEFAULT 0,
    terbit boolean NOT NULL DEFAULT true,
    dibuat_pada timestamptz NOT NULL DEFAULT now(),
    diubah_pada timestamptz NOT NULL DEFAULT now(),
    diubah_oleh varchar(50)
);

CREATE INDEX IF NOT EXISTS ix_panduan_kategori_id_urutan ON panduan (kategori_id, urutan);
CREATE INDEX IF NOT EXISTS ix_panduan_href_menu ON panduan (href_menu);
