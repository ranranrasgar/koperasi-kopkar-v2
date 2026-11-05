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

-- Log koreksi transaksi yang sudah diposting. Baris asal tidak diubah: pembatalan membuat transaksi pembalik (no_bukti_pembalik).
-- data_lama dan data_baru menyimpan isi saat koreksi. Aplikasi hanya menambah baris di sini, tidak pernah mengubah atau menghapus.
CREATE TABLE IF NOT EXISTS transaksi_koreksi (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    waktu timestamptz NOT NULL DEFAULT now(),
    jenis varchar(20) NOT NULL,
    sumber_id bigint,
    no_bukti varchar(100) NOT NULL,
    aksi varchar(20) NOT NULL,
    alasan varchar(255) NOT NULL,
    no_bukti_pembalik varchar(100),
    opr varchar(100) NOT NULL,
    operator_id bigint,
    data_lama jsonb NOT NULL,
    data_baru jsonb
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_transaksi_koreksi_batal ON transaksi_koreksi (jenis, no_bukti) WHERE aksi = 'batal';
CREATE INDEX IF NOT EXISTS ix_transaksi_koreksi_pembalik ON transaksi_koreksi (no_bukti_pembalik);
CREATE INDEX IF NOT EXISTS ix_transaksi_koreksi_waktu ON transaksi_koreksi (waktu DESC);

-- Tema tampilan admin per operator (halaman Pengaturan Tampilan): enam warna #rrggbb dalam JSON. Tanpa baris = tampilan awal.
CREATE TABLE IF NOT EXISTS opr_tampilan (
    operator_id bigint PRIMARY KEY,
    tema jsonb NOT NULL,
    diubah_pada timestamptz NOT NULL DEFAULT now()
);

-- Tabel grade (nama + nominal plafon) dan relasi anggota.grade_id. Kolom lama anggota.grade (nama) dan anggota.rp_grade (nominal) tetap ada
-- sebagai salinan yang dibaca desktop, mobile-api, dan aplikasi anggota; trigger di bawah menyamakannya dengan tabel grade.
CREATE TABLE IF NOT EXISTS grade (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nama varchar(15) NOT NULL UNIQUE,
    nominal numeric(20,4) NOT NULL DEFAULT 0 CHECK (nominal >= 0)
);
ALTER TABLE anggota ADD COLUMN IF NOT EXISTS grade_id bigint REFERENCES grade (id) ON DELETE RESTRICT;
CREATE INDEX IF NOT EXISTS ix_anggota_grade_id ON anggota (grade_id);

-- Anggota yang grade_id-nya diisi atau diganti otomatis mengikuti nama dan nominal grade itu. Isi kolom lama tidak disentuh bila grade_id tidak berubah,
-- dan sesi dapat melewatinya dengan set_config('kopkar.lewati_grade', '1', true) (dipakai pemasangan awal supaya plafon anggota tidak berubah diam-diam).
CREATE OR REPLACE FUNCTION anggota_sinkron_grade() RETURNS trigger AS $$
BEGIN
    IF current_setting('kopkar.lewati_grade', true) = '1' THEN RETURN NEW; END IF;
    IF NEW.grade_id IS NOT NULL AND (TG_OP = 'INSERT' OR NEW.grade_id IS DISTINCT FROM OLD.grade_id) THEN
        SELECT g.nama, g.nominal INTO NEW.grade, NEW.rp_grade FROM grade g WHERE g.id = NEW.grade_id;
    END IF;
    RETURN NEW;
END $$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS tg_anggota_sinkron_grade ON anggota;
CREATE TRIGGER tg_anggota_sinkron_grade BEFORE INSERT OR UPDATE OF grade_id ON anggota FOR EACH ROW EXECUTE FUNCTION anggota_sinkron_grade();

-- Mengubah nama atau nominal grade berlaku untuk semua anggota bergrade itu.
CREATE OR REPLACE FUNCTION grade_sinkron_anggota() RETURNS trigger AS $$
BEGIN
    UPDATE anggota SET grade = NEW.nama, rp_grade = NEW.nominal WHERE grade_id = NEW.id AND (grade IS DISTINCT FROM NEW.nama OR rp_grade IS DISTINCT FROM NEW.nominal);
    RETURN NEW;
END $$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS tg_grade_sinkron_anggota ON grade;
CREATE TRIGGER tg_grade_sinkron_anggota AFTER UPDATE OF nama, nominal ON grade FOR EACH ROW EXECUTE FUNCTION grade_sinkron_anggota();

-- Isi awal (hanya bila tabel masih kosong): grade dari data karyawan Mattel dan anggota (pola huruf dan dua angka, mis. M06), nominal = nilai yang paling sering
-- dipakai anggota bergrade itu, dibulatkan ke kelipatan 500 ribu (nilai 0 dan 1 dianggap belum diisi). Lalu anggota ditautkan lewat nama grade tanpa mengubah rp_grade mereka;
-- selisihnya ditampilkan di halaman Grade dan diterapkan lewat tombol di sana.
SELECT set_config('kopkar.lewati_grade', '1', true);
INSERT INTO grade (nama, nominal)
SELECT n.nama, COALESCE((SELECT mode() WITHIN GROUP (ORDER BY round(a.rp_grade / 500000) * 500000) FROM anggota a WHERE a.grade = n.nama AND a.rp_grade > 1), 0)
  FROM (SELECT btrim(grade) AS nama FROM anggota UNION SELECT btrim(grade) FROM karyawan_mattel) n
 WHERE n.nama ~ '^[A-Za-z][0-9]{2}$' AND NOT EXISTS (SELECT 1 FROM grade)
 ORDER BY n.nama
ON CONFLICT (nama) DO NOTHING;
UPDATE anggota a SET grade_id = g.id FROM grade g WHERE a.grade_id IS NULL AND a.grade = g.nama;
SELECT set_config('kopkar.lewati_grade', '', true);

-- Jurnal Penyesuaian: memakai tabel jurnal_umum dengan status 'Penyesuaian' dan nomor JP/yymmdd/n (nomor sendiri, tidak bertabrakan dengan JU/).
CREATE SEQUENCE IF NOT EXISTS seq_jurnal_penyesuaian_no START 1;


-- Pinjaman yang ditutup lunas tanpa jurnal (sudah selesai di luar koperasi). Menyimpan nilai cicilan sebelum ditutup supaya bisa dibatalkan.
CREATE TABLE IF NOT EXISTS pinjaman_penutupan (
    id bigserial PRIMARY KEY,
    pinjaman_tunai_id bigint NOT NULL,
    no_pinjaman varchar(30) NOT NULL,
    cicilan_sebelum integer NOT NULL,
    sisa_cicilan_sebelum integer,
    sisa_buku numeric(20,4) NOT NULL,
    alasan varchar(255) NOT NULL,
    oleh varchar(30) NOT NULL,
    operator_id bigint,
    pada timestamptz NOT NULL DEFAULT now(),
    dibatalkan_pada timestamptz,
    dibatalkan_oleh varchar(30)
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_pinjaman_penutupan_aktif ON pinjaman_penutupan (pinjaman_tunai_id) WHERE dibatalkan_pada IS NULL;
CREATE INDEX IF NOT EXISTS ix_pinjaman_penutupan_no ON pinjaman_penutupan (no_pinjaman);
