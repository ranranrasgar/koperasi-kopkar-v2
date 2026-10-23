// SQL laporan Daftar Pinjaman (tanpa import server, supaya bisa diuji dari skrip). Dipakai laporanPinjaman di pinjaman.ts.
//
// Sumber data tiap kolom:
//  - kontrak (tgl, no, anggota, plafond, provisi, jasa, angsuran/bulan, lama): tabel pinjaman_tunai (+ anggota, jenis_kredit).
//    Jasa = plafond x bunga% x (lama / bunga_per); angsuran per bulan = (plafond + jasa) / lama (rumus desktop).
//  - Bayar Pokok dan Bayar Bunga: jumlah yang BENAR-BENAR diterima, yaitu SUM(debit_pokok) dan SUM(debit_bunga) di buku pinjaman
//    (pinjaman_tunai_rincian). Rumus lama (pokok / lama x jml_cicilan) hanya perkiraan dan meleset untuk pinjaman yang dibayar
//    tidak rata, dilunasi sekaligus, atau diselesaikan dengan potongan (±350 pinjaman, sebagian besar sebelum 2024).
//  - Sisa Pokok: saldo buku = SUM(kredit_pokok - debit_pokok), sama dengan saldo di aplikasi anggota. Kolom saldo_pokok di
//    rincian TIDAK dipakai: pada baris angsuran nilainya 0 (bukan saldo berjalan).
//  - Lunas = sisa buku <= SISA_LUNAS ATAU semua cicilan sudah terbayar (jml_cicilan >= lama), aturan yang sama dengan aplikasi
//    anggota dan API aplikasi lama (pelunasan lewat potongan tidak tercatat di rincian). Pinjaman lunas ditampilkan dengan
//    sisa cicilan 0 dan tunggakan 0.
//  - Jml Cicilan: penghitung di pinjaman_tunai (dikelola aplikasi desktop).
//  - Pinjaman tanpa baris rincian sama sekali (belum diposting ke buku) tetap tampil, dengan bayar 0 dan sisa = plafond.

export interface FilterPinjaman {
    grup: string                 // "All" = semua grup
    keyword: string
    kolomCari: string | null     // nama kolom SQL dari daftar putih
    aktif: boolean               // status anggota
    kredit: string               // kode_kredit atau "All"
    tahun: number
    bulan: number                // 0 = semua bulan
    status: number               // 0 semua, 1 menunggak, 2 lunas, 3 belum lunas
    limit: number
    offset: number
}

export const SISA_LUNAS = 100

const tanggal = (t: number, b: number) => `${String(t).padStart(4, "0")}-${String(b).padStart(2, "0")}-01`

export function sqlLaporanPinjaman(f: FilterPinjaman) {
    const values: unknown[] = []
    const p = (v: unknown) => { values.push(v); return `$${values.length}` }

    // Rentang tanggal (bisa memakai indeks tgl_pinjaman), bukan EXTRACT.
    const dari = f.bulan === 0 ? tanggal(f.tahun, 1) : tanggal(f.tahun, f.bulan)
    const sampai = f.bulan === 0 ? tanggal(f.tahun + 1, 1) : f.bulan === 12 ? tanggal(f.tahun + 1, 1) : tanggal(f.tahun, f.bulan + 1)
    let where = `WHERE p.tgl_pinjaman >= ${p(dari)}::date AND p.tgl_pinjaman < ${p(sampai)}::date AND a.aktif = ${p(f.aktif)}`
    if (f.grup !== "All") where += ` AND jk.group_pinjaman = ${p(f.grup)}`
    if (f.kredit && f.kredit !== "All") where += ` AND jk.kode_kredit = ${p(f.kredit)}`
    if (f.keyword && f.kolomCari) where += ` AND ${f.kolomCari} ILIKE ${p(`%${f.keyword}%`)}`

    const kontrak = `
        SELECT p.id, p.tgl_pinjaman, p.no_pinjaman, p.no_pinjaman_urut, a.kode_agt, a.nik, a.nama,
               p.rp_pinjaman_pokok, p.rp_provisi, p.lama_angsuran, p.jml_cicilan, p.jml_tunggakan, jk.kode_kredit,
               ROUND(p.rp_pinjaman_pokok - p.rp_uang_muka) AS temp_total_plafond,
               (p.rp_pinjaman_pokok - p.rp_uang_muka) * p.persen_bunga / 100 * (p.lama_angsuran::numeric / NULLIF(p.bunga_per, 0)) AS temp_total_jasa
          FROM pinjaman_tunai p
          JOIN anggota a ON a.id = p.anggota_id
          LEFT JOIN jenis_kredit jk ON jk.id = p.jenis_kredit_id
         ${where}`

    // Nilai dari buku pinjaman, hanya dihitung untuk baris yang dibutuhkan (satu halaman, atau semua bila ada filter status).
    const lengkap = (sumber: string) => `
        SELECT y.*, CASE WHEN y.lunas THEN 0 ELSE GREATEST(y.lama_angsuran - y.jml_cicilan, 0) END AS sisa_cicilan,
               CASE WHEN y.lunas THEN 0 ELSE y.tunggakan_tersimpan END AS jml_tunggakan
          FROM (
            SELECT h.id, h.tgl_pinjaman, h.no_pinjaman, h.no_pinjaman_urut, h.kode_agt, h.nik, h.nama, h.rp_pinjaman_pokok, h.rp_provisi,
                   h.temp_total_plafond, h.temp_total_jasa, h.lama_angsuran, h.jml_cicilan, h.kode_kredit, h.jml_tunggakan AS tunggakan_tersimpan,
                   (h.temp_total_plafond + h.temp_total_jasa) / NULLIF(h.lama_angsuran, 0) AS temp_angs_per_bulan,
                   s.sisa_pokok, LEAST(h.temp_total_plafond, s.dibayar_pokok) AS bayar_pokok, s.bayar_bunga,
                   (s.sisa_pokok <= ${SISA_LUNAS} OR h.jml_cicilan >= h.lama_angsuran) AS lunas
              FROM ${sumber} h
              LEFT JOIN LATERAL (
                    SELECT CASE WHEN count(*) = 0 THEN h.temp_total_plafond
                                ELSE LEAST(h.temp_total_plafond, GREATEST(COALESCE(SUM(r.kredit_pokok - r.debit_pokok), 0), 0)) END AS sisa_pokok,
                           COALESCE(SUM(r.debit_pokok), 0) AS dibayar_pokok,
                           COALESCE(SUM(r.debit_bunga), 0) AS bayar_bunga
                      FROM pinjaman_tunai_rincian r WHERE r.pinjaman_tunai_id = h.id) s ON true) y`

    const urut = "tgl_pinjaman DESC, no_pinjaman_urut DESC"
    const kondisiStatus = f.status === 1 ? "WHERE jml_tunggakan > 0"
        : f.status === 2 ? "WHERE lunas"
        : f.status === 3 ? "WHERE NOT lunas" : ""

    const jumlahWhere = values.length
    // Placeholder LIMIT/OFFSET ditambahkan setelah WHERE, jadi query hitung memakai parameter WHERE saja.
    const hasil = (sqlCount: string, sqlItems: string) => ({ sqlCount, sqlItems, valuesCount: values.slice(0, jumlahWhere), valuesItems: [...values] })
    if (!kondisiStatus) {
        // Halaman dipilih dulu (urut + LIMIT), baru buku pinjamannya dihitung untuk baris itu saja.
        const items = `WITH f AS (${kontrak}), h AS (SELECT * FROM f ORDER BY ${urut} LIMIT ${p(f.limit)} OFFSET ${p(f.offset)})
                       SELECT * FROM (${lengkap("h")}) x ORDER BY ${urut}`
        return hasil(`WITH f AS (${kontrak}) SELECT COUNT(*)::int AS total FROM f`, items)
    }
    const items = `WITH f AS (${kontrak}) SELECT * FROM (${lengkap("f")}) x ${kondisiStatus} ORDER BY ${urut} LIMIT ${p(f.limit)} OFFSET ${p(f.offset)}`
    return hasil(`WITH f AS (${kontrak}) SELECT COUNT(*)::int AS total FROM (${lengkap("f")}) x ${kondisiStatus}`, items)
}
