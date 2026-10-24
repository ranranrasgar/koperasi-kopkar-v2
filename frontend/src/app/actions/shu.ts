"use server"

import { revalidatePath } from "next/cache"
import { batalkanPencairan, cairkanShu, hitungShu, postingKeSukarela, postingShu, tutupBuku } from "@kopkar/backend/src/posting/shu.ts"
import { modeUji, tx } from "@/lib/db"
import { GalatSesi, operatorAktif, type Operator } from "@/lib/operator"
import { MENU } from "@/config/akses"
import type { Hasil } from "@/app/actions/transaksi"

const TANGGAL = /^\d{4}-\d{2}-\d{2}$/

/** Tindakan yang di desktop meminta login administrator: hanya superadmin atau grup admin. */
function wajibAdmin(o: Operator) {
    if (!o.superadmin && o.grup?.trim().toLowerCase() !== "admin") throw new GalatSesi("Tindakan ini hanya untuk superadmin atau admin")
}

/** Jalankan satu proses SHU dalam transaksi; mode uji tidak menyimpan, pesan galat diteruskan ke pengguna. */
async function proses(menu: readonly string[], admin: boolean, fn: (o: Operator) => Promise<{ pesan: string; rincian?: Record<string, string | number> }>): Promise<Hasil> {
    try {
        const o = await operatorAktif(menu)
        if (admin) wajibAdmin(o)
        const r = await fn(o)
        if (await modeUji()) return { ok: true, pesan: `MODE UJI, tidak tersimpan: ${r.pesan}`, rincian: r.rincian }
        revalidatePath("/dashboard", "layout")
        return { ok: true, pesan: r.pesan, rincian: r.rincian }
    } catch (e) {
        return { ok: false, error: e instanceof Error ? e.message : "Proses gagal" }
    }
}

const tahunDari = (v: unknown) => {
    const t = Number(v)
    if (!Number.isInteger(t)) throw new GalatSesi("Tahun tidak valid")
    return t
}
const tanggalDari = (v: unknown) => {
    const s = String(v ?? "")
    if (!TANGGAL.test(s)) throw new GalatSesi("Tanggal tidak valid")
    return s
}
const angka = (v: string) => Number(v)

export async function tutupBukuAction(tahun: number): Promise<Hasil> {
    return proses([MENU.tutupBuku], true, async (o) => {
        const r = await tx((db) => tutupBuku(db, { tahun: tahunDari(tahun), opr: o.nama }))
        return {
            pesan: `Tutup buku ${tahun} selesai (${r.nomorBukti}, ${r.baris} baris). Lanjutkan ke Hitung SHU.`,
            rincian: { "Pendapatan sebelum pajak": angka(r.rencana.pendapatan), "Pajak": angka(r.rencana.pajak), "Laba ditahan": angka(r.rencana.labaDitahan),
                "SHU anggota": angka(r.rencana.shuAnggota), ...(Math.abs(angka(r.selisih)) >= 0.005 ? { "Selisih jurnal lama (dibawa apa adanya)": angka(r.selisih) } : {}) },
        }
    })
}

export async function hitungShuAction(tahun: number, sukarela: boolean): Promise<Hasil> {
    return proses([MENU.hitungShu], false, async (o) => {
        const r = await tx((db) => hitungShu(db, { tahun: tahunDari(tahun), opr: o.nama, sukarela }))
        return { pesan: `SHU ${tahun} dihitung untuk ${r.anggota} anggota. Periksa hasilnya, lalu posting.`, rincian: { "SHU anggota (kolam)": angka(r.kolam), "Total bagian": angka(r.totalBagian) } }
    })
}

export async function postingShuAction(tahun: number): Promise<Hasil> {
    return proses([MENU.hitungShu], true, async (o) => {
        const r = await tx((db) => postingShu(db, { tahun: tahunDari(tahun), opr: o.nama }))
        return { pesan: `SHU ${tahun} diposting untuk ${r.anggota} anggota; siap dicairkan.` }
    })
}

/** Cairkan SHU satu anggota tunai (form modal: akun kas/bank dan tanggal). */
export async function cairkanShuAction(_: Hasil, f: FormData): Promise<Hasil> {
    return proses([MENU.shu], false, async (o) => {
        const r = await tx((db) => cairkanShu(db, { tahun: tahunDari(f.get("tahun")), kodeAgt: String(f.get("kodeAgt") ?? ""), akunKas: String(f.get("akunKas") ?? ""),
            tanggal: tanggalDari(f.get("tanggal")), opr: o.nama }))
        return { pesan: `SHU dicairkan dengan nomor ${r.nomorBukti}`, rincian: { "No. Bukti": r.nomorBukti, "Jumlah": angka(r.jumlah) } }
    })
}

export async function batalkanShuAction(tahun: number, kodeAgt: string): Promise<Hasil> {
    return proses([MENU.shu], true, async () => {
        await tx((db) => batalkanPencairan(db, { tahun: tahunDari(tahun), kodeAgt }))
        return { pesan: `Pencairan SHU ${kodeAgt} dibatalkan` }
    })
}

/** Pindahkan semua SHU yang belum diambil ke simpanan sukarela (form modal: tanggal). */
export async function postingSukarelaAction(_: Hasil, f: FormData): Promise<Hasil> {
    return proses([MENU.shu], true, async (o) => {
        const r = await tx((db) => postingKeSukarela(db, { tahun: tahunDari(f.get("tahun")), tanggal: tanggalDari(f.get("tanggal")), opr: o.nama }))
        return { pesan: `${r.anggota} anggota: SHU dipindahkan ke simpanan sukarela`, rincian: { "Anggota": r.anggota, "Jumlah": angka(r.jumlah) } }
    })
}
