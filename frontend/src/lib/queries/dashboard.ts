import "server-only"
import { query } from "@/lib/db"
import { hariIni } from "@/lib/format"
import { SQL_AKTIVITAS, SQL_ANGGOTA, SQL_ARUS, SQL_DAFTAR_MENUNGGU, SQL_JATUH_TEMPO, SQL_PENGAJUAN_MENUNGGU, SQL_SALDO_SIMPANAN, SQL_STAFF_BELUM_ABSEN, sqlRingkasKpr, sqlRingkasPinjaman } from "./dashboard-sql"
import { akunBankBook } from "./laporan"

export interface BulanArus { bln: string; setor: number; ambil: number; angsuran: number }
export interface RingkasPinjaman { grup: string; sisa: number; kontrak: number; tunggak: number }
export interface AktivitasDashboard { tanggal: string; no_bukti: string; nama: string; jenis: string | null; aksi: string; jumlah: number }
export interface JatuhTempo { tanggal: string; kontrak: number; jumlah: number }

// Saldo kas dan sisa pokok menghitung seluruh buku, jadi disimpan sebentar: dashboard dibuka setiap login.
const MENIT_SIMPAN = 5
const g = globalThis as unknown as { kopkarCacheDashboard?: Map<string, { waktu: number; nilai: unknown }> }
const cache = (g.kopkarCacheDashboard ??= new Map())

async function tersimpan<T>(kunci: string, ambil: () => Promise<T>) {
    const ada = cache.get(kunci)
    if (ada && Date.now() - ada.waktu < MENIT_SIMPAN * 60_000) return ada.nilai as T
    const nilai = await ambil()
    cache.set(kunci, { waktu: Date.now(), nilai })
    return nilai
}

const satu = async <T,>(sql: string, values: unknown[] = []) => (await query<T>(sql, values))[0]
const hitung = async (sql: string) => (await satu<{ n: number }>(sql)).n

export const ringkasAnggota = () => satu<{ aktif: number; masuk: number; keluar: number }>(SQL_ANGGOTA)
export const saldoSimpanan = async () => (await satu<{ saldo: number }>(SQL_SALDO_SIMPANAN)).saldo
export const arusBulanan = () => query<BulanArus>(SQL_ARUS)
export const jumlahPengajuanMenunggu = () => hitung(SQL_PENGAJUAN_MENUNGGU)
export const jumlahDaftarMenunggu = () => hitung(SQL_DAFTAR_MENUNGGU)
export const jumlahStaffBelumAbsen = () => hitung(SQL_STAFF_BELUM_ABSEN)
export const jatuhTempoDekat = (grup: string[]) => query<JatuhTempo>(SQL_JATUH_TEMPO, [grup])
export const aktivitasTerakhir = (grup: string[], simpanan: boolean) => query<AktivitasDashboard>(SQL_AKTIVITAS, [grup, grup.includes("KPR"), simpanan])

/** Sisa pokok, kontrak berjalan, dan tunggakan satu grup, nilainya sama dengan Daftar Pinjaman dan Daftar KPR. */
export const ringkasPinjaman = (grup: string) => tersimpan<RingkasPinjaman>(`pinjaman:${grup}`, async () => {
    if (grup === "KPR") {
        const q = sqlRingkasKpr()
        return { grup, ...await satu<{ kontrak: number; sisa: number }>(q.sql, q.values), tunggak: 0 }
    }
    const q = sqlRingkasPinjaman(grup)
    const [sisa, kontrak, tunggak] = await Promise.all([satu<{ sisa_pokok: number }>(q.sisa.sql, q.sisa.values),
        satu<{ total: number }>(q.kontrak.sql, q.kontrak.values), satu<{ total: number }>(q.tunggak.sql, q.tunggak.values)])
    return { grup, sisa: sisa.sisa_pokok, kontrak: kontrak.total, tunggak: tunggak.total }
})

export const saldoKas = () => tersimpan("kas", async () => {
    const akun = await akunBankBook(hariIni())
    return { saldo: akun.reduce((n, a) => n + a.saldo, 0), akun: akun.length }
})
