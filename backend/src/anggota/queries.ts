import type pg from 'pg';

type Pool = pg.Pool;

// Query baca data anggota, dipakai bersama oleh mobile-api (kontrak Android lama) dan PWA anggota.
// Bentuk keluaran mengikuti DbOperation.php (server PHP lama): nama kunci tidak boleh berubah karena aplikasi
// Android v5.6 membacanya apa adanya. Tipe angka mengikuti parser pg pemanggil (mobile-api: number, backend: teks).
//
// Relasi selalu lewat id (anggota_id, pinjaman_tunai_id, kpr_id) yang berindeks, bukan kode lama (kode_agt,
// no_pinjaman). Kode lama hanya dipakai di batas API Android untuk mencari id-nya (idAnggota, idPinjaman).
// Baris lama tanpa FK (log_notifikasi berkode tanggal, tagihan tanpa pinjaman) memang bukan milik anggota mana pun.

/** id anggota dari kode_agt (parameter kdAnggota API Android), atau null. */
export async function idAnggota(db: Pool, kodeAgt: string): Promise<number | null> {
    const r = await db.query<{ id: string }>('SELECT id FROM anggota WHERE kode_agt = $1', [kodeAgt]);
    return r.rows[0] ? Number(r.rows[0].id) : null;
}

/** id pinjaman tunai dan/atau KPR dari no_pinjaman (parameter noPinjaman API Android). */
export async function idPinjaman(db: Pool, noPinjaman: string) {
    const r = await db.query<{ tunai: string | null; kpr: string | null }>(
        `SELECT (SELECT id FROM pinjaman_tunai WHERE no_pinjaman = $1) tunai, (SELECT id FROM kpr WHERE no_pinjaman = $1) kpr`, [noPinjaman]);
    const { tunai, kpr } = r.rows[0];
    return { tunaiId: tunai === null ? null : Number(tunai), kprId: kpr === null ? null : Number(kpr) };
}

export async function getSimpanan(db: Pool, anggotaId: number | null) {
    const r = await db.query(
        `SELECT a.nama nama_agt, a.kode_agt, js.kode_simpanan jenis_simpanan, js.nama_simpanan, s.total
           FROM (SELECT jenis_simpanan_id, SUM(rp_setoran - rp_pengambilan) total FROM simpanan
                  WHERE anggota_id = $1 GROUP BY jenis_simpanan_id) s
           JOIN jenis_simpanan js ON js.id = s.jenis_simpanan_id JOIN anggota a ON a.id = $1
          ORDER BY js.kode_simpanan`, [anggotaId]);
    return r.rows;
}

export async function getSimpananRinciPaginated(db: Pool, anggotaId: number | null, kodeSimpanan: string, offset: number, limit: number) {
    const r = await db.query(
        `SELECT s.tgl_transaksi, s.no_bukti, s.rp_setoran debit, s.rp_pengambilan kredit
           FROM simpanan s
          WHERE s.anggota_id = $1 AND s.jenis_simpanan_id = (SELECT id FROM jenis_simpanan WHERE kode_simpanan = $2)
          ORDER BY s.tgl_transaksi DESC, s.no_bukti DESC OFFSET $3 LIMIT $4`, [anggotaId, kodeSimpanan, offset, limit]);
    return r.rows;
}

export async function getSaldoJenisPinjaman(db: Pool, anggotaId: number | null) {
    const r = await db.query(
        `SELECT pt.tgl_pinjaman, pt.no_pinjaman, pt.kode_kredit,
                SUM(ptr.kredit_pokok + ptr.kredit_bunga) - SUM(ptr.debit_pokok + ptr.debit_bunga) saldo
           FROM pinjaman_tunai pt JOIN pinjaman_tunai_rincian ptr ON ptr.pinjaman_tunai_id = pt.id
          WHERE pt.anggota_id = $1
          GROUP BY pt.id HAVING SUM(ptr.kredit_pokok + ptr.kredit_bunga) - SUM(ptr.debit_pokok + ptr.debit_bunga) > 0
          ORDER BY pt.kode_kredit, pt.tgl_pinjaman, pt.no_pinjaman`, [anggotaId]);
    return r.rows;
}

export async function getPinjaman(db: Pool, anggotaId: number | null) {
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
           WHERE p.anggota_id = $1 AND EXISTS (SELECT 1 FROM pinjaman_tunai_rincian ptr WHERE ptr.pinjaman_tunai_id = p.id)
        ) x
        WHERE (temp_total_plafond - bayar_pokok) > 0
        ORDER BY no_pinjaman`, [anggotaId]);
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
export async function getPinjamanRinciPaginated(db: Pool, pinjaman: { tunaiId: number | null; kprId: number | null }, offset: number, limit: number) {
    const r = await db.query(
        `SELECT angsuran_ke, tanggal_angsuran tgl_angsuran, no_bukti, debit, kredit FROM (
            SELECT angsuran_ke, tanggal_angsuran, no_bukti, kredit_pokok + kredit_bunga debit, debit_pokok + debit_bunga kredit
              FROM pinjaman_tunai_rincian WHERE pinjaman_tunai_id = $1 AND angsuran_ke <> 0
            UNION ALL
            SELECT angsuran_ke, tanggal_angsuran, no_bukti, kredit_pokok + kredit_bunga, debit_pokok + debit_bunga
              FROM kpr_rincian WHERE kpr_id = $2 AND angsuran_ke <> 0
         ) c ORDER BY tanggal_angsuran DESC, no_bukti DESC OFFSET $3 LIMIT $4`, [pinjaman.tunaiId, pinjaman.kprId, offset, limit]);
    return r.rows;
}

export async function getJadwalAngsuran(db: Pool, pinjamanTunaiId: number | null) {
    const r = await db.query(
        `SELECT angsuran_ke, tanggal_angsuran tgl_tagihan, debit_pokok pokok, debit_bunga jasa, debit_pokok + debit_bunga total,
                tgl_bayar, no_bukti,
                CASE WHEN no_bukti IS NOT NULL AND no_bukti <> '' THEN 'Sudah Dibayar' ELSE 'Belum Dibayar' END status
           FROM pinjaman_tunai_rincian_tagih WHERE pinjaman_tunai_id = $1 AND angsuran_ke <> 0 ORDER BY angsuran_ke`, [pinjamanTunaiId]);
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
        `SELECT p.pertanyaan FROM app_user u JOIN pertanyaan p ON p.id = u.pertanyaan_id WHERE u.username = $1`, [username]);
    return r.rows[0] ? { pertanyaan: r.rows[0].pertanyaan as string } : null;
}

export async function isTerdebet(db: Pool, anggotaId: number | null) {
    return (await db.query('SELECT 1 FROM temp_potongan_all WHERE anggota_id = $1 LIMIT 1', [anggotaId])).rowCount! > 0;
}

export async function getPotonganBulanan(db: Pool, anggotaId: number | null) {
    const r = await db.query(
        `SELECT no_rek, nama_bank, atas_nama_rek atas_nama, s_pokok, s_wajib, s_sukarela, rp_koperasi rp_koprasi, rp_bank, rp_kpr,
                rp_adm_bank rp_admin_bank, s_pokok + s_wajib + s_sukarela + rp_koperasi + rp_bank + rp_kpr + rp_adm_bank total_potongan
           FROM temp_potongan_all WHERE anggota_id = $1`, [anggotaId]);
    return r.rows;
}

export async function getTahunShu(db: Pool) {
    const r = await db.query(`SELECT DISTINCT EXTRACT(YEAR FROM tgl_tutup_buku)::int y FROM temp_shu_backup WHERE tgl_tutup_buku IS NOT NULL ORDER BY y DESC`);
    return r.rows.map((x) => String(x.y));
}

// Rentang tanggal satu tahun buku: memakai indeks (anggota_id, tgl_tutup_buku), tidak seperti EXTRACT(YEAR ...).
const TAHUN = (p: string) => `tgl_tutup_buku >= make_date(${p}::int, 1, 1) AND tgl_tutup_buku < make_date(${p}::int + 1, 1, 1)`;

export async function getShu(db: Pool, anggotaId: number | null, tahun: string) {
    const kosong = { rp_sukarela: 0, rp_uang: 0, rp_barang: 0, rp_lama: 0, temp_sukarela: 0, temp_uang: 0, temp_barang: 0, temp_lama: 0, total_shu: 0, no_reff: '' };
    if (!/^\d{4}$/.test(tahun)) return kosong;
    const r = await db.query(
        `SELECT (SELECT prosentase FROM jenis_pos_shu WHERE urut = 2) prosentase,
                (SELECT rp_labaditahan FROM temp_shu_backup WHERE ${TAHUN('$1')} LIMIT 1) labaditahan,
                t.s, t.u, t.b, t.l, me.rp_sukarela, me.rp_jasa_uang, me.rp_jasa_barang, me.lama_agt, me.no_reff
           FROM (SELECT COALESCE(SUM(rp_sukarela),0) s, COALESCE(SUM(rp_jasa_uang),0) u, COALESCE(SUM(rp_jasa_barang),0) b, COALESCE(SUM(lama_agt),0) l
                   FROM temp_shu_backup WHERE ${TAHUN('$1')}) t
           LEFT JOIN LATERAL (SELECT rp_sukarela, rp_jasa_uang, rp_jasa_barang, lama_agt, no_reff FROM temp_shu_backup
                               WHERE anggota_id = $2 AND ${TAHUN('$1')} LIMIT 1) me ON true`, [tahun, anggotaId]);
    const x = r.rows[0];
    const labaditahan = Number(x.labaditahan ?? 0), labaagt = (labaditahan * Number(x.prosentase ?? 0)) / 100;
    if (!(labaditahan > 0)) return kosong;
    const share = (mine: number, total: number) => (total > 0 ? (mine / total) * (labaagt / 4) : 0);
    const rp = { s: Number(x.rp_sukarela ?? 0), u: Number(x.rp_jasa_uang ?? 0), b: Number(x.rp_jasa_barang ?? 0), l: Number(x.lama_agt ?? 0) };
    const t = { s: share(rp.s, Number(x.s)), u: share(rp.u, Number(x.u)), b: share(rp.b, Number(x.b)), l: share(rp.l, Number(x.l)) };
    return { rp_sukarela: rp.s, rp_uang: rp.u, rp_barang: rp.b, rp_lama: rp.l, temp_sukarela: t.s, temp_uang: t.u, temp_barang: t.b, temp_lama: t.l,
        total_shu: t.s + t.u + t.b + t.l, no_reff: x.no_reff ?? '' };
}

export async function getLogNotifikasi(db: Pool, anggotaId: number | null, offset: number, limit: number) {
    const r = await db.query(
        `SELECT title, pesan, to_char(datetimes, 'YYYY-MM-DD HH24:MI:SS') datetimes FROM log_notifikasi
          WHERE anggota_id = $1 ORDER BY log_notifikasi.datetimes DESC OFFSET $2 LIMIT $3`, [anggotaId, offset, limit]);
    return r.rows;
}

export async function getHistory(db: Pool, anggotaId: number | null, offset: number, limit: number) {
    const r = await db.query(
        `SELECT tgl, ref, title, sub, amount, category FROM (
            SELECT s.tgl_transaksi tgl, s.no_bukti ref, js.nama_simpanan title,
                   CASE WHEN s.rp_setoran > 0 THEN 'Setoran ' || js.nama_simpanan ELSE 'Penarikan ' || js.nama_simpanan END sub,
                   CASE WHEN s.rp_setoran > 0 THEN s.rp_setoran ELSE -s.rp_pengambilan END amount, 'SIMPANAN' category
              FROM simpanan s JOIN jenis_simpanan js ON js.id = s.jenis_simpanan_id WHERE s.anggota_id = $1
            UNION ALL
            SELECT r.tanggal_angsuran, r.no_bukti, jk.nama_kredit, 'Pembayaran Angsuran', -(r.debit_pokok + r.debit_bunga), 'PINJAMAN'
              FROM pinjaman_tunai pt JOIN pinjaman_tunai_rincian r ON r.pinjaman_tunai_id = pt.id JOIN jenis_kredit jk ON jk.id = pt.jenis_kredit_id
             WHERE pt.anggota_id = $1 AND (r.debit_pokok + r.debit_bunga) > 0
            UNION ALL
            SELECT r.tanggal_angsuran, r.no_bukti, jk.nama_kredit, 'Pembayaran Angsuran KPR', -(r.debit_pokok + r.debit_bunga), 'KPR'
              FROM kpr k JOIN kpr_rincian r ON r.kpr_id = k.id JOIN jenis_kredit jk ON jk.id = k.jenis_kredit_id
             WHERE k.anggota_id = $1 AND (r.debit_pokok + r.debit_bunga) > 0
            UNION ALL
            SELECT pp.tgl_realisasi, 'REG-PP', jk.nama_kredit, 'Pengajuan Pinjaman Baru', pp.rp_pinjaman_pokok, 'PENGAJUAN'
              FROM pengajuan_pinjaman pp JOIN jenis_kredit jk ON jk.id = pp.jenis_kredit_id WHERE pp.anggota_id = $1
            UNION ALL
            SELECT t.tgl_tutup_buku, t.no_reff, 'Sisa Hasil Usaha', 'Tahun Buku ' || EXTRACT(YEAR FROM t.tgl_tutup_buku)::int,
                   t.rp_sukarela + t.rp_jasa_uang + t.rp_jasa_barang, 'SHU'
              FROM temp_shu_backup t WHERE t.anggota_id = $1
         ) h ORDER BY tgl DESC, ref DESC OFFSET $2 LIMIT $3`, [anggotaId, offset, limit]);
    return r.rows;
}

export async function getHimbauan(db: Pool) {
    const r = await db.query('SELECT id, judul_himbauan, isi_himbauan, image FROM himbauan WHERE status = true ORDER BY id DESC LIMIT 1');
    return r.rows[0] ?? null;
}

export async function getPromos(db: Pool) {
    return (await db.query('SELECT id, judul, isi, image FROM promo WHERE status = true ORDER BY id DESC')).rows;
}

/** Daftar anggota (data diri + detail; yang punya detail lebih dulu, sebagian anggota belum punya detail sehingga kolom detailnya null seperti di server lama). Tanpa token server lama mengembalikan semua anggota; anggotaId membatasi ke satu orang. */
export async function getAnggota(db: Pool, anggotaId?: number | null) {
    const r = await db.query(
        `SELECT a.kode_agt, a.tglpencatatan, a.nik, a.nama, a.jns_kelamin, a.alamat, a.kota, a.kodepos kode_pos, a.telp_rmh tlp_rumah, a.hp,
                ad.no_ktp_sim no_ktp, ad.no_sim, a.status, ad.nama_istri_suami, ad.jml_tanggungan, ad.jml_anak, a.status_staff, CASE WHEN a.agt_non_agt THEN 'Y' ELSE 'N' END agt_non_agt,
                a.rp_grade, a.grade, a.simpanan_pokok, a.simpanan_wajib, a.simpanan_sukarela, ad.pekerjaan, ad.alamat_kerja, ad.nama_perusahaan,
                ad.jabatan, ad.lama_bekerja_tahun, ad.lama_bekerja_bulan, ad.telp_ktr tlp_kantor, ad.npwp, ad.fasilitas_listrik, ad.fasilitas_pdam,
                ad.fasilitas_lain_lain, ad.lama_menempati_tahun, ad.lama_menempati_bulan, a.bank_no_rek, a.bank_nama, a.bank_atas_nama
           FROM anggota a LEFT JOIN anggota_detail ad ON ad.anggota_id = a.id
          WHERE ($1::bigint IS NULL OR a.id = $1) ORDER BY (ad.id IS NULL), a.id`, [anggotaId ?? null]);
    return r.rows;
}
