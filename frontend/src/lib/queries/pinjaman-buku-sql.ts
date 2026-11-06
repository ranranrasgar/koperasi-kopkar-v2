// SQL Buku Pinjaman (tanpa import server, supaya bisa diuji dari skrip): semua bukti pembayaran angsuran pinjaman tunai dan KPR, seperti Buku Simpanan.
// Baris pencairan tidak ikut; yang tampil hanya baris bernilai bayar, termasuk angsuran yang dibatalkan dan pembaliknya.

export interface FilterBukuPinjaman { grupBoleh: string[]; grup: string; kredit: string; dari: string; sampai: string; cari: string }

const KOLOM = `id_baris, sumber, id, pinjaman_id, urut, no_bukti, tanggal_angsuran, no_pinjaman, kode_agt, nik, nama, grup, nama_kredit, angsuran_ke, pokok, jasa, adm, provisi, total, kas, deskripsi`

export function sqlBukuPinjaman(f: FilterBukuPinjaman) {
    const values: unknown[] = []
    const p = (v: unknown) => { values.push(v); return `$${values.length}` }
    const grup = p(f.grup ? f.grupBoleh.filter((g) => g === f.grup) : f.grupBoleh)
    const syarat: string[] = []
    if (f.kredit) syarat.push(`jk.kode_kredit = ${p(f.kredit)}`)
    if (f.dari) syarat.push(`r.tanggal_angsuran >= ${p(f.dari)}`)
    if (f.sampai) syarat.push(`r.tanggal_angsuran <= ${p(f.sampai)}`)
    let cari = ""
    if (f.cari) {
        const kw = p(`%${f.cari}%`)
        cari = `AND (a.id = ANY (ARRAY(SELECT b.id FROM anggota b WHERE b.kode_agt ILIKE ${kw} OR b.nik ILIKE ${kw} OR b.nama ILIKE ${kw})) OR r.no_bukti ILIKE ${kw} OR {no} ILIKE ${kw})`
    }
    const lain = syarat.map((s) => ` AND ${s}`).join("")
    const base = `
        SELECT ${KOLOM} FROM (
            SELECT 'tunai-' || r.id AS id_baris, 'tunai' AS sumber, r.id, p.id AS pinjaman_id, r.urut, r.no_bukti, r.tanggal_angsuran, p.no_pinjaman, a.kode_agt, a.nik, a.nama,
                   jk.group_pinjaman AS grup, jk.nama_kredit, r.angsuran_ke, r.debit_pokok AS pokok, r.debit_bunga AS jasa, r.rp_adm AS adm, r.rp_provisi AS provisi,
                   r.debit_pokok + r.debit_bunga + r.rp_adm + r.rp_provisi AS total, k.nama_perkiraan AS kas, r.deskripsi
              FROM pinjaman_tunai_rincian r JOIN pinjaman_tunai p ON p.id = r.pinjaman_tunai_id JOIN anggota a ON a.id = p.anggota_id
              JOIN jenis_kredit jk ON jk.id = p.jenis_kredit_id LEFT JOIN perkiraan k ON k.id = r.kas_perkiraan_id
             WHERE jk.group_pinjaman = ANY(${grup}::text[]) AND r.debit_pokok + r.debit_bunga + r.rp_adm + r.rp_provisi <> 0${lain} ${cari.replace("{no}", "p.no_pinjaman")}
            UNION ALL
            SELECT 'kpr-' || r.id, 'kpr', r.id, x.id, r.urut, r.no_bukti, r.tanggal_angsuran, x.no_pinjaman, a.kode_agt, a.nik, a.nama,
                   'KPR', jk.nama_kredit, r.angsuran_ke, r.debit_pokok, r.debit_bunga, 0, 0, r.debit_pokok + r.debit_bunga, k.nama_perkiraan, r.deskripsi
              FROM kpr_rincian r JOIN kpr x ON x.id = r.kpr_id JOIN anggota a ON a.id = x.anggota_id
              LEFT JOIN jenis_kredit jk ON jk.id = x.jenis_kredit_id LEFT JOIN perkiraan k ON k.id = r.kas_perkiraan_id
             WHERE 'KPR' = ANY(${grup}::text[]) AND r.debit_pokok + r.debit_bunga <> 0${lain} ${cari.replace("{no}", "x.no_pinjaman")}
        ) b`
    return { base, values }
}

/** Kolom per baris halaman. Sisa pokok seperti rekening koran: dari seluruh riwayat pinjaman sampai baris ini. */
export const KOLOM_HALAMAN_BUKU = `
    CASE WHEN t.sumber = 'kpr'
         THEN (SELECT SUM(x.kredit_pokok - x.debit_pokok) FROM kpr_rincian x WHERE x.kpr_id = t.pinjaman_id AND (x.tanggal_angsuran, x.urut, x.id) <= (t.tanggal_angsuran, t.urut, t.id))
         ELSE (SELECT SUM(x.kredit_pokok - x.debit_pokok) FROM pinjaman_tunai_rincian x WHERE x.pinjaman_tunai_id = t.pinjaman_id AND (x.tanggal_angsuran, x.urut, x.id) <= (t.tanggal_angsuran, t.urut, t.id))
    END AS sisa_pokok,
    CASE WHEN EXISTS (SELECT 1 FROM jurnal_umum j WHERE j.nomor_bukti = t.no_bukti) THEN 'ada' ELSE 'belum' END AS jurnal,
    (SELECT CASE WHEN k.no_bukti = t.no_bukti THEN 'batal' ELSE 'pembalik' END FROM transaksi_koreksi k
      WHERE k.jenis IN ('angsuran', 'kpr_angsuran') AND k.aksi = 'batal' AND t.no_bukti IN (k.no_bukti, k.no_bukti_pembalik) LIMIT 1) AS status_koreksi`
