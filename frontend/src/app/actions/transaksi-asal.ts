"use server"

import { revalidatePath } from "next/cache"
import { hapusTransaksiAsal, infoTransaksiAsal, type InfoAsal } from "@kopkar/backend/src/posting/hapus-transaksi.ts"
import { hapusCacheAudit } from "@/lib/queries/audit"
import { catatAksi } from "@/lib/aktivitas"
import { modeUji, pool, tx } from "@/lib/db"
import { GalatSesi, operatorAktif, wajibAksi } from "@/lib/operator"
import { MENU } from "@/config/akses"

/** Menu yang boleh melihat info transaksi asal sebuah bukti jurnal: yang bekerja dengan jurnal, atau dengan koreksi transaksi. */
const MENU_LIHAT = [MENU.jurnalBermasalah, MENU.jurnalUmum, MENU.jurnalPenyesuaian, MENU.batalTransaksi]
const MENU_HAPUS = [MENU.batalTransaksi]

/** Info transaksi asal (simpanan, angsuran, pencairan) dari sebuah nomor bukti jurnal; `info` null bila bukti bukan dari transaksi tersebut. Hanya membaca. */
export async function infoAsalAction(nomorBukti: string): Promise<{ info: InfoAsal | null } | { error: string }> {
    try {
        await operatorAktif(MENU_LIHAT)
        return { info: await infoTransaksiAsal(pool, nomorBukti) }
    } catch (e) {
        return { error: e instanceof Error ? e.message : "Gagal membaca transaksi" }
    }
}

/** Hapus transaksi asal beserta seluruh jurnalnya. Izinnya sama dengan Batalkan Transaksi (aksi hapus). */
export async function hapusTransaksiAsalAction(nomorBukti: string, alasan: string): Promise<{ ok: true; pesan: string } | { ok: false; error: string }> {
    try {
        const o = await operatorAktif(MENU_HAPUS)
        wajibAksi(o, MENU_HAPUS, "hapus")
        const r = await tx((db) => hapusTransaksiAsal(db, { noBukti: nomorBukti, alasan, opr: o.nama, operatorId: o.id }))
        const pesan = `${r.judul} ${nomorBukti} dihapus beserta ${r.jurnalDihapus} baris jurnalnya`
        await catatAksi(MENU_HAPUS[0], pesan, o)
        hapusCacheAudit()
        if (await modeUji()) return { ok: true, pesan: `MODE UJI, tidak tersimpan: ${pesan}` }
        revalidatePath("/dashboard", "layout")
        return { ok: true, pesan }
    } catch (e) {
        if (!(e instanceof GalatSesi)) console.error("hapus transaksi asal gagal:", e)
        return { ok: false, error: e instanceof Error ? e.message : "Gagal menghapus transaksi" }
    }
}
