"use server"

import { revalidatePath } from "next/cache"
import { generatePotongan, postingPotongan, setDipotong, ubahPotongan } from "@kopkar/backend/src/posting/potongan.ts"
import { detailAnggotaPeriode, satuPeriode } from "@/lib/queries/potongan-gaji"
import { modeUji, tx } from "@/lib/db"
import { GalatSesi, operatorAktif } from "@/lib/operator"
import { MENU } from "@/config/akses"
import type { Hasil } from "@/app/actions/transaksi"

const PERIODE = /^\d{4}-(0[1-9]|1[0-2])$/
const MENU_POTONGAN = [MENU.potonganSemua]

class InputSalah extends Error {}

const teks = (f: FormData, k: string) => String(f.get(k) ?? "").trim()
function periode(f: FormData) {
    const p = teks(f, "periode")
    if (!PERIODE.test(p)) throw new InputSalah("Periode tidak valid")
    return p
}
// Isian angka biasa (input type=number); koma desimal diterima. Kosong = 0.
const uang = (f: FormData, k: string) => teks(f, k).replace(",", ".") || "0"

/** Pola sama dengan posting() di actions/transaksi: satu transaksi, mode uji di-rollback, galat diteruskan ke operator. */
async function aksi(fn: (opr: string) => Promise<Exclude<Hasil, null>>): Promise<Hasil> {
    try {
        const o = await operatorAktif(MENU_POTONGAN)
        const res = await fn(o.nama)
        if (res.ok && await modeUji()) return { ...res, pesan: `MODE UJI, tidak tersimpan: ${res.pesan}` }
        revalidatePath("/dashboard", "layout")
        return res
    } catch (e) {
        if (!(e instanceof InputSalah) && !(e instanceof GalatSesi)) console.error("potongan gaji gagal:", e)
        return { ok: false, error: e instanceof Error ? e.message : "Proses gagal" }
    }
}

export async function generatePotonganAction(_: Hasil, f: FormData): Promise<Hasil> {
    return aksi(async (opr) => {
        const r = await tx((db) => generatePotongan(db, periode(f), opr))
        return { ok: true, pesan: `Potongan ${r.periode} digenerate: ${r.anggota} anggota, ${r.pinjaman} pinjaman`,
            rincian: { "Anggota": r.anggota, "Pinjaman": r.pinjaman, "Total potongan": Number(r.total) } }
    })
}

export async function ubahPotonganAction(_: Hasil, f: FormData): Promise<Hasil> {
    return aksi(async (opr) => {
        const p = periode(f), kode = teks(f, "kodeAgt")
        const dipotong = f.get("dipotong") === "1"
        const pinjaman = teks(f, "pinjamanIds").split(",").filter(Boolean).map((id) => ({
            id, pokok: uang(f, `pokok_${id}`), jasa: uang(f, `jasa_${id}`), adm: uang(f, `adm_${id}`), provisi: uang(f, `provisi_${id}`),
        }))
        await tx((db) => ubahPotongan(db, p, kode, { dipotong, alasan: teks(f, "alasan") || null,
            sWajib: uang(f, "sWajib"), sSukarela: uang(f, "sSukarela"), pinjaman }, opr))
        return { ok: true, pesan: `Potongan ${kode} untuk ${p} disimpan${dipotong ? "" : " (tidak dipotong)"}` }
    })
}

/** Saklar Dipotong di grid (seperti centang tmp di desktop). */
export async function setDipotongAction(p: string, kodeAgt: string, dipotong: boolean): Promise<Hasil> {
    return aksi(async (opr) => {
        if (!PERIODE.test(p)) throw new InputSalah("Periode tidak valid")
        await tx((db) => setDipotong(db, p, kodeAgt, dipotong, null, opr))
        return { ok: true, pesan: `${kodeAgt} ${dipotong ? "dipotong" : "tidak dipotong"}` }
    })
}

/** Rincian satu anggota untuk modal Ubah. */
export async function detailPotonganAction(p: string, kodeAgt: string) {
    await operatorAktif(MENU_POTONGAN)
    if (!PERIODE.test(p)) return null
    const [per, d] = await Promise.all([satuPeriode(p), detailAnggotaPeriode(p, kodeAgt)])
    return per && d ? { status: per.status, ...d } : null
}

export async function postingPotonganAction(_: Hasil, f: FormData): Promise<Hasil> {
    return aksi(async (opr) => {
        const p = periode(f), tanggal = teks(f, "tanggal"), kas = teks(f, "kas")
        if (teks(f, "konfirmasi") !== p) throw new InputSalah(`Ketik ${p} untuk mengonfirmasi posting`)
        if (!/^\d{4}-\d{2}-\d{2}$/.test(tanggal)) throw new InputSalah("Tanggal posting tidak valid")
        if (!kas) throw new InputSalah("Pilih akun kas/bank")
        const r = await tx((db) => postingPotongan(db, { periode: p, tanggal, kasPerkiraanId: kas, opr }))
        return { ok: true, pesan: `Potongan ${p} diposting untuk ${r.anggota} anggota`,
            rincian: { "Anggota": r.anggota, "Setoran simpanan": r.simpanan, "Angsuran pinjaman": r.angsuran, "Angsuran KPR": r.kpr } }
    })
}
