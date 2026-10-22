---
judul: Jurnal umum
ringkasan: Membaca daftar jurnal, mencatat jurnal memorial, dan aturan keseimbangan debit kredit.
menu: /dashboard/accounting/journal
---
**Akuntansi → Jurnal Umum** berisi **semua** baris jurnal: yang dibuat otomatis oleh transaksi (simpanan, pinjaman, angsuran) maupun jurnal memorial yang dicatat manual.

## Membaca daftar jurnal

- Baris dikelompokkan **per nomor bukti**, dengan **debit lebih dulu** lalu kredit lawannya.
- Saring **Sumber** (Simpanan, Pencairan Pinjaman, Angsuran Pinjaman, Angsuran KPR, dan lain-lain), periode **Dari / Sampai**, atau cari nomor bukti, kode akun, atau keterangan.
- Urutan bawaan adalah tanggal terbaru lebih dulu.

## Mencatat jurnal memorial

Pakai jurnal memorial untuk transaksi yang tidak punya form sendiri, misalnya biaya operasional, penyusutan, atau koreksi.

1. Tekan **Jurnal Baru**.
2. Isi **Tanggal** dan **Keterangan Jurnal** (wajib).
3. Isi baris: pilih **Akun**, lalu isi **Debit** atau **Kredit**. Keterangan baris boleh diisi; bila kosong memakai keterangan jurnal.
4. Tambah baris sesuai kebutuhan; hapus baris dengan ikon tempat sampah.
5. Tunggu sampai penanda **Seimbang** muncul, lalu tekan **Simpan Jurnal**.

## Aturan jurnal

| Aturan | Pesan bila dilanggar |
| --- | --- |
| Minimal dua baris yang berisi nilai | *Jurnal minimal dua baris berisi nilai* |
| Satu baris hanya debit **atau** kredit | *Baris 2: isi debit atau kredit, bukan keduanya* |
| Nilai berupa angka | *Baris 1: nilai harus angka* |
| Total debit = total kredit | *Jurnal ... tidak seimbang: debit ... kredit ...* |
| Keterangan jurnal wajib | *Keterangan jurnal wajib diisi* |
| Akun harus ada di COA | *Akun ... tidak ada di perkiraan* |

Nomor jurnal dibuat otomatis: `JU/yymmdd/n`, contoh `JU/261022/1205`.

> **Penting:** Jurnal yang sudah tersimpan tidak dihapus atau diubah dari web. Untuk membetulkan kesalahan, buat **jurnal koreksi** (jurnal kebalikan) dengan keterangan yang menyebut nomor jurnal yang dikoreksi.
