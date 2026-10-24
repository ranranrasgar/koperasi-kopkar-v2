# Dokumentasi Fitur Aplikasi KopkarMJS2000 (Existing)

Dokumen ini merangkum seluruh spesifikasi teknis, alur transaksi, dan logika bisnis aplikasi KopkarMJS2000 versi 5.6 untuk referensi pengembangan di masa mendatang.

---

## 1. Tech Stack (Teknologi)
### Frontend (Mobile)
*   **Language**: Java (JDK 1.8)
*   **Target SDK**: 34 (Android 14)
*   **Min SDK**: 23 (Android 6.0 Marshmallow)
*   **Networking**: Volley Library (Custom Singleton Pattern)
*   **Notifications**: Firebase Cloud Messaging (FCM)
*   **UI Components**: Material Design 3, CardView, RecyclerView, ViewBinding
*   **Security**: MD5 Hashing (Sisi Server), Cleartext Traffic Enabled (HTTP Support)

### Backend (API)
*   **Language**: PHP (Version 7.0 - Existing on Server)
*   **Web Server**: Nginx 1.10.3 (Ubuntu)
*   **Database**: MySQL / MariaDB

---

## 2. Struktur Data Utama (Database Reference)
Berdasarkan respon API, berikut adalah entitas data yang digunakan:
*   **Anggota**: `kode_agt`, `nama`, `nik`, `status_staff` (Staff/No Staff), `rp_grade` (Plafon Kredit), `simpanan_pokok`, `simpanan_wajib`, `simpanan_sukarela`.
*   **Jenis Kredit**: `kd_kredit`, `nm_kredit`, `bunga_kredit`, `kunci_staff`, `kunci_grade`, `kunci_saldo`, `max_cicilan`.
*   **Pinjaman**: `no_pinjaman`, `tgl_pinjaman`, `pinjaman_pokok`, `saldo`, `bunga`.

---

## 3. Fitur Utama & Menu Navigasi
Halaman Utama (`MainActivity`) memiliki 7 modul utama dalam bentuk CardView:

### A. Profile Anggota (Detail Anggota)
Menampilkan informasi lengkap biodata anggota yang diambil dari sesi login.
*   **Data Personal**: NIK, Nama, Alamat, Kota, HP, Status Perkawinan.
*   **Data Pekerjaan**: Nama Perusahaan, Jabatan, Lama Bekerja.
*   **Data Finansial**: Saldo Simpanan (Pokok, Wajib, Sukarela) dan Nominal Grade (Plafon).

### B. Info (Log Notifikasi)
Menampilkan riwayat pesan push notification yang dikirimkan oleh sistem atau admin.
*   **Data**: Judul, Pesan, dan Tanggal.

### C. Pengajuan Kredit (Transaksi Utama)
Formulir bagi anggota untuk mengajukan pinjaman baru secara online.
*   **Input**: Tanggal Realisasi, Jenis Pinjaman (Spinner), Lama Pinjaman (Tenor), Besar Pinjaman, Keterangan.
*   **Logika Bisnis & Validasi**:
    1.  **Validasi Staff**: Jika jenis kredit bertanda `kunci_staff=1`, maka hanya user dengan `status_staff=Staff` yang boleh mengajukan.
    2.  **Validasi Grade**: Jika `kunci_grade=1`, nominal pinjaman tidak boleh melebihi `rp_grade` (Plafon).
    3.  **Validasi Saldo**: Jika `kunci_saldo=1`, user tidak boleh mengajukan pinjaman jika masih memiliki saldo pinjaman aktif pada kategori yang sama.
    4.  **Validasi Tenor**: Input bulan tidak boleh melebihi `max_cicilan` dari jenis kredit terpilih.

### D. Simpanan
Menampilkan ringkasan seluruh jenis simpanan yang dimiliki anggota.
*   **Detail Simpanan**: Menampilkan riwayat mutasi (Debit/Kredit) simpanan berdasarkan filter Bulan dan Tahun.

### E. Pinjaman
Menampilkan daftar pinjaman aktif anggota.
*   **Detail Pinjaman**: Menampilkan kartu piutang (riwayat angsuran), sisa saldo, dan bunga yang sudah dibayar.

### F. Potongan Bulanan
Menampilkan rincian potongan gaji otomatis setiap bulan untuk keperluan koperasi dan angsuran bank terkait.
*   **Data**: No Rekening Bank, Nama Bank, Potongan Koperasi, Potongan Bank, Potongan KPR, Total Potongan.
*   **Status Terdebet**: Indikator apakah tagihan bulan berjalan sudah dipotong dari payroll atau belum.

### G. SHU (Sisa Hasil Usaha)
Menampilkan rincian pembagian SHU tahunan anggota.
*   **Komponen SHU**: Jasa Pinjaman Uang, Jasa Pinjaman Barang, Jasa Sukarela, Lama Keanggotaan.
*   **Filter**: Berdasarkan Tahun Buku.

---

## 4. Keamanan & Validasi Sistem
*   **Authentication**: Menggunakan kombinasi Username dan Password.
*   **Session Management**: Menggunakan `SharedPreferences` (Folder: `loginPrefs`). Data sesi mencakup KD Anggota dan Status Staff.
*   **Auto-Logout**: Aplikasi akan memaksa user kembali ke Login jika data `kdAnggota` tidak ditemukan dalam memori saat mengakses menu transaksi.
*   **Reset Password**: Menggunakan fitur Pertanyaan Keamanan yang sudah didaftarkan saat registrasi awal.

---

## 5. Alur Transaksi Pengajuan Kredit (Workflow)
1.  User masuk ke menu **Pengajuan Kredit**.
2.  Sistem memuat daftar **Jenis Pinjaman** (API: `getjeniskredit`).
3.  User memilih jenis pinjaman -> Sistem menampilkan otomatis **% Bunga/Jasa**.
4.  User mengisi nominal dan tenor -> Sistem melakukan **Validasi Client-Side** (Staff, Grade, & Saldo).
5.  User Klik Simpan -> Muncul **Konfirmasi Dialog**.
6.  Sistem mengirim data via POST ke API `createpinjaman`.
7.  Response Berhasil -> Input di-reset, muncul Toast pesan sukses.

---

## 6. Catatan untuk Pengembangan Baru (Next Project)
*   **API Security**: Disarankan mengganti MD5 dengan `password_hash` (BCRYPT) dan menggunakan Token-based Authentication (JWT).
*   **Data Persistence**: Migrasi dari SharedPreferences ke **Room Database** atau **DataStore** untuk performa yang lebih baik.
*   **UI/UX**: Mengadopsi **Jetpack Compose** untuk antarmuka yang lebih modern dan reaktif.
*   **Connection**: Wajib menggunakan **HTTPS** (SSL) demi keamanan data anggota.
