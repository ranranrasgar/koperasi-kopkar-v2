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
-- Sesi kasir: dibuka dengan modal laci, ditutup dengan hitung uang fisik.
CREATE TABLE IF NOT EXISTS kantin_sesi_kasir (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    unit_usaha_id bigint NOT NULL REFERENCES unit_usaha(id),
    opr_id bigint NOT NULL REFERENCES opr(id),
    opr varchar(50) NOT NULL,
    dibuka_pada timestamptz NOT NULL DEFAULT now(),
    modal_awal numeric(20,4) NOT NULL DEFAULT 0,
    ditutup_pada timestamptz,
    total_tunai_sistem numeric(20,4),
    uang_fisik numeric(20,4),
    selisih numeric(20,4),
    catatan varchar(255)
);
-- Satu sesi terbuka per operator per kantin.
CREATE UNIQUE INDEX IF NOT EXISTS ux_kantin_sesi_terbuka ON kantin_sesi_kasir (unit_usaha_id, opr_id) WHERE ditutup_pada IS NULL;

-- Penjualan (POS dan nanti pesanan aplikasi anggota). Nomor KTN-yymm-n dari seq_kantin_jual.
CREATE SEQUENCE IF NOT EXISTS seq_kantin_jual START 1;
CREATE SEQUENCE IF NOT EXISTS seq_kantin_stok START 1;
CREATE TABLE IF NOT EXISTS kantin_penjualan (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    no_bukti varchar(30) NOT NULL UNIQUE,
    unit_usaha_id bigint NOT NULL REFERENCES unit_usaha(id),
    sesi_kasir_id bigint REFERENCES kantin_sesi_kasir(id),
    anggota_id bigint REFERENCES anggota(id),
    tanggal date NOT NULL,
    sumber varchar(10) NOT NULL DEFAULT 'pos' CHECK (sumber IN ('pos', 'mobile')),
    status varchar(16) NOT NULL DEFAULT 'selesai' CHECK (status IN ('menunggu_bayar', 'dibayar', 'diproses', 'siap', 'selesai', 'batal')),
    metode varchar(10) NOT NULL CHECK (metode IN ('tunai', 'sukarela')),
    model varchar(12) NOT NULL,                              -- model unit saat transaksi (menentukan jurnalnya)
    subtotal numeric(20,4) NOT NULL,
    diskon numeric(20,4) NOT NULL DEFAULT 0,
    total numeric(20,4) NOT NULL,
    total_pokok numeric(20,4) NOT NULL DEFAULT 0,
    persen_bagi_hasil numeric(7,4),
    bagi_hasil numeric(20,4) NOT NULL DEFAULT 0,
    uang_diterima numeric(20,4),
    kembalian numeric(20,4),
    kunci_idempoten uuid UNIQUE,
    catatan varchar(255),
    dibuat_pada timestamptz NOT NULL DEFAULT now(),
    opr varchar(50) NOT NULL,
    dibatalkan_pada timestamptz,
    opr_batal varchar(50),
    alasan_batal varchar(255)
);
CREATE INDEX IF NOT EXISTS ix_kantin_penjualan_unit ON kantin_penjualan (unit_usaha_id, tanggal DESC);
-- Bayar Simpanan Sukarela: token QR bayar yang dipakai (HP anggota mencocokkan status pembayarannya) dan baris pengambilan simpanannya.
ALTER TABLE kantin_penjualan ADD COLUMN IF NOT EXISTS qr_token varchar(32);
ALTER TABLE kantin_penjualan ADD COLUMN IF NOT EXISTS simpanan_id bigint;
-- Penyelesaian tenant yang mencakup nota ini (nota di periode terselesaikan tidak bisa dibatalkan).
ALTER TABLE kantin_penjualan ADD COLUMN IF NOT EXISTS penyelesaian_id bigint;
CREATE INDEX IF NOT EXISTS ix_kantin_penjualan_qr ON kantin_penjualan (qr_token) WHERE qr_token IS NOT NULL;
CREATE INDEX IF NOT EXISTS ix_kantin_penjualan_anggota ON kantin_penjualan (anggota_id, tanggal DESC) WHERE anggota_id IS NOT NULL;
CREATE TABLE IF NOT EXISTS kantin_penjualan_item (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    penjualan_id bigint NOT NULL REFERENCES kantin_penjualan(id) ON DELETE CASCADE,
    produk_id bigint NOT NULL REFERENCES kantin_produk(id),
    nama_produk varchar(100) NOT NULL,
    satuan varchar(20) NOT NULL,
    qty numeric(20,4) NOT NULL,
    harga_jual numeric(20,4) NOT NULL,
    harga_pokok numeric(20,4) NOT NULL,
    subtotal numeric(20,4) NOT NULL
);
CREATE INDEX IF NOT EXISTS ix_kantin_penjualan_item_jual ON kantin_penjualan_item (penjualan_id);

-- Penyelesaian tenant per periode (model bagi_hasil/sewa): bagi hasil (dengan minimum bulanan) atau sewa, utang koperasi dari belanja sukarela,
-- piutang bagi hasil dari penjualan tunai, dan neto yang ditransfer. Nota di periode itu ditandai kantin_penjualan.penyelesaian_id.
CREATE SEQUENCE IF NOT EXISTS seq_kantin_selesai START 1;
CREATE TABLE IF NOT EXISTS tenant_penyelesaian (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    no_bukti varchar(30) NOT NULL UNIQUE,
    unit_usaha_id bigint NOT NULL REFERENCES unit_usaha(id),
    tenant_id bigint REFERENCES tenant(id),
    model varchar(12) NOT NULL,
    periode_mulai date NOT NULL,
    periode_selesai date NOT NULL,
    tanggal date NOT NULL,
    nota integer NOT NULL DEFAULT 0,
    total_penjualan numeric(20,4) NOT NULL DEFAULT 0,
    total_tunai numeric(20,4) NOT NULL DEFAULT 0,
    total_sukarela numeric(20,4) NOT NULL DEFAULT 0,
    bagi_hasil numeric(20,4) NOT NULL DEFAULT 0,          -- dari nota (persen x penjualan)
    tambahan numeric(20,4) NOT NULL DEFAULT 0,            -- kekurangan dari minimum bulanan, atau sewa
    utang_tenant numeric(20,4) NOT NULL DEFAULT 0,        -- belanja sukarela dikurangi bagi hasilnya
    piutang_tenant numeric(20,4) NOT NULL DEFAULT 0,      -- bagi hasil penjualan tunai + tambahan
    neto numeric(20,4) NOT NULL DEFAULT 0,                -- positif: koperasi membayar tenant; negatif: tenant membayar koperasi
    akun_kas varchar(30),
    catatan varchar(255),
    opr varchar(50) NOT NULL,
    dibuat_pada timestamptz NOT NULL DEFAULT now(),
    dibatalkan_pada timestamptz,
    opr_batal varchar(50)
);
CREATE INDEX IF NOT EXISTS ix_tenant_penyelesaian_unit ON tenant_penyelesaian (unit_usaha_id, periode_mulai DESC);

-- PIN transaksi anggota (6 angka, bcrypt) untuk menyetujui pembayaran dari HP: tagihan QR kantin dan belanja di aplikasi.
-- Salah 5 kali berturut-turut: terkunci 15 menit. Mengatur/mengganti PIN wajib memasukkan password akun.
CREATE TABLE IF NOT EXISTS anggota_pin (
    anggota_id bigint PRIMARY KEY REFERENCES anggota(id) ON DELETE CASCADE,
    pin_hash varchar(100) NOT NULL,
    gagal integer NOT NULL DEFAULT 0,
    kunci_sampai timestamptz,
    diubah_pada timestamptz NOT NULL DEFAULT now()
);

-- Tagihan QR kantin: kasir menampilkan QR (KOPKAR1:T:token), anggota memindai dan menyetujui di HP dengan PIN. Isi = keranjang saat tagihan dibuat.
CREATE TABLE IF NOT EXISTS kantin_tagihan (
    token varchar(32) PRIMARY KEY,
    unit_usaha_id bigint NOT NULL REFERENCES unit_usaha(id),
    opr_id bigint NOT NULL REFERENCES opr(id),
    opr varchar(50) NOT NULL,
    isi jsonb NOT NULL,
    total numeric(20,4) NOT NULL,
    kunci uuid NOT NULL,
    berlaku_sampai timestamptz NOT NULL,
    penjualan_id bigint REFERENCES kantin_penjualan(id),
    dibatalkan_pada timestamptz,
    dibuat_pada timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_kantin_tagihan_berlaku ON kantin_tagihan (berlaku_sampai);

-- Belanja dari aplikasi anggota: tas per anggota per kantin (disimpan di server), lalu pesanan.
CREATE TABLE IF NOT EXISTS kantin_tas (
    anggota_id bigint NOT NULL REFERENCES anggota(id) ON DELETE CASCADE,
    unit_usaha_id bigint NOT NULL REFERENCES unit_usaha(id) ON DELETE CASCADE,
    produk_id bigint NOT NULL REFERENCES kantin_produk(id) ON DELETE CASCADE,
    qty numeric(20,4) NOT NULL,
    diubah_pada timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (anggota_id, unit_usaha_id, produk_id)
);
-- Pesanan: sukarela dibayar saat checkout (penjualan langsung diposting, status 'dibayar'); tunai dibayar saat diambil di kasir
-- (status 'menunggu' sampai kasir memposting penjualannya, batal otomatis setelah batas_ambil). Alur: dibayar/menunggu -> diproses -> siap -> selesai.
CREATE TABLE IF NOT EXISTS kantin_pesanan (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    unit_usaha_id bigint NOT NULL REFERENCES unit_usaha(id),
    anggota_id bigint NOT NULL REFERENCES anggota(id),
    isi jsonb NOT NULL,
    total numeric(20,4) NOT NULL,
    metode varchar(10) NOT NULL CHECK (metode IN ('tunai', 'sukarela')),
    status varchar(10) NOT NULL CHECK (status IN ('menunggu', 'dibayar', 'diproses', 'siap', 'selesai', 'batal')),
    catatan varchar(255),
    batas_ambil timestamptz,
    penjualan_id bigint REFERENCES kantin_penjualan(id),
    alasan_batal varchar(255),
    dibuat_pada timestamptz NOT NULL DEFAULT now(),
    diubah_pada timestamptz NOT NULL DEFAULT now(),
    diubah_oleh varchar(50)
);
CREATE INDEX IF NOT EXISTS ix_kantin_pesanan_unit ON kantin_pesanan (unit_usaha_id, status, dibuat_pada DESC);
CREATE INDEX IF NOT EXISTS ix_kantin_pesanan_anggota ON kantin_pesanan (anggota_id, dibuat_pada DESC);

-- Kartu stok: setiap perubahan stok produk berstok (stok masuk, penjualan, batal, opname).
CREATE TABLE IF NOT EXISTS kantin_stok_mutasi (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    produk_id bigint NOT NULL REFERENCES kantin_produk(id),
    unit_usaha_id bigint NOT NULL REFERENCES unit_usaha(id),
    waktu timestamptz NOT NULL DEFAULT now(),
    tanggal date NOT NULL,
    jenis varchar(8) NOT NULL CHECK (jenis IN ('masuk', 'jual', 'batal', 'opname', 'rusak')),
    qty numeric(20,4) NOT NULL,                              -- positif masuk, negatif keluar
    harga numeric(20,4) NOT NULL,                            -- harga beli (masuk) atau harga pokok (keluar)
    stok_setelah numeric(20,4) NOT NULL,
    no_bukti varchar(30) NOT NULL,
    opr varchar(50) NOT NULL,
    keterangan varchar(255)
);
CREATE INDEX IF NOT EXISTS ix_kantin_stok_mutasi_produk ON kantin_stok_mutasi (produk_id, waktu);
CREATE INDEX IF NOT EXISTS ix_kantin_stok_mutasi_bukti ON kantin_stok_mutasi (no_bukti);
-- HPP rata-rata produk sebelum stok masuk ini: hapus/ubah stok masuk mengembalikannya persis (baris lama NULL: dihitung balik).
ALTER TABLE kantin_stok_mutasi ADD COLUMN IF NOT EXISTS hpp_sebelum numeric(20,4);
-- Status buka kantin (backend/src/unit-usaha/kantin.ts sqlBuka): 'jadwal' (jam_buka-jam_tutup, boleh lewat tengah malam), '24jam', atau
-- 'tutup' sementara (sampai tutup_sampai, inklusif; NULL = sampai diubah lagi) dengan pesan untuk anggota.
ALTER TABLE unit_usaha ADD COLUMN IF NOT EXISTS status_buka varchar(10) NOT NULL DEFAULT 'jadwal' CHECK (status_buka IN ('jadwal', '24jam', 'tutup'));
ALTER TABLE unit_usaha ADD COLUMN IF NOT EXISTS pesan_tutup varchar(150);
ALTER TABLE unit_usaha ADD COLUMN IF NOT EXISTS tutup_sampai date;

-- Gambar produk memakai pengumuman_gambar (jenis ref 'produk').
ALTER TABLE pengumuman_gambar_ref DROP CONSTRAINT IF EXISTS pengumuman_gambar_ref_jenis_check;
ALTER TABLE pengumuman_gambar_ref ADD CONSTRAINT pengumuman_gambar_ref_jenis_check CHECK (jenis IN ('himbauan', 'promo', 'notifikasi', 'produk'));

-- Penggajian karyawan koperasi (docs/prd-penggajian.md). Karyawan koperasi bukan anggota berstatus Staff; tautan ke anggota opsional.
CREATE TABLE IF NOT EXISTS karyawan (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    kode varchar(20) NOT NULL UNIQUE,                        -- K007, sama dengan Excel lama
    nama varchar(100) NOT NULL,
    nik_ktp varchar(30),
    jenis_kelamin char(1) CHECK (jenis_kelamin IN ('L', 'P')),
    status_kerja varchar(10) NOT NULL DEFAULT 'Kontrak' CHECK (status_kerja IN ('Tetap', 'Kontrak')),
    tgl_masuk date,
    akhir_kontrak date,
    bidang varchar(60),
    jabatan varchar(60),
    atasan varchar(60),
    bank varchar(50),
    no_rek varchar(40),
    atas_nama_rek varchar(100),
    npwp varchar(30),
    status_ptkp varchar(5) NOT NULL DEFAULT 'TK/0' CHECK (status_ptkp IN ('TK/0', 'TK/1', 'TK/2', 'TK/3', 'K/0', 'K/1', 'K/2', 'K/3')),
    umk numeric(20,4) NOT NULL DEFAULT 0,
    tunj_jabatan numeric(20,4) NOT NULL DEFAULT 0,
    aktif boolean NOT NULL DEFAULT true,
    anggota_id bigint REFERENCES anggota(id) ON DELETE SET NULL,
    catatan varchar(255),
    dibuat_pada timestamptz NOT NULL DEFAULT now(),
    diubah_pada timestamptz NOT NULL DEFAULT now(),
    diubah_oleh varchar(50)
);
CREATE UNIQUE INDEX IF NOT EXISTS ux_karyawan_anggota ON karyawan (anggota_id) WHERE anggota_id IS NOT NULL;

-- Tarif efektif rata-rata PPh 21 bulanan (PP 58/2023, PMK 168/2023): tarif berlaku untuk bruto >= batas_bawah sampai batas berikutnya.
CREATE TABLE IF NOT EXISTS gaji_ter (
    kategori char(1) NOT NULL CHECK (kategori IN ('A', 'B', 'C')),
    batas_bawah numeric(20,4) NOT NULL,
    tarif numeric(6,3) NOT NULL,
    PRIMARY KEY (kategori, batas_bawah)
);
INSERT INTO gaji_ter (kategori, batas_bawah, tarif)
SELECT * FROM (VALUES
    ('A', 0, 0),
    ('A', 5400001, 0.25),
    ('A', 5650001, 0.5),
    ('A', 5950001, 0.75),
    ('A', 6300001, 1),
    ('A', 6750001, 1.25),
    ('A', 7500001, 1.5),
    ('A', 8550001, 1.75),
    ('A', 9650001, 2),
    ('A', 10050001, 2.25),
    ('A', 10350001, 2.5),
    ('A', 10700001, 3),
    ('A', 11050001, 3.5),
    ('A', 11600001, 4),
    ('A', 12500001, 5),
    ('A', 13750001, 6),
    ('A', 15100001, 7),
    ('A', 16950001, 8),
    ('A', 19750001, 9),
    ('A', 24150001, 10),
    ('A', 26450001, 11),
    ('A', 28000001, 12),
    ('A', 30050001, 13),
    ('A', 32400001, 14),
    ('A', 35400001, 15),
    ('A', 39100001, 16),
    ('A', 43850001, 17),
    ('A', 47800001, 18),
    ('A', 51400001, 19),
    ('A', 56300001, 20),
    ('A', 62200001, 21),
    ('A', 68600001, 22),
    ('A', 77500001, 23),
    ('A', 89000001, 24),
    ('A', 103000001, 25),
    ('A', 125000001, 26),
    ('A', 157000001, 27),
    ('A', 206000001, 28),
    ('A', 337000001, 29),
    ('A', 454000001, 30),
    ('A', 550000001, 31),
    ('A', 695000001, 32),
    ('A', 910000001, 33),
    ('A', 1400000001, 34),
    ('B', 0, 0),
    ('B', 6200001, 0.25),
    ('B', 6500001, 0.5),
    ('B', 6850001, 0.75),
    ('B', 7300001, 1),
    ('B', 9200001, 1.5),
    ('B', 10750001, 2),
    ('B', 11250001, 2.5),
    ('B', 11600001, 3),
    ('B', 12600001, 4),
    ('B', 13600001, 5),
    ('B', 14950001, 6),
    ('B', 16400001, 7),
    ('B', 18450001, 8),
    ('B', 21850001, 9),
    ('B', 26000001, 10),
    ('B', 27700001, 11),
    ('B', 29350001, 12),
    ('B', 31450001, 13),
    ('B', 33950001, 14),
    ('B', 37100001, 15),
    ('B', 41100001, 16),
    ('B', 45800001, 17),
    ('B', 49500001, 18),
    ('B', 53800001, 19),
    ('B', 58500001, 20),
    ('B', 64000001, 21),
    ('B', 71000001, 22),
    ('B', 80000001, 23),
    ('B', 93000001, 24),
    ('B', 109000001, 25),
    ('B', 129000001, 26),
    ('B', 163000001, 27),
    ('B', 211000001, 28),
    ('B', 374000001, 29),
    ('B', 459000001, 30),
    ('B', 555000001, 31),
    ('B', 704000001, 32),
    ('B', 957000001, 33),
    ('B', 1405000001, 34),
    ('C', 0, 0),
    ('C', 6600001, 0.25),
    ('C', 6950001, 0.5),
    ('C', 7350001, 0.75),
    ('C', 7800001, 1),
    ('C', 8850001, 1.25),
    ('C', 9800001, 1.5),
    ('C', 10950001, 1.75),
    ('C', 11200001, 2),
    ('C', 12050001, 3),
    ('C', 12950001, 4),
    ('C', 14150001, 5),
    ('C', 15550001, 6),
    ('C', 17050001, 7),
    ('C', 19500001, 8),
    ('C', 22700001, 9),
    ('C', 26600001, 10),
    ('C', 28100001, 11),
    ('C', 30100001, 12),
    ('C', 32600001, 13),
    ('C', 35400001, 14),
    ('C', 38900001, 15),
    ('C', 43000001, 16),
    ('C', 47400001, 17),
    ('C', 51200001, 18),
    ('C', 55800001, 19),
    ('C', 60400001, 20),
    ('C', 66700001, 21),
    ('C', 74500001, 22),
    ('C', 83200001, 23),
    ('C', 95600001, 24),
    ('C', 110000001, 25),
    ('C', 134000001, 26),
    ('C', 169000001, 27),
    ('C', 221000001, 28),
    ('C', 390000001, 29),
    ('C', 463000001, 30),
    ('C', 561000001, 31),
    ('C', 709000001, 32),
    ('C', 965000001, 33),
    ('C', 1419000001, 34)
) AS t(kategori, batas_bawah, tarif) WHERE NOT EXISTS (SELECT 1 FROM gaji_ter);

-- Satu periode gaji: tanggal awal (bawaan 23) bulan lalu s/d sehari sebelumnya bulan ini; periode = bulan akhir, mis. '2015-10'.
CREATE TABLE IF NOT EXISTS gaji_periode (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    periode char(7) NOT NULL UNIQUE,
    dari date NOT NULL,
    sampai date NOT NULL,
    status varchar(6) NOT NULL DEFAULT 'draf' CHECK (status IN ('draf', 'final')),
    dibuat_oleh varchar(50) NOT NULL,
    dibuat_pada timestamptz NOT NULL DEFAULT now(),
    final_oleh varchar(50),
    final_pada timestamptz,
    CHECK (sampai >= dari)
);

-- Kode kehadiran harian: ATN hadir, RD libur, ABS tidak hadir, ANN cuti tahunan, MED sakit, MAT melahirkan, UNP izin tanpa upah.
CREATE TABLE IF NOT EXISTS gaji_hadir (
    periode_id bigint NOT NULL REFERENCES gaji_periode(id) ON DELETE CASCADE,
    karyawan_id bigint NOT NULL REFERENCES karyawan(id) ON DELETE CASCADE,
    tanggal date NOT NULL,
    kode varchar(3) NOT NULL CHECK (kode IN ('ATN', 'RD', 'ABS', 'ANN', 'MED', 'MAT', 'UNP')),
    PRIMARY KEY (periode_id, karyawan_id, tanggal)
);

-- Lembur harian; jam dan jam_bobot dihitung backend (backend/src/gaji/hitung.ts) saat disimpan.
CREATE TABLE IF NOT EXISTS gaji_lembur (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    periode_id bigint NOT NULL REFERENCES gaji_periode(id) ON DELETE CASCADE,
    karyawan_id bigint NOT NULL REFERENCES karyawan(id) ON DELETE CASCADE,
    tanggal date NOT NULL,
    mulai time NOT NULL,
    selesai time NOT NULL,
    jenis_hari varchar(9) NOT NULL CHECK (jenis_hari IN ('kerja', 'istirahat')),
    jam numeric(6,2) NOT NULL,
    jam_bobot numeric(6,2) NOT NULL,
    keterangan varchar(255),
    opr varchar(50) NOT NULL,
    UNIQUE (periode_id, karyawan_id, tanggal)
);

-- Isian manual per karyawan per periode, dan salinan hasil hitungan saat periode difinalkan.
CREATE TABLE IF NOT EXISTS gaji_slip (
    periode_id bigint NOT NULL REFERENCES gaji_periode(id) ON DELETE CASCADE,
    karyawan_id bigint NOT NULL REFERENCES karyawan(id) ON DELETE CASCADE,
    cad_resiko numeric(20,4) NOT NULL DEFAULT 0,
    thr numeric(20,4) NOT NULL DEFAULT 0,
    tunj_lain numeric(20,4) NOT NULL DEFAULT 0,
    pot_koperasi numeric(20,4) NOT NULL DEFAULT 0,
    pot_lain numeric(20,4) NOT NULL DEFAULT 0,
    ket_pot_lain varchar(255),
    hasil jsonb,
    PRIMARY KEY (periode_id, karyawan_id)
);
