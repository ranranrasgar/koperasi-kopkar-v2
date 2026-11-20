# PRD Penggajian Karyawan Koperasi

| | |
| --- | --- |
| Status | Disetujui pengguna 20 November 2026 (enam rekomendasi). **Tahap 1-2 selesai** (20 November); berikutnya Tahap 3 (lembur). |
| Sumber | Excel `10. Slip gaji October 2015 new umk.xlsx` (milik pengguna, di luar repo): sheet Master Karyawan, ATN, Absen bln / OT per orang, Rate Lembur, PPh 21, Slip S, TGL CUTI, Sheet1 |
| Menggantikan | Menu Absensi lama (`/dashboard/attendance`, jam masuk/pulang anggota berstatus Staff dari QR) menjadi bagian dari penggajian |

## 1. Latar

Koperasi menggaji karyawannya sendiri (kode `K007`...; 8 orang pada 2015) dengan Excel. Karyawan ini **bukan** anggota berstatus `Staff`: `status_staff` di tabel `anggota` adalah golongan karyawan Mattel (Staff / No Staff) untuk potongan gaji, dan hanya 3 anggota aktif berstatus Staff. Jadi penggajian butuh master karyawan sendiri, yang boleh ditautkan ke anggota bila karyawan itu juga anggota.

## 2. Pola hitung di Excel (acuan)

Periode: tanggal 23 bulan lalu s/d 22 bulan ini (mis. "Oktober 2015" = 23 Sep - 22 Okt).

| Komponen | Rumus Excel |
| --- | --- |
| Jml. upah minimum | UMK + tunjangan jabatan |
| Potongan alpa | (jml ABS / 30) x UMK dan (jml ABS / 30) x tunjangan jabatan |
| Gaji | jml. upah - kedua potongan alpa |
| HK (hari kerja dibayar) | jumlah hari berkode `ATN` |
| Tunj. transport | HK x Rp 7.000 |
| Tunj. makan | HK x Rp 10.000 |
| Upah lembur per jam | jml. upah / 173 |
| Jam lembur harian | jam selesai - jam mulai rencana lembur; di hari kerja (`ATN`) lebih dari 3 jam dikurangi 1 jam istirahat |
| Jam lembur berbobot | tabel Rate Lembur (Kepmenakertrans 102/2004). Hari kerja: jam ke-1 x1,5, berikutnya x2. Hari istirahat (6 hari kerja): jam 1-7 x2, jam 8 x3, jam 9+ x4. Hari istirahat (5 hari kerja): jam 1-8 x2, jam 9 x3, jam 10+ x4 |
| Uang lembur | jumlah jam berbobot x upah lembur per jam |
| Cadangan risiko, THR, tunj. lain | manual |
| Gaji kotor | gaji + transport + makan + lembur + cad. risiko + THR + tunj. lain |
| JHT (Jamsostek) | 2% x jml. upah |
| BPJS | 0,5% x jml. upah (aturan 2015) |
| PPh 21 (cara 2015) | bruto = gaji kotor + 0,84% x gaji (JKK & JK); biaya jabatan 5% x bruto; PKP = bruto - THR - PTKP bulanan - biaya jabatan - JHT; PPh = 5% x PKP |
| Potongan lain-lain | cicilan pinjaman karyawan (Sheet1: pokok + jasa per bulan) |
| Gaji bersih | gaji kotor - JHT - BPJS - PPh 21 - lain-lain |

Kode kehadiran (sheet ATN): `ATN` hadir, `RD` libur/rest day, `ABS` (X) tidak hadir, `ANN` (L) cuti tahunan, `MED` (S) sakit, `MAT` (M) melahirkan, `UNP` izin tanpa upah. Hak cuti 12 hari per tahun, 6 di antaranya cuti yang diatur koperasi (cuti bersama).

**Kekeliruan Excel yang tidak ditiru**: rate lembur selalu memakai kolom hari kerja, juga di hari libur; potongan Koperasi tampil di slip tetapi tidak mengurangi gaji bersih di Master; slip satu karyawan mengambil cicilan karyawan lain (`Sheet1!E3`); tunjangan beberapa baris diketik manual; PPh bisa negatif; hari pertama periode memakai `CHOOSE` yang salah ("Jumat" untuk Minggu).

## 3. Keputusan

| No | Keputusan |
| --- | --- |
| K1 | Tabel `karyawan` sendiri (kode K..., data kerja, rekening, NPWP, status PTKP, UMK, tunjangan jabatan, aktif), tautan opsional `anggota_id` |
| K2 | Kehadiran: satu grid per periode berisi kode harian. Hari yang tercatat dari pindai QR (karyawan yang tertaut anggota) terisi `ATN` otomatis; operator mengisi kode lain. Izin tanpa upah (`UNP`) dihitung sama dengan `ABS` untuk potongan (label slip Excel: "Jml. Mangkir / Izin Tnp. Bayar") |
| K3 | Lembur diisi per hari (jam mulai/selesai, jenis hari kerja/istirahat), bobot dari aturan di atas, termasuk perbaikan kolom hari libur |
| K4 | PPh 21 memakai **TER** (PP 58/2023, PMK 168/2023) untuk Januari-November: PPh = tarif TER kategori (A: TK/0, TK/1, K/0; B: TK/2, TK/3, K/1, K/2; C: K/3) x bruto bulanan, dibulatkan ke bawah. Bruto = gaji kotor + premi JKK/JKM dan BPJS Kesehatan yang dibayar koperasi. Masa Desember (Pasal 17 setahun) belum; tercatat sebagai tahap lanjutan. Persen BPJS, tarif harian, pembagi, dan tabel TER disimpan di database dan bisa diubah |
| K5 | Potongan koperasi dan lain-lain diisi per karyawan per periode; bila karyawan tertaut anggota, cicilan pinjaman koperasi yang jatuh tempo bisa ditarik sebagai usulan |
| K6 | Hasil: slip per karyawan (cetak), rekap periode seperti sheet Master, ekspor Excel. Posting jurnal gaji tahap berikutnya |

## 4. Pengaturan bawaan (`pengaturan_web` kunci `gaji`, JSON)

| Kunci | Bawaan | Arti |
| --- | --- | --- |
| `tanggalAwal` | 23 | periode = tanggal ini bulan lalu s/d sehari sebelumnya bulan ini |
| `transportPerHari` | 7000 | x HK |
| `makanPerHari` | 10000 | x HK |
| `pembagiHarian` | 30 | potongan alpa = hari / pembagi x upah |
| `pembagiLembur` | 173 | upah lembur per jam = jml. upah / pembagi |
| `hariKerjaSeminggu` | 6 | memilih tabel bobot lembur hari istirahat |
| `jhtPersen` | 2 | potongan karyawan, dasar jml. upah |
| `jpPersen` | 1 | Jaminan Pensiun karyawan, dasar jml. upah (0 = tidak ikut) |
| `kesPersen` | 1 | BPJS Kesehatan karyawan, dasar jml. upah |
| `premiPerusahaanPersen` | 0,54 | JKK 0,24% + JKM 0,30% dibayar koperasi, dasar gaji; masuk bruto PPh |
| `kesPerusahaanPersen` | 4 | BPJS Kesehatan dibayar koperasi, dasar jml. upah; masuk bruto PPh |
| `hakCutiTahunan` | 12 | |

Angka persen BPJS dan premi harus diperiksa bendahara sebelum dipakai; Excel 2015 memakai JHT 2% dan BPJS 0,5% tanpa JP.

## 5. Tabel (di `database/postgres/anggota-web.sql`, dipasang `npm run anggota:pasang`)

- `karyawan`: id, kode UNIQUE, nama, nik_ktp, jenis_kelamin (L/P), status_kerja (Tetap/Kontrak), tgl_masuk, akhir_kontrak, bidang, jabatan, atasan, bank, no_rek, atas_nama_rek, npwp, status_ptkp (TK/0..K/3), umk, tunj_jabatan, aktif, anggota_id FK (SET NULL), catatan, dibuat/diubah.
- `gaji_ter`: kategori (A/B/C), batas_bawah (bruto bulanan, inklusif), tarif persen. Diisi sekali dari PMK 168/2023.
- `gaji_periode`: periode 'YYYY-MM' UNIQUE, dari, sampai, status (draf/final), dibuat/difinalkan oleh/pada.
- `gaji_hadir`: (periode_id, karyawan_id, tanggal) PK, kode.
- `gaji_lembur`: id, periode_id, karyawan_id, tanggal, mulai, selesai, jenis_hari (kerja/istirahat), jam, jam_bobot, keterangan.
- `gaji_slip`: (periode_id, karyawan_id) PK, cad_resiko, thr, tunj_lain, pot_koperasi, pot_lain, ket_pot_lain, hasil (jsonb, salinan hitungan saat final).

## 6. Halaman (grup menu baru **Kepegawaian**)

| Menu | Izin (`MENU`) | Isi |
| --- | --- | --- |
| Data Karyawan | `Data Karyawan (web)` | Daftar + tambah/ubah karyawan |
| Absensi Karyawan | `Absensi Karyawan` (izin lama) | Grid kode harian per periode, pindai QR tetap ada |
| Lembur | `Lembur Karyawan (web)` | Input lembur per hari, ringkasan jam berbobot |
| Penggajian | `Penggajian (web)` | Rekap seperti sheet Master, isian manual, final, slip, ekspor |
| Pengaturan Gaji | `Pengaturan Gaji (web)` | Isian bagian 4 dan tabel TER |

## 7. Tahapan

| Tahap | Isi | Cek |
| --- | --- | --- |
| 1 | PRD, tabel, mesin hitung `backend/src/gaji/hitung.ts` (murni, uji dengan angka Excel), Data Karyawan, Pengaturan Gaji | Uji mesin cocok dengan Master Karyawan Excel untuk komponen non-pajak; halaman tambah/ubah karyawan |
| 2 | Periode + grid kehadiran (+ isi otomatis dari QR) | Hitungan HK/ABS per karyawan sama dengan sheet ATN |
| 3 | Lembur harian | Jam berbobot sama dengan tabel Rate Lembur |
| 4 | Penggajian: rekap, isian manual, final, slip cetak, ekspor | Slip sama dengan Slip S kecuali PPh (TER) |
| 5 | Posting jurnal gaji, PPh Desember, sisa cuti | menyusul |
