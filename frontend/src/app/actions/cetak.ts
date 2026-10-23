"use server"

import { AKSES_HALAMAN } from "@/config/akses"
import type { PageData } from "@/config/modules"
import { query } from "@/lib/db"
import { identitasKoperasi } from "@/lib/koperasi"
import { operatorAktif } from "@/lib/operator"
import { daftarAnggota } from "@/lib/queries/anggota"
import { daftarJurnal } from "@/lib/queries/akuntansi"
import { daftarKaryawanMattel, daftarUserMobile } from "@/lib/queries/keanggotaan"
import { laporanPinjaman } from "@/lib/queries/pinjaman"
import { bukuSimpanan, rekapSimpanan } from "@/lib/queries/simpanan"
import { hariIni } from "@/lib/format"

export interface KopCetak {
    nama: string
    /** Baris alamat (alamat, alamat 2/telepon, kota) dari Pengaturan Perusahaan; yang kosong dibuang. */
    alamat: string[]
    /** Email dan website bila diisi. */
    kontak: string[]
    logo: string
    petugas: string
    waktu: string
}

/** Kop surat untuk dokumen cetak: nama, alamat, dan logo dari Pengaturan Perusahaan, serta operator dan waktu cetak. */
export async function kopCetakAction(): Promise<KopCetak | null> {
    try {
        const o = await operatorAktif()
        const [[p], k] = await Promise.all([
            query<{ a1: string | null; a2: string | null; kota: string | null; email: string | null; http: string | null }>(
                "SELECT alamat_perusahaan1 a1, alamat_perusahaan2 a2, kota_perusahaan kota, email, http FROM perusahaan ORDER BY id LIMIT 1"),
            identitasKoperasi(),
        ])
        const t = (v: string | null | undefined) => (v ?? "").trim()
        const waktu = new Intl.DateTimeFormat("id-ID", { dateStyle: "long", timeStyle: "short", timeZone: "Asia/Jakarta" }).format(new Date())
        return {
            nama: k.nama, logo: k.logo, petugas: o.namaLengkap, waktu,
            alamat: [t(p?.a1), t(p?.a2), t(p?.kota)].filter(Boolean),
            kontak: [t(p?.email) && `Email: ${t(p?.email)}`, t(p?.http) && t(p?.http)].filter(Boolean) as string[],
        }
    } catch {
        return null
    }
}

type Ambil = (s: Record<string, string>) => Promise<PageData & { ekstra?: unknown }>

/** Daftar bertabel yang bisa dicetak seluruh barisnya (bukan hanya halaman yang tampil), per alamat halaman. */
const DAFTAR: Record<string, Ambil> = {
    "/dashboard/members": (s) => daftarAnggota(s) as Promise<PageData>,
    "/dashboard/members/karyawan-mattel": (s) => daftarKaryawanMattel(s) as Promise<PageData>,
    "/dashboard/members/mobile-users": (s) => daftarUserMobile(s) as Promise<PageData>,
    "/dashboard/accounting/journal": (s) => daftarJurnal(s) as Promise<PageData>,
    "/dashboard/savings/ledger": (s) => bukuSimpanan(s) as Promise<PageData>,
    "/dashboard/loans": (s) => laporanPinjaman(s) as unknown as Promise<PageData>,
    "/dashboard/savings": async (s) => {
        const { grandTotal, ...d } = await rekapSimpanan({ ...s, endDate: /^\d{4}-\d{2}-\d{2}$/.test(s.endDate ?? "") ? s.endDate : hariIni() })
        return { ...(d as unknown as PageData), ekstra: grandTotal }
    },
}

/**
 * Seluruh baris daftar sesuai filter dan urutan yang sedang dipakai (maksimal MAKS_SEMUA baris), untuk dokumen cetak.
 * Hak akses sama dengan halaman daftarnya.
 */
export async function dataCetakAction(path: string, params: Record<string, string>): Promise<{ items: Record<string, unknown>[]; total: number; ekstra?: unknown } | { error: string }> {
    try {
        const ambil = DAFTAR[path]
        if (!ambil) return { error: "Daftar ini belum bisa dicetak" }
        await operatorAktif(AKSES_HALAMAN[path])
        const { page: _h, pageSize: _p, ...saring } = params
        const d = await ambil({ ...saring, page: "1", pageSize: "semua" })
        return { items: d.items as Record<string, unknown>[], total: d.total, ekstra: d.ekstra }
    } catch (e) {
        return { error: e instanceof Error ? e.message : "Gagal mengambil data cetak" }
    }
}
