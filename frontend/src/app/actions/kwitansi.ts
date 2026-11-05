"use server"

import { kopCetakAction, type KopCetak } from "@/app/actions/cetak"
import { AKSES_HALAMAN, MENU, MENU_DETAIL_PINJAMAN_GRUP } from "@/config/akses"
import type { DataBuku, DataKwitansi, JenisBukti } from "@/lib/kwitansi-tipe"
import { operatorAktif } from "@/lib/operator"
import { dataBuku, dataKwitansi } from "@/lib/queries/kwitansi"

const MENU_SIMPANAN = [MENU.setoranSimpanan, MENU.pencairanSimpanan, MENU.lapBukuSimpanan]
const MENU_PINJAMAN = [...AKSES_HALAMAN["/dashboard/loans/[no]"], MENU.angsurKpr, MENU.cairKpr, MENU.lapPinjamanKpr, MENU.titipan]

export type HasilBukti = { kop: KopCetak | null; kwitansi: DataKwitansi } | { kop: KopCetak | null; buku: DataBuku } | { error: string }

/** Data satu bukti untuk dicetak: hanya membaca, jadi bisa dicetak ulang kapan saja selama transaksinya tersimpan. */
export async function dataBuktiAction(jenis: JenisBukti, no: string): Promise<HasilBukti> {
    try {
        const o = await operatorAktif(jenis === "simpanan" ? MENU_SIMPANAN : MENU_PINJAMAN)
        const kop = await kopCetakAction()
        const tidakAda = { error: `Bukti ${no} tidak ditemukan. Dalam Mode Uji transaksi tidak tersimpan, jadi kwitansinya tidak bisa dicetak.` }
        // Sama dengan halaman detail pinjaman: hanya operator yang menangani grup pinjaman itu. KPR dan titipan tidak berisi grup.
        const bolehGrup = (grup?: string) => grup === undefined || o.superadmin || (MENU_DETAIL_PINJAMAN_GRUP[grup] ?? []).some((m) => o.izin.includes(m))
        if (jenis === "buku") {
            const buku = await dataBuku(no)
            if (buku && !bolehGrup(buku.grup)) return { error: `Anda tidak punya akses ke pinjaman grup ${buku.grup}.` }
            return buku ? { kop, buku } : tidakAda
        }
        const kwitansi = await dataKwitansi(jenis, no)
        if (kwitansi && !bolehGrup(kwitansi.grup)) return { error: `Anda tidak punya akses ke pinjaman grup ${kwitansi.grup}.` }
        return kwitansi ? { kop, kwitansi } : tidakAda
    } catch (e) {
        return { error: e instanceof Error ? e.message : "Gagal membaca data cetak" }
    }
}
