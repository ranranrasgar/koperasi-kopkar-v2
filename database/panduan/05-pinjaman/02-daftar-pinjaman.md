---
judul: Daftar pinjaman
ringkasan: Laporan semua pinjaman dengan plafond, jasa, angsuran per bulan, sisa, dan tunggakan, bisa disaring per grup, jenis, dan periode.
menu: /dashboard/loans
---
**Pinjaman → Daftar Pinjaman** menampilkan data pinjaman koperasi beserta ringkasan totalnya.

## Menyaring

- **Grup** (KOPERASI, BANK / PIHAK LAIN) dan **Jenis** pinjaman.
- **Periode**: pilih bulan dan tahun pencairan, atau **Tahunan** untuk satu tahun penuh.
- Status anggota **Aktif / Non-Aktif**.
- **Pencarian**: pilih kolom yang dicari (No Pinjaman, NIK, Kode Anggota, Nama, Kota, ID Supervisor, ID Kolektor, ID Surveyor, atau ID Sales), lalu ketik di kotak **Kata kunci**.

## Kolom

| Kolom | Arti |
| --- | --- |
| Tgl Pinjaman, No Pinjaman | Tanggal dan nomor pencairan (`CR-mmyy-urut`) |
| Plafond Pokok | Pokok pinjaman |
| Total Jasa | Jasa seluruh masa pinjaman |
| Provisi | Biaya provisi |
| Angs Per Bulan | Angsuran pokok + jasa per bulan |
| Lama / Cicilan / Sisa | Lama angsuran, angsuran yang sudah dibayar, dan sisanya |
| Bayar Pokok / Bayar Bunga | Pembayaran yang sudah masuk |
| Tunggakan | Angsuran yang sudah lewat jatuh tempo tetapi belum dibayar |

Untuk melihat tunggakan secara rinci per pinjaman, buka **Pinjaman → Kredit Macet**.

## Detail pinjaman dan kirim info ke anggota

Klik **nomor pinjaman** untuk membuka detail: jadwal angsuran dan riwayat pembayaran. Di kanan atas detail ada tombol **Kirim info ke anggota** yang mengirim ulang notifikasi dan email (dengan PDF jadwal angsuran) ke anggota pemilik pinjaman. Tombol ini memakai izin yang sama dengan melihat detail pinjaman grup itu; di mode uji tidak ada yang dikirim.
