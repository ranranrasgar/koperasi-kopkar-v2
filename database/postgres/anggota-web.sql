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
    jenis varchar(12) NOT NULL CHECK (jenis IN ('himbauan', 'promo', 'notifikasi', 'produk')),
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

-- Sasaran himbauan/promo: untuk anggota (semua, atau status staff tertentu) dan/atau internal kantor (pengguna aplikasi
-- admin; semua grup atau grup tertentu). Himbauan/promo tanpa baris di sini = semua anggota saja (perilaku lama).
CREATE TABLE IF NOT EXISTS pengumuman_sasaran (
    jenis varchar(12) NOT NULL CHECK (jenis IN ('himbauan', 'promo')),
    ref_id bigint NOT NULL,
    untuk_anggota boolean NOT NULL DEFAULT true,
    status_staff text[],
    untuk_internal boolean NOT NULL DEFAULT false,
    grup_ids bigint[],
    dibuat_pada timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (jenis, ref_id)
);
-- Penanda "sudah dibaca" pengumuman internal per operator (angka merah di lonceng navbar admin).
CREATE TABLE IF NOT EXISTS pengumuman_baca_opr (
    opr_id bigint NOT NULL REFERENCES opr(id) ON DELETE CASCADE,
    jenis varchar(12) NOT NULL,
    ref_id bigint NOT NULL,
    dibaca_pada timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (opr_id, jenis, ref_id)
);

-- Notifikasi untuk operator (admin) yang dibuat sistem, mis. pengajuan kredit baru dari anggota. Penerima: operator
-- yang grupnya berizin menu `menu` (atau grup superadmin). Tampil di lonceng navbar admin; penanda baca per operator.
CREATE TABLE IF NOT EXISTS notif_admin (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    menu varchar(100) NOT NULL,
    judul varchar(80) NOT NULL,
    isi varchar(300) NOT NULL,
    url varchar(200) NOT NULL,
    dibuat_pada timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_notif_admin_dibuat_pada ON notif_admin (dibuat_pada DESC);
CREATE TABLE IF NOT EXISTS notif_admin_baca (
    opr_id bigint NOT NULL REFERENCES opr(id) ON DELETE CASCADE,
    notif_id bigint NOT NULL REFERENCES notif_admin(id) ON DELETE CASCADE,
    PRIMARY KEY (opr_id, notif_id)
);

-- Penanda halaman pengantar ("Selamat datang") sudah dilihat; satu baris per akun, tampil sekali saat pertama masuk.
CREATE TABLE IF NOT EXISTS app_user_intro (
    app_user_id bigint PRIMARY KEY REFERENCES app_user(id) ON DELETE CASCADE,
    dilihat_pada timestamptz NOT NULL DEFAULT now()
);

-- Antrean email keluar: notifikasi (himbauan, promo, pengajuan, keputusan) dan email sistem (kode verifikasi, reset).
-- Dikirim bertahap oleh pekerja di server (backend/src/email/pekerja.ts) supaya siaran ke ribuan anggota tidak
-- membebani halaman admin atau akun SMTP. status 'dicatat' = SMTP belum diatur, hanya dicatat di log.
CREATE TABLE IF NOT EXISTS email_antrean (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    jenis varchar(30) NOT NULL,
    ke varchar(150) NOT NULL,
    judul varchar(200) NOT NULL,
    teks text NOT NULL,
    tautan varchar(300),
    status varchar(10) NOT NULL DEFAULT 'menunggu' CHECK (status IN ('menunggu', 'terkirim', 'gagal', 'dicatat')),
    percobaan integer NOT NULL DEFAULT 0,
    galat text,
    dibuat_pada timestamptz NOT NULL DEFAULT now(),
    dikirim_pada timestamptz,
    coba_lagi_pada timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_email_antrean_status ON email_antrean (status, coba_lagi_pada);
-- Lampiran satu berkas (mis. PDF jadwal angsuran) disimpan sampai email terkirim, lalu dikosongkan.
ALTER TABLE email_antrean ADD COLUMN IF NOT EXISTS lampiran_nama varchar(150);
ALTER TABLE email_antrean ADD COLUMN IF NOT EXISTS lampiran bytea;

-- Verifikasi kepemilikan email per akun. Kode 6 angka (disimpan sebagai hash), berlaku 15 menit, maks. 5 salah.
-- aktivasi = akun dibuat lewat pendaftaran dan baru aktif (app_user.status) setelah email terverifikasi.
-- Email notifikasi hanya dikirim ke email yang terverifikasi dan masih sama dengan app_user.email.
CREATE TABLE IF NOT EXISTS app_user_email_verif (
    app_user_id bigint PRIMARY KEY REFERENCES app_user(id) ON DELETE CASCADE,
    email varchar(150) NOT NULL,
    kode_hash varchar(64),
    kedaluwarsa timestamptz,
    percobaan integer NOT NULL DEFAULT 0,
    terakhir_kirim timestamptz,
    aktivasi boolean NOT NULL DEFAULT false,
    terverifikasi_pada timestamptz
);

-- Identitas Google akun (masuk/daftar dengan Google). sub = ID tetap akun Google; email Google dari Google sudah terverifikasi.
CREATE TABLE IF NOT EXISTS app_user_google (
    app_user_id bigint PRIMARY KEY REFERENCES app_user(id) ON DELETE CASCADE,
    sub varchar(64) NOT NULL UNIQUE,
    email varchar(150) NOT NULL,
    dibuat_pada timestamptz NOT NULL DEFAULT now()
);

-- Pendaftaran baru dari aplikasi anggota menunggu persetujuan admin: akun status false + menunggu_admin true sampai
-- admin menyetujui (Anggota, Pendaftaran Baru) atau menolak.
ALTER TABLE app_user ADD COLUMN IF NOT EXISTS menunggu_admin boolean NOT NULL DEFAULT false;
-- Keputusan admin atas pendaftaran baru: 'disetujui' atau 'ditolak' (kosong = akun lama / belum diputuskan). Dipakai filter User Mobile.
ALTER TABLE app_user ADD COLUMN IF NOT EXISTS keputusan_daftar varchar(10);
-- Password sementara dari pengurus (User Mobile, ikon kunci): true sampai anggota mengganti passwordnya sendiri. PWA mewajibkan
-- ganti password setelah masuk; aplikasi Android lama tidak bisa memaksa. Setiap aturPassword mengembalikannya ke false.
ALTER TABLE app_user ADD COLUMN IF NOT EXISTS wajib_ganti_password boolean NOT NULL DEFAULT false;

-- Pengajuan kredit yang disetujui di web dan belum dicairkan: true saat disetujui, false lagi saat pinjaman tunai jenis yang sama
-- dicairkan untuk anggota itu atau persetujuannya dibatalkan. Dipakai aturan "Kunci jika belum lunas". Baris lama otomatis false.
ALTER TABLE pengajuan_pinjaman ADD COLUMN IF NOT EXISTS menunggu_cair boolean NOT NULL DEFAULT false;

-- QR transaksi: token acak yang ditunjukkan anggota ke kasir untuk memilih dirinya dan satu jenis simpanan atau pinjaman (berlaku 5 menit).
CREATE TABLE IF NOT EXISTS qr_anggota (
    token varchar(32) PRIMARY KEY,
    anggota_id bigint NOT NULL REFERENCES anggota(id) ON DELETE CASCADE,
    jenis varchar(10) NOT NULL,
    ref varchar(40) NOT NULL,
    berlaku_sampai timestamptz NOT NULL
);

-- Absensi staff dari QR saya: satu baris per anggota per hari (tanggal zona Asia/Jakarta).
CREATE TABLE IF NOT EXISTS absensi_staff (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    anggota_id bigint NOT NULL REFERENCES anggota(id) ON DELETE CASCADE,
    tanggal date NOT NULL,
    masuk timestamptz NOT NULL,
    pulang timestamptz,
    UNIQUE (anggota_id, tanggal)
);
CREATE INDEX IF NOT EXISTS ix_absensi_staff_tanggal ON absensi_staff (tanggal DESC);

-- Unit usaha koperasi (kantin dulu; PPOB dan e-commerce menyusul). Rancangan: docs/prd-kantin.md.
-- Model per unit: 'milik' (barang dan kas milik koperasi), 'bagi_hasil' (tenant, koperasi mendapat persen penjualan), 'sewa' (tenant, sewa tetap).
CREATE TABLE IF NOT EXISTS tenant (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nama_usaha varchar(100) NOT NULL,
    pemilik varchar(100),
    telepon varchar(30),
    email varchar(100),
    bank varchar(50),
    no_rekening varchar(50),
    nama_rekening varchar(100),
    aktif boolean NOT NULL DEFAULT true,
    dibuat_pada timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS unit_usaha (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    jenis varchar(12) NOT NULL DEFAULT 'KANTIN' CHECK (jenis IN ('KANTIN', 'PPOB', 'ECOMMERCE')),
    kode varchar(20) NOT NULL UNIQUE,
    nama varchar(80) NOT NULL,
    lokasi varchar(100),
    jam_buka time,
    jam_tutup time,
    aktif boolean NOT NULL DEFAULT true,
    tampil_anggota boolean NOT NULL DEFAULT true,
    model varchar(12) NOT NULL DEFAULT 'milik' CHECK (model IN ('milik', 'bagi_hasil', 'sewa')),
    tenant_id bigint REFERENCES tenant(id),
    -- Akun jurnal, dibuat otomatis saat unit disimpan (backend/src/unit-usaha/kantin.ts). Model milik: kas, persediaan, penjualan, hpp.
    -- Model tenant: piutang tenant, utang ke tenant, pendapatan (bagi hasil atau sewa).
    akun_kas_id bigint REFERENCES perkiraan(id),
    akun_persediaan_id bigint REFERENCES perkiraan(id),
    akun_penjualan_id bigint REFERENCES perkiraan(id),
    akun_hpp_id bigint REFERENCES perkiraan(id),
    akun_piutang_tenant_id bigint REFERENCES perkiraan(id),
    akun_utang_tenant_id bigint REFERENCES perkiraan(id),
    akun_pendapatan_tenant_id bigint REFERENCES perkiraan(id),
    terima_tunai boolean NOT NULL DEFAULT true,
    terima_sukarela boolean NOT NULL DEFAULT true,
    batas_sukarela_transaksi numeric(20,4) NOT NULL DEFAULT 100000,
    batas_sukarela_harian numeric(20,4) NOT NULL DEFAULT 200000,
    saldo_sukarela_minimal numeric(20,4) NOT NULL DEFAULT 0,
    menit_batal_pesanan integer NOT NULL DEFAULT 30,
    dibuat_oleh varchar(50),
    dibuat_pada timestamptz NOT NULL DEFAULT now(),
    diubah_pada timestamptz
);
-- Kontrak tenant per unit; yang berlaku = baris dengan mulai terbaru.
CREATE TABLE IF NOT EXISTS tenant_kontrak (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    unit_usaha_id bigint NOT NULL REFERENCES unit_usaha(id) ON DELETE CASCADE,
    tenant_id bigint NOT NULL REFERENCES tenant(id),
    mulai date NOT NULL,
    selesai date,
    persen_bagi_hasil numeric(7,4) NOT NULL DEFAULT 0,
    minimum_bulanan numeric(20,4) NOT NULL DEFAULT 0,
    sewa_bulanan numeric(20,4) NOT NULL DEFAULT 0,
    periode_penyelesaian varchar(10) NOT NULL DEFAULT 'bulanan' CHECK (periode_penyelesaian IN ('bulanan', 'mingguan')),
    dibuat_pada timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_tenant_kontrak_unit ON tenant_kontrak (unit_usaha_id, mulai DESC);
-- Operator yang boleh memakai satu unit. Admin (izin Unit Usaha) melihat semua unit tanpa baris di sini.
CREATE TABLE IF NOT EXISTS unit_usaha_opr (
    unit_usaha_id bigint NOT NULL REFERENCES unit_usaha(id) ON DELETE CASCADE,
    opr_id bigint NOT NULL REFERENCES opr(id) ON DELETE CASCADE,
    peran varchar(10) NOT NULL CHECK (peran IN ('pengelola', 'kasir')),
    PRIMARY KEY (unit_usaha_id, opr_id)
);
CREATE INDEX IF NOT EXISTS ix_unit_usaha_opr_opr ON unit_usaha_opr (opr_id);

CREATE TABLE IF NOT EXISTS kantin_kategori (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    unit_usaha_id bigint NOT NULL REFERENCES unit_usaha(id) ON DELETE CASCADE,
    nama varchar(50) NOT NULL,
    urutan integer NOT NULL DEFAULT 0
);
CREATE UNIQUE INDEX IF NOT EXISTS ux_kantin_kategori_nama ON kantin_kategori (unit_usaha_id, lower(nama));
CREATE TABLE IF NOT EXISTS kantin_produk (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    unit_usaha_id bigint NOT NULL REFERENCES unit_usaha(id),
    kategori_id bigint REFERENCES kantin_kategori(id) ON DELETE SET NULL,
    kode varchar(30) NOT NULL,
    barcode varchar(50),
    nama varchar(100) NOT NULL,
    satuan varchar(20) NOT NULL DEFAULT 'pcs',
    harga_beli numeric(20,4) NOT NULL DEFAULT 0,
    harga_jual numeric(20,4) NOT NULL,
    harga_pokok numeric(20,4) NOT NULL DEFAULT 0,          -- HPP per satuan: rata-rata bergerak untuk produk berstok, harga beli untuk yang tidak
    kelola_stok boolean NOT NULL DEFAULT false,
    stok numeric(20,4) NOT NULL DEFAULT 0,                 -- hanya berubah lewat mutasi stok (stok masuk, penjualan, opname)
    stok_minimal numeric(20,4) NOT NULL DEFAULT 0,
    tampil_anggota boolean NOT NULL DEFAULT true,
    aktif boolean NOT NULL DEFAULT true,
    keterangan varchar(255),
    dibuat_pada timestamptz NOT NULL DEFAULT now(),
    diubah_pada timestamptz,
    UNIQUE (unit_usaha_id, kode)
);
CREATE UNIQUE INDEX IF NOT EXISTS ux_kantin_produk_barcode ON kantin_produk (unit_usaha_id, barcode) WHERE barcode IS NOT NULL;
CREATE TABLE IF NOT EXISTS kantin_harga_riwayat (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    produk_id bigint NOT NULL REFERENCES kantin_produk(id) ON DELETE CASCADE,
    harga_beli_lama numeric(20,4),
    harga_beli_baru numeric(20,4) NOT NULL,
    harga_jual_lama numeric(20,4),
    harga_jual_baru numeric(20,4) NOT NULL,
    opr varchar(50) NOT NULL,
    waktu timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_kantin_harga_riwayat_produk ON kantin_harga_riwayat (produk_id, waktu DESC);
-- Gambar produk memakai pengumuman_gambar (jenis ref 'produk').
ALTER TABLE pengumuman_gambar_ref DROP CONSTRAINT IF EXISTS pengumuman_gambar_ref_jenis_check;
ALTER TABLE pengumuman_gambar_ref ADD CONSTRAINT pengumuman_gambar_ref_jenis_check CHECK (jenis IN ('himbauan', 'promo', 'notifikasi', 'produk'));
