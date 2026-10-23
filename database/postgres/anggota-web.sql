-- Tabel khusus PWA anggota (tidak ada di MySQL lama). Aman dijalankan ulang.
-- Foto profil anggota disimpan di database (keputusan K10), satu foto per akun. Foto lama aplikasi Android
-- (app_user.foto, nama file di folder images/ server PHP) belum dipindahkan.
CREATE TABLE IF NOT EXISTS app_user_foto (
    app_user_id bigint PRIMARY KEY REFERENCES app_user(id) ON DELETE CASCADE,
    isi bytea NOT NULL,
    jenis varchar(20) NOT NULL,
    diubah_pada timestamptz NOT NULL DEFAULT now()
);

-- Langganan Web Push per perangkat (keputusan K8). Satu akun bisa punya banyak perangkat; endpoint unik per perangkat.
CREATE TABLE IF NOT EXISTS app_user_push (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    app_user_id bigint NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
    endpoint text NOT NULL UNIQUE,
    p256dh text NOT NULL,
    auth text NOT NULL,
    dibuat_pada timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_app_user_push_app_user_id ON app_user_push (app_user_id);

-- Gambar pengumuman (himbauan, promo, notifikasi), dikompres di browser admin lalu disimpan di database.
-- token acak dipakai di alamat publik /gambar/<token> (harus terbuka tanpa login agar tampil di notifikasi HP).
-- Gambar lama aplikasi Android (kolom image di himbauan/promo, file di server PHP) tidak disentuh.
CREATE TABLE IF NOT EXISTS pengumuman_gambar (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    token varchar(32) NOT NULL UNIQUE,
    isi bytea NOT NULL,
    jenis varchar(20) NOT NULL,
    dibuat_pada timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS pengumuman_gambar_ref (
    jenis varchar(12) NOT NULL CHECK (jenis IN ('himbauan', 'promo', 'notifikasi')),
    ref_id bigint NOT NULL,
    gambar_id bigint NOT NULL REFERENCES pengumuman_gambar(id) ON DELETE CASCADE,
    PRIMARY KEY (jenis, ref_id)
);
CREATE INDEX IF NOT EXISTS ix_pengumuman_gambar_ref_gambar_id ON pengumuman_gambar_ref (gambar_id);
