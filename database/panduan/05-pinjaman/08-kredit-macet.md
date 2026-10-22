---
judul: Kredit macet dan tunggakan
ringkasan: Cara sistem menghitung tunggakan per pinjaman tunai dan KPR, arti setiap kolom, dan cara menyaring.
menu: /dashboard/loans/bad-debts
---
**Pinjaman → Kredit Macet** menampilkan pinjaman tunai **dan KPR** yang punya angsuran **sudah jatuh tempo menurut jadwal tagih tetapi belum dibayar**.

**Tunggakan = jumlah angsuran yang jatuh temponya ≤ tanggal laporan − jumlah angsuran yang sudah dibayar.**

| Kolom | Arti |
| --- | --- |
| No. Pinjaman, Anggota, Jenis, Grup | Identitas pinjaman |
| Dibayar / Jatuh Tempo | Contoh *3 / 5*: sudah 3 kali bayar dari 5 yang jatuh tempo |
| Tunggak | Jumlah angsuran yang tertunggak (contoh di atas: 2) |
| Nilai Tunggakan | Pinjaman tunai: pokok + jasa + adm + provisi angsuran yang tertunggak. KPR: pokok saja |
| Sejak | Tanggal jatuh tempo angsuran tertua yang belum dibayar |

Daftar diurutkan dari tunggakan terbanyak. Saring per **Grup** (KOPERASI, BANK / PIHAK LAIN, KPR) dan status anggota (**Aktif / Non-aktif / Semua**; bawaannya Aktif). Isi **Per Tanggal** untuk melihat posisi tunggakan pada tanggal tertentu.

## Menindaklanjuti tunggakan

Pembayaran tunggakan dicatat seperti angsuran biasa di **Setoran Angsuran**. Karena angsuran selalu dibayar berurutan, angsuran tertua dilunasi lebih dulu. Satu kali simpan melunasi satu angsuran, jadi tunggakan 2 angsuran dicatat dengan dua kali simpan.

> **Catatan:** Kolom **Kolektibilitas** (misalnya lancar, kurang lancar, diragukan, macet) muncul setelah tabel jenis macet diisi. Saat ini tabel itu masih kosong.
