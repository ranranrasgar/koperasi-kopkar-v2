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
//    sisa pokok 0, sisa cicilan 0, dan tunggakan 0. `sisa_buku` menyimpan saldo buku apa adanya: ±180 pinjaman yang cicilannya selesai
//    masih bersaldo buku (182 pinjaman, total Rp 1.502.623.670), umumnya pinjaman bank (BRI) yang di-top-up atau dilunasi sendiri oleh
//    anggota langsung ke bank: koperasi membereskannya dengan jurnal umum manual ("jurnal balik", pengembalian potongan gaji) tanpa
//    mengubah rincian pinjaman. Dari 182, 86 (Rp 531,5 juta) punya jurnal balik/koreksi/pelunasan terkait yang ditemukan lewat nomor
//    pinjaman atau nama anggota; 96 belum ditemukan jurnalnya. Header pinjaman (rp_saldo_pokok) dan desktop menganggapnya lunas.
//  - Tunggak: dihitung langsung dari jadwal tagih (pinjaman_tunai_rincian_tagih): angsuran yang sudah jatuh tempo hari ini dikurangi
//    jml_cicilan, sama dengan laporan Kredit Macet. Kolom jml_tunggakan di pinjaman_tunai (hasil tombol "Cek Tunggakan" desktop) tidak
//    dipakai karena usang (hanya 14 pinjaman terisi, padahal ±225 menunggak). Jatuh Tempo = tanggal angsuran berikutnya yang belum dibayar.
//  - Jml Cicilan: penghitung di pinjaman_tunai (dikelola aplikasi desktop).
//  - Pinjaman tanpa baris rincian sama sekali (belum diposting ke buku) tetap tampil, dengan bayar 0 dan sisa = plafond.

export interface FilterPinjaman {
    grup: string                 // "All" = semua grup
    keyword: string
    kolomCari: string | null     // nama kolom SQL dari daftar putih
    aktif: boolean | null        // status anggota; null = semua anggota
    kredit: string               // kode_kredit atau "All"
    status: number               // 0 semua, 1 menunggak, 2 lunas, 3 belum lunas
    limit: number
    offset: number
}

export const SISA_LUNAS = 100
/** Tanggal hari ini zona Jakarta, dasar hitungan tunggakan. */
const HARI_INI = "(now() AT TIME ZONE 'Asia/Jakarta')::date"

export function sqlLaporanPinjaman(f: FilterPinjaman) {
    const values: unknown[] = []
    const p = (v: unknown) => { values.push(v); return `$${values.length}` }

    let where = "WHERE 1=1"
    if (f.aktif !== null) where += ` AND a.aktif = ${p(f.aktif)}`
    if (f.grup !== "All") where += ` AND jk.group_pinjaman = ${p(f.grup)}`
    if (f.kredit && f.kredit !== "All") where += ` AND jk.kode_kredit = ${p(f.kredit)}`
    if (f.keyword && f.kolomCari) where += ` AND ${f.kolomCari} ILIKE ${p(`%${f.keyword}%`)}`

    const kontrak = `
        SELECT p.id, p.tgl_pinjaman, p.no_pinjaman, p.no_pinjaman_urut, a.kode_agt, a.nik, a.nama,
               p.rp_pinjaman_pokok, p.rp_uang_muka AS uang_muka, p.rp_provisi, p.lama_angsuran, p.jml_cicilan, p.opr, jk.kode_kredit,
               ROUND(p.rp_pinjaman_pokok - p.rp_uang_muka) AS temp_total_plafond,
               ROUND((p.rp_pinjaman_pokok - p.rp_uang_muka) * p.persen_adm / 100) AS rp_adm,
               (p.rp_pinjaman_pokok - p.rp_uang_muka) * p.persen_bunga / 100 * (p.lama_angsuran::numeric / NULLIF(p.bunga_per, 0)) AS temp_total_jasa
          FROM pinjaman_tunai p
          JOIN anggota a ON a.id = p.anggota_id
          LEFT JOIN jenis_kredit jk ON jk.id = p.jenis_kredit_id
         ${where}`

    // Nilai dari buku pinjaman dan jadwal tagih, hanya dihitung untuk baris yang dibutuhkan (satu halaman, atau semua bila ada filter status).
    const lengkap = (sumber: string) => `
        SELECT y.*, CASE WHEN y.lunas THEN 0 ELSE y.sisa_buku END AS sisa_pokok,
               CASE WHEN y.lunas THEN 0 ELSE GREATEST(y.lama_angsuran - y.jml_cicilan, 0) END AS sisa_cicilan,
               CASE WHEN y.lunas THEN 0 ELSE GREATEST(y.jatuh_tempo_n - y.jml_cicilan, 0) END AS jml_tunggakan
          FROM (
            SELECT h.id, h.tgl_pinjaman, h.no_pinjaman, h.no_pinjaman_urut, h.kode_agt, h.nik, h.nama, h.rp_pinjaman_pokok, h.uang_muka, h.rp_provisi, h.rp_adm,
                   h.temp_total_plafond, h.temp_total_jasa, h.lama_angsuran, h.jml_cicilan, h.opr, h.kode_kredit,
                   h.temp_total_plafond / NULLIF(h.lama_angsuran, 0) AS angs_pokok, h.temp_total_jasa / NULLIF(h.lama_angsuran, 0) AS angs_jasa,
                   (h.temp_total_plafond + h.temp_total_jasa) / NULLIF(h.lama_angsuran, 0) AS temp_angs_per_bulan,
                   s.sisa_pokok AS sisa_buku, LEAST(h.temp_total_plafond, s.dibayar_pokok) AS bayar_pokok, s.bayar_bunga,
                   LEAST(h.temp_total_plafond, s.dibayar_pokok) + s.bayar_bunga AS total_bayar,
                   (s.sisa_pokok <= ${SISA_LUNAS} OR h.jml_cicilan >= h.lama_angsuran) AS lunas,
                   COALESCE(j.jatuh_tempo_n, 0) AS jatuh_tempo_n, j.jatuh_tempo AS jatuh_tempo
              FROM ${sumber} h
              LEFT JOIN LATERAL (
                    SELECT CASE WHEN count(*) = 0 THEN h.temp_total_plafond
                                ELSE LEAST(h.temp_total_plafond, GREATEST(COALESCE(SUM(r.kredit_pokok - r.debit_pokok), 0), 0)) END AS sisa_pokok,
                           COALESCE(SUM(r.debit_pokok), 0) AS dibayar_pokok,
                           COALESCE(SUM(r.debit_bunga), 0) AS bayar_bunga
                      FROM pinjaman_tunai_rincian r WHERE r.pinjaman_tunai_id = h.id) s ON true
              LEFT JOIN LATERAL (
                    -- Jadwal tagih: jumlah angsuran yang sudah jatuh tempo hari ini (untuk tunggakan) dan tanggal angsuran berikutnya yang belum dibayar.
                    SELECT COUNT(*) FILTER (WHERE t.tanggal_angsuran <= ${HARI_INI}) AS jatuh_tempo_n,
                           MIN(t.tanggal_angsuran) FILTER (WHERE t.angsuran_ke > h.jml_cicilan) AS jatuh_tempo
                      FROM pinjaman_tunai_rincian_tagih t WHERE t.pinjaman_tunai_id = h.id) j ON true) y`

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
