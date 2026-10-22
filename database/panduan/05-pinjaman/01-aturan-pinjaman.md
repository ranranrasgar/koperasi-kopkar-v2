---
judul: Aturan dan perhitungan pinjaman
ringkasan: Cara sistem menghitung jasa, adm, provisi, jadwal angsuran, tanggal jatuh tempo, dan pembulatan, lengkap dengan contoh angka.
---
Semua angka di halaman ini dihitung oleh **mesin posting** yang sama dengan yang dipakai saat menyimpan, sehingga pratinjau di form pencairan selalu sama dengan hasil akhirnya.

## Tiga grup pinjaman

| Grup | Contoh | Bunga | Dicatat sebagai | Form pencairan |
| --- | --- | --- | --- | --- |
| KOPERASI | C01, C02, C31, C32 | Ada (jasa) | Piutang anggota | Input Pinjaman Tunai |
| BANK / PIHAK LAIN | Pinjaman lewat bank | Sesuai jenis | Piutang | Input Pinjaman Tunai |
| KPR | BTN, BRI | **Tanpa bunga** | **Titipan** (kewajiban kepada bank) | Input Pinjaman KPR |

## Rumus

| Komponen | Rumus | Kapan ditagih |
| --- | --- | --- |
| Pokok per angsuran | Pokok ÷ lama angsuran | Setiap angsuran |
| Jasa total, bunga **per angsuran** | Pokok × bunga % × lama | Dibagi rata ke setiap angsuran |
| Jasa total, bunga **per lama angsuran** | Pokok × bunga % (sekali) | Dibagi rata ke setiap angsuran |
| Adm | Pokok × adm %, dibulatkan ke rupiah | **Hanya angsuran pertama** |
| Provisi | Pokok × provisi %, dibulatkan ke rupiah | **Hanya angsuran pertama** |

## Contoh 1: C01 Pinj. Uang Non Staff

Pokok **Rp 6.000.000**, lama **12 kali**, bunga 1,5% per angsuran, adm 1%, provisi 0%.

| | Nilai |
| --- | --- |
| Jasa total | 6.000.000 × 1,5% × 12 = **Rp 1.080.000** |
| Pokok per bulan | 6.000.000 ÷ 12 = **Rp 500.000** |
| Jasa per bulan | 1.080.000 ÷ 12 = **Rp 90.000** |
| Adm | 6.000.000 × 1% = **Rp 60.000** (angsuran ke-1) |
| Angsuran ke-1 | 500.000 + 90.000 + 60.000 = **Rp 650.000** |
| Angsuran ke-2 sampai ke-12 | 500.000 + 90.000 = **Rp 590.000** |

## Contoh 2: C32 Pinj. Konsumtif Non Staff

Pokok **Rp 10.000.000**, lama **24 kali**, bunga 2% per angsuran, adm 1%, provisi 1%.

| | Nilai |
| --- | --- |
| Jasa total | 10.000.000 × 2% × 24 = **Rp 4.800.000** |
| Pokok per bulan (jadwal) | 10.000.000 ÷ 24 = **Rp 416.667** (dibulatkan) |
| Jasa per bulan | **Rp 200.000** |
| Adm dan provisi | **Rp 100.000** dan **Rp 100.000** (angsuran ke-1) |
| Angsuran ke-1 | **Rp 816.667** |
| Angsuran berikutnya | **Rp 616.667** |

## Pembulatan

- **Jadwal tagih** (yang dilihat anggota dan dipakai potongan gaji) dibulatkan ke **rupiah penuh**.
- Saat angsuran **diposting**, pokok dan jasa dihitung sampai 4 angka desimal (contoh 2: pokok Rp 416.666,6667), lalu dibulatkan 2 desimal di jurnal.
- **Angsuran terakhir mengambil sisa persis**, sehingga saldo pokok dan jasa pinjaman pasti tepat nol saat lunas.

## Tanggal jatuh tempo

Angsuran ke-1 jatuh tempo **bulan berikutnya** setelah tanggal pinjaman, pada tanggal jatuh tempo jenis pinjaman. Tanggal di atas 28 dibatasi menjadi **28** supaya berlaku di semua bulan.

Contoh: pinjaman tanggal 22 Oktober 2026 dengan jatuh tempo tanggal 10 → angsuran ke-1 jatuh tempo **10 November 2026**, ke-2 **10 Desember 2026**, dan seterusnya.

## Aturan yang diperiksa sistem

| Aturan | Pesan bila dilanggar |
| --- | --- |
| Lama angsuran bilangan bulat minimal 1 | *Lama angsuran harus bilangan bulat >= 1* |
| Lama tidak melebihi maksimum jenis pinjaman (0 = bebas) | *Lama 15 melebihi maksimum 12 untuk Pinj. Uang Non Staff* |
| Pokok lebih dari nol | *Pokok harus lebih dari nol* |
| Operator punya izin pencairan untuk grup jenis pinjaman itu | Jenis pinjaman grup lain tidak muncul di pilihan |
| Jenis grup KPR tidak boleh lewat form pinjaman tunai | *Jenis kredit grup KPR dicairkan lewat form KPR* |
| Angsuran hanya untuk pinjaman yang belum lunas | *Pinjaman ... sudah lunas* |
