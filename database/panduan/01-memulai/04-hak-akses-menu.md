---
judul: Hak akses dan kenapa menu saya berbeda
ringkasan: Menu dan tombol yang bisa dipakai ditentukan oleh grup operator, sama seperti di aplikasi desktop.
---
Setiap operator masuk ke satu **grup** (contoh: admin, Kasir, Pengurus, Pengawas, supervisor). Hak akses diatur **per grup**, bukan per orang, memakai nama menu yang sama dengan aplikasi desktop.

## Apa yang diatur hak akses

- **Menu yang tampil** di menu samping.
- **Halaman yang boleh dibuka.** Alamat halaman yang tidak diizinkan dialihkan ke Dashboard.
- **Tombol simpan.** Setiap transaksi diperiksa lagi di server saat disimpan, jadi tidak bisa diakali dari browser.

## Aturan khusus pinjaman

Izin pencairan dan angsuran dibedakan menurut **grup jenis pinjaman**:

| Grup jenis pinjaman | Izin pencairan | Izin angsuran |
| --- | --- | --- |
| KOPERASI | Pencairan pinjaman koperasi | Setoran angsuran pinjaman koperasi |
| BANK / PIHAK LAIN | Pencairan pinjaman bank | Setoran angsuran pinjaman bank |
| KPR | Pencairan KPR (form KPR) | Setoran angsuran KPR |

Contoh: kasir yang hanya diberi izin pencairan koperasi tidak akan melihat jenis pinjaman bank di form pencairan.

## Grup superadmin

Grup **superadmin** selalu punya semua akses, termasuk menu khusus web yang tidak ada di desktop: **Kelola Hak Akses**, **Operator**, dan **Kelola Panduan**.

Jika Anda membutuhkan akses tambahan, minta ke superadmin. Perubahan hak akses berlaku langsung tanpa perlu login ulang. Cara mengaturnya dijelaskan di panduan *Mengelola hak akses grup*.
