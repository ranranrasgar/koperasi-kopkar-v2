-- SHU per tahun buku untuk web (pengganti temp_shu / temp_shu_backup desktop, yang dikosongkan tiap proses dan hanya menyimpan satu tahun).
-- Aman dijalankan ulang. Tabel desktop tidak diubah; data SHU di temp_shu_backup diimpor sekali sebagai tahun tutup bukunya.

CREATE TABLE IF NOT EXISTS shu_tahun (
    tahun            integer PRIMARY KEY,
    tgl_tutup_buku   date NOT NULL,
    rp_pendapatan    numeric(18,2) NOT NULL DEFAULT 0,   -- pendapatan sebelum pajak (rugi laba tahun itu)
    rp_pajak         numeric(18,2) NOT NULL DEFAULT 0,
    rp_laba_ditahan  numeric(18,2) NOT NULL DEFAULT 0,   -- setelah pajak: dasar pembagian ke pos
    rp_shu_anggota   numeric(18,2) NOT NULL DEFAULT 0,   -- bagian pos "SHU yang dibagikan anggota" (kolam yang dibagi ke anggota)
    hitung_sukarela  boolean NOT NULL DEFAULT true,      -- komponen saldo sukarela ikut dihitung
    status           varchar(10) NOT NULL DEFAULT 'draf' CHECK (status IN ('draf', 'posting')),
    dihitung_oleh    varchar(50),
    dihitung_pada    timestamp,
    diposting_oleh   varchar(50),
    diposting_pada   timestamp
);

CREATE TABLE IF NOT EXISTS shu_anggota (
    tahun            integer NOT NULL REFERENCES shu_tahun (tahun) ON DELETE CASCADE,
    kode_agt         varchar(50) NOT NULL,
    anggota_id       bigint,
    nik              varchar(50),
    nama             varchar(100),
    status_staff     varchar(50),
    no_rek           varchar(50),
    tgl_masuk        date,
    rp_sukarela      numeric(18,2) NOT NULL DEFAULT 0,   -- saldo simpanan sukarela sampai akhir tahun
    rp_jasa_uang     numeric(18,2) NOT NULL DEFAULT 0,   -- jasa (bunga) pinjaman uang yang dibayar pada tahun itu
    rp_jasa_barang   numeric(18,2) NOT NULL DEFAULT 0,
    lama_agt         integer NOT NULL DEFAULT 0,         -- lama menjadi anggota, bulan
    rp_bagian        numeric(18,4) NOT NULL DEFAULT 0,   -- SHU anggota hasil rumus (empat komponen)
    status           smallint NOT NULL DEFAULT 0,        -- 0 belum diambil, 1 sudah dicairkan
    rp_dicairkan     numeric(18,4) NOT NULL DEFAULT 0,
    tgl_cair         date,
    no_reff          varchar(50),                        -- nomor bukti jurnal SHU/...
    cara             varchar(10),                        -- 'kas' atau 'sukarela'
    PRIMARY KEY (tahun, kode_agt)
);
CREATE INDEX IF NOT EXISTS ix_shu_anggota_status ON shu_anggota (tahun, status);
CREATE INDEX IF NOT EXISTS ix_shu_anggota_noreff ON shu_anggota (no_reff);

-- Impor satu kali dari temp_shu_backup desktop: tahun tutup buku, angka tutup buku dari jurnal TBT, dan baris anggota beserta status pencairannya.
DO $$
DECLARE
    th integer;
    ld varchar; hp varchar; pos2 varchar;
BEGIN
    SELECT kode_perkiraan INTO ld FROM perkiraan WHERE keterangan = 'Laba Ditahan' ORDER BY id LIMIT 1;
    SELECT kode_perkiraan INTO hp FROM perkiraan WHERE keterangan = 'Hutang Pajak' ORDER BY id LIMIT 1;
    SELECT kode_coa INTO pos2 FROM jenis_pos_shu WHERE urut = 2;
    FOR th IN SELECT DISTINCT EXTRACT(year FROM tgl_tutup_buku)::int FROM temp_shu_backup LOOP
        CONTINUE WHEN EXISTS (SELECT 1 FROM shu_tahun WHERE tahun = th);
        INSERT INTO shu_tahun (tahun, tgl_tutup_buku, rp_pendapatan, rp_pajak, rp_laba_ditahan, rp_shu_anggota, status, dihitung_oleh, dihitung_pada, diposting_oleh)
        SELECT th, make_date(th, 12, 31),
            COALESCE((SELECT SUM(kredit_jurnalumum) FROM jurnal_umum WHERE deskripsi = 'Tutup Buku Tahun ' || th AND kode_perkiraan = ld AND tanggal_jurnalumum = make_date(th, 12, 31)), 0),
            COALESCE((SELECT SUM(kredit_jurnalumum) FROM jurnal_umum WHERE deskripsi = 'Tutup Buku Tahun ' || th AND kode_perkiraan = hp AND tanggal_jurnalumum = make_date(th, 12, 31)), 0),
            0,
            COALESCE((SELECT SUM(kredit_jurnalumum) FROM jurnal_umum WHERE deskripsi = 'Tutup Buku Tahun ' || th AND kode_perkiraan = pos2 AND tanggal_jurnalumum = make_date(th, 12, 31)), 0),
            'posting', 'impor desktop', now(), 'impor desktop';
        UPDATE shu_tahun SET rp_laba_ditahan = rp_pendapatan - rp_pajak WHERE tahun = th;
        INSERT INTO shu_anggota (tahun, kode_agt, anggota_id, nik, nama, status_staff, no_rek, tgl_masuk, rp_sukarela, rp_jasa_uang, rp_jasa_barang, lama_agt,
                                 rp_bagian, status, rp_dicairkan, tgl_cair, no_reff, cara)
        SELECT th, b.kode_agt, b.anggota_id, b.nik, b.nama, b.status_staff, b.no_rek, b.tgl_masuk, b.rp_sukarela, b.rp_jasa_uang, b.rp_jasa_barang, b.lama_agt,
               0, b.status, b.rp_pencairan, (SELECT MIN(tanggal_jurnalumum) FROM jurnal_umum WHERE nomor_bukti = b.no_reff), NULLIF(b.no_reff, ''),
               CASE WHEN b.status = 1 THEN 'kas' END
          FROM temp_shu_backup b WHERE EXTRACT(year FROM b.tgl_tutup_buku) = th
        ON CONFLICT DO NOTHING;
        -- bagian anggota dihitung dengan rumus yang sama dengan Hitung SHU (diverifikasi persis dengan rp_pencairan desktop)
        UPDATE shu_anggota s SET rp_bagian = ROUND(t.bagian, 4)
          FROM (SELECT kode_agt,
                       (SELECT rp_shu_anggota FROM shu_tahun WHERE tahun = th) / 4 * (
                           CASE WHEN SUM(rp_sukarela) OVER () = 0 THEN 0 ELSE rp_sukarela / SUM(rp_sukarela) OVER () END +
                           CASE WHEN SUM(rp_jasa_uang) OVER () = 0 THEN 0 ELSE rp_jasa_uang / SUM(rp_jasa_uang) OVER () END +
                           CASE WHEN SUM(rp_jasa_barang) OVER () = 0 THEN 0 ELSE rp_jasa_barang / SUM(rp_jasa_barang) OVER () END +
                           CASE WHEN SUM(lama_agt) OVER () = 0 THEN 0 ELSE lama_agt::numeric / SUM(lama_agt) OVER () END) AS bagian
                  FROM shu_anggota WHERE tahun = th) t
         WHERE s.tahun = th AND s.kode_agt = t.kode_agt;
    END LOOP;
END $$;
