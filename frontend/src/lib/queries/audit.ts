import "server-only"
import { query } from "@/lib/db"
import { CEK_AUDIT, SQL_SALDO_BUKU, sqlBarisCek, sqlJumlahCek } from "@/lib/queries/audit-sql"
import { jurnalBermasalah, saldoPerAkun } from "@/lib/queries/laporan"

export interface BarisAudit { tanggal: string; bukti: string; anggota: string | null; kode_agt: string | null; keterangan: string | null; nilai: number }

/** Jumlah temuan tiap pemeriksaan pada rentang tanggal transaksi. */
export async function ringkasanAudit(dari: string, sampai: string) {
    return Promise.all(CEK_AUDIT.map(async (c) => {
        const [r] = await query<{ jumlah: number; total: number }>(sqlJumlahCek(c), [dari, sampai])
        return { id: c.id, modul: c.modul, judul: c.judul, jumlah: r?.jumlah ?? 0, total: r?.total ?? 0 }
    }))
}

export const barisAudit = (id: string, dari: string, sampai: string, batas: number) => {
    const c = CEK_AUDIT.find((x) => x.id === id)
    return c ? query<BarisAudit>(sqlBarisCek(c, batas), [dari, sampai]) : Promise.resolve([])
}

/** Saldo buku pembantu dibandingkan saldo akunnya di Buku Besar, posisi `hari`. Saldo akun dibalik untuk akun bersaldo normal kredit. */
export async function saldoBukuVsBesar(hari: string) {
    const [buku, akun] = await Promise.all([
        query<{ modul: string; kode_perkiraan: string; nama_perkiraan: string; saldo: number }>(SQL_SALDO_BUKU),
        saldoPerAkun(hari, hari),
    ])
    const besar = new Map(akun.map((a) => [a.kode_perkiraan, a.d_k === "D" ? a.akhir : -a.akhir]))
    return buku.map((b) => {
        const saldoBesar = besar.get(b.kode_perkiraan) ?? 0
        return { ...b, saldoBesar, selisih: b.saldo - saldoBesar }
    })
}

export async function ringkasJurnalBermasalah(sampai: string) {
    const { tidakSeimbang, tanpaAkun, sejak } = await jurnalBermasalah(sampai)
    return { tidakSeimbang: tidakSeimbang.length, selisih: tidakSeimbang.reduce((t, b) => t + b.selisih, 0), tanpaAkun: tanpaAkun.length, sejak }
}
