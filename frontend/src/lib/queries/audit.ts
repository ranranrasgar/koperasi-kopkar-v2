import "server-only"
import { query } from "@/lib/db"
import { CEK_AUDIT, SQL_SALDO_BUKU, sqlBarisCek, sqlJumlahCek } from "@/lib/queries/audit-sql"
import { jurnalBermasalah, saldoPerAkun } from "@/lib/queries/laporan"

export interface BarisAudit { tanggal: string; bukti: string; anggota: string | null; kode_agt: string | null; keterangan: string | null; nilai: number }

// Ringkasan menjalankan 12 pemeriksaan atas seluruh transaksi periode, terlalu berat diulang tiap halaman dibuka di VPS 2 GB. Hasilnya disimpan
// sebentar di memori proses; globalThis karena server action dan halaman bisa memakai salinan modul yang berbeda.
const LAMA_SIMPAN_MS = 5 * 60_000
const MAKS_KUNCI = 20
const BARENGAN = 3
type Tersimpan = { pada: number; nilai: Promise<unknown> }
const g = globalThis as unknown as { kopkarCacheAudit?: Map<string, Tersimpan> }
const cache = (g.kopkarCacheAudit ??= new Map<string, Tersimpan>())

async function simpanSebentar<T>(kunci: string, segar: boolean, hitung: () => Promise<T>) {
    const ada = cache.get(kunci)
    if (ada && !segar && Date.now() - ada.pada < LAMA_SIMPAN_MS) return { nilai: await (ada.nilai as Promise<T>), pada: ada.pada }
    if (cache.size >= MAKS_KUNCI) cache.clear()
    const baru = { pada: Date.now(), nilai: hitung() }
    cache.set(kunci, baru)
    baru.nilai.catch(() => cache.delete(kunci)) // kegagalan tidak disimpan
    return { nilai: await baru.nilai, pada: baru.pada }
}

/** Dipanggil setelah koreksi supaya hasilnya langsung terlihat di Audit Data. */
export const hapusCacheAudit = () => cache.clear()

/** Jumlah temuan tiap pemeriksaan pada rentang tanggal transaksi. Bergiliran beberapa sekaligus supaya tidak menghabiskan koneksi dan memori database. */
export function ringkasanAudit(dari: string, sampai: string, segar = false) {
    return simpanSebentar(`ringkas|${dari}|${sampai}`, segar, async () => {
        const hasil = []
        for (let i = 0; i < CEK_AUDIT.length; i += BARENGAN) {
            hasil.push(...await Promise.all(CEK_AUDIT.slice(i, i + BARENGAN).map(async (c) => {
                const [r] = await query<{ jumlah: number; total: number }>(sqlJumlahCek(c), [dari, sampai])
                return { id: c.id, modul: c.modul, judul: c.judul, jumlah: r?.jumlah ?? 0, total: r?.total ?? 0 }
            })))
        }
        return hasil
    })
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

export interface BarisKoreksi { waktu: string; jenis: string; no_bukti: string; no_bukti_pembalik: string | null; aksi: string; alasan: string; opr: string }

export const riwayatKoreksi = (batas: number) => query<BarisKoreksi>(
    `SELECT TO_CHAR(waktu AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM-DD HH24:MI') AS waktu, jenis, no_bukti, no_bukti_pembalik, aksi, alasan, opr
       FROM transaksi_koreksi ORDER BY waktu DESC LIMIT ${batas}`)

export async function ringkasJurnalBermasalah(sampai: string, segar = false) {
    return (await simpanSebentar(`jurnal|${sampai}`, segar, async () => {
        const { tidakSeimbang, tanpaAkun, sejak } = await jurnalBermasalah(sampai)
        return { tidakSeimbang: tidakSeimbang.length, selisih: tidakSeimbang.reduce((t, b) => t + b.selisih, 0), tanpaAkun: tanpaAkun.length, sejak }
    })).nilai
}
