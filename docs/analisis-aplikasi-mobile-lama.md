# Analisis aplikasi mobile anggota lama (Android v5.6 + API PHP)

Ditulis 23 Oktober 2026 sebagai bahan PRD PWA anggota (`docs/prd-pwa-anggota.md`). Semua isi berasal dari membaca kode sumber dan data, bukan dari dokumentasi saja; lokasi file dicantumkan supaya bisa dicek ulang.

## 1. Lokasi sumber

| Bagian | Lokasi | Keterangan |
| --- | --- | --- |
| Aplikasi Android | `G:\Rhansoft\Android\KopkarMJS2000_Rhansoft_upgrade` | Java, paket `com.rhansoft.kopkarmjsjkt2000`, 52 file Java, 49 layout. Dokumen ringkas: `DOCUMENTATION_EXISTING_FEATURES.md` (sebagian tidak akurat, lihat bagian 9) |
| Daftar URL API | `app/src/main/java/com/rhansoft/kopkarmjsjkt2000/util/Api.java` | Produksi `http://101.50.3.222/KopkarMJS2000_2026/v1/` (HTTP, bukan HTTPS) |
| **Server API PHP (sumber aturan sebenarnya)** | `C:\laragon\www\KopkarMJS2000_2026` | `v1/Api.php` (router apicall), `v1/login.php` + `v1/user.php` (daftar/login), `v1/dashboard.php`, `includes/DbOperation.php` (2.008 baris query), `includes/Auth.php` (token), `includes/MailHelper.php` (email Gmail SMTP), `reset-password.php` (halaman reset dari email) |
| Port baca di v2 | `mobile-api/src/queries.ts`, `mobile-api/src/server.ts` | 17 endpoint baca, bentuk JSON diuji terhadap `database/contract/mobile-api-shapes.json` |
| Database live | MySQL `kopkar_mjs_2000` di VPS produksi | Dipakai aplikasi desktop + API PHP. PostgreSQL v2 adalah **salinan migrasi** (22 Oktober 2026), belum menggantikan yang live |

## 2. Peta layar Android dan API

| Layar (Activity) | Isi | API |
| --- | --- | --- |
| `SplashActivity` | Logo, cek sesi | - |
| `LoginActivity` | Login; mode **daftar** (username, password ×2, NIK, pertanyaan keamanan, jawaban) | `login.php` (POST), `getpertanyaan` |
| `UpdateEmailActivity` | Wajib isi email bila akun belum punya email (dipanggil setelah login) | `updateemail` |
| `LupaPasswordActivity` | Username + email → kirim tautan reset ke email | `isuserexist&username=&email=` |
| `ResetPasswordActivity` | Jalur lama: username → pertanyaan → jawaban → password baru | `isuserexist`, `updateuserpassword` |
| `MainActivity` (Beranda) | Kartu total simpanan (bisa disembunyikan), sisa pinjaman, plafon kredit (grade), potongan bulan ini, SHU berjalan; kartu RAT (himbauan); slider promo; menu: Profil, Ajuan Kredit, Simpanan, Pinjaman, SHU, Potongan; ikon notifikasi, bantuan ("segera hadir"), logout. Daftar FCM token saat dibuka | `dashboard.php`, `updatefcmtoken` |
| `DetailAnggota` (Profil) | Biodata, pekerjaan, rekening, foto (kamera/galeri → upload), **ganti kata sandi** | data dari sesi login, `updateprofile` (multipart `foto`), `updateuserpassword` |
| `SimpananActivity` | Total saldo + kartu per jenis simpanan | `getsimpanan` |
| `SimpananRinciActivity` | Mutasi satu jenis, dimuat bertahap | `getsimpananrincipaginated` (offset/limit) |
| `PinjamanActivity` | Total sisa pinjaman + daftar pinjaman aktif | `getpinjaman` |
| `PinjamanRinciActivity` | Rincian pinjaman, status cicilan ke-n dari n, riwayat angsuran | `getpinjamanrincipaginated` |
| `JadwalAngsuranActivity` | Jadwal angsuran (tenor, total) | `getjadwalangsuran` |
| `PengajuanKreditActivity` | Form pengajuan (lihat bagian 4) | `getjeniskreditv1`, `getSaldoJenisPinjaman`, `createpinjaman` |
| `PotonganBulananActivity` | Rekening, pokok, wajib, sukarela, koperasi, bank, KPR, admin bank, total; status terdebet | `getpotonganbulanan`, `isterdebet` |
| `ShuActivity` | Pilih tahun buku; total SHU + 4 komponen; No Reff | `gettahunshu`, `getshu`, `dashboard.php` |
| `HistoryActivity` | Riwayat transaksi gabungan, dimuat bertahap | `gethistory` |
| `LogNotifikasiActivity` | Riwayat notifikasi | `getlognotifikasi` |
| `PpobActivity`, `TokoActivity`, `ScannerBottomSheet`, menu Produk/Pesanan | **Belum berfungsi** ("segera hadir") | - |

Teks dekoratif tanpa data di layout (jangan ditiru sebagai fitur): "+2.4% bulan ini", "Target Menabung", "Silver Tier", "5 Tahun", "Rekening Terproteksi", "RAT Tahun Buku 2023" statis.

## 3. Pendaftaran, login, dan password (`v1/login.php`, `v1/user.php`)

**Login** (`username` + `password`, tanpa `nik`):
1. Cari `user` berdasar username. Tidak ada → *"Username '…' tidak terdaftar."*
2. `user.status` harus `'Y'`, selain itu → *"Akun Anda tidak aktif. Hubungi Admin."*
3. Password: bila hash diawali `$2y$` → `password_verify` (bcrypt); selain itu dianggap **MD5** (`md5(password) == hash`) lalu **diganti bcrypt** (rehash otomatis).
4. Ambil data anggota (`anggota` LEFT JOIN `anggota_detail`, JOIN `user` untuk foto/email/username) dengan syarat `anggota.AKTIF = 'Y'`. Tidak ada → *"Data anggota tidak ditemukan atau sudah tidak aktif."*
5. Balasan: `success`, `anggota` (±40 kolom biodata/pekerjaan/rekening/grade/simpanan per bulan), `api_token` (lihat bagian 6). Salah password → *"Password salah."*
6. Aplikasi: bila `email` kosong/kurang dari 5 karakter → wajib ke layar isi email.

**Daftar** (`username`, `password`, `nik`, `idPertanyaan`, `jawaban` semua terisi):
1. Tolak bila username sudah ada **atau** anggota dengan NIK itu sudah punya akun → *"Username/NIK sudah terdaftar...!"*
2. NIK harus **tepat 6 karakter** → *"Gagal mendaftarkan. NIK tidak valid"*
3. NIK ada di tabel `anggota` → buat akun dengan `KODE_AGT` anggota itu → *"User berhasil didaftarkan...!"*
4. Bila bukan anggota: NIK harus ada di `karyawan_mattel`, selain itu → *"NIK tidak terdaftar di database karyawan Mattel"*. Bila karyawan Mattel → akun dibuat dengan `KODE_AGT = NIK` (belum jadi anggota; kode lama: "ToDo: pendaftaran anggota otomatis").
5. Password disimpan bcrypt. Jawaban keamanan disimpan apa adanya di MySQL.
6. Catatan: aplikasi hanya memeriksa password ×2 sama; tidak ada aturan panjang password saat daftar.

**Lupa password**, dua jalur:
- **Email** (`isuserexist&username=&email=`): username + email cocok → kirim tautan `reset-password.php?user=…&token=…` (token reset bertanda tangan, 30 menit) lewat Gmail SMTP. Halaman reset: password **minimal 6 karakter** + konfirmasi.
- **Pertanyaan keamanan** (aplikasi lama): `isuserexist&username=` mengembalikan pertanyaan (dan **jawaban**, hanya selama `API_AUTH_REQUIRED=false`); `verifyjawaban` (POST username, jawaban; cocok tanpa beda huruf besar/kecil, di-trim) → `reset_token`; `updateuserpassword` (username, password, resetToken atau token login).

**Ganti email** (`updateemail`): email tidak boleh dipakai akun lain (*"Email ini sudah dipakai, gunakan email lain."*); kirim email notifikasi.

**Foto profil** (`updateprofile`, multipart `foto`): JPG/PNG/WEBP dicek dari isi file, maks. 5 MB, disimpan di `images/`.

## 4. Pengajuan kredit (`PengajuanKreditActivity`, `createpinjaman`)

**Daftar jenis kredit** (`getJenisKreditV1`): `jenis_kredit` dengan `kunci_hanya_untuk_staff = (anggota Staff ? 1 : 0)` **sama persis** (staff hanya melihat produk staff, non-staff hanya produk non-staff) dan `hide = 'N'`, urut nama.

Data PostgreSQL saat analisis (produk tampil):

| Kode | Staff | Kunci grade | Kunci sisa | Maks. cicilan |
| --- | --- | --- | --- | --- |
| C01 Pinj. Uang Non Staff | 0 | **1** | 0 | 12 |
| C02 Pinj. Uang Staff | 1 | **1** | 0 | 12 |
| C07 Dibayar Dimuka Non Staff | 0 | 0 | 0 | 5 |
| C08 Dibayar Dimuka Staff | 1 | 0 | 0 | 5 |
| C31 Pinj. Konsumtif Staff | 1 | 0 | 0 | 24 |
| C32 Pinj. Konsumtif Non Staff | 0 | 0 | 0 | 24 |

**Isian**: tanggal realisasi (bawaan hari ini, bebas dipilih), jenis pinjaman, lama (bawaan 12), besar pinjaman, keterangan. Persen jasa tampil otomatis dari jenis kredit.

**Validasi (urutan seperti aplikasi)**, semuanya **hanya di HP**:
1. `kunci_staff = 1` dan anggota bukan Staff → *"Pinjaman ini hanya untuk staff!"*
2. `kunci_grade = 1` dan besar pinjaman > `rp_grade` (plafon dari data anggota) → *"Pinjaman ini tidak boleh melebihi grade!"*
3. `kunci_saldo = 1` dan anggota masih punya pinjaman dengan kode kredit sama yang saldonya > 0 (`getSaldoJenisPinjaman`) → *"Silahkan selesaikan terlebih dahulu tagihan sebelumnya!"*
4. Lama kosong/0 → *"Lama pinjaman harus di isi!"*; lama > `max_cicilan` → *"Tenor pinjaman tidak boleh melebihi {max}"*
5. Besar kosong/0 → *"Besar pinjaman harus di isi!"*
6. Konfirmasi: *"Anda yakin data sudah benar? Lanjutkan?"*

**Estimasi angsuran** (tampilan saja): `besar / lama + besar × jasa% / 100` per bulan (tanpa adm/provisi).

**`getSaldoJenisPinjaman`**: per pinjaman tunai anggota, `SUM(kredit_pokok + kredit_bunga) − SUM(debit_pokok + debit_bunga)` dari rincian, hanya yang > 0.

**Server `createPinjaman`**: langsung `INSERT INTO pengajuan_pinjaman (tgl_realisasi, kd_anggota, kd_kredit, persen_bunga, lama_angsuran, rp_pinjaman_pokok, keterangan, persen_adm, persen_provisi, persen_denda)` dengan **nilai kiriman HP**, termasuk persen bunga/adm/provisi/denda; status bawaan tabel (P). **Tidak ada validasi server.** Balasan *"Pinjaman berhasil diajukan"*.

Setelah masuk, pengajuan diputuskan admin di web v2 (`/dashboard/loans/apply`, status P → Y/N) dan yang disetujui dicairkan lewat form pencairan.

## 5. Query tampilan (sudah diport ke `mobile-api`)

| Endpoint | Rumus / sumber | Status port v2 |
| --- | --- | --- |
| `dashboard.php` | total simpanan = jumlah saldo semua jenis **kecuali 01 (pokok)**; sisa pinjaman = jumlah `saldo` dari `getPinjaman`; potongan = `total_potongan` baris pertama `getPotonganBulanan`; SHU = `getSHU(tahun lalu).total_shu`; himbauan; promo | Sama |
| `getpinjaman` | Hanya pinjaman tunai yang punya rincian dan **sisa = ROUND(pokok − uang muka) − ROUND(pokok / lama × jml_cicilan) > 0**. Jasa total = (pokok − uang muka) × bunga% × (lama / bunga_per). `bayar_bunga` = ROUND(pokok × bunga% / bunga_per × jml_cicilan) | Sama. **Catatan**: "sisa" ini rumus aplikasi lama, bukan saldo akuntansi dari rincian (bisa beda sedikit karena pembulatan) dan tidak memuat KPR |
| `getpotonganbulanan`, `isterdebet` | Membaca `temp_potongan_all` (hasil *generate* potongan terakhir dari desktop). Terdebet = anggota ada di tabel itu | Sama. Web v2 punya proyeksi langsung (`lib/queries/pinjaman-lap.ts proyeksiPotongan`) |
| `getshu` | laba anggota = `labaditahan(tahun)` × `prosentase pos SHU urut 2` (51%) / 100. Total SHU = Σ komponen (sukarela, jasa uang, jasa barang, lama) dengan komponen = (nilai anggota / total semua anggota tahun itu) × laba anggota / 4. Bila laba ditahan 0 → kosong | **Diperbaiki di v2**: PHP mengambil baris anggota tanpa filter tahun (bug) dan bisa membagi nol |
| `gethistory` | Gabungan: simpanan (+/−), angsuran pinjaman tunai, angsuran KPR, pengajuan (REG-PP), SHU; urut tanggal turun, offset/limit | Sama |
| `getsimpanan`, `getsimpananrincipaginated`, `getpinjamanrincipaginated`, `getjadwalangsuran`, `getlognotifikasi`, `gettahunshu`, `getpertanyaan`, `getanggota` | Lihat `mobile-api/src/queries.ts` | Sama, diuji bentuk JSON |

## 6. Keamanan server lama (`includes/Auth.php`, `v1/Api.php`)

- Token login: `v1.<payload base64url>.<HMAC-SHA256>` dengan payload `{k: kode_agt, p: 'api', e: kedaluwarsa}`, berlaku **30 hari**. Token reset: `p: 'reset'`, subjek username, **30 menit**. Rahasia `API_TOKEN_SECRET` di `includes/Secrets.php`.
- `Auth::requireMember(kdAnggota)` melindungi endpoint data anggota (`getsimpanan`, `getpinjaman`, `createpinjaman`, `updateemail`, `getshu`, `updateprofile`, …) dan endpoint per pinjaman (pemilik dicari dari `noPinjaman`).
- **Saklar `API_AUTH_REQUIRED = false` (masa transisi)**: request **tanpa** token tetap dilayani, jadi siapa pun yang tahu kode anggota masih bisa membaca data orang lain. Request dengan token tetap divalidasi.
- `mobile-api` v2 meniru kontrak lama **tanpa autentikasi sama sekali**.
- HTTP tanpa TLS di produksi (`http://101.50.3.222`).

## 7. Data PostgreSQL v2 yang relevan (23 Oktober 2026)

| Tabel | Isi | Catatan |
| --- | --- | --- |
| `app_user` (MySQL `user`) | 1.180 akun, 1.076 aktif | `password_hash`: **1.170 MD5, 10 bcrypt**. `jawaban_hash`: scrypt dari jawaban yang di-trim dan huruf kecil (migrasi). Email terisi hanya **11** akun. `fcm_token` kosong semua (tidak dibawa). Kolom: username, kode_agt, status, id_pertanyaan, foto, email, anggota_id, karyawan_mattel_id |
| `pengajuan_pinjaman` | 112 (P 14, Y 14, N 84) | Kolom sama dengan MySQL + `anggota_id`, `jenis_kredit_id` (wajib) |
| `pertanyaan` | daftar pertanyaan keamanan | `urut` = id lama |
| `log_notifikasi` | 42.758 baris | kode_agt, title, pesan, datetimes |
| `himbauan`, `promo` | judul, isi, image, status | gambar di `images/` server PHP (perlu dipindah) |
| `anggota_detail` | biodata pekerjaan/keluarga untuk profil | sebagian anggota tidak punya baris detail |
| `temp_potongan_all` | 1.080 baris | snapshot generate desktop |
| `jenis_kredit` | kolom `kunci_hanya_untuk_staff`, `kunci_jika_melebihi_grade`, `kunci_jika_sisa`, `mak_cicilan`, `persen_denda` | ada |

Catatan `CLAUDE.md`: password anggota di `app_user` **jangan ditulis dari form web admin**. PWA anggota adalah pengecualian yang disengaja (login/daftar/ganti password anggota sendiri), dengan format hash yang tetap bisa dibaca server PHP selama masa transisi (bcrypt `$2y$`).

## 8. Temuan yang memengaruhi desain

1. **Validasi pengajuan hanya di klien; server menerima persen bunga/biaya dari klien.** PWA wajib memvalidasi di server dan mengambil persen dari `jenis_kredit`.
2. **API tanpa autentikasi efektif** (`API_AUTH_REQUIRED=false`, `mobile-api` tanpa auth). PWA wajib sesi per anggota.
3. **Sumber data**: live = MySQL + desktop + PHP. PWA di atas PostgreSQL v2 hanya benar bila v2 sudah menjadi sistem utama (cutover). Sebelum itu, data PWA basi dan pengajuan tidak sampai ke desktop.
4. **Rehash MD5 → bcrypt** saat login dipertahankan; jangan pakai format hash yang tidak bisa dibaca PHP selama dua sistem hidup berdampingan.
5. Email hampir tidak ada (11/1.180): alur wajib-isi-email akan dialami hampir semua anggota saat pertama login; reset via email baru efektif setelahnya.
6. Notifikasi push: token FCM tidak dimigrasi; PWA memakai Web Push (perlu pendaftaran ulang per perangkat; iOS hanya bila dipasang ke layar utama).
7. `getpinjaman` memakai rumus sisa versi aplikasi lama dan tidak menampilkan KPR; diputuskan di PRD.
8. Bug SHU PHP (tanpa filter tahun) sudah diperbaiki di port v2; perilaku PWA mengikuti versi v2.

## 9. Ketidakakuratan `DOCUMENTATION_EXISTING_FEATURES.md`

- Menyebut API `getjeniskredit`; yang dipakai `getjeniskreditv1`.
- "Detail Simpanan berdasarkan filter Bulan dan Tahun": aplikasi memakai `getsimpananrincipaginated` (offset/limit, tanpa filter bulan).
- "MD5 hashing": server sudah bcrypt dengan rehash otomatis.
- Tidak menyebut pendaftaran, wajib isi email, reset via email, token API, dan ketiadaan validasi server pada pengajuan.
