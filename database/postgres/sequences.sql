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

-- Pinjaman tunai: urut rincian (dipakai nomor ANGS-CR-), urut jadwal tagih, dan urut nomor pinjaman (CR-).
CREATE SEQUENCE IF NOT EXISTS seq_pinjaman_rincian_urut;
CREATE SEQUENCE IF NOT EXISTS seq_pinjaman_tagih_urut;
CREATE SEQUENCE IF NOT EXISTS seq_pinjaman_no;
SELECT setval('seq_pinjaman_rincian_urut', GREATEST((SELECT COALESCE(MAX(urut), 0) FROM pinjaman_tunai_rincian), 1))
 WHERE (SELECT last_value FROM seq_pinjaman_rincian_urut) = 1 AND NOT (SELECT is_called FROM seq_pinjaman_rincian_urut);
SELECT setval('seq_pinjaman_tagih_urut', GREATEST((SELECT COALESCE(MAX(urut), 0) FROM pinjaman_tunai_rincian_tagih), 1))
 WHERE (SELECT last_value FROM seq_pinjaman_tagih_urut) = 1 AND NOT (SELECT is_called FROM seq_pinjaman_tagih_urut);
SELECT setval('seq_pinjaman_no', GREATEST((SELECT COALESCE(MAX(no_pinjaman_urut), 0) FROM pinjaman_tunai), 1))
 WHERE (SELECT last_value FROM seq_pinjaman_no) = 1 AND NOT (SELECT is_called FROM seq_pinjaman_no);

-- KPR: nomor KPR-mmyy-urut dan urut rincian (nomor ANGS-KPR-).
CREATE SEQUENCE IF NOT EXISTS seq_kpr_no;
CREATE SEQUENCE IF NOT EXISTS seq_kpr_rincian_urut;
SELECT setval('seq_kpr_no', GREATEST((SELECT COALESCE(MAX(no_pinjaman_urut), 0) FROM kpr), 1))
 WHERE (SELECT last_value FROM seq_kpr_no) = 1 AND NOT (SELECT is_called FROM seq_kpr_no);
SELECT setval('seq_kpr_rincian_urut', GREATEST((SELECT COALESCE(MAX(urut), 0) FROM kpr_rincian), 1))
 WHERE (SELECT last_value FROM seq_kpr_rincian_urut) = 1 AND NOT (SELECT is_called FROM seq_kpr_rincian_urut);

-- Jurnal umum (memorial) dari web: nomor JU/yymmdd/n. Desktop memakai nomor harian kecil dan
-- beberapa nomor besar; sequence dimulai di atas nomor tertinggi yang pernah ada supaya tidak bentrok.
CREATE SEQUENCE IF NOT EXISTS seq_jurnal_umum_no;
SELECT setval('seq_jurnal_umum_no', GREATEST((SELECT COALESCE(MAX(substring(nomor_bukti FROM '[0-9]+$')::bigint), 0)
    FROM jurnal_umum WHERE nomor_bukti LIKE 'JU/%'), 1))
 WHERE (SELECT last_value FROM seq_jurnal_umum_no) = 1 AND NOT (SELECT is_called FROM seq_jurnal_umum_no);

-- Pengelolaan akses dari web: urut grup operator (unik) dan urut baris hak akses.
CREATE SEQUENCE IF NOT EXISTS seq_opr_grup_urut;
CREATE SEQUENCE IF NOT EXISTS seq_opr_hak_akses_urut;
SELECT setval('seq_opr_grup_urut', GREATEST((SELECT COALESCE(MAX(urut), 0) FROM opr_grup), 1))
 WHERE (SELECT last_value FROM seq_opr_grup_urut) = 1 AND NOT (SELECT is_called FROM seq_opr_grup_urut);
SELECT setval('seq_opr_hak_akses_urut', GREATEST((SELECT COALESCE(MAX(urut), 0) FROM opr_hak_akses), 1))
 WHERE (SELECT last_value FROM seq_opr_hak_akses_urut) = 1 AND NOT (SELECT is_called FROM seq_opr_hak_akses_urut);
