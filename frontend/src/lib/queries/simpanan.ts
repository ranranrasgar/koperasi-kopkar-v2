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
        where.push(`(s.no_bukti ILIKE ${kw} OR s.kode_agt ILIKE ${kw} OR a.nik ILIKE ${kw} OR a.nama ILIKE ${kw})`)
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
    const sortable = { tgl_transaksi: "(tgl_transaksi, urut, id)" }
    return paged({ base, values, searchParams: s, sortable, defaultSort: "(tgl_transaksi, urut, id) DESC", kolomHalaman: saldo })
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
