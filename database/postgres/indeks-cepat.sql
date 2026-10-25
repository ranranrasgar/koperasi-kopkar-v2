-- Indeks untuk kecepatan halaman (hasil pengukuran query halaman pada data produksi: jurnal_umum 1,1 juta baris, simpanan 300 ribu baris).
-- Dipasang oleh `npm run indeks:pasang` (CREATE INDEX CONCURRENTLY, tabel tetap bisa dipakai). Satu pernyataan per baris; aman dijalankan ulang.
-- Buku Besar, Bank Book, saldo akun: dicari menurut kode akun dan tanggal.
CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_jurnal_umum_kode_perkiraan_tanggal ON jurnal_umum (kode_perkiraan, tanggal_jurnalumum, urutan);
-- Neraca, Rugi Laba, Neraca Saldo, Jurnal Bermasalah: agregasi per tanggal lewat index-only scan (kolom penutup).
CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_jurnal_umum_tanggal_cover ON jurnal_umum (tanggal_jurnalumum) INCLUDE (kode_perkiraan, debit_jurnalumum, kredit_jurnalumum, nomor_bukti);
-- Pencarian teks di Jurnal Umum (ILIKE '%kata%') memakai indeks trigram.
CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_jurnal_umum_nomor_bukti_trgm ON jurnal_umum USING gin (nomor_bukti gin_trgm_ops);
CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_jurnal_umum_deskripsi_trgm ON jurnal_umum USING gin (deskripsi gin_trgm_ops);
CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_jurnal_umum_kode_trgm ON jurnal_umum USING gin (kode_perkiraan gin_trgm_ops);
-- Simpanan: dasbor dan grafik (jumlah per tanggal), rekap per anggota, dan pencarian nomor bukti.
CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_simpanan_tgl_cover ON simpanan (tgl_transaksi) INCLUDE (rp_setoran, rp_pengambilan, jenis_simpanan);
CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_simpanan_anggota_cover ON simpanan (anggota_id) INCLUDE (jenis_simpanan, rp_setoran, rp_pengambilan, tgl_transaksi);
CREATE INDEX CONCURRENTLY IF NOT EXISTS ix_simpanan_no_bukti_trgm ON simpanan USING gin (no_bukti gin_trgm_ops);
