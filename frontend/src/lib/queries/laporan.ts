import "server-only"
import { SQL_AKUN_BANKBOOK } from "@kopkar/backend/src/posting/bankbook.ts"
import { query } from "@/lib/db"

/*
 * Model saldo desktop (diverifikasi terhadap data 2024 dan 2025): tutup buku tahun Y membuat jurnal TBT dengan
 * dua bagian, yaitu penutupan rugi-laba bertanggal Y-12-31 dan saldo pembuka tahun Y+1 bertanggal Y+1-01-01 yang mengulang
 * saldo semua akun. Karena itu saldo pada tanggal D = saldo pembuka TBT terakhir (tanggal O <= D) + jurnal lain sejak O.
 * Baris saldo pembuka tidak pernah dihitung sebagai mutasi.
 */
const PEMBUKA = "(j.nomor_bukti LIKE 'TBT/%' AND j.tanggal_jurnalumum = date_trunc('year', j.tanggal_jurnalumum)::date)"

export interface SaldoAkun {
    kode_perkiraan: string; nama_perkiraan: string; d_k: string; kode_klasifikasi: number | null; nama_klasifikasi: string | null
    awal: number; debit: number; kredit: number; akhir: number  // semua bertanda debit - kredit
}

/** Tanggal saldo pembuka TBT terakhir yang <= tanggal, atau null (data sebelum tutup buku pertama). */
async function pembukaTerakhir(tanggal: string) {
    const [r] = await query<{ o: string | null }>(
        `SELECT MAX(j.tanggal_jurnalumum)::text AS o FROM jurnal_umum j WHERE ${PEMBUKA} AND j.tanggal_jurnalumum <= $1`, [tanggal])
    return r?.o ?? null
}

/**
 * Saldo awal (pada `dari`), mutasi debit/kredit dalam [dari, sampai], dan saldo akhir per akun.
 * `tanpaTutupBuku`: abaikan semua baris TBT di mutasi (untuk rugi-laba, supaya penutupan 31-12 tidak menolkan pendapatan/biaya).
 */
export async function saldoPerAkun(dari: string, sampai: string, opsi: { tanpaTutupBuku?: boolean } = {}): Promise<SaldoAkun[]> {
    const o = await pembukaTerakhir(dari)
    const awal = o
        ? `(${PEMBUKA} AND j.tanggal_jurnalumum = $3) OR (NOT ${PEMBUKA} AND j.tanggal_jurnalumum >= $3 AND j.tanggal_jurnalumum < $1)`
        : `(NOT ${PEMBUKA} AND j.tanggal_jurnalumum < $1)`
    const mutasi = `NOT ${PEMBUKA} AND j.tanggal_jurnalumum BETWEEN $1 AND $2${opsi.tanpaTutupBuku ? " AND j.nomor_bukti NOT LIKE 'TBT/%'" : ""}`
    return query<SaldoAkun>(`
        WITH s AS (
            SELECT j.kode_perkiraan,
                   SUM(CASE WHEN ${awal} THEN j.debit_jurnalumum - j.kredit_jurnalumum ELSE 0 END) AS awal,
                   SUM(CASE WHEN ${mutasi} THEN j.debit_jurnalumum ELSE 0 END) AS debit,
                   SUM(CASE WHEN ${mutasi} THEN j.kredit_jurnalumum ELSE 0 END) AS kredit
              FROM jurnal_umum j
             WHERE j.tanggal_jurnalumum <= $2 ${o ? "AND j.tanggal_jurnalumum >= $3" : ""}
             GROUP BY j.kode_perkiraan)
        SELECT COALESCE(p.kode_perkiraan, s.kode_perkiraan) AS kode_perkiraan,
               COALESCE(p.nama_perkiraan, '(akun tidak ada di COA)') AS nama_perkiraan, COALESCE(p.d_k, 'D') AS d_k,
               p.kode_klasifikasi, k.nama_klasifikasi,
               COALESCE(s.awal, 0) AS awal, COALESCE(s.debit, 0) AS debit, COALESCE(s.kredit, 0) AS kredit,
               COALESCE(s.awal, 0) + COALESCE(s.debit, 0) - COALESCE(s.kredit, 0) AS akhir
          FROM s FULL JOIN perkiraan p ON p.kode_perkiraan = s.kode_perkiraan
          LEFT JOIN klasifikasi_perkiraan k ON k.kode_klasifikasi = p.kode_klasifikasi
         ORDER BY 1`, o ? [dari, sampai, o] : [dari, sampai])
}

export interface BarisBukuBesar {
    tanggal_jurnalumum: string; nomor_bukti: string; deskripsi: string | null; debit: number; kredit: number; saldo: number; opr: string | null
}

/** Buku besar satu akun dengan saldo berjalan (bertanda debit - kredit). */
export async function bukuBesar(kode: string, dari: string, sampai: string, halaman: { page: number; pageSize: number } = { page: 1, pageSize: 5000 }) {
    const o = await pembukaTerakhir(dari)
    const [awal] = await query<{ s: number }>(`
        SELECT COALESCE(SUM(j.debit_jurnalumum - j.kredit_jurnalumum), 0) AS s FROM jurnal_umum j
         WHERE j.kode_perkiraan = $1 AND (${o
            ? `(${PEMBUKA} AND j.tanggal_jurnalumum = $3) OR (NOT ${PEMBUKA} AND j.tanggal_jurnalumum >= $3 AND j.tanggal_jurnalumum < $2)`
            : `NOT ${PEMBUKA} AND j.tanggal_jurnalumum < $2`})`, o ? [kode, dari, o] : [kode, dari])
    const baris = await query<BarisBukuBesar>(`
        SELECT j.tanggal_jurnalumum, j.nomor_bukti, j.deskripsi, j.debit_jurnalumum AS debit, j.kredit_jurnalumum AS kredit, j.opr,
               $4::numeric + SUM(j.debit_jurnalumum - j.kredit_jurnalumum) OVER (ORDER BY j.tanggal_jurnalumum, j.urutan) AS saldo
          FROM jurnal_umum j
         WHERE j.kode_perkiraan = $1 AND j.tanggal_jurnalumum BETWEEN $2 AND $3 AND NOT ${PEMBUKA}
         ORDER BY j.tanggal_jurnalumum, j.urutan LIMIT $5 OFFSET $6`, [kode, dari, sampai, awal.s, halaman.pageSize, (halaman.page - 1) * halaman.pageSize])
    // Saldo berjalan dihitung atas seluruh baris lalu dipotong per halaman (window sebelum LIMIT), jadi saldo tiap halaman benar.
    // Total dan jumlah baris dihitung terpisah untuk seluruh periode.
    const [tot] = await query<{ debit: number; kredit: number; n: number }>(`
        SELECT COALESCE(SUM(j.debit_jurnalumum), 0) AS debit, COALESCE(SUM(j.kredit_jurnalumum), 0) AS kredit, COUNT(*) AS n FROM jurnal_umum j
         WHERE j.kode_perkiraan = $1 AND j.tanggal_jurnalumum BETWEEN $2 AND $3 AND NOT ${PEMBUKA}`, [kode, dari, sampai])
    return { awal: awal.s, baris, debit: tot.debit, kredit: tot.kredit, jumlahBaris: tot.n }
}

/** Saldo satu akun pada awal hari `dari` (sebelum mutasi tanggal itu), dengan aturan saldo pembuka yang sama dengan buku besar. */
async function saldoAwal(kode: string, dari: string) {
    const o = await pembukaTerakhir(dari)
    const [r] = await query<{ s: number }>(`
        SELECT COALESCE(SUM(j.debit_jurnalumum - j.kredit_jurnalumum), 0) AS s FROM jurnal_umum j
         WHERE j.kode_perkiraan = $1 AND (${o
            ? `(${PEMBUKA} AND j.tanggal_jurnalumum = $3) OR (NOT ${PEMBUKA} AND j.tanggal_jurnalumum >= $3 AND j.tanggal_jurnalumum < $2)`
            : `NOT ${PEMBUKA} AND j.tanggal_jurnalumum < $2`})`, o ? [kode, dari, o] : [kode, dari])
    return r.s
}

export interface HarianBankBook { tanggal: string; awal: number; debit: number; kredit: number; akhir: number; bukti: number }

/** Ringkasan per hari satu akun kas/bank (semua tanggal dalam rentang), tanggal menaik seperti Bank Book desktop. */
export async function harianBankBook(kode: string, dari: string, sampai: string) {
    const awal = await saldoAwal(kode, dari)
    const rows = await query<HarianBankBook>(`
        WITH h AS (
            SELECT d::date AS tanggal, COALESCE(SUM(j.debit_jurnalumum), 0) AS debit, COALESCE(SUM(j.kredit_jurnalumum), 0) AS kredit,
                   COUNT(DISTINCT j.nomor_bukti) AS bukti
              FROM generate_series($2::date, $3::date, interval '1 day') d
              LEFT JOIN jurnal_umum j ON j.kode_perkiraan = $1 AND j.tanggal_jurnalumum = d::date AND NOT ${PEMBUKA}
             GROUP BY 1)
        SELECT tanggal::text, debit, kredit, bukti,
               $4::numeric + COALESCE(SUM(debit - kredit) OVER (ORDER BY tanggal ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING), 0) AS awal,
               $4::numeric + SUM(debit - kredit) OVER (ORDER BY tanggal) AS akhir
          FROM h ORDER BY tanggal`, [kode, dari, sampai, awal])
    return { awal, rows }
}

export interface TransaksiBankBook {
    nomor_bukti: string; tanggal: string; deskripsi: string | null; lawan: string | null; debit: number; kredit: number
    opr: string | null; bankbook: boolean
}

/** Bukti yang menyentuh akun kas/bank pada satu tanggal, dengan nama akun lawannya, urut seperti dicatat. */
export const transaksiBankBook = (kode: string, tanggal: string) =>
    query<TransaksiBankBook>(`
        SELECT j.nomor_bukti, j.tanggal_jurnalumum::text tanggal, MIN(j.deskripsi) deskripsi,
               (SELECT string_agg(DISTINCT x.kode_perkiraan || ' ' || COALESCE(p.nama_perkiraan, ''), ', ')
                  FROM jurnal_umum x LEFT JOIN perkiraan p ON p.kode_perkiraan = x.kode_perkiraan
                 WHERE x.nomor_bukti = j.nomor_bukti AND x.kode_perkiraan <> $1) lawan,
               SUM(j.debit_jurnalumum) debit, SUM(j.kredit_jurnalumum) kredit, MIN(j.opr) opr,
               j.nomor_bukti LIKE 'BB/%' bankbook
          FROM jurnal_umum j
         WHERE j.kode_perkiraan = $1 AND j.tanggal_jurnalumum = $2 AND NOT ${PEMBUKA}
         GROUP BY j.nomor_bukti, j.tanggal_jurnalumum ORDER BY MIN(j.urutan)`, [kode, tanggal])

export interface AkunBankBook { id: number; kode_perkiraan: string; nama_perkiraan: string; saldo: number }

/** Akun Bank Book (keterangan GC/BANK, seperti desktop) dengan saldo sampai `per`. */
export async function akunBankBook(per: string) {
    const saldo = new Map((await saldoPerAkun(per, per)).map((s) => [s.kode_perkiraan, s.akhir]))
    const akun = await query<Omit<AkunBankBook, "saldo">>(SQL_AKUN_BANKBOOK)
    return akun.map((a) => ({ ...a, saldo: saldo.get(a.kode_perkiraan) ?? 0 }))
}

export interface TutupBuku { nomor_bukti: string; tanggal: string; bagian: string; baris: number; debit: number; kredit: number; opr: string | null }

/** Riwayat tutup buku tahunan (jurnal TBT): bagian penutupan 31-12 dan saldo pembuka 01-01. */
export const riwayatTutupBuku = () =>
    query<TutupBuku>(`
        SELECT j.nomor_bukti, j.tanggal_jurnalumum AS tanggal,
               CASE WHEN ${PEMBUKA} THEN 'Saldo pembuka' ELSE 'Penutupan rugi-laba' END AS bagian,
               COUNT(*) AS baris, SUM(j.debit_jurnalumum) AS debit, SUM(j.kredit_jurnalumum) AS kredit, MIN(j.opr) AS opr
          FROM jurnal_umum j WHERE j.nomor_bukti LIKE 'TBT/%'
         GROUP BY 1, 2, 3 ORDER BY 2 DESC, 3`)

export interface JurnalTidakSeimbang { nomor_bukti: string; tanggal: string; baris: number; debit: number; kredit: number; selisih: number; deskripsi: string | null; tanpa_akun: number }
export interface BarisTanpaAkun { id: number; nomor_bukti: string; tanggal: string; kode_perkiraan: string; debit: number; kredit: number; deskripsi: string | null }

/**
 * Jurnal yang membuat neraca tidak seimbang, dengan cakupan yang sama dengan saldo per akun pada tanggal `sampai`: saldo pembuka TBT terakhir
 * ditambah jurnal sesudahnya. `tidakSeimbang`: bukti yang total debit dan kreditnya berbeda; `tanpaAkun`: baris dengan kode akun yang tidak ada di COA
 * (saldonya tidak masuk neraca).
 */
export async function jurnalBermasalah(sampai: string) {
    const o = await pembukaTerakhir(sampai)
    const cakupan = o
        ? `j.tanggal_jurnalumum >= $2 AND j.tanggal_jurnalumum <= $1 AND (NOT ${PEMBUKA} OR j.tanggal_jurnalumum = $2)` // batas tanggal di luar OR supaya indeks tanggal dipakai
        : `NOT ${PEMBUKA} AND j.tanggal_jurnalumum <= $1`
    const args = o ? [sampai, o] : [sampai]
    const [tidakSeimbang, tanpaAkun] = await Promise.all([
        // Agregasi hanya memakai kolom yang ada di indeks penutup (index-only scan); keterangan diambil terakhir untuk bukti yang bermasalah saja.
        query<JurnalTidakSeimbang>(`
            WITH g AS (
                SELECT j.nomor_bukti, MIN(j.tanggal_jurnalumum) AS tanggal, COUNT(*)::int AS baris, SUM(j.debit_jurnalumum) AS debit, SUM(j.kredit_jurnalumum) AS kredit,
                       SUM(j.debit_jurnalumum - j.kredit_jurnalumum) AS selisih, COUNT(*) FILTER (WHERE p.id IS NULL)::int AS tanpa_akun
                  FROM jurnal_umum j LEFT JOIN perkiraan p ON p.kode_perkiraan = j.kode_perkiraan
                 WHERE ${cakupan} GROUP BY j.nomor_bukti HAVING ABS(SUM(j.debit_jurnalumum - j.kredit_jurnalumum)) >= 0.5)
            SELECT g.nomor_bukti, g.tanggal::text AS tanggal, g.baris, g.debit, g.kredit, g.selisih, g.tanpa_akun,
                   (SELECT MIN(x.deskripsi) FROM jurnal_umum x WHERE x.nomor_bukti = g.nomor_bukti) AS deskripsi
              FROM g ORDER BY g.tanggal DESC, g.nomor_bukti`, args),
        query<BarisTanpaAkun>(`
            SELECT j.id, j.nomor_bukti, j.tanggal_jurnalumum::text AS tanggal, j.kode_perkiraan, j.debit_jurnalumum AS debit, j.kredit_jurnalumum AS kredit, j.deskripsi
              FROM jurnal_umum j LEFT JOIN perkiraan p ON p.kode_perkiraan = j.kode_perkiraan
             WHERE ${cakupan} AND p.id IS NULL ORDER BY j.tanggal_jurnalumum DESC, j.nomor_bukti, j.urutan`, args),
    ])
    return { tidakSeimbang, tanpaAkun, sejak: o }
}
