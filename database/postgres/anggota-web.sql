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

-- Pesan anggota ke koperasi (percakapan dua arah, hanya teks). Pesan masuk memberi Web Push ke operator berizin
-- "Pesan Anggota (web)"; balasan operator memberi Web Push ke HP anggota.
CREATE TABLE IF NOT EXISTS pesan_percakapan (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    anggota_id bigint NOT NULL REFERENCES anggota(id),
    app_user_id bigint REFERENCES app_user(id) ON DELETE SET NULL,
    subjek varchar(100) NOT NULL,
    status varchar(10) NOT NULL DEFAULT 'buka' CHECK (status IN ('buka', 'selesai')),
    dibuat_pada timestamptz NOT NULL DEFAULT now(),
    pesan_terakhir_pada timestamptz NOT NULL DEFAULT now(),
    belum_dibaca_admin boolean NOT NULL DEFAULT true,
    belum_dibaca_anggota boolean NOT NULL DEFAULT false
);
CREATE INDEX IF NOT EXISTS ix_pesan_percakapan_anggota_id ON pesan_percakapan (anggota_id, pesan_terakhir_pada DESC);
CREATE INDEX IF NOT EXISTS ix_pesan_percakapan_status ON pesan_percakapan (status, pesan_terakhir_pada DESC);
CREATE TABLE IF NOT EXISTS pesan_isi (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    percakapan_id bigint NOT NULL REFERENCES pesan_percakapan(id) ON DELETE CASCADE,
    pengirim varchar(8) NOT NULL CHECK (pengirim IN ('anggota', 'admin')),
    opr_nama varchar(50),
    isi text NOT NULL,
    dibuat_pada timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_pesan_isi_percakapan_id ON pesan_isi (percakapan_id, id);

-- Langganan Web Push browser operator (admin), satu operator bisa punya beberapa browser.
CREATE TABLE IF NOT EXISTS opr_push (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    opr_id bigint NOT NULL REFERENCES opr(id) ON DELETE CASCADE,
    endpoint text NOT NULL UNIQUE,
    p256dh text NOT NULL,
    auth text NOT NULL,
    dibuat_pada timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_opr_push_opr_id ON opr_push (opr_id);
