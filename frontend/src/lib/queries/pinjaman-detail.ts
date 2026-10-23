import "server-only"
import { query } from "@/lib/db"
import { sqlLaporanPinjaman } from "@/lib/queries/pinjaman-sql"
import type { LaporanPinjamanRow } from "@/lib/queries/pinjaman"

export interface InfoPinjaman {
    id: number; persen_bunga: number; bunga_per: number; persen_adm: number; persen_provisi: number; persen_denda: number
    nama_kredit: string | null; group_pinjaman: string | null; status_staff: string | null; aktif: boolean; hp: string; kota: string
    no_rek: string; deskripsi: string; jatuh_tempo: number
}
export interface BarisJadwal { angsuran_ke: number; tanggal_angsuran: string; debit_pokok: number; debit_bunga: number; rp_adm: number; rp_provisi: number }
export interface BarisBayar {
    urut: number; angsuran_ke: number; tanggal_angsuran: string; no_bukti: string; deskripsi: string
    debit_pokok: number; debit_bunga: number; kredit_pokok: number; kredit_bunga: number; rp_adm: number; rp_provisi: number
}

/**
 * Detail satu pinjaman tunai: ringkasan dengan angka yang sama persis dengan Daftar Pinjaman (sqlLaporanPinjaman), data kontrak tambahan,
 * jadwal tagih (angsuran per bulan), dan buku pinjaman (pencairan dan pembayaran). Null bila nomor tidak ada.
 */
export async function detailPinjaman(no: string) {
    const q = sqlLaporanPinjaman({ grup: "All", keyword: no, kolomCari: "p.no_pinjaman", aktif: null, kredit: "All", status: 0, urutKolom: null, urutArah: "ASC", limit: 10, offset: 0 })
    const kandidat = await query<LaporanPinjamanRow>(q.sqlItems, q.valuesItems)
    const ringkas = kandidat.find((r) => r.no_pinjaman === no)
    if (!ringkas) return null
    const [info] = await query<InfoPinjaman>(
        `SELECT p.id, p.persen_bunga, p.bunga_per, p.persen_adm, p.persen_provisi, p.persen_denda, jk.nama_kredit, jk.group_pinjaman, a.status_staff, a.aktif, a.hp, a.kota,
                p.no_rek, p.deskripsi, p.jatuh_tempo
           FROM pinjaman_tunai p JOIN anggota a ON a.id = p.anggota_id LEFT JOIN jenis_kredit jk ON jk.id = p.jenis_kredit_id WHERE p.no_pinjaman = $1`, [no])
    const [jadwal, bayar] = await Promise.all([
        query<BarisJadwal>(
            `SELECT angsuran_ke, tanggal_angsuran, debit_pokok, debit_bunga, rp_adm, rp_provisi
               FROM pinjaman_tunai_rincian_tagih WHERE pinjaman_tunai_id = $1 ORDER BY angsuran_ke`, [info.id]),
        query<BarisBayar>(
            `SELECT urut, angsuran_ke, tanggal_angsuran, no_bukti, deskripsi, debit_pokok, debit_bunga, kredit_pokok, kredit_bunga, rp_adm, rp_provisi
               FROM pinjaman_tunai_rincian WHERE pinjaman_tunai_id = $1 ORDER BY angsuran_ke, urut`, [info.id]),
    ])
    return { ringkas, info, jadwal, bayar }
}
