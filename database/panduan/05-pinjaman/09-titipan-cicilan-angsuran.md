---
judul: Titipan angsuran pinjaman tunai
ringkasan: Mencatat uang yang dititipkan anggota sedikit demi sedikit untuk angsuran, lalu menyimpannya ke angsuran sekaligus.
menu: /dashboard/loans/titipan
---
Menu: **Pinjaman → Titipan Angsuran** (pengganti form desktop *Setoran Titipan Angsuran*). Dipakai bila anggota membayar angsuran pinjaman tunai secara bertahap: setiap setoran dicatat sebagai titipan, dan setelah cukup, titipan disimpan ke angsuran.

## Mencatat titipan

1. Pilih **Anggota**, lalu **Pinjaman** yang masih berjalan.
2. Sistem menampilkan tanggal realisasi, lama, jumlah pinjaman, **angsuran berikutnya** (pokok dan jasa), dan **Titipan belum diposting** (merah).
3. Di **Input titipan**, isi **Tanggal** dan **Jumlah**, lalu **Simpan Titipan**.

Titipan yang belum diposting bisa dihapus dengan ikon tempat sampah. Centang **Tampilkan yang sudah POSTING** untuk melihat semua riwayat titipan pinjaman itu.

> **Penting:** Titipan **tidak membuat jurnal**. Uangnya belum tercatat di kas sampai disimpan ke angsuran, sama seperti di aplikasi desktop. Simpan uang titipan terpisah dan segera posting bila sudah cukup.

## Simpan ke angsuran

Bagian **Simpan ke angsuran** tampil bila Anda juga punya izin setoran angsuran.

1. Isi **Tanggal Bayar** dan **Diterima di Kas/Bank**.
2. Tekan **Simpan ke Angsuran**. Angsuran berikutnya dibukukan seperti di **Setoran Angsuran** (nomor `ANGS-CR-...`, jurnal kas), dan pada transaksi yang sama semua titipan yang belum diposting ditandai **POSTING**.

Bila jumlah titipan kurang dari angsuran, muncul peringatan kuning; angsuran tetap dibukukan penuh sesuai jadwal. Tombol tidak aktif bila belum ada titipan. Di mode uji, titipan maupun angsuran tidak tersimpan.

Hak akses: menu *Setoran Titipan Angsuran Pinjaman* (sama dengan halaman Setoran Titipan); untuk menyimpan ke angsuran juga perlu izin angsuran koperasi atau bank.
