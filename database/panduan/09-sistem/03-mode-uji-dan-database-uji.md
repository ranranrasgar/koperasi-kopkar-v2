---
judul: Mode uji dan database uji
ringkasan: Dua cara mencoba aplikasi tanpa mengubah data asli, kapan memakai masing-masing, dan cara menyalakan atau mematikannya.
---
Ada dua fasilitas untuk mencoba aplikasi tanpa mengubah data asli koperasi.

| | Mode uji | Database uji |
| --- | --- | --- |
| Tanda di layar | Banner **kuning** *Mode uji aktif* | Banner **ungu** *Server uji* dan judul tab **[UJI]** |
| Alamat | Sama dengan aplikasi utama (port 3100) | Port **3101** |
| Database | Database asli | Salinan database (`kopkar_mjs_2000_uji`) |
| Data tersimpan? | **Tidak.** Setiap simpan langsung dibatalkan | **Ya**, tetapi hanya di salinan |
| Cocok untuk | Mengecek validasi dan hasil hitung satu transaksi | Menelusuri alur antar halaman, misalnya pencairan → angsuran → jurnal → neraca |

## Mode uji

Saat Anda menekan **Simpan**, transaksi dijalankan sungguhan (nomor bukti dibuat, jurnal dibentuk, saldo dicek), lalu **dibatalkan** sebelum tersimpan. Pesan hasilnya diawali *MODE UJI, tidak tersimpan*.

Yang ikut dibatalkan: semua transaksi uang, data master (perusahaan, logo, jenis simpanan, jenis pinjaman), setuju/tolak pengajuan, dan perubahan panduan. Yang **tetap tersimpan**: perubahan hak akses, operator, ganti password, dan saklar mode itu sendiri.

Nomor urut bukti tetap terpakai walaupun transaksinya dibatalkan, jadi transaksi asli berikutnya bisa melompati beberapa nomor. Ini wajar.

### Menyalakan dan mematikan mode uji

1. Buka **Sistem & Pengaturan → Mode Uji / Live**. Menu ini hanya tersedia untuk grup **admin** dan **superadmin**; banner kuning juga punya tautan **Ubah ke Live** bagi mereka.
2. Geser saklar ke **Uji** atau **Live**, lalu konfirmasi.
3. Perubahan berlaku **langsung untuk semua operator**, tanpa menjalankan ulang server. Halaman mencatat siapa dan kapan terakhir mengubah.

> **Penting:** Sebelum menggeser ke **Live**, pastikan semua operator tahu bahwa transaksi berikutnya akan tersimpan permanen dan membentuk jurnal.

Bila saklar tampil terkunci, mode sedang dikunci oleh baris `KOPKAR_UJI_ROLLBACK` di file `frontend/.env.local` server (`1` = uji, `0` = live). Hapus baris itu dan jalankan ulang server untuk memakai saklar. Server uji (port 3101) sengaja dikunci live.

## Database uji

1. Jalankan `npm run uji:reset` untuk membuat salinan database (sekitar 30 detik). Database asli hanya dibaca.
2. Jalankan `npm run dev:uji`, lalu buka `http://localhost:3101`.
3. Login seperti biasa. Login di server uji terpisah dari server utama.
4. Untuk mulai bersih lagi, jalankan `npm run uji:reset` kapan saja, bahkan saat server uji masih berjalan.

> **Penting:** Selalu periksa tanda di layar sebelum mencatat transaksi. Tanpa banner kuning atau ungu, Anda sedang bekerja di **data asli**.
