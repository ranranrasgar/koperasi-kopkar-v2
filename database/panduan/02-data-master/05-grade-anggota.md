---
judul: Grade anggota dan nominal plafon
ringkasan: Tabel grade (nama dan nominal), cara anggota ditautkan ke grade, dan cara menerapkan perubahan ke plafon pinjaman anggota.
menu: /dashboard/settings/grade
---
Menu **Data Master → Grade Anggota** menyimpan daftar grade (misalnya M06, S10, T04) beserta **nominal plafon** masing-masing. Setiap anggota **ditautkan** ke satu grade, sehingga nominal plafon pinjamannya selalu mengikuti tabel ini. Hak aksesnya sama dengan menu *Jenis Pinjaman*, karena grade menentukan batas pinjaman.

## Cara kerja

- Satu grade punya **nama** (tanpa spasi, maksimal 15 karakter, tidak boleh kembar) dan **nominal** (Rp).
- Anggota menyimpan tautan ke grade-nya. Nama dan nominal pada data anggota ikut diisi dari tabel, jadi aplikasi desktop, aplikasi Android, dan PWA anggota tetap membaca grade seperti biasa.
- **Mengubah nominal atau nama grade berlaku langsung untuk semua anggota bergrade itu**, dan dengan sendirinya mengubah batas pinjaman mereka pada jenis pinjaman yang mengunci grade (*Kunci jika melebihi grade*; lihat artikel Jenis Pinjaman).
- Anggota baru dari pendaftaran dipilihkan grade dari form kelengkapan, dan nominalnya otomatis dari tabel ini.

## Mengelola grade

| Aksi | Cara |
| --- | --- |
| Tambah | **Tambah grade**, isi nama dan nominal |
| Ubah | Ikon **pensil** di baris grade; perubahan menjalar ke anggota bergrade itu |
| Hapus | Ikon **tempat sampah**; hanya untuk grade yang **belum dipakai anggota mana pun** |

Tabel menampilkan jumlah **anggota aktif**, **semua anggota**, dan **nominal beda** (anggota yang nominal grade-nya belum sama dengan tabel).

## Menerapkan tabel ke anggota yang sudah ada

Saat pertama dipasang, tabel diisi dari data yang sudah ada: nama grade dari data karyawan dan anggota, nominalnya nilai yang paling sering dipakai anggota bergrade itu (dibulatkan ke kelipatan Rp500.000). Anggota ditautkan lewat nama grade, **tanpa mengubah nominal yang sudah tercatat pada mereka**, karena sebagian anggota lama punya nilai yang berbeda atau belum terisi (0 atau 1).

Bila ada selisih, muncul kotak kuning dengan tombol **Terapkan ke anggota**. Tombol itu:

1. menautkan anggota yang namanya cocok dengan sebuah grade tetapi belum tertaut, dan
2. menyamakan nominal grade anggota dengan tabel.

> **Perhatian:** langkah 2 **mengubah plafon pinjaman** anggota yang nilainya berbeda. Periksa dulu nominal tiap grade di tabel (grade yang nominalnya *belum diisi* tidak akan memberi plafon), lalu tekan tombolnya.

Anggota yang gradenya tidak ada di tabel (misalnya penulisan lama seperti `0` atau `-`) tetap seperti semula sampai grade-nya dibuat dan diterapkan.
