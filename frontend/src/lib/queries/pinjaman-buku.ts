import "server-only"
import { query } from "@/lib/db"
import { isTanggal, paged, sp, type SearchParams } from "@/lib/list"
import { KOLOM_HALAMAN_BUKU, sqlBukuPinjaman } from "./pinjaman-buku-sql"

const filter = (s: SearchParams, grupBoleh: string[]) => ({
    grupBoleh, grup: sp(s, "grup"), kredit: sp(s, "kredit"), cari: sp(s, "search").trim(),
    dari: isTanggal(sp(s, "dari")) ? sp(s, "dari") : "", sampai: isTanggal(sp(s, "sampai")) ? sp(s, "sampai") : "",
})

/** Bukti pembayaran angsuran dari grup pinjaman yang boleh dilihat operator. */
export function bukuPinjaman(s: SearchParams, grupBoleh: string[]) {
    const { base, values } = sqlBukuPinjaman(filter(s, grupBoleh))
    return paged({
        base, values, searchParams: s, kolomHalaman: KOLOM_HALAMAN_BUKU,
        sortable: { tanggal_angsuran: "tanggal_angsuran {d}, urut {d}, id {d}" }, defaultSort: "tanggal_angsuran DESC, urut DESC, id DESC",
    })
}

export async function totalBukuPinjaman(s: SearchParams, grupBoleh: string[]) {
    const { base, values } = sqlBukuPinjaman(filter(s, grupBoleh))
    return (await query<{ total: number; pokok: number; jasa: number }>(
        `SELECT COALESCE(SUM(total), 0) AS total, COALESCE(SUM(pokok), 0) AS pokok, COALESCE(SUM(jasa), 0) AS jasa FROM (${base}) t`, values))[0]
}
