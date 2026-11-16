# PRD: Unit Usaha Kantin (POS, Belanja Mobile, Bayar dari Simpanan Sukarela)

| | |
| --- | --- |
| Status | **Rancangan, belum dikerjakan.** K3 diputuskan (model A + B, bagian 3a); K1, K2, K4-K9 memakai usulan kecuali diubah |
| Tanggal | 16 November 2026 |
| Lingkup | Unit usaha **Kantin** dulu; skema dibuat umum supaya PPOB dan e-commerce bisa menyusul |
| Bacaan terkait | `CLAUDE.md` (arsitektur, hak akses, nomor bukti), `backend/src/posting/simpanan.ts`, `journal.ts`, `backend/src/anggota/qr.ts`, `docs/prd-pwa-anggota.md` |

## 1. Ringkasan

Koperasi punya beberapa unit usaha. Modul ini menambahkan **unit usaha** sebagai data master, lalu mengisi unit pertama, **kantin**:

1. Admin membuat kantin (bisa lebih dari satu), menautkan akun COA kas, penjualan, HPP, persediaan, dan menetapkan operator yang boleh memakai kantin itu.
2. Operator kantin mengelola produk (harga beli, harga jual, satuan, kategori, stok, gambar). Margin terlihat langsung.
3. Kasir menjual lewat layar **POS** bergaya aplikasi kafe (tampilan gambar atau tabel, serba keyboard: F1, F2, ..., Enter).
4. Anggota juga bisa belanja sendiri dari **PWA anggota**: pilih kantin, pilih produk yang ada stoknya, masuk keranjang, checkout, bayar.
5. Pembayaran **tunai** atau **potong Simpanan Sukarela** lewat QR, dua arah:
   - **QR anggota dipindai kasir** (anggota menunjukkan QR bayar di HP).
   - **QR kantin dipindai anggota** (kasir menampilkan QR tagihan, anggota memindai dan menyetujui di HP, seperti payment gateway).
6. Setiap transaksi otomatis menjadi jurnal ganda lewat mesin posting yang sudah ada.
7. Riwayat transaksi tampil di PWA anggota, di admin (semua kantin), dan di akun kantin masing-masing (hanya kantinnya).

## 2. Kondisi sistem sekarang yang menjadi dasar

| Hal | Keadaan | Akibat untuk modul kantin |
| --- | --- | --- |
| Mesin posting | `backend/src/posting/*`, satu transaksi `withTx`, uang `bigint` unit, `postJournal()` menolak jurnal tak seimbang dan periode tertutup | Penjualan kantin dibuat sebagai `posting/kantin.ts` dengan pola yang sama |
| Simpanan Sukarela | Kode `03`, akun **2.1.00.20 Simpanan Sukarela** (kewajiban). Pengambilan = baris `simpanan` dengan `rp_pengambilan`, anggota dikunci `FOR UPDATE`, saldo dicek | Bayar dari sukarela = pengambilan sukarela dengan lawan **Penjualan Kantin**, bukan kas |
| QR anggota | `qr_anggota` + `buatQr`/`bacaQr`: token acak 5 menit, isi data di server, kasir memindai lewat `PindaiQr` (kamera atau pemindai USB) | Dipakai ulang dengan jenis baru `bayar` (lebih singkat, sekali pakai) |
| COA | Belum ada akun persediaan, penjualan barang, HPP, atau kas kantin. Induk yang ada: 1.1.01.00 Aktiva Lancar, 4.0.00.00 Pendapatan, 5.0.00.00 Beban Operasi | Akun kantin harus dibuat (otomatis saat kantin dibuat, bagian 7) |
| Operator dan izin | Login `opr` + grup, izin per menu di `opr_hak_akses`, halaman wajib `wajibIzin`, aksi `operatorAktif([MENU.x])` | Kasir kantin = operator biasa; ditambah **pembatasan per kantin** |
| Mode uji | `tx()` menjalankan lalu rollback | Berlaku otomatis untuk POS |
| Push notifikasi | `backend/src/anggota/push.ts` | Notifikasi "Pembayaran berhasil", "Pesanan siap diambil" |
| Android | Native, lewat `mobile-api` (aturan wajib sama dengan PWA) | Tahap awal hanya PWA; fungsi backend dibuat agar mobile-api bisa memanggil yang sama nanti |

## 3. Peran

| Peran | Siapa | Bisa |
| --- | --- | --- |
| Admin koperasi | Grup superadmin/admin | Membuat unit usaha dan kantin, akun COA, menetapkan operator kantin, melihat semua penjualan dan laporan, membatalkan transaksi |
| Pengelola kantin | Operator dengan peran `pengelola` di satu kantin | Produk, kategori, harga, stok masuk, stok opname, laporan kantinnya, membatalkan transaksi hari ini |
| Kasir kantin | Operator dengan peran `kasir` di satu kantin | POS, terima pesanan mobile, buka/tutup sesi kasir, cetak struk |
| Anggota | Akun PWA (`app_user`) | Belanja mobile, bayar QR, riwayat belanja |
| Pembeli umum | Bukan anggota | Hanya tunai di POS (bila diizinkan, keputusan K2) |

Satu operator boleh ditugaskan ke lebih dari satu kantin; POS meminta memilih kantin bila lebih dari satu.

**Operator kantin memakai grup baru `Kantin`** (dipasang `pengaturan:pasang`, izin hanya menu Kantin). Akun `opr` tidak terikat ke anggota, jadi petugas boleh anggota, pengurus, karyawan tenant, atau orang luar; kolom opsional `opr.anggota_id` diisi bila petugasnya anggota. Karena admin dianjurkan dibatasi ke IP kantor, akses kantin dari luar jaringan (mis. pemilik tenant melihat laporan) membutuhkan alamat terpisah `kasir.kopkarmjsmattel.com` yang hanya melayani menu kantin (tahap lanjut).

## 3a. Model kepemilikan per kantin (keputusan 16 November)

Dipilih saat admin membuat kantin. POS, produk, QR, dan riwayat sama untuk semua model; yang berbeda hanya jurnal dan pemegang uang tunai.

| | **A. Milik koperasi** | **B. Tenant bagi hasil** | C. Tenant sewa tetap |
| --- | --- | --- | --- |
| Status | Dikerjakan | Dikerjakan | Struktur data disiapkan; sewa sementara dicatat lewat Bank Book/Jurnal Umum |
| Barang dan stok | Koperasi | Tenant | Tenant |
| Uang tunai | Kas Kantin (koperasi) | **Dipegang tenant** | Dipegang tenant |
| Pendapatan koperasi | Penjualan − HPP | x% penjualan, **minimal Rp Y per bulan** | Sewa per bulan |
| Persediaan/HPP di buku koperasi | Ya | Tidak (harga beli tetap boleh diisi tenant untuk laporannya sendiri) | Tidak |
| Bayar sukarela | Penjualan koperasi | Utang ke tenant (dikurangi bagi hasil) | Utang ke tenant |
| Penyelesaian | - | **Bulanan** (bisa diubah mingguan per kantin) | Bulanan |

**Data tenant**: nama usaha, pemilik, kontak, rekening tujuan transfer, masa kontrak (mulai/selesai), persen bagi hasil, bagi hasil minimum per bulan, nilai sewa, jadwal penyelesaian.

**Penyelesaian tenant (model B)**, menu **Unit Usaha → Penyelesaian Tenant**:
1. Pilih kantin dan periode; sistem menghitung total penjualan (tunai + sukarela), bagi hasil = max(x% × penjualan, minimum), utang ke tenant dari belanja sukarela, dan piutang tenant.
2. Selisih minimum (bila x% penjualan < minimum) dijurnal saat penyelesaian: Dr Piutang Tenant, Cr Pendapatan Bagi Hasil.
3. Neto = Utang ke Tenant − Piutang Tenant. Positif: koperasi mentransfer ke tenant (Dr Utang ke Tenant, Cr Piutang Tenant, Cr Kas/Bank). Negatif: tenant menyetor ke koperasi.
4. Cetak **Rekap Penyelesaian Tenant** (rincian per hari dan per metode) untuk ditandatangani kedua pihak; periode yang sudah diselesaikan terkunci (transaksi di dalamnya tidak bisa dibatalkan).

**Pengaman model B**: bagi hasil minimum di kontrak; anggota didorong bayar sukarela/QR (pasti tercatat); struk wajib dicetak atau dikirim ke HP anggota; laporan penjualan harian per kantin untuk perbandingan antarbulan.

## 4. Alur proses

### 4.1 Admin membuat kantin

1. Menu **Unit Usaha → Daftar Unit Usaha → Tambah**. Isi: jenis (`KANTIN`; PPOB/ECOMMERCE belum aktif), kode (`KTN01`), nama (*Kantin Gedung A*), lokasi, jam buka, aktif, tampil di aplikasi anggota.
2. Bagian **Akun Jurnal**: pilih **Buat akun otomatis** (bawaan) atau pilih akun yang sudah ada. Otomatis membuat 4 akun detail (bagian 7.1). Akun kas diberi `keterangan = 'GC'` supaya muncul di Bank Book untuk setoran harian.
3. Bagian **Operator**: tambah operator dan perannya (`pengelola`/`kasir`). Operator baru dibuat dari Kelola Operator seperti biasa, grup **Kantin** (grup bawaan dengan izin menu kantin saja).
4. Bagian **Pengaturan bayar**: metode yang diterima (tunai, sukarela), batas belanja sukarela per transaksi dan per hari, saldo sukarela minimal yang harus tersisa.
5. Simpan: satu transaksi database (unit, akun COA, penugasan operator). Dicatat di Aktivitas Pengguna.

### 4.2 Pengelola mengatur produk

1. Menu **Kantin → Produk**, hanya produk kantin yang ditugaskan.
2. Isi: kode/SKU, barcode (opsional, untuk pemindai), nama, kategori (Makanan, Minuman, Snack, ...), satuan (porsi, pcs, botol, bungkus), harga beli, harga jual, **kelola stok** ya/tidak, stok minimal, gambar, tampil di aplikasi anggota, aktif.
3. Layar menghitung langsung **margin Rp** = jual − beli dan **margin %** = margin / jual (dan markup % = margin / beli); peringatan merah bila harga jual ≤ harga beli.
4. Produk tanpa kelola stok (mis. nasi rames yang dimasak harian) selalu tersedia; produk berstok (minuman botol) berkurang setiap terjual dan hilang dari katalog anggota bila stok 0.
5. Setiap perubahan harga disimpan di riwayat harga (siapa, kapan, dari berapa ke berapa).
6. Impor/ekspor produk dari Excel untuk pengisian awal.

### 4.3 Stok

| Mutasi | Kapan | Jurnal |
| --- | --- | --- |
| Stok masuk (pembelian) | Pengelola mencatat barang datang: produk, qty, harga beli, dibayar dari kas kantin/kas induk/utang | Dr Persediaan Kantin, Cr Kas (atau Utang Usaha) |
| Penjualan | Otomatis dari transaksi | Dr HPP, Cr Persediaan (bagian 6) |
| Batal penjualan | Otomatis | Pembalik |
| Stok opname / penyesuaian | Hitung fisik, sistem mencatat selisih | Selisih kurang: Dr Beban Selisih Persediaan, Cr Persediaan (sebaliknya bila lebih) |
| Rusak/kedaluwarsa | Pengelola mencatat | Dr Beban Barang Rusak, Cr Persediaan |

Harga pokok memakai **rata-rata bergerak**: setiap stok masuk, `harga_pokok = (stok×pokok_lama + qty×harga_beli) / (stok+qty)`. Produk tanpa kelola stok memakai harga beli dari master sebagai HPP. (Bila koperasi tidak ingin mencatat persediaan dan HPP, lihat keputusan K1.)

### 4.4 Penjualan di POS (kasir)

1. Kasir login admin → **Kantin → Kasir (POS)**. Bila sesi kasir belum dibuka, diminta **Buka Sesi** (isi modal awal laci).
2. Layar POS (bagian 9): kiri katalog (kartu bergambar atau tabel), kanan keranjang.
3. Tambah produk: klik kartu, ketik nama/kode lalu Enter, atau pindai barcode.
4. Pilih pembeli (opsional untuk tunai, wajib untuk sukarela): F2 lalu pindai QR anggota, atau ketik kode/nama.
5. Bayar:
   - **Tunai (F8)**: isi uang diterima (tombol cepat: Uang Pas, 10 rb, 20 rb, 50 rb, 100 rb), kembalian dihitung, Enter = simpan.
   - **Sukarela, QR anggota (F9)**: pindai QR bayar di HP anggota (bagian 5.1).
   - **Sukarela, QR kantin (F10)**: tampilkan QR tagihan, tunggu anggota menyetujui (bagian 5.2).
6. Tersimpan: nomor bukti, jurnal, stok berkurang, struk tercetak otomatis (printer termal 58/80 mm), keranjang kosong, fokus kembali ke pencarian.
7. **Tahan transaksi** (F7): keranjang disimpan sementara untuk melayani pembeli berikutnya, dipanggil lagi dari daftar tahan.
8. **Tutup Sesi** di akhir shift: sistem menampilkan total tunai seharusnya (modal + penjualan tunai), kasir mengisi uang fisik, selisih dicatat. Setoran ke kas induk lewat **Bank Book** (Dr Kas Induk, Cr Kas Kantin) atau tombol **Setor ke Kas Induk** di layar tutup sesi.

### 4.5 Belanja dari PWA anggota

1. Menu baru **Kantin** di PWA (ikon di Beranda; navigasi bawah tetap 5 tab sesuai keputusan PRD PWA).
2. Pilih kantin yang aktif dan buka (jam buka). Tampil produk yang **aktif, tampil di aplikasi, dan stoknya ada** (produk tanpa kelola stok selalu tampil), dikelompokkan per kategori, dengan pencarian.
3. **Tambah ke tas** (satu tas per kantin, disimpan di server supaya tidak hilang saat ganti HP/browser). Ubah qty, catatan per item (mis. "tidak pedas").
4. **Checkout**: ringkasan, pilihan **ambil di kantin** (bawaan), catatan pesanan, metode bayar:
   - **Simpanan Sukarela**: tampil saldo dan sisa setelah belanja; tombol **Bayar** (dengan PIN bila K4 disetujui). Server memeriksa ulang stok, harga, saldo, batas; posting langsung; status **Dibayar, menunggu diproses**.
   - **Tunai di kasir**: pesanan tercatat **Menunggu bayar**; dibayar saat mengambil. Dibatalkan otomatis bila tidak diambil dalam X menit (pengaturan kantin), stok yang ditahan dikembalikan.
5. Harga dan stok selalu dibaca ulang di server saat checkout; bila berubah, anggota diberi tahu dan diminta konfirmasi ulang.
6. Kasir melihat **Pesanan Masuk** (F6) dengan bunyi notifikasi: Terima → Siap diambil (anggota dapat push) → Selesai. Pesanan bisa ditolak dengan alasan; bila sudah dibayar sukarela, dananya kembali otomatis (jurnal pembalik).

## 5. Pembayaran dengan Simpanan Sukarela

### 5.1 Anggota menunjukkan QR, kasir memindai

1. Anggota membuka **Bayar** di PWA (tombol di Beranda dan di halaman Kantin). PWA meminta `buatQr(..., 'bayar')`: token acak, **berlaku 60 detik, sekali pakai**, QR diperbarui otomatis tiap 50 detik. Di bawah QR tampil saldo sukarela.
2. Kasir menekan F9 dan memindai (kamera atau pemindai USB, komponen `PindaiQr`).
3. Server dalam satu transaksi: baca token (masih berlaku, belum dipakai) → tandai terpakai → kunci anggota `FOR UPDATE` → periksa anggota aktif, kantin menerima sukarela, total ≤ batas per transaksi, total hari ini ≤ batas harian, saldo − total ≥ saldo minimal → posting penjualan + pengambilan sukarela → jurnal.
4. POS menampilkan nama dan foto anggota (untuk dicocokkan kasir) dan status berhasil; struk tercetak.
5. HP anggota mendapat push **"Pembayaran Rp X di Kantin Y berhasil, saldo sukarela Rp Z"**, dan layar QR berganti menjadi bukti bayar (PWA memeriksa status token tiap 2 detik selama layar QR terbuka).

### 5.2 Kasir menampilkan QR, anggota memindai

1. Kasir menekan F10: transaksi disimpan berstatus **Menunggu bayar** dengan token tagihan (berlaku 3 menit). QR tampil besar di layar kasir atau layar kedua yang menghadap pembeli, berisi `KOPKAR1:T:<token>` (hanya token; nominal dan isi di server).
2. Anggota membuka **Bayar → Pindai QR** di PWA (kamera HP lewat browser).
3. PWA menampilkan rincian dari server: nama kantin, item, total, saldo sukarela, sisa setelah bayar.
4. Anggota menekan **Setujui dan Bayar** (PIN bila K4). Server memeriksa hal yang sama dengan 5.1 lalu memposting.
5. Layar POS memeriksa status tiap 1-2 detik; begitu lunas, tampil **Berhasil**, struk tercetak, keranjang kosong. Kasir bisa **Batalkan tagihan** (Esc) selama belum dibayar.

### 5.3 Pengaman

- QR tidak memuat data apa pun selain token acak; tangkapan layar tidak berguna setelah 60 detik atau setelah dipakai.
- Token bayar sekali pakai (`dipakai_pada` diisi dalam transaksi yang sama dengan posting).
- Semua transaksi POS membawa **kunci idempoten** (UUID dari browser); Enter dua kali atau koneksi ulang tidak membuat dua penjualan.
- `anggota_id` selalu dari sesi PWA atau dari token QR, tidak pernah dari isian.
- Batas per transaksi, per hari, dan saldo minimal diatur per kantin; **PIN transaksi** opsional (K4).
- Setiap bayar sukarela dicatat di Aktivitas Pengguna dan mengirim notifikasi ke anggota, jadi pemakaian tanpa sepengetahuan anggota langsung terlihat.

## 6. Jurnal otomatis

Satu penjualan = satu nomor bukti `KTN-yymm-n` (dari sequence `seq_kantin_jual`), satu jurnal. Contoh total Rp 25.000, harga pokok Rp 17.000:

**Tunai**

| Akun | Debit | Kredit |
| --- | ---: | ---: |
| Kas Kantin Gedung A | 25.000 | |
| Penjualan Kantin Gedung A | | 25.000 |
| HPP Kantin Gedung A | 17.000 | |
| Persediaan Kantin Gedung A | | 17.000 |

**Simpanan Sukarela**

| Akun | Debit | Kredit |
| --- | ---: | ---: |
| 2.1.00.20 Simpanan Sukarela | 25.000 | |
| Penjualan Kantin Gedung A | | 25.000 |
| HPP Kantin Gedung A | 17.000 | |
| Persediaan Kantin Gedung A | | 17.000 |

Ditambah satu baris `simpanan` (jenis 03, `rp_pengambilan` 25.000, deskripsi *Belanja Kantin Gedung A KTN-2611-15*, nomor bukti sama) supaya saldo dan mutasi sukarela anggota langsung berkurang di semua layar yang sudah ada (PWA, Android, Buku Simpanan, potongan). Baris ini **tidak** membuat jurnal SMPK sendiri; jurnalnya bagian dari jurnal KTN di atas. Audit Data perlu mengenali baris simpanan bersumber kantin.

**Model B, tenant bagi hasil 10%** (total Rp 25.000; tunai dipegang tenant, tanpa HPP/persediaan)

| Metode | Akun | Debit | Kredit |
| --- | --- | ---: | ---: |
| Tunai | Piutang Tenant Kantin X | 2.500 | |
| | Pendapatan Bagi Hasil Kantin X | | 2.500 |
| Sukarela | 2.1.00.20 Simpanan Sukarela | 25.000 | |
| | Utang ke Tenant Kantin X | | 22.500 |
| | Pendapatan Bagi Hasil Kantin X | | 2.500 |

Baris pengambilan sukarela anggota dibuat sama seperti model A. Penyelesaian bulanan di bagian 3a.

**Lain-lain**

| Kejadian | Jurnal |
| --- | --- |
| Diskon | Penjualan dicatat neto (setelah diskon); diskon disimpan di data penjualan untuk laporan |
| Batal penjualan | Jurnal dan baris simpanan dihapus per nomor bukti (pola `hapus-transaksi.ts`), stok dikembalikan; hanya bila periode terbuka. Pembatalan setelah tutup sesi kasir hanya oleh admin |
| Stok masuk | Dr Persediaan, Cr Kas Kantin / Kas Induk / Utang Usaha (`KTB-yymm-n`) |
| Opname | Dr/Cr Persediaan lawan Beban Selisih Persediaan (`KTO-yymm-n`) |
| Selisih kas tutup sesi | Kurang: Dr Beban Selisih Kas, Cr Kas Kantin; lebih: sebaliknya ke Pendapatan Lain-lain |
| Setoran ke kas induk | Lewat Bank Book (sudah ada) |

## 7. Akun COA

### 7.1 Akun dibuat otomatis per kantin

Usulan penomoran (perlu persetujuan akuntan, K1):

| Akun | Induk | Contoh kode | `keterangan` |
| --- | --- | --- | --- |
| Kas Kantin Gedung A | 1.1.01.00 Aktiva Lancar | 1.1.01.8x | `GC` (muncul di Bank Book) |
| Persediaan Kantin Gedung A | 1.1.01.00 Aktiva Lancar | 1.1.01.9x | |
| Penjualan Kantin Gedung A | **4.1.00.00 Pendapatan Unit Usaha** (induk baru) | 4.1.00.1x | |
| HPP Kantin Gedung A | **5.3.00.00 Harga Pokok Penjualan** (induk baru) | 5.3.00.1x | |

Model B (tenant bagi hasil) membuat akun lain:

| Akun | Induk | Contoh kode |
| --- | --- | --- |
| Piutang Tenant Kantin X | 1.1.01.00 Aktiva Lancar | 1.1.01.9x |
| Utang ke Tenant Kantin X | 2.1.00.00 Kewajiban Lancar | 2.1.00.7x |
| Pendapatan Bagi Hasil Kantin X | 4.1.00.00 Pendapatan Unit Usaha | 4.1.00.2x |

Akun bersama (sekali saja): Beban Selisih Persediaan, Beban Barang Rusak, Beban Selisih Kas di bawah 5.1.00.00 Beban Usaha. Kode berikutnya dicari di bawah `pg_advisory_xact_lock` (pola `max()+1` yang diizinkan `CLAUDE.md`). Laporan Laba Rugi dan Neraca yang sudah ada otomatis memuat akun baru karena dihitung dari `jurnal_umum` per induk; perlu dicek apakah urutan dan pengelompokan laporan memakai kode klasifikasi tertentu.

### 7.2 Catatan Kas Simpanan Sukarela

Ada akun **1.1.01.31 Kas Simp. Sukarela**. Bila dana sukarela disimpan terpisah, belanja dengan sukarela membuat penjualan kantin "dibayar" oleh kewajiban koperasi, sementara uangnya masih di Kas Simp. Sukarela. Akuntan perlu memutuskan apakah ada pemindahan berkala Kas Simp. Sukarela → Kas Induk sebesar total belanja sukarela (bisa dibantu laporan rekap per periode). Lihat K5.

## 8. Skema database

Tabel baru di berkas web baru `database/postgres/unit-usaha.sql` (pola `anggota-web.sql`: aman diulang, dipasang `npm run unit-usaha:pasang`, tidak lewat `mapping.mjs` karena khusus web). Semua `id bigint`, FK `<induk>_id`, uang `numeric(20,4)`, boolean.

```sql
-- Master unit usaha (kantin sekarang, PPOB/e-commerce nanti)
unit_usaha (
  id, jenis text CHECK (jenis IN ('KANTIN','PPOB','ECOMMERCE')), kode text UNIQUE, nama, lokasi, jam_buka time, jam_tutup time,
  aktif bool, tampil_anggota bool,
  model text CHECK (model IN ('milik','bagi_hasil','sewa')), tenant_id NULL,
  akun_kas_id, akun_penjualan_id, akun_hpp_id, akun_persediaan_id,               -- model milik (FK perkiraan)
  akun_piutang_tenant_id, akun_utang_tenant_id, akun_bagi_hasil_id,             -- model tenant
  terima_tunai bool, terima_sukarela bool,
  batas_sukarela_transaksi numeric, batas_sukarela_harian numeric, saldo_sukarela_minimal numeric,
  menit_batal_pesanan int, dibuat_oleh, dibuat_pada, diubah_pada
)
unit_usaha_opr (unit_usaha_id, opr_id, peran text CHECK (peran IN ('pengelola','kasir')), PRIMARY KEY (unit_usaha_id, opr_id))
-- opr.anggota_id bigint NULL (baru, opsional): petugas kantin yang juga anggota

-- Tenant dan kontraknya (model bagi_hasil / sewa)
tenant (id, nama_usaha, pemilik, telepon, email, bank, no_rekening, nama_rekening, aktif, catatan)
tenant_kontrak (
  id, unit_usaha_id, tenant_id, mulai date, selesai date NULL,
  persen_bagi_hasil numeric, minimum_bulanan numeric, sewa_bulanan numeric,
  periode_penyelesaian text CHECK (periode_penyelesaian IN ('bulanan','mingguan'))
)
tenant_penyelesaian (
  id, unit_usaha_id, tenant_id, kontrak_id, periode_mulai date, periode_selesai date,
  total_penjualan, total_tunai, total_sukarela, bagi_hasil, tambahan_minimum, utang_tenant, piutang_tenant, neto,
  no_bukti, akun_kas_id, dibuat_pada, opr, dibatalkan_pada NULL
)

-- Produk
kantin_kategori (id, unit_usaha_id, nama, urutan, aktif)
kantin_produk (
  id, unit_usaha_id, kategori_id, kode, barcode, nama, satuan,
  harga_beli numeric, harga_jual numeric, harga_pokok numeric,       -- harga_pokok = rata-rata bergerak
  kelola_stok bool, stok numeric, stok_minimal numeric,
  gambar bytea, gambar_tipe text,                                    -- media disimpan di database (aturan proyek)
  tampil_anggota bool, aktif bool, dibuat_pada, diubah_pada,
  UNIQUE (unit_usaha_id, kode), UNIQUE (unit_usaha_id, barcode)
)
kantin_harga_riwayat (id, produk_id, harga_beli_lama, harga_beli_baru, harga_jual_lama, harga_jual_baru, opr, waktu)

-- Stok
kantin_stok_mutasi (
  id, produk_id, unit_usaha_id, waktu, jenis text CHECK (jenis IN ('masuk','jual','batal','opname','rusak')),
  qty numeric, harga numeric, stok_setelah numeric, no_bukti, sumber_id, opr, keterangan
)

-- Penjualan (POS dan mobile dalam satu tabel)
kantin_penjualan (
  id, no_bukti text UNIQUE, unit_usaha_id, sesi_kasir_id, anggota_id NULL,  -- NULL = pembeli umum
  sumber text CHECK (sumber IN ('pos','mobile')),
  status text CHECK (status IN ('tahan','menunggu_bayar','dibayar','diproses','siap','selesai','batal')),
  metode text CHECK (metode IN ('tunai','sukarela')),
  subtotal, diskon, total, total_pokok, uang_diterima, kembalian,
  simpanan_id NULL,                    -- baris pengambilan sukarela
  kunci_idempoten uuid UNIQUE, catatan, alasan_batal,
  dibuat_pada, dibayar_pada, selesai_pada, dibatalkan_pada, opr, opr_batal
)
kantin_penjualan_item (
  id, penjualan_id, produk_id, nama_produk, satuan,     -- disalin saat transaksi
  qty, harga_jual, harga_pokok, diskon, subtotal, catatan
)

-- Tas belanja anggota (PWA)
kantin_tas (anggota_id, unit_usaha_id, produk_id, qty, catatan, diubah_pada, PRIMARY KEY (anggota_id, unit_usaha_id, produk_id))

-- Token bayar QR (dua arah)
kantin_token_bayar (
  token text PRIMARY KEY, arah text CHECK (arah IN ('anggota','kantin')),
  anggota_id NULL, penjualan_id NULL, berlaku_sampai timestamptz, dipakai_pada timestamptz NULL
)
-- (alternatif: jenis 'bayar' di qr_anggota + kolom dipakai_pada; arah kantin tetap butuh penjualan_id)

-- Sesi kasir
kantin_sesi_kasir (
  id, unit_usaha_id, opr_id, dibuka_pada, modal_awal, ditutup_pada,
  total_tunai_sistem, uang_fisik, selisih, catatan
)
```

Indeks: `kantin_penjualan (unit_usaha_id, dibuat_pada)`, `(anggota_id, dibuat_pada)`, `(status) WHERE status IN ('menunggu_bayar','dibayar','diproses','siap')`, `kantin_produk (unit_usaha_id, aktif)`, `kantin_stok_mutasi (produk_id, waktu)`. Sequence: `seq_kantin_jual`, `seq_kantin_beli`, `seq_kantin_opname` (didaftarkan di `sequences:pasang`).

Penguncian: produk berstok dikunci `SELECT ... FOR UPDATE` saat penjualan (urut menurut id supaya tidak deadlock); anggota dikunci saat bayar sukarela; token bayar dikunci saat dipakai.

## 9. POS: tampilan dan pintasan

```
┌──────────────────────────────────────────────────────┬──────────────────────────────┐
│ [F1 Cari produk / pindai barcode........] [▦ | ☰ F4] │ Pembeli: [F2] Umum            │
│ Semua | Makanan | Minuman | Snack | ...  (← →)       │──────────────────────────────│
│ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐                  │ Nasi Rames   2 x 12.000  24.000│
│ │ foto │ │ foto │ │ foto │ │ foto │                  │ Es Teh       1 x  5.000   5.000│
│ │Nasi R│ │Es Teh│ │Kopi  │ │Roti  │                  │  (↑↓ pilih, + − qty, Del hapus)│
│ │12.000│ │5.000 │ │6.000 │ │ 8.000│  stok 4          │──────────────────────────────│
│ └──────┘ └──────┘ └──────┘ └──────┘                  │ Subtotal              29.000  │
│                                                      │ Diskon (F3)                0  │
│                                                      │ TOTAL                 29.000  │
│                                                      │ [F8 Tunai] [F9 QR Anggota]    │
│ F6 Pesanan Masuk (3)   F7 Tahan   Sesi: Budi, 07.00  │ [F10 QR Kantin]  [Esc Batal]  │
└──────────────────────────────────────────────────────┴──────────────────────────────┘
```

| Tombol | Fungsi |
| --- | --- |
| F1 | Fokus ke pencarian produk / barcode |
| F2 | Pilih pembeli: pindai QR anggota atau cari kode/nama |
| F3 | Diskon (nominal atau persen) untuk item terpilih atau seluruh nota |
| F4 | Ganti tampilan kartu bergambar ↔ tabel |
| F6 | Pesanan masuk dari aplikasi anggota |
| F7 | Tahan transaksi / panggil transaksi tertahan |
| F8 | Bayar tunai |
| F9 | Bayar sukarela: pindai QR anggota |
| F10 | Bayar sukarela: tampilkan QR kantin |
| Enter | Di pencarian: tambah produk teratas; di layar bayar: simpan |
| ↑ ↓ / ← → | Pilih baris keranjang / kategori |
| + / − / angka | Ubah qty baris terpilih |
| Del | Hapus baris terpilih |
| Esc | Tutup dialog / batalkan tagihan yang menunggu |
| Ctrl+P | Cetak ulang struk terakhir |

F5 (muat ulang), F11 (layar penuh), dan F12 (alat pengembang) sengaja tidak dipakai karena dikuasai browser. Mode layar penuh dan "pasang sebagai aplikasi" disarankan di komputer kasir. Struk dicetak lewat `window.print()` dengan CSS 58/80 mm (tanpa driver khusus); laci uang mengikuti printer bila didukung.

## 10. Riwayat dan laporan

| Tempat | Isi |
| --- | --- |
| PWA anggota → Kantin → **Riwayat Belanja** | Daftar nota (kantin, waktu, total, metode, status), rincian item, bukti bayar; status pesanan berjalan. Belanja sukarela juga tampil di mutasi Simpanan Sukarela |
| Akun kantin (pengelola/kasir) | Penjualan kantinnya saja: daftar nota dengan saringan tanggal/metode/kasir/status, cetak ulang, batal (sesuai izin), rekap sesi kasir |
| Admin → Unit Usaha → **Penjualan** | Semua kantin, saringan sama, ekspor dan cetak |
| Laporan | Penjualan harian/bulanan per kantin, laba kotor (penjualan − HPP), produk terlaris, rekap per metode bayar (tunai vs sukarela), kartu stok, stok minimum, sesi kasir dan selisih kas, belanja sukarela per anggota (bahan SHU, K6) |

## 11. Hak akses dan berkas yang disentuh

Menu baru di `src/config/akses.ts` (`MENU`, `AKSES_HALAMAN`) dan `menu.ts`, masing-masing satu izin per menu sidebar:

| Menu | Halaman | Untuk |
| --- | --- | --- |
| Unit Usaha → Daftar Unit Usaha | `/dashboard/unit-usaha` | Admin |
| Unit Usaha → Penjualan | `/dashboard/unit-usaha/penjualan` | Admin |
| Kantin → Kasir (POS) | `/dashboard/kantin/kasir` | Kasir, pengelola |
| Kantin → Produk | `/dashboard/kantin/produk` | Pengelola |
| Kantin → Stok | `/dashboard/kantin/stok` | Pengelola |
| Kantin → Laporan | `/dashboard/kantin/laporan` | Pengelola |

Izin menu saja tidak cukup: setiap query dan aksi kantin juga disaring `unit_usaha_id IN (kantin milik operator)` lewat satu fungsi `kantinOperator(o)` (superadmin/admin: semua). Grup **Kantin** baru dipasang oleh `pengaturan:pasang` dengan izin menu Kantin saja.

Berkas utama:
- `backend/src/posting/kantin.ts`: `jualKantin`, `bayarTagihan`, `batalJual`, `stokMasuk`, `opname`, `bukaSesi`/`tutupSesi` (satu-satunya penulis uang dan stok).
- `backend/src/unit-usaha/*`: buat unit + akun COA, query katalog, tas, pesanan, riwayat (dipakai admin, PWA, dan nanti mobile-api).
- `frontend/src/app/actions/kantin.ts` (pembungkus memanggil `catatAksi`), halaman di `frontend/src/app/dashboard/kantin/**` dan `unit-usaha/**`.
- `anggota/src/app/(app)/kantin/**` (katalog, tas, checkout, bayar, pindai, riwayat).
- `database/postgres/unit-usaha.sql`, `package.json` skrip pasang, `docker-compose.yml`/`Dockerfile` tidak berubah (layanan sama), `docs/DEPLOY-VPS.md` langkah pasang ditambah, artikel Pusat Panduan baru `database/panduan/NN-kantin/*`.
- Uji: `backend/test/kantin.test.ts` (jurnal seimbang, saldo sukarela kurang ditolak, batas harian, token sekali pakai, idempoten, batal mengembalikan stok dan saldo, kantin lain tidak bisa diakses).

## 12. Keputusan yang dibutuhkan

| No | Pertanyaan | Usulan |
| --- | --- | --- |
| K1 | Catat persediaan dan HPP (laba kotor terlihat), atau cukup penjualan saja (Dr Kas, Cr Penjualan; pembelian bahan langsung beban)? Penomoran akun di 7.1 disetujui akuntan? | Catat persediaan + HPP untuk produk berstok; produk masak harian HPP dari harga beli |
| K2 | Pembeli umum (bukan anggota) boleh belanja tunai di POS? | Boleh, tunai saja |
| K3 | Kantin dikelola koperasi sendiri atau tenant? | **Diputuskan 16 November: diatur per kantin.** Model A (milik koperasi) dan B (tenant bagi hasil, minimum bulanan, tunai dipegang tenant, penyelesaian bulanan) dikerjakan; C (sewa) disiapkan strukturnya. Operator kantin memakai grup baru `Kantin`, boleh orang luar (bagian 3 dan 3a) |
| K4 | PIN transaksi 6 digit untuk bayar sukarela? Batas per transaksi, per hari, dan saldo minimal | PIN wajib untuk QR kantin (5.2) dan belanja mobile; batas bawaan Rp 100.000/transaksi, Rp 200.000/hari, saldo minimal Rp 0 |
| K5 | Dana sukarela di Kas Simp. Sukarela: perlu pemindahan berkala ke kas induk sebesar belanja sukarela? | Laporan rekap per periode, pemindahan lewat Bank Book oleh bendahara |
| K6 | Belanja kantin ikut dihitung sebagai jasa usaha anggota untuk SHU? | Datanya disiapkan; aturan SHU tidak diubah dulu |
| K7 | Pesanan mobile boleh bayar tunai di kasir, dan batas waktu ambil? | Boleh, batal otomatis 30 menit |
| K8 | Aplikasi Android ikut sekarang, atau PWA dulu? | PWA dulu; mobile-api menyusul memakai fungsi backend yang sama |
| K9 | Perangkat kasir: printer termal 58 atau 80 mm, pemindai barcode, layar kedua untuk QR? | 80 mm, pemindai USB, layar kedua opsional |

## 13. Tahapan pengerjaan

| Tahap | Isi | Hasil yang bisa dicek |
| --- | --- | --- |
| 1 | Unit usaha (model A/B) + tenant dan kontrak + akun COA otomatis per model + grup Kantin + operator per kantin; produk, kategori, gambar, margin | Admin membuat 1 kantin milik koperasi dan 1 kantin tenant; kasir kantin A tidak melihat produk kantin B |
| 2 | Stok masuk (jurnal persediaan) + POS tunai + struk + sesi kasir + jurnal model A dan B + stok + batal; laporan penjualan dan laba kotor | Penjualan tunai muncul di jurnal sesuai model, neraca seimbang, stok berkurang |
| 3 | Bayar sukarela QR anggota (5.1) + riwayat belanja di PWA + notifikasi; Penyelesaian Tenant bulanan | Saldo sukarela anggota berkurang di PWA, Android, dan Buku Simpanan; rekap tenant cocok dengan jurnal |
| 4 | QR kantin dipindai anggota (5.2) + PIN | Pembayaran dari HP anggota menutup tagihan di POS dalam ≤ 2 detik |
| 5 | Katalog, tas, checkout, pesanan masuk, status pesanan di PWA | Pesanan anggota sampai ke kasir dan status kembali ke HP |
| 6 | Stok masuk, opname, kartu stok, stok minimum; Android lewat mobile-api; PPOB/e-commerce memakai `unit_usaha` | Sesuai kebutuhan berikutnya |
