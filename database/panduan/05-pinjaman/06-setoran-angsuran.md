---
judul: Setoran angsuran pinjaman dan KPR
ringkasan: Membayar angsuran berikutnya, mengubah jasa/adm/provisi, aturan jumlah KPR, pelunasan, dan jurnal angsuran.
menu: /dashboard/loans/payment
---
Menu: **Angsuran & Pemantauan → Setoran Angsuran**. Ada dua tab: **Pinjaman Tunai** dan **KPR**. Tab yang tampil mengikuti izin Anda.

## Membatalkan angsuran atau pencairan

Transaksi yang sudah diposting tidak bisa diubah atau dihapus. Operator berizin **D** di baris Audit Data pada Kelola Hak Akses (awalnya hanya superadmin) bisa membatalkannya dengan alasan minimal 10 karakter:

- **Pinjaman tunai**: buka detail pinjaman. Ikon batal ada di baris **angsuran terakhir**; tombol **Batalkan Pencairan** ada bila belum ada angsuran.
- **Seluruh pinjaman sekaligus**: tombol **Batalkan Pinjaman** di detail pinjaman (muncul bila sudah ada angsuran) membatalkan semua angsuran dari yang terakhir, lalu pencairannya, dengan satu alasan. Bila satu langkah ditolak (misalnya ada angsuran dari Potongan Gaji), tidak ada yang diubah dan pesannya menyebut penyebabnya.
- **KPR**: masukkan nomor buktinya di **Sistem → Audit Data**, bagian *Batalkan transaksi lewat nomor bukti*.

Sistem membuat pembalik `BTL...` bertanggal hari ini beserta jurnal kebalikannya. Baris asal tetap terlihat di buku pinjaman dengan tanda *DIBATALKAN*.

- Angsuran hanya bisa dibatalkan dari yang terakhir. Jadwal dan hitungan cicilan kembali, jadi angsuran itu bisa dibayar lagi.
- Pencairan hanya bisa dibatalkan bila belum ada angsuran. Pinjamannya tetap ada di Daftar Pinjaman dengan sisa 0 dan tampil sebagai lunas; detailnya menampilkan keterangan pembatalan.
- Ditolak untuk angsuran dari Potongan Gaji yang diposting di web, pinjaman yang sedang ditutup tanpa jurnal, serta pencairan yang masih ada di periode Potongan Gaji belum selesai atau masih punya titipan.
- Titipan yang sudah **POSTING** tidak kembali otomatis saat angsurannya dibatalkan.
- **Pinjaman salah input, atau anggota membatalkan pinjaman dan mengembalikan uangnya**: pakai **Batalkan Pencairan** (belum ada angsuran) atau **Batalkan Pinjaman** (sudah ada angsuran) di detail pinjaman. Jangan diinput sebagai angsuran berjasa 0: pinjaman akan tampil sebagai pinjaman yang dibayar berkali-kali di aplikasi anggota, dan jasanya tercatat tidak ditagih. Bila sudah terlanjur, pakai **Batalkan Pinjaman**.
- Pembatalan tidak bisa diurungkan, dan tercatat di **Audit Data**, bagian Riwayat koreksi.

## Angsuran pinjaman tunai

1. Pilih **Anggota** dengan mengetik kode, KPK, nama, atau **nomor rekening pinjaman** (nomor pinjaman seperti `CR-0726-22626`, atau kolom No. Rekening lama). Bila dipilih dari nomor pinjaman, pinjaman itu langsung terpilih, termasuk pindah ke tab KPR untuk KPR. Hanya pinjaman yang masih berjalan yang ikut dicari. Daftar **Pinjaman** berisi pinjaman yang masih berjalan, dengan format *nomor | jenis | pokok | sudah dibayar/lama*.
2. Pilih pinjaman. Sistem menampilkan **Angsuran ke-n dari lama** beserta pokok, jasa, adm, provisi, dan total.
3. Isi **Tanggal Bayar** dan **Diterima di Kas/Bank**, lalu **Simpan**.

### Aturan angsuran tunai

- Pembayaran selalu untuk **angsuran berikutnya** secara berurutan. Satu kali simpan = satu angsuran.
- Centang **Ubah pokok/jasa/adm/provisi** bila ada keputusan khusus, misalnya adm dibebaskan atau anggota membayar pokok lebih besar. Isi nilai baru di kotak yang muncul.
- **Pokok yang diubah** tidak boleh melebihi **Sisa pokok**, dan keterangan baris angsurannya ditandai *pokok diubah*.
- **Lunas pinjaman koperasi** (grup KOPERASI) berarti **total bayar pokok + total bayar jasa = pokok + jasa kontrak pencairan**. Nilai pokok dan jasa per setoran boleh diubah berapa pun, tetapi jasa yang kurang **tetap tertagih**: tidak hilang dan tidak perlu alasan. Keterangan angsurannya ditandai *jasa kurang, tetap tertagih*, dan form menampilkan **Sisa jasa** di samping Sisa pokok.
- **Angsuran terakhir pinjaman koperasi wajib melunasi sisa tagihan.** Form mengisi pokok dan jasanya dengan sisa pokok dan sisa jasa. Pembagian pokok/jasa boleh diubah asal totalnya sama; bila kurang atau lebih, simpan ditolak (*Angsuran ke-n adalah angsuran terakhir: pokok + jasa harus melunasi sisa tagihan ...*).
- Pinjaman koperasi yang **cicilannya sudah penuh tetapi jasanya masih kurang** (data lama) tetap muncul di daftar dengan judul **Pelunasan sisa**. Satu kali simpan melunasi seluruh sisanya. Bila sisa itu memang dibebaskan pengurus, pakai **Tutup Pinjaman** dengan alasan.
- **Pinjaman bank** (grup BANK / PIHAK LAIN) memakai aturan lama: jasa di bawah jadwal wajib disertai **alasan** minimal 10 karakter, yang tercatat di keterangan angsuran (*jasa tidak ditagih: ...*), dan pinjaman lunas begitu cicilannya penuh. Angsuran dari Potongan Gaji tidak terkena aturan alasan karena memakai nominal jadwal.
- Mengubah pokok **tidak menyusun ulang jadwal**. Satu kali simpan tetap dihitung satu cicilan, dan angsuran berikutnya tetap memakai nilai jadwal. Pelunasan beberapa angsuran sekaligus belum tersedia.
- Pinjaman bank yang pokoknya pernah diubah: periksa angsuran terakhir dan isikan pokok sama dengan **Sisa pokok** supaya pinjaman pas lunas. Form memberi peringatan bila nilainya berbeda.
- **Pinjaman bank seperti BRI** mengikuti pembagian pokok dan jasa terakhir pinjaman itu, bila totalnya sama dengan jadwal. Pembagian ini berlaku di Setoran Angsuran dan Potongan Gaji, dan bisa diubah lewat kotak Ubah.
- Potongan Gaji mengikuti aturan yang sama: angsuran terakhir pinjaman koperasi dipotong sebesar sisa pokok + sisa jasa.
- Setelah lunas, pinjaman tidak muncul lagi di daftar. Mencoba membayar lagi menghasilkan *Pinjaman ... sudah lunas*.

### Yang dibuat sistem

| Data | Isi |
| --- | --- |
| Nomor bukti | `ANGS-CR-mmyy-urut` |
| Rincian | Baris *Setoran ke n* berisi pokok, jasa, adm, provisi, dan sisa pokok/jasa |
| Jadwal tagih | Baris angsuran ke-n ditandai terbayar (nomor bukti, tanggal bayar) |
| Jurnal | **Debit** kas/bank sebesar total; **Kredit** piutang (pokok), pendapatan jasa, adm, dan provisi |

Contoh angsuran ke-1 pinjaman C01 Rp 6.000.000:

| Akun | Debit | Kredit |
| --- | --- | --- |
| Kas/bank penerima | 650.000 | |
| Piutang pinjaman (pokok) | | 500.000 |
| Pendapatan jasa | | 90.000 |
| Pendapatan adm | | 60.000 |

## Memindai QR dari HP anggota

Anggota menunjukkan **QR saya** dari Beranda aplikasi web anggota. Tekan ikon **QR** di navbar, arahkan QR ke kamera, lalu pilih transaksi di jendela yang muncul. Form terbuka dengan anggota dan pinjamannya sudah terisi, termasuk tab KPR. Pilihan yang tampil mengikuti hak akses Anda. Ikon **QR** di sebelah isian **Anggota** juga bisa dipakai, dan bila ada lebih dari satu pinjaman, pilih pinjamannya di form. Bila memakai alat pemindai USB, pindai saat kursor ada di kotak bawah.

QR berlaku 5 menit dan hanya memilih data. Periksa nama dan jumlah sebelum menyimpan. Kamera hanya bisa dipakai lewat alamat `https` atau `localhost`.

## Angsuran KPR

1. Pilih **Anggota**, lalu **KPR** yang masih berjalan.
2. **Jumlah (Rp)**: kosongkan untuk memakai angsuran per bulan (atau sisa pokok bila lebih kecil). Isi bila anggota membayar jumlah lain.
3. Isi **Tanggal Bayar** dan **Diterima di Kas/Bank**, lalu **Simpan**.

### Aturan angsuran KPR

- Jumlah harus lebih dari nol dan **tidak boleh melebihi sisa pokok** (*Jumlah ... melebihi sisa pokok ...*).
- **Angsuran terakhir** (dan setoran sesudahnya bila KPR belum lunas) wajib melunasi sisa pokok. Bila jumlah dikosongkan, nilainya otomatis sisa pokok persis; jumlah yang lebih kecil ditolak. KPR lunas bila seluruh pokok terbayar.
- Nomor bukti `ANGS-KPR-mmyy-urut`. Jurnal: **Debit** kas/bank, **Kredit** akun titipan KPR.

## Mengirim ulang informasi kredit

Di tab **KPR**, di bawah ringkasan KPR yang dipilih ada tautan **Kirim info ke anggota**: mengirim ulang notifikasi dan email berisi ringkasan serta PDF jadwal angsuran ke anggota pemilik KPR itu. Untuk pinjaman tunai, tombolnya ada di halaman detail pinjaman.

## Mencetak kwitansi

Setelah transaksi tersimpan, tombol **Cetak Kwitansi** muncul di kotak hasil. Jendela cetak terbuka dengan pilihan kertas **Continuous 9,5 x 5,5 in** atau **A4/2**; pilih yang sama di pengaturan printer, lalu tekan **Cetak**. Tampilannya hitam polos supaya tajam di printer dot matrix seperti LX-300 dan Epson 2210.

Cetak ulang angsuran pinjaman tunai: buka detail pinjaman, tab **Riwayat Pembayaran**, lalu tekan ikon printer di baris angsurannya.

Dalam Mode Uji transaksi tidak tersimpan, jadi tombol ini tidak muncul.
