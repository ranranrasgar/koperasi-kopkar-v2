import "server-only"
import { query } from "@/lib/db"
import { isTanggal, paged, params, sp, type SearchParams } from "@/lib/list"

export const jenisSimpanan = () =>
    query<{ kode_simpanan: string; nama_simpanan: string }>("SELECT kode_simpanan, nama_simpanan FROM jenis_simpanan ORDER BY kode_simpanan")

export async function bukuSimpanan(s: SearchParams) {
    const { values, p } = params()
    const where: string[] = []
    const cari = sp(s, "search")
    if (cari) {
        const kw = p(`%${cari}%`)
        // Anggota yang cocok dicari dulu (tabel kecil), lalu simpanannya lewat indeks anggota_id; no_bukti lewat indeks trigram. Keduanya digabung bitmap OR,
        // bukan OR lintas tabel yang memindai seluruh simpanan.
        where.push(`(s.anggota_id = ANY (ARRAY(SELECT b.id FROM anggota b WHERE b.kode_agt ILIKE ${kw} OR b.nik ILIKE ${kw} OR b.nama ILIKE ${kw})) OR s.no_bukti ILIKE ${kw})`)
    }
    if (sp(s, "jenis")) where.push(`s.jenis_simpanan = ${p(sp(s, "jenis"))}`)
    if (isTanggal(sp(s, "dari"))) where.push(`s.tgl_transaksi >= ${p(sp(s, "dari"))}`)
    if (isTanggal(sp(s, "sampai"))) where.push(`s.tgl_transaksi <= ${p(sp(s, "sampai"))}`)

    const base = `
        SELECT s.id, s.urut, s.anggota_id, s.jenis_simpanan_id, s.no_bukti, s.tgl_transaksi, s.kode_agt, a.nik, a.nama, j.nama_simpanan,
               s.rp_setoran, s.rp_pengambilan, s.deskripsi, s.opr
          FROM simpanan s
          JOIN anggota a ON a.id = s.anggota_id
          LEFT JOIN jenis_simpanan j ON j.id = s.jenis_simpanan_id
         ${where.length ? `WHERE ${where.join(" AND ")}` : ""}`
    // Saldo seperti rekening koran: saldo anggota untuk jenis itu setelah transaksi ini, dari SELURUH riwayat (bukan
    // hanya periode tampil). Kolom simpanan.rp_saldo tidak dipakai: 98% bernilai 0 karena desktop tidak mengisinya.
    // Urutan transaksi: (tanggal, urut, id), karena urut tidak unik. Dihitung hanya untuk baris halaman (indeks anggota/jenis/tanggal).
    const saldo = `(SELECT SUM(x.rp_setoran - x.rp_pengambilan) FROM simpanan x
        WHERE x.anggota_id = t.anggota_id AND x.jenis_simpanan_id = t.jenis_simpanan_id
          AND (x.tgl_transaksi, x.urut, x.id) <= (t.tgl_transaksi, t.urut, t.id)) AS rp_saldo`
    // Hanya urut kronologis (terbaru atau terlama) supaya saldo berjalan tetap terbaca. Satu kunci gabungan, sehingga
    // arah urut juga berlaku untuk transaksi pada tanggal yang sama.
    const sortable = { tgl_transaksi: "tgl_transaksi {d}, urut {d}, id {d}" }
    return paged({ base, values, searchParams: s, sortable, defaultSort: "tgl_transaksi DESC, urut DESC, id DESC", kolomHalaman: saldo })
}

export interface BuktiSimpanan {
    no_bukti: string; tgl_transaksi: string; jenis_simpanan: string; nama_simpanan: string | null; kode_agt: string; nik: string | null; nama: string
    rp_setoran: number; rp_pengambilan: number; deskripsi: string | null; opr: string | null
}
export interface BarisJurnalBukti { kode_perkiraan: string; nama_perkiraan: string | null; debit: number; kredit: number }

/** Satu bukti simpanan beserta jurnalnya, untuk ditinjau. */
export async function detailBuktiSimpanan(no: string) {
    const [[bukti], jurnal] = await Promise.all([
        query<BuktiSimpanan>(
            `SELECT s.no_bukti, s.tgl_transaksi::text AS tgl_transaksi, s.jenis_simpanan, j.nama_simpanan, s.kode_agt, a.nik, a.nama, s.rp_setoran, s.rp_pengambilan, s.deskripsi, s.opr
               FROM simpanan s JOIN anggota a ON a.id = s.anggota_id LEFT JOIN jenis_simpanan j ON j.id = s.jenis_simpanan_id WHERE s.no_bukti = $1`, [no]),
        query<BarisJurnalBukti>(
            `SELECT j.kode_perkiraan, p.nama_perkiraan, j.debit_jurnalumum AS debit, j.kredit_jurnalumum AS kredit
               FROM jurnal_umum j LEFT JOIN perkiraan p ON p.kode_perkiraan = j.kode_perkiraan WHERE j.nomor_bukti = $1 ORDER BY j.urutan`, [no]),
    ])
    return bukti ? { bukti, jurnal } : null
}

export interface JenisSaldo { kode_simpanan: string; nama_simpanan: string; setoran: number; pengambilan: number; saldo: number; transaksi: number }
export interface AnggotaSimpanan { kode_agt: string; nik: string | null; nama: string; aktif: boolean; total: number; transaksi: number; terakhir: string | null }
const MAKS_PILIHAN = 20

/**
 * Ringkasan di atas Buku Simpanan, dari kata pencarian. Satu anggota cocok: saldonya per jenis. Beberapa cocok: daftar pilihan
 * (maks. MAKS_PILIHAN). Saldo dari seluruh riwayat sampai filter Sampai Tanggal, sama dengan kolom Saldo; filter Dari dan Jenis tidak mengubahnya.
 */
export async function ringkasanBukuSimpanan(s: SearchParams) {
    const cari = sp(s, "search").trim()
    if (!cari) return null
    const { values, p } = params()
    const kw = p(`%${cari}%`)
    const batas = isTanggal(sp(s, "sampai")) ? `AND x.tgl_transaksi <= ${p(sp(s, "sampai"))}` : ""
    const cocok = await query<AnggotaSimpanan & { id: number }>(
        `SELECT a.id, a.kode_agt, a.nik, a.nama, a.aktif, SUM(x.rp_setoran - x.rp_pengambilan) AS total, COUNT(*)::int AS transaksi, MAX(x.tgl_transaksi)::text AS terakhir
           FROM anggota a JOIN simpanan x ON x.anggota_id = a.id ${batas}
          WHERE a.kode_agt ILIKE ${kw} OR a.nik ILIKE ${kw} OR a.nama ILIKE ${kw}
          GROUP BY a.id ORDER BY a.aktif DESC, a.nama LIMIT ${MAKS_PILIHAN + 1}`, values)
    if (cocok.length === 0) return null
    if (cocok.length > 1) return { pilihan: cocok.slice(0, MAKS_PILIHAN), lebih: cocok.length > MAKS_PILIHAN, anggota: null, jenis: [] as JenisSaldo[] }
    const nilai: unknown[] = [cocok[0].id]
    if (batas) nilai.push(sp(s, "sampai"))
    const jenis = await query<JenisSaldo>(
        `SELECT j.kode_simpanan, j.nama_simpanan, SUM(x.rp_setoran) AS setoran, SUM(x.rp_pengambilan) AS pengambilan,
                SUM(x.rp_setoran - x.rp_pengambilan) AS saldo, COUNT(*)::int AS transaksi
           FROM simpanan x JOIN jenis_simpanan j ON j.id = x.jenis_simpanan_id
          WHERE x.anggota_id = $1 ${batas ? "AND x.tgl_transaksi <= $2" : ""}
          GROUP BY j.id ORDER BY j.kode_simpanan`, nilai)
    return { pilihan: [] as AnggotaSimpanan[], lebih: false, anggota: cocok[0], jenis }
}

// Simpanan per jenis: kode baru ('01'..'04') dan kode lama ('SP', 'SW', 'SS', 'SK').
// Query sama dengan web lama (src/app/actions/savingsSummary.ts) yang sudah dicocokkan dengan MySQL produksi.
const JENIS = [
    { name: "Pokok", codes: "'01','SP'" },
    { name: "Wajib", codes: "'02','SW'" },
    { name: "Sukarela", codes: "'03','SS'" },
    { name: "Khusus", codes: "'04','SK'" },
]

export interface RekapSimpananRow {
    kode_agt: string
    nama: string
    nik: string | null
    status_staff: string | null
    Setoran_Pokok: number; Ambil_Pokok: number; Saldo_Pokok: number
    Setoran_Wajib: number; Ambil_Wajib: number; Saldo_Wajib: number
    Setoran_Sukarela: number; Ambil_Sukarela: number; Saldo_Sukarela: number
    Setoran_Khusus: number; Ambil_Khusus: number; Saldo_Khusus: number
    Saldo_Total: number
}

export async function rekapSimpanan(s: SearchParams) {
    const { values, p } = params()
    let where = "WHERE a.aktif"
    if (isTanggal(sp(s, "endDate"))) where += ` AND s.tgl_transaksi <= ${p(sp(s, "endDate"))}`
    if (sp(s, "search")) {
        const kw = p(`%${sp(s, "search")}%`)
        where += ` AND (a.nama ILIKE ${kw} OR a.nik ILIKE ${kw})`
    }
    const staff = sp(s, "status_staff")
    if (staff && staff !== "ALL") where += ` AND a.status_staff = ${p(staff)}`
    const sembunyikanNol = sp(s, "hideZero") !== "0"

    const sums = JENIS.flatMap((j) => [
        `SUM(CASE WHEN s.jenis_simpanan IN (${j.codes}) THEN COALESCE(s.rp_setoran, 0) ELSE 0 END) AS "Setoran_${j.name}"`,
        `SUM(CASE WHEN s.jenis_simpanan IN (${j.codes}) THEN COALESCE(s.rp_pengambilan, 0) ELSE 0 END) AS "Ambil_${j.name}"`,
    ])
    const saldo = JENIS.map((j) => `"Setoran_${j.name}" - "Ambil_${j.name}" AS "Saldo_${j.name}"`)
    // PostgreSQL tidak bisa memfilter alias SELECT, jadi totalnya dibungkus subquery.
    const base = `
        SELECT t.*, ${saldo.join(", ")}
          FROM (
            SELECT a.kode_agt, a.nama, a.tglpencatatan, a.status_staff, a.nik, a.bank_no_rek, a.bank_atas_nama, a.bank_nama,
                   ${sums.join(",\n                   ")},
                   SUM(COALESCE(s.rp_setoran, 0) - COALESCE(s.rp_pengambilan, 0)) AS "Saldo_Total"
              FROM simpanan s
              JOIN anggota a ON a.id = s.anggota_id
             ${where}
             GROUP BY a.id
          ) t
         ${sembunyikanNol ? `WHERE t."Saldo_Total" > 0` : ""}`

    const sortable: Record<string, string> = { KPK: "nik", NAMA: "nama" }
    for (const j of JENIS) for (const k of ["Setoran", "Ambil", "Saldo"]) sortable[`${k}_${j.name}`] = `"${k}_${j.name}"`
    sortable.Saldo_Total = `"Saldo_Total"`

    // Isi halaman, jumlah baris, dan baris total dari satu query: agregasi seluruh simpanan cukup dihitung sekali.
    const { jumlah, ...page } = await paged<RekapSimpananRow, keyof RekapSimpananRow & string>({
        base, values, searchParams: s, sortable, defaultSort: "nama ASC",
        jumlahkan: [...JENIS.flatMap((j) => ["Setoran", "Ambil", "Saldo"].map((k) => `${k}_${j.name}` as keyof RekapSimpananRow)), "Saldo_Total"],
    })
    return { ...page, grandTotal: jumlah as Omit<RekapSimpananRow, "kode_agt" | "nama" | "nik" | "status_staff"> }
}
