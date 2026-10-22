---
judul: Masuk, keluar, dan mengganti password
ringkasan: Cara login operator, aturan password, penguncian setelah salah berkali-kali, dan lama sesi.
menu: /ganti-password
---
Setiap pengguna aplikasi adalah **operator** dengan nama login sendiri. Nama operator tercatat di setiap transaksi (kolom *opr*), jadi jangan pernah memakai akun orang lain.

## Masuk (login)

1. Buka alamat aplikasi. Jika belum masuk, Anda otomatis diarahkan ke halaman **Login Operator**.
2. Isi **nama operator** dan **password**, lalu tekan **Masuk**.
3. Jika akun Anda baru dibuat atau password-nya baru di-reset admin, Anda langsung diminta **mengganti password** sebelum bisa memakai aplikasi.

## Aturan password

- Minimal **8 karakter**.
- Wajib berisi **huruf dan angka**.
- Password disimpan terenkripsi (scrypt). Admin pun tidak bisa melihat password Anda, hanya bisa me-reset.

## Penguncian karena salah password

> **Penting:** Setelah **5 kali** gagal login berturut-turut, nama operator itu dikunci selama **5 menit**. Pesan yang muncul: *Terlalu banyak percobaan gagal. Coba lagi dalam ... menit.*

Pesan galat login sengaja tidak menyebut apakah nama atau password yang salah, demi keamanan. Akun yang dinonaktifkan admin juga tidak bisa masuk walaupun password-nya benar.

## Lama sesi dan keluar

- Sesi berlaku **12 jam**. Setelah itu Anda diminta login lagi.
- Tekan **Logout** di bagian bawah menu samping atau di menu profil (kanan atas) bila selesai, terutama di komputer bersama.
- Saat password diganti (oleh Anda sendiri atau di-reset admin), semua sesi lama otomatis tidak berlaku.

## Mengganti password sendiri

Buka menu profil di kanan atas, pilih **Ganti Password**, isi password lama dan password baru dua kali. Password baru harus memenuhi aturan di atas dan **berbeda dari password lama**. Pesan galat yang mungkin muncul: *Password lama salah*, *Ulangi password baru dengan sama persis*, atau *Password baru harus berbeda dari password lama*.

## Lupa password

Hubungi **superadmin**. Superadmin membuka menu **Operator**, memilih akun Anda, lalu menekan **Reset password**. Sistem membuat password sementara yang hanya ditampilkan sekali; superadmin menyampaikannya ke Anda secara langsung. Saat login dengan password sementara itu, Anda wajib menggantinya.
