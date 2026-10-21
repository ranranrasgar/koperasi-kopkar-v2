-- Penomoran bukti dari sequence (pengganti max()+1 di aplikasi desktop). Aman dijalankan ulang:
-- sequence yang sudah ada tidak diubah nilainya.
CREATE SEQUENCE IF NOT EXISTS seq_simpanan_urut;
CREATE SEQUENCE IF NOT EXISTS seq_jurnal_urutan;
CREATE SEQUENCE IF NOT EXISTS seq_jurnal_urut;
SELECT setval('seq_simpanan_urut', GREATEST((SELECT COALESCE(MAX(urut), 0) FROM simpanan), 1))
 WHERE (SELECT last_value FROM seq_simpanan_urut) = 1 AND NOT (SELECT is_called FROM seq_simpanan_urut);
SELECT setval('seq_jurnal_urutan', GREATEST((SELECT COALESCE(MAX(urutan), 0) FROM jurnal_umum), 1))
 WHERE (SELECT last_value FROM seq_jurnal_urutan) = 1 AND NOT (SELECT is_called FROM seq_jurnal_urutan);
SELECT setval('seq_jurnal_urut', GREATEST((SELECT COALESCE(MAX(urut), 0) FROM jurnal_umum WHERE tahun NOT LIKE 'BB%'), 1))
 WHERE (SELECT last_value FROM seq_jurnal_urut) = 1 AND NOT (SELECT is_called FROM seq_jurnal_urut);
