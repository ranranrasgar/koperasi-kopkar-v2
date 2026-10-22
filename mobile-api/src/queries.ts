import type { Pool } from './db.js';

// Query baca untuk API mobile. Bentuk keluaran mengikuti DbOperation.php (server PHP lama):
// nama kunci dan tipe tidak boleh berubah karena aplikasi Android v5.6 membacanya apa adanya.

export async function getSimpanan(db: Pool, kdAnggota: string) {
    const r = await db.query(
        `SELECT a.nama nama_agt, a.kode_agt, js.kode_simpanan jenis_simpanan, js.nama_simpanan,
                SUM(s.rp_setoran - s.rp_pengambilan) total
           FROM simpanan s JOIN jenis_simpanan js ON js.id = s.jenis_simpanan_id JOIN anggota a ON a.id = s.anggota_id
          WHERE a.kode_agt = $1
          GROUP BY a.nama, a.kode_agt, js.kode_simpanan, js.nama_simpanan ORDER BY js.kode_simpanan`, [kdAnggota]);
    return r.rows;
}

export async function getSimpananRinciPaginated(db: Pool, kdAnggota: string, jenis: string, offset: number, limit: number) {
    const r = await db.query(
        `SELECT s.tgl_transaksi, s.no_bukti, s.rp_setoran debit, s.rp_pengambilan kredit
           FROM simpanan s JOIN anggota a ON a.id = s.anggota_id JOIN jenis_simpanan js ON js.id = s.jenis_simpanan_id
          WHERE a.kode_agt = $1 AND js.kode_simpanan = $2
          ORDER BY s.tgl_transaksi DESC, s.no_bukti DESC OFFSET $3 LIMIT $4`, [kdAnggota, jenis, offset, limit]);
    return r.rows;
}

export async function getSaldoJenisPinjaman(db: Pool, kdAnggota: string) {
    const r = await db.query(
        `SELECT pt.tgl_pinjaman, pt.no_pinjaman, pt.kode_kredit,
                SUM(ptr.kredit_pokok + ptr.kredit_bunga) - SUM(ptr.debit_pokok + ptr.debit_bunga) saldo
           FROM pinjaman_tunai pt JOIN pinjaman_tunai_rincian ptr ON ptr.pinjaman_tunai_id = pt.id
           JOIN anggota a ON a.id = pt.anggota_id
          WHERE a.kode_agt = $1
          GROUP BY pt.id HAVING SUM(ptr.kredit_pokok + ptr.kredit_bunga) - SUM(ptr.debit_pokok + ptr.debit_bunga) > 0
          ORDER BY pt.kode_kredit`, [kdAnggota]);
    return r.rows;
}

export async function getPinjaman(db: Pool, kdAnggota: string) {
    const r = await db.query(
        `SELECT * FROM (
          SELECT p.tgl_pinjaman, p.no_pinjaman, a.bank_no_rek, a.kode_agt, a.nik, a.nama, a.bank_nama, p.no_rek,
                 p.rp_pinjaman_pokok, p.persen_adm, p.rp_adm rp_adm_ori, p.rp_uang_muka, p.rp_provisi,
                 ROUND(p.rp_pinjaman_pokok - p.rp_uang_muka) temp_total_plafond,
                 ((p.rp_pinjaman_pokok - p.rp_uang_muka) * p.persen_bunga / 100) * (p.lama_angsuran::numeric / NULLIF(p.bunga_per, 0)) temp_total_jasa,
                 (p.rp_pinjaman_pokok - p.rp_uang_muka) / NULLIF(p.lama_angsuran, 0) temp_angs_pokok,
                 ((p.rp_pinjaman_pokok - p.rp_uang_muka) * p.persen_bunga / 100) * (p.lama_angsuran::numeric / NULLIF(p.bunga_per, 0)) / NULLIF(p.lama_angsuran, 0) temp_angs_bunga,
                 ROUND((p.rp_pinjaman_pokok - p.rp_uang_muka) * p.persen_adm / 100) rp_adm,
                 (p.rp_pinjaman_pokok - p.rp_uang_muka) / NULLIF(p.lama_angsuran, 0)
                   + ((p.rp_pinjaman_pokok - p.rp_uang_muka) * p.persen_bunga / 100) * (p.lama_angsuran::numeric / NULLIF(p.bunga_per, 0)) / NULLIF(p.lama_angsuran, 0) temp_angs_per_bulan,
                 p.lama_angsuran, p.jml_cicilan, (p.lama_angsuran - p.jml_cicilan) sisa_cicilan, p.jml_tunggakan, p.jatuh_tempo_tgl, p.opr,
                 jk.kode_kredit,
                 ROUND(p.rp_pinjaman_pokok / NULLIF(p.lama_angsuran, 0) * p.jml_cicilan) bayar_pokok,
                 ROUND((p.rp_pinjaman_pokok * p.persen_bunga / 100) / NULLIF(p.bunga_per, 0) * p.jml_cicilan) bayar_bunga,
                 jk.nama_kredit, jk.bunga_kredit
            FROM pinjaman_tunai p JOIN anggota a ON a.id = p.anggota_id LEFT JOIN jenis_kredit jk ON jk.id = p.jenis_kredit_id
           WHERE a.kode_agt = $1 AND EXISTS (SELECT 1 FROM pinjaman_tunai_rincian ptr WHERE ptr.pinjaman_tunai_id = p.id)
        ) x
        WHERE (temp_total_plafond - bayar_pokok) > 0
        ORDER BY no_pinjaman`, [kdAnggota]);
    // kunci tambahan "legacy" yang dibaca aplikasi, sama seperti DbOperation::getPinjaman
    return r.rows.map(({ nama_kredit, bunga_kredit, ...p }) => ({
        ...p,
        nama_agt: p.nama,
        nama_kredit,
        pinjaman_pokok: p.rp_pinjaman_pokok,
        saldo: p.temp_total_plafond - p.bayar_pokok,
        bunga: p.bayar_bunga,
        lamaAngsuran: p.lama_angsuran,
        persen_bunga: bunga_kredit,
    }));
}

/** Rincian angsuran: pinjaman tunai dan KPR digabung, terbaru dulu. */
export async function getPinjamanRinciPaginated(db: Pool, noPinjaman: string, offset: number, limit: number) {
    const r = await db.query(
        `SELECT angsuran_ke, tanggal_angsuran tgl_angsuran, no_bukti, debit, kredit FROM (
            SELECT angsuran_ke, tanggal_angsuran, no_bukti, kredit_pokok + kredit_bunga debit, debit_pokok + debit_bunga kredit
              FROM pinjaman_tunai_rincian WHERE no_pinjaman = $1 AND angsuran_ke <> 0
            UNION ALL
            SELECT angsuran_ke, tanggal_angsuran, no_bukti, kredit_pokok + kredit_bunga, debit_pokok + debit_bunga
              FROM kpr_rincian WHERE no_pinjaman = $1 AND angsuran_ke <> 0
         ) c ORDER BY tanggal_angsuran DESC, no_bukti DESC OFFSET $2 LIMIT $3`, [noPinjaman, offset, limit]);
    return r.rows;
}

export async function getJadwalAngsuran(db: Pool, noPinjaman: string) {
    const r = await db.query(
        `SELECT angsuran_ke, tanggal_angsuran tgl_tagihan, debit_pokok pokok, debit_bunga jasa, debit_pokok + debit_bunga total,
                tgl_bayar, no_bukti,
                CASE WHEN no_bukti IS NOT NULL AND no_bukti <> '' THEN 'Sudah Dibayar' ELSE 'Belum Dibayar' END status
           FROM pinjaman_tunai_rincian_tagih WHERE no_pinjaman = $1 AND angsuran_ke <> 0 ORDER BY angsuran_ke`, [noPinjaman]);
    return r.rows;
}

export async function getJenisKreditV1(db: Pool, statusStaff: string) {
    const staff = statusStaff === 'Staff' ? 1 : 0;
    const r = await db.query(
        `SELECT kode_kredit kd_kredit, nama_kredit nm_kredit, bunga_kredit, kunci_hanya_untuk_staff kunci_staff,
                kunci_jika_melebihi_grade kunci_grade, kunci_jika_sisa kunci_saldo, mak_cicilan max_cicilan,
                persen_adm, persen_provisi, persen_denda, $1::int staff
           FROM jenis_kredit WHERE kunci_hanya_untuk_staff = $1 AND hide = false ORDER BY nama_kredit`, [staff]);
    return r.rows;
}

export async function getPertanyaan(db: Pool) {
    return (await db.query('SELECT urut id_pertanyaan, pertanyaan FROM pertanyaan ORDER BY urut')).rows;
}

export async function isUserExist(db: Pool, username: string) {
    const r = await db.query(
        `SELECT p.pertanyaan FROM app_user u JOIN pertanyaan p ON p.urut = u.id_pertanyaan WHERE u.username = $1`, [username]);
    return r.rows[0] ? { pertanyaan: r.rows[0].pertanyaan as string } : null;
}

export async function isTerdebet(db: Pool, kdAnggota: string) {
    return (await db.query('SELECT 1 FROM temp_potongan_all WHERE kode_agt = $1 LIMIT 1', [kdAnggota])).rowCount! > 0;
}

export async function getPotonganBulanan(db: Pool, kdAnggota: string) {
    const r = await db.query(
        `SELECT no_rek, nama_bank, atas_nama_rek atas_nama, s_pokok, s_wajib, s_sukarela, rp_koperasi rp_koprasi, rp_bank, rp_kpr,
                rp_adm_bank rp_admin_bank, s_pokok + s_wajib + s_sukarela + rp_koperasi + rp_bank + rp_kpr + rp_adm_bank total_potongan
           FROM temp_potongan_all WHERE kode_agt = $1`, [kdAnggota]);
    return r.rows;
}

export async function getTahunShu(db: Pool) {
    const r = await db.query(`SELECT DISTINCT EXTRACT(YEAR FROM tgl_tutup_buku)::int y FROM temp_shu_backup WHERE tgl_tutup_buku IS NOT NULL ORDER BY y DESC`);
    return r.rows.map((x) => String(x.y));
}

export async function getShu(db: Pool, kdAnggota: string, tahun: string) {
    const kosong = { rp_sukarela: 0, rp_uang: 0, rp_barang: 0, rp_lama: 0, temp_sukarela: 0, temp_uang: 0, temp_barang: 0, temp_lama: 0, total_shu: 0, no_reff: '' };
    const pos = (await db.query('SELECT prosentase FROM jenis_pos_shu WHERE urut = 2')).rows[0];
    const laba = (await db.query(`SELECT DISTINCT rp_labaditahan v FROM temp_shu_backup WHERE EXTRACT(YEAR FROM tgl_tutup_buku) = $1 LIMIT 1`, [tahun])).rows[0];
    const labaditahan = Number(laba?.v ?? 0), labaagt = (labaditahan * Number(pos?.prosentase ?? 0)) / 100;
    if (!(labaditahan > 0)) return kosong;
    const tot = (await db.query(
        `SELECT COALESCE(SUM(rp_sukarela),0) s, COALESCE(SUM(rp_jasa_uang),0) u, COALESCE(SUM(rp_jasa_barang),0) b, COALESCE(SUM(lama_agt),0) l
           FROM temp_shu_backup WHERE EXTRACT(YEAR FROM tgl_tutup_buku) = $1`, [tahun])).rows[0];
    const me = (await db.query(
        `SELECT rp_sukarela, rp_jasa_uang, rp_jasa_barang, lama_agt, no_reff FROM temp_shu_backup WHERE kode_agt = $1 AND EXTRACT(YEAR FROM tgl_tutup_buku) = $2 LIMIT 1`,
        [kdAnggota, tahun])).rows[0];
    const share = (mine: number, total: number) => (total > 0 ? (mine / total) * (labaagt / 4) : 0);
    const rp = { s: Number(me?.rp_sukarela ?? 0), u: Number(me?.rp_jasa_uang ?? 0), b: Number(me?.rp_jasa_barang ?? 0), l: Number(me?.lama_agt ?? 0) };
    const t = { s: share(rp.s, tot.s), u: share(rp.u, tot.u), b: share(rp.b, tot.b), l: share(rp.l, tot.l) };
    return { rp_sukarela: rp.s, rp_uang: rp.u, rp_barang: rp.b, rp_lama: rp.l, temp_sukarela: t.s, temp_uang: t.u, temp_barang: t.b, temp_lama: t.l,
        total_shu: t.s + t.u + t.b + t.l, no_reff: me?.no_reff ?? '' };
}

export async function getLogNotifikasi(db: Pool, kdAnggota: string, offset: number, limit: number) {
    const r = await db.query(
        `SELECT title, pesan, to_char(datetimes, 'YYYY-MM-DD HH24:MI:SS') datetimes FROM log_notifikasi
          WHERE kode_agt = $1 ORDER BY log_notifikasi.datetimes DESC OFFSET $2 LIMIT $3`, [kdAnggota, offset, limit]);
    return r.rows;
}

export async function getHistory(db: Pool, kdAnggota: string, offset: number, limit: number) {
    const r = await db.query(
        `SELECT tgl, ref, title, sub, amount, category FROM (
            SELECT s.tgl_transaksi tgl, s.no_bukti ref, js.nama_simpanan title,
                   CASE WHEN s.rp_setoran > 0 THEN 'Setoran ' || js.nama_simpanan ELSE 'Penarikan ' || js.nama_simpanan END sub,
                   CASE WHEN s.rp_setoran > 0 THEN s.rp_setoran ELSE -s.rp_pengambilan END amount, 'SIMPANAN' category
              FROM simpanan s JOIN jenis_simpanan js ON js.id = s.jenis_simpanan_id JOIN anggota a ON a.id = s.anggota_id WHERE a.kode_agt = $1
            UNION ALL
            SELECT r.tanggal_angsuran, r.no_bukti, jk.nama_kredit, 'Pembayaran Angsuran', -(r.debit_pokok + r.debit_bunga), 'PINJAMAN'
              FROM pinjaman_tunai_rincian r JOIN pinjaman_tunai pt ON pt.id = r.pinjaman_tunai_id JOIN jenis_kredit jk ON jk.id = pt.jenis_kredit_id
              JOIN anggota a ON a.id = pt.anggota_id WHERE a.kode_agt = $1 AND (r.debit_pokok + r.debit_bunga) > 0
            UNION ALL
            SELECT r.tanggal_angsuran, r.no_bukti, jk.nama_kredit, 'Pembayaran Angsuran KPR', -(r.debit_pokok + r.debit_bunga), 'KPR'
              FROM kpr_rincian r JOIN kpr k ON k.id = r.kpr_id JOIN jenis_kredit jk ON jk.id = k.jenis_kredit_id
              JOIN anggota a ON a.id = k.anggota_id WHERE a.kode_agt = $1 AND (r.debit_pokok + r.debit_bunga) > 0
            UNION ALL
            SELECT pp.tgl_realisasi, 'REG-PP', jk.nama_kredit, 'Pengajuan Pinjaman Baru', pp.rp_pinjaman_pokok, 'PENGAJUAN'
              FROM pengajuan_pinjaman pp JOIN jenis_kredit jk ON jk.id = pp.jenis_kredit_id WHERE pp.kd_anggota = $1
            UNION ALL
            SELECT t.tgl_tutup_buku, t.no_reff, 'Sisa Hasil Usaha', 'Tahun Buku ' || EXTRACT(YEAR FROM t.tgl_tutup_buku)::int,
                   t.rp_sukarela + t.rp_jasa_uang + t.rp_jasa_barang, 'SHU'
              FROM temp_shu_backup t WHERE t.kode_agt = $1
         ) h ORDER BY tgl DESC, ref DESC OFFSET $2 LIMIT $3`, [kdAnggota, offset, limit]);
    return r.rows;
}

export async function getHimbauan(db: Pool) {
    const r = await db.query('SELECT id, judul_himbauan, isi_himbauan, image FROM himbauan WHERE status = true ORDER BY id DESC LIMIT 1');
    return r.rows[0] ?? null;
}

export async function getPromos(db: Pool) {
    return (await db.query('SELECT id, judul, isi, image FROM promo WHERE status = true ORDER BY id DESC')).rows;
}

/** Daftar anggota (data diri + detail; yang punya detail lebih dulu, sebagian anggota belum punya detail sehingga kolom detailnya null seperti di server lama). Tanpa token server lama mengembalikan semua anggota; kdAnggota membatasi ke satu orang. */
export async function getAnggota(db: Pool, kdAnggota?: string) {
    const r = await db.query(
        `SELECT a.kode_agt, a.tglpencatatan, a.nik, a.nama, a.jns_kelamin, a.alamat, a.kota, a.kodepos kode_pos, a.telp_rmh tlp_rumah, a.hp,
                ad.no_ktp_sim no_ktp, ad.no_sim, a.status, ad.nama_istri_suami, ad.jml_tanggungan, ad.jml_anak, a.status_staff, CASE WHEN a.agt_non_agt THEN 'Y' ELSE 'N' END agt_non_agt,
                a.rp_grade, a.grade, a.simpanan_pokok, a.simpanan_wajib, a.simpanan_sukarela, ad.pekerjaan, ad.alamat_kerja, ad.nama_perusahaan,
                ad.jabatan, ad.lama_bekerja_tahun, ad.lama_bekerja_bulan, ad.telp_ktr tlp_kantor, ad.npwp, ad.fasilitas_listrik, ad.fasilitas_pdam,
                ad.fasilitas_lain_lain, ad.lama_menempati_tahun, ad.lama_menempati_bulan, a.bank_no_rek, a.bank_nama, a.bank_atas_nama
           FROM anggota a LEFT JOIN anggota_detail ad ON ad.anggota_id = a.id
          WHERE ($1::text IS NULL OR a.kode_agt = $1) ORDER BY (ad.id IS NULL), a.id`, [kdAnggota ?? null]);
    return r.rows;
}
