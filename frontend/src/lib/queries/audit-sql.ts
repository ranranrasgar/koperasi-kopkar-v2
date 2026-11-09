// SQL pemeriksaan Audit Data (tanpa import server, supaya bisa diuji dari skrip). Semua hanya membaca; dipakai audit.ts.
//
// Tiap pemeriksaan menghasilkan baris temuan dengan kolom yang sama: tanggal, bukti, anggota, keterangan, nilai, tautan_no.
// $1 = dari, $2 = sampai. Jurnal ditautkan lewat nomor_bukti karena sumber_tipe/sumber_id hasil migrasi tidak lengkap.
// Batas selisih 1 rupiah: simpanan menyimpan 4 desimal sedangkan jurnal 2 desimal.

export type ModulAudit = "Simpanan" | "Pinjaman Tunai" | "KPR"

export interface CekAudit {
    id: string
    modul: ModulAudit
    judul: string
    /** Apa artinya dan apa yang perlu diperiksa, tampil di halaman rincian. */
    arti: string
    sql: string
}

const SIMPANAN = `s.tgl_transaksi AS tanggal, s.no_bukti AS bukti, a.nama AS anggota, a.kode_agt AS kode_agt`
const NILAI_SIMPANAN = "(s.rp_setoran + s.rp_pengambilan)"
const NILAI_ANGSURAN = "(r.debit_pokok + r.debit_bunga + r.rp_adm + r.rp_provisi)"
const SISA_POKOK = "(SELECT COALESCE(SUM(x.kredit_pokok - x.debit_pokok), 0) FROM pinjaman_tunai_rincian x WHERE x.pinjaman_tunai_id = p.id)"
const DIBAYAR_POKOK = "(SELECT COALESCE(SUM(x.debit_pokok), 0) FROM pinjaman_tunai_rincian x WHERE x.pinjaman_tunai_id = p.id)"
const DIBAYAR_KPR = "(SELECT COALESCE(SUM(x.debit_pokok), 0) FROM kpr_rincian x WHERE x.kpr_id = k.id)"

/** Transaksi tanpa jurnal yang sudah dibatalkan saling menghapus dengan pembaliknya, jadi bukan temuan lagi. */
const BELUM_BATAL = (bukti: string) => `NOT EXISTS (SELECT 1 FROM transaksi_koreksi k WHERE k.aksi = 'batal' AND ${bukti} IN (k.no_bukti, k.no_bukti_pembalik))`

export const CEK_AUDIT: CekAudit[] = [
    {
        id: "simpanan-tanpa-jurnal", modul: "Simpanan", judul: "Transaksi simpanan tanpa jurnal",
        arti: "Baris simpanan bernilai yang tidak punya jurnal dengan nomor bukti sama. Saldo anggota terhitung, tetapi tidak masuk Buku Besar. Baris akhir 2017 kemungkinan saldo awal saat pindah data; pastikan dengan akuntan.",
        sql: `SELECT ${SIMPANAN}, s.deskripsi AS keterangan, ${NILAI_SIMPANAN} AS nilai
                FROM simpanan s JOIN anggota a ON a.id = s.anggota_id
               WHERE s.tgl_transaksi BETWEEN $1 AND $2 AND ${NILAI_SIMPANAN} <> 0
                 AND NOT EXISTS (SELECT 1 FROM jurnal_umum j WHERE j.nomor_bukti = s.no_bukti) AND ${BELUM_BATAL("s.no_bukti")}`,
    },
    {
        id: "simpanan-beda-jurnal", modul: "Simpanan", judul: "Nilai simpanan berbeda dengan jurnal",
        arti: "Nilai transaksi simpanan tidak sama dengan total debit jurnalnya. Salah satunya pernah diubah atau keliru dicatat. Bukti SHU tidak diperiksa: simpanannya hanya sisa pembulatan dari pengambilan SHU.",
        sql: `SELECT ${SIMPANAN}, 'Jurnal ' || TO_CHAR(j.debit, 'FM999G999G999G990') AS keterangan, ABS(${NILAI_SIMPANAN} - j.debit) AS nilai
                FROM simpanan s JOIN anggota a ON a.id = s.anggota_id
                JOIN LATERAL (SELECT SUM(x.debit_jurnalumum) AS debit FROM jurnal_umum x WHERE x.nomor_bukti = s.no_bukti) j ON j.debit IS NOT NULL
               WHERE s.tgl_transaksi BETWEEN $1 AND $2 AND s.no_bukti NOT LIKE 'SHU/%' AND ABS(${NILAI_SIMPANAN} - j.debit) >= 1 AND ${BELUM_BATAL("s.no_bukti")}`,
    },
    {
        id: "jurnal-simpanan-yatim", modul: "Simpanan", judul: "Jurnal simpanan tanpa transaksi",
        arti: "Jurnal bersumber simpanan yang nomor buktinya tidak ada lagi di tabel simpanan. Buku Besar terisi, tetapi saldo anggota tidak.",
        sql: `SELECT MIN(j.tanggal_jurnalumum) AS tanggal, j.nomor_bukti AS bukti, NULL::varchar AS anggota, NULL::varchar AS kode_agt,
                     MIN(j.deskripsi) AS keterangan, SUM(j.debit_jurnalumum) AS nilai
                FROM jurnal_umum j
               WHERE j.sumber_tipe = 'simpanan' AND j.tanggal_jurnalumum BETWEEN $1 AND $2
                 AND NOT EXISTS (SELECT 1 FROM simpanan s WHERE s.no_bukti = j.nomor_bukti)
               GROUP BY j.nomor_bukti`,
    },
    {
        id: "pencairan-tanpa-jurnal", modul: "Pinjaman Tunai", judul: "Pencairan pinjaman tanpa jurnal",
        arti: "Pinjaman tunai yang nomornya tidak punya jurnal pencairan. Piutang di daftar pinjaman tidak masuk Buku Besar. Pinjaman tahun 2017 kemungkinan saldo awal saat pindah data.",
        sql: `SELECT p.tgl_pinjaman AS tanggal, p.no_pinjaman AS bukti, a.nama AS anggota, a.kode_agt AS kode_agt, p.kode_kredit AS keterangan, p.rp_pinjaman_pokok AS nilai
                FROM pinjaman_tunai p JOIN anggota a ON a.id = p.anggota_id
               WHERE p.tgl_pinjaman BETWEEN $1 AND $2
                 AND NOT EXISTS (SELECT 1 FROM jurnal_umum j WHERE j.nomor_bukti = p.no_pinjaman) AND ${BELUM_BATAL("p.no_pinjaman")}`,
    },
    {
        id: "angsuran-tanpa-jurnal", modul: "Pinjaman Tunai", judul: "Angsuran tanpa jurnal",
        arti: "Baris angsuran bernilai yang tidak punya jurnal dengan nomor bukti sama. Sisa pinjaman berkurang, tetapi kas dan piutang di Buku Besar tidak.",
        sql: `SELECT r.tanggal_angsuran AS tanggal, r.no_bukti AS bukti, a.nama AS anggota, a.kode_agt AS kode_agt, 'Pinjaman ' || p.no_pinjaman AS keterangan, ${NILAI_ANGSURAN} AS nilai
                FROM pinjaman_tunai_rincian r JOIN pinjaman_tunai p ON p.id = r.pinjaman_tunai_id JOIN anggota a ON a.id = p.anggota_id
               WHERE r.tanggal_angsuran BETWEEN $1 AND $2 AND ${NILAI_ANGSURAN} <> 0 AND r.no_bukti NOT LIKE 'BTL%'
                 AND NOT EXISTS (SELECT 1 FROM jurnal_umum j WHERE j.nomor_bukti = r.no_bukti) AND ${BELUM_BATAL("r.no_bukti")}`,
    },
    {
        id: "angsuran-beda-jurnal", modul: "Pinjaman Tunai", judul: "Nilai angsuran berbeda dengan jurnal",
        arti: "Pokok + jasa + adm + provisi di buku pinjaman tidak sama dengan total debit jurnalnya.",
        sql: `SELECT r.tanggal_angsuran AS tanggal, r.no_bukti AS bukti, a.nama AS anggota, a.kode_agt AS kode_agt,
                     'Pinjaman ' || p.no_pinjaman || ', jurnal ' || TO_CHAR(j.debit, 'FM999G999G999G990') AS keterangan, ABS(${NILAI_ANGSURAN} - j.debit) AS nilai
                FROM pinjaman_tunai_rincian r JOIN pinjaman_tunai p ON p.id = r.pinjaman_tunai_id JOIN anggota a ON a.id = p.anggota_id
                JOIN LATERAL (SELECT SUM(x.debit_jurnalumum) AS debit FROM jurnal_umum x WHERE x.nomor_bukti = r.no_bukti) j ON j.debit IS NOT NULL
               WHERE r.tanggal_angsuran BETWEEN $1 AND $2 AND ${NILAI_ANGSURAN} <> 0 AND r.no_bukti NOT LIKE 'BTL%' AND ABS(${NILAI_ANGSURAN} - j.debit) >= 1 AND ${BELUM_BATAL("r.no_bukti")}`,
    },
    {
        id: "cicilan-beda-rincian", modul: "Pinjaman Tunai", judul: "Hitungan cicilan berbeda dengan buku",
        arti: "Kolom Bayar (jml_cicilan) tidak sama dengan jumlah baris angsuran di buku pinjaman. Sebagian wajar: pelunasan lewat potongan atau penutupan pinjaman tidak selalu tercatat di rincian.",
        sql: `SELECT p.tgl_pinjaman AS tanggal, p.no_pinjaman AS bukti, a.nama AS anggota, a.kode_agt AS kode_agt,
                     'Bayar ' || p.jml_cicilan || ', baris buku ' || r.n AS keterangan, ABS(p.jml_cicilan - r.n)::numeric AS nilai
                FROM pinjaman_tunai p JOIN anggota a ON a.id = p.anggota_id
                JOIN LATERAL (SELECT COUNT(*)::int AS n FROM pinjaman_tunai_rincian x WHERE x.pinjaman_tunai_id = p.id AND x.angsuran_ke > 0 AND x.debit_pokok + x.debit_bunga > 0) r ON true
               WHERE p.tgl_pinjaman BETWEEN $1 AND $2 AND p.jml_cicilan <> r.n`,
    },
    {
        id: "lunas-bersaldo", modul: "Pinjaman Tunai", judul: "Cicilan selesai tetapi masih bersaldo",
        arti: "Semua cicilan sudah terbayar, tetapi saldo pokok di buku pinjaman lebih dari Rp 100. Umumnya pinjaman bank yang di-top-up atau dilunasi langsung ke bank dan dibereskan dengan jurnal manual.",
        sql: `SELECT t.tgl_pinjaman AS tanggal, t.no_pinjaman AS bukti, t.nama AS anggota, t.kode_agt AS kode_agt, t.kode_kredit AS keterangan, t.sisa AS nilai
                FROM (SELECT p.tgl_pinjaman, p.no_pinjaman, a.nama, a.kode_agt, p.kode_kredit, ${SISA_POKOK} AS sisa
                        FROM pinjaman_tunai p JOIN anggota a ON a.id = p.anggota_id
                       WHERE p.tgl_pinjaman BETWEEN $1 AND $2 AND p.jml_cicilan >= p.lama_angsuran) t
               WHERE t.sisa > 100`,
    },
    {
        id: "pinjaman-bayar-lebih", modul: "Pinjaman Tunai", judul: "Pokok dibayar melebihi pinjaman",
        arti: "Jumlah pokok yang dibayar di buku pinjaman lebih besar dari pokok pinjaman (selisih di atas Rp 100). Nilai = kelebihannya.",
        sql: `SELECT t.tgl_pinjaman AS tanggal, t.no_pinjaman AS bukti, t.nama AS anggota, t.kode_agt AS kode_agt, t.kode_kredit AS keterangan, t.dibayar - t.pokok AS nilai
                FROM (SELECT p.tgl_pinjaman, p.no_pinjaman, a.nama, a.kode_agt, p.kode_kredit, p.rp_pinjaman_pokok - p.rp_uang_muka AS pokok, ${DIBAYAR_POKOK} AS dibayar
                        FROM pinjaman_tunai p JOIN anggota a ON a.id = p.anggota_id WHERE p.tgl_pinjaman BETWEEN $1 AND $2) t
               WHERE t.dibayar - t.pokok > 100`,
    },
    {
        id: "kpr-angsuran-tanpa-jurnal", modul: "KPR", judul: "Angsuran KPR tanpa jurnal",
        arti: "Baris angsuran KPR yang tidak punya jurnal. Pencairan KPR memang tidak berjurnal, jadi hanya angsuran yang diperiksa.",
        sql: `SELECT r.tanggal_angsuran AS tanggal, r.no_bukti AS bukti, a.nama AS anggota, a.kode_agt AS kode_agt, 'KPR ' || k.no_pinjaman AS keterangan, r.debit_pokok AS nilai
                FROM kpr_rincian r JOIN kpr k ON k.id = r.kpr_id JOIN anggota a ON a.id = k.anggota_id
               WHERE r.tanggal_angsuran BETWEEN $1 AND $2 AND r.debit_pokok <> 0 AND r.no_bukti NOT LIKE 'BTL%'
                 AND NOT EXISTS (SELECT 1 FROM jurnal_umum j WHERE j.nomor_bukti = r.no_bukti) AND ${BELUM_BATAL("r.no_bukti")}`,
    },
    {
        id: "kpr-beda-jurnal", modul: "KPR", judul: "Nilai angsuran KPR berbeda dengan jurnal",
        arti: "Angsuran KPR di buku tidak sama dengan total debit jurnalnya.",
        sql: `SELECT r.tanggal_angsuran AS tanggal, r.no_bukti AS bukti, a.nama AS anggota, a.kode_agt AS kode_agt,
                     'KPR ' || k.no_pinjaman || ', jurnal ' || TO_CHAR(j.debit, 'FM999G999G999G990') AS keterangan, ABS(r.debit_pokok - j.debit) AS nilai
                FROM kpr_rincian r JOIN kpr k ON k.id = r.kpr_id JOIN anggota a ON a.id = k.anggota_id
                JOIN LATERAL (SELECT SUM(x.debit_jurnalumum) AS debit FROM jurnal_umum x WHERE x.nomor_bukti = r.no_bukti) j ON j.debit IS NOT NULL
               WHERE r.tanggal_angsuran BETWEEN $1 AND $2 AND r.debit_pokok <> 0 AND r.no_bukti NOT LIKE 'BTL%' AND ABS(r.debit_pokok - j.debit) >= 1 AND ${BELUM_BATAL("r.no_bukti")}`,
    },
    {
        id: "kpr-bayar-lebih", modul: "KPR", judul: "Pokok KPR dibayar melebihi pinjaman",
        arti: "Jumlah pokok yang dibayar di buku KPR lebih besar dari pokok KPR (selisih di atas Rp 100). Nilai = kelebihannya.",
        sql: `SELECT t.tgl_pinjaman AS tanggal, t.no_pinjaman AS bukti, t.nama AS anggota, t.kode_agt AS kode_agt, t.kode_kredit AS keterangan, t.dibayar - t.pokok AS nilai
                FROM (SELECT k.tgl_pinjaman, k.no_pinjaman, a.nama, a.kode_agt, k.kode_kredit, k.rp_pinjaman_pokok AS pokok, ${DIBAYAR_KPR} AS dibayar
                        FROM kpr k JOIN anggota a ON a.id = k.anggota_id WHERE k.tgl_pinjaman BETWEEN $1 AND $2) t
               WHERE t.dibayar - t.pokok > 100`,
    },
]

export const sqlJumlahCek = (c: CekAudit) => `SELECT COUNT(*)::int AS jumlah, COALESCE(SUM(nilai), 0) AS total FROM (${c.sql}) t`
export const sqlBarisCek = (c: CekAudit, limit: number) => `SELECT tanggal::text AS tanggal, bukti, anggota, kode_agt, keterangan, nilai FROM (${c.sql}) t ORDER BY tanggal DESC, bukti LIMIT ${limit}`

/**
 * Saldo buku pembantu per akun Buku Besar, posisi sekarang. Sisa pinjaman memakai aturan Daftar Pinjaman (pinjaman-sql.ts): cicilan selesai = 0,
 * tanpa baris rincian = pokok, selain itu saldo buku yang dibatasi 0 sampai pokok; banyak pinjaman lama tidak punya baris pencairan di rincian.
 */
export const SQL_SALDO_BUKU = `
    SELECT string_agg(DISTINCT b.modul, ' + ') AS modul, p.kode_perkiraan, p.nama_perkiraan, SUM(b.saldo) AS saldo
      FROM (
        SELECT 'Simpanan' AS modul, j.coa_id AS akun, COALESCE(SUM(s.rp_setoran - s.rp_pengambilan), 0) AS saldo
          FROM jenis_simpanan j LEFT JOIN simpanan s ON s.jenis_simpanan_id = j.id GROUP BY j.id
        UNION ALL
        SELECT 'Pinjaman Tunai', j.coa_kredit_id,
               CASE WHEN t.jml_cicilan >= t.lama_angsuran THEN 0
                    WHEN r.n = 0 THEN t.rp_pinjaman_pokok - t.rp_uang_muka
                    ELSE LEAST(t.rp_pinjaman_pokok - t.rp_uang_muka, GREATEST(r.sisa, 0)) END
          FROM pinjaman_tunai t JOIN jenis_kredit j ON j.id = t.jenis_kredit_id
          JOIN LATERAL (SELECT COUNT(*) AS n, COALESCE(SUM(x.kredit_pokok - x.debit_pokok), 0) AS sisa FROM pinjaman_tunai_rincian x WHERE x.pinjaman_tunai_id = t.id) r ON true
        UNION ALL
        SELECT 'KPR', j.coa_kredit_id, GREATEST(r.sisa, 0)
          FROM kpr t JOIN jenis_kredit j ON j.id = t.jenis_kredit_id
          JOIN LATERAL (SELECT COALESCE(SUM(x.kredit_pokok - x.debit_pokok), 0) AS sisa FROM kpr_rincian x WHERE x.kpr_id = t.id) r ON true
      ) b JOIN perkiraan p ON p.id = b.akun
     GROUP BY p.id ORDER BY p.kode_perkiraan`
