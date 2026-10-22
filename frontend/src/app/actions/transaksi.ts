"use server"

import { revalidatePath } from "next/cache"
import { setorSimpanan, ambilSimpanan } from "@kopkar/backend/src/posting/simpanan.ts"
import { cairkanPinjaman, bayarAngsuran } from "@kopkar/backend/src/posting/pinjaman.ts"
import { cairkanKpr, bayarAngsuranKpr } from "@kopkar/backend/src/posting/kpr.ts"
import { postJurnalUmum } from "@kopkar/backend/src/posting/jurnal-umum.ts"
import { cicilan, jadwal, jasaTotal, jatuhTempo, persenToMicro, rpAdm, rpProvisi, type Terms } from "@kopkar/backend/src/posting/pinjaman-calc.ts"
import { toUnits, fromUnits } from "@kopkar/backend/src/posting/money.ts"
import { modeUji, query, tx } from "@/lib/db"
import { GalatSesi, operatorAktif, wajibLogin, wajibMenu, type Operator } from "@/lib/operator"
import { MENU, MENU_ANGSUR_GRUP, MENU_CAIR_GRUP, MENU_TRANSAKSI, punyaIzin } from "@/config/akses"
import { cariAnggota, type AnggotaRingkas } from "@/lib/queries/anggota"
import { kprBerjalan, pinjamanBerjalan, type KprBerjalan, type PinjamanBerjalan } from "@/lib/queries/pinjaman"

export type Hasil = { ok: true; pesan: string; rincian?: Record<string, string | number>; jadwal?: Jadwal[] } | { ok: false; error: string } | null
export type Jadwal = { ke: number; tanggal: string; pokok: number; jasa: number; adm: number; provisi: number }

const TANGGAL = /^\d{4}-\d{2}-\d{2}$/
const UANG = /^\d+(\.\d{1,4})?$/

class InputSalah extends Error {}

const LABEL: Record<string, string> = {
    kodeAgt: "Anggota", jenisSimpanan: "Jenis simpanan", kas: "Akun kas/bank", kodeKredit: "Jenis kredit",
    noPinjaman: "Pinjaman", tanggal: "Tanggal", jumlah: "Jumlah", pokok: "Pokok", lama: "Lama angsuran", deskripsi: "Keterangan",
}

function teks(f: FormData, k: string, wajib = true) {
    const v = String(f.get(k) ?? "").trim()
    if (wajib && !v) throw new InputSalah(`${LABEL[k] ?? k} wajib diisi`)
    return v
}
function tanggal(f: FormData, k = "tanggal") {
    const v = teks(f, k)
    if (!TANGGAL.test(v)) throw new InputSalah("Tanggal tidak valid")
    return v
}
function uang(f: FormData, k: string, label: string) {
    const v = teks(f, k).replace(/,/g, ".")
    if (!UANG.test(v) || toUnits(v) <= 0n) throw new InputSalah(`${label} harus angka lebih dari nol`)
    return v
}
function uangOpsional(f: FormData, k: string, label: string) {
    const v = teks(f, k, false).replace(/,/g, ".")
    if (!v) return undefined
    if (!UANG.test(v)) throw new InputSalah(`${label} harus angka`)
    return v
}
function bulat(f: FormData, k: string, label: string) {
    const n = Number(teks(f, k))
    if (!Number.isInteger(n) || n < 1) throw new InputSalah(`${label} harus bilangan bulat >= 1`)
    return n
}
const rp = (v: string | bigint) => Number(typeof v === "bigint" ? fromUnits(v) : v)

/**
 * Jalankan posting dalam satu transaksi; pesan galat mesin posting diteruskan ke kasir.
 * `menu`: menu desktop yang mengizinkan aksi ini (cukup salah satu); pemeriksaan per grup pinjaman di dalam fn.
 */
async function posting(menu: readonly string[], fn: (o: Operator) => Promise<Exclude<Hasil, null>>): Promise<Hasil> {
    try {
        const o = await operatorAktif(menu)
        const res = await fn(o)
        if (modeUji && res.ok) return { ...res, pesan: `MODE UJI, tidak tersimpan: ${res.pesan}` }
        revalidatePath("/dashboard", "layout")
        return res
    } catch (e) {
        if (!(e instanceof InputSalah) && !(e instanceof GalatSesi)) console.error("posting gagal:", e)
        return { ok: false, error: e instanceof Error ? e.message : "Transaksi gagal" }
    }
}

// ---------- pencarian dan info anggota ----------

export async function cariAnggotaAction(kata: string): Promise<AnggotaRingkas[]> {
    const o = await wajibLogin() // sesi habis: alihkan ke login
    if (!punyaIzin(o.izin, MENU_TRANSAKSI)) return []
    if (kata.trim().length < 2) return []
    return cariAnggota(kata)
}

export interface InfoAnggota {
    saldo: { kode_simpanan: string; nama_simpanan: string; saldo: number }[]
    pinjaman: PinjamanBerjalan[]
    kpr: KprBerjalan[]
}

export async function infoAnggotaAction(kodeAgt: string): Promise<InfoAnggota> {
    const o = await wajibLogin() // sesi habis: alihkan ke login
    if (!punyaIzin(o.izin, MENU_TRANSAKSI)) return { saldo: [], pinjaman: [], kpr: [] }
    const [saldo, pinjaman, kpr] = await Promise.all([
        query<InfoAnggota["saldo"][number]>(
            `SELECT j.kode_simpanan, j.nama_simpanan, COALESCE(SUM(s.rp_setoran - s.rp_pengambilan), 0) AS saldo
               FROM jenis_simpanan j
               LEFT JOIN simpanan s ON s.jenis_simpanan_id = j.id AND s.anggota_id = (SELECT id FROM anggota WHERE kode_agt = $1)
              GROUP BY j.id ORDER BY j.kode_simpanan`, [kodeAgt]),
        pinjamanBerjalan(kodeAgt),
        kprBerjalan(kodeAgt),
    ])
    return { saldo, pinjaman, kpr }
}

// ---------- simpanan ----------

async function simpanan(tipe: "setor" | "ambil", f: FormData): Promise<Hasil> {
    return posting([tipe === "setor" ? MENU.setoranSimpanan : MENU.pencairanSimpanan], async ({ nama: opr }) => {
        const input = {
            kodeAgt: teks(f, "kodeAgt"), jenisSimpanan: teks(f, "jenisSimpanan"), tanggal: tanggal(f),
            jumlah: uang(f, "jumlah", "Jumlah"), kasPerkiraanId: teks(f, "kas"), opr, deskripsi: teks(f, "deskripsi", false) || null,
        }
        const r = await tx((db) => (tipe === "setor" ? setorSimpanan : ambilSimpanan)(db, input))
        return { ok: true, pesan: `${tipe === "setor" ? "Setoran" : "Pengambilan"} tercatat dengan nomor ${r.noBukti}`,
            rincian: { "No. Bukti": r.noBukti, "Jumlah": rp(input.jumlah), "Saldo setelah transaksi": rp(r.saldoSetelah) } }
    })
}

export async function setorSimpananAction(_: Hasil, f: FormData) { return simpanan("setor", f) }
export async function ambilSimpananAction(_: Hasil, f: FormData) { return simpanan("ambil", f) }

// ---------- pinjaman tunai ----------

/** Pratinjau pencairan dengan rumus mesin posting yang sama (tanpa menulis ke database). */
export async function pratinjauPinjamanAction(p: { kodeKredit: string; tglPinjaman: string; pokok: string; lama: number; persenBunga?: string }) {
    const o = await wajibLogin() // sesi habis: alihkan ke login
    if (!punyaIzin(o.izin, [MENU.cairKoperasi, MENU.cairBank])) return null
    try {
        if (!UANG.test(p.pokok) || toUnits(p.pokok) <= 0n || !Number.isInteger(p.lama) || p.lama < 1 || !TANGGAL.test(p.tglPinjaman)) return null
        if (p.persenBunga && !UANG.test(p.persenBunga)) return null
        const [jk] = await query<{ bunga_kredit: string; bunga_per: string; persen_adm: string; persen_provisi: string; jatuh_tempo: number; mak_cicilan: number }>(
            "SELECT bunga_kredit::text, bunga_per, persen_adm::text, persen_provisi::text, jatuh_tempo, mak_cicilan FROM jenis_kredit WHERE kode_kredit = $1", [p.kodeKredit])
        if (!jk) return null
        const t: Terms = { pokok: toUnits(p.pokok), persenBunga: persenToMicro(p.persenBunga || jk.bunga_kredit),
            perAngsuran: jk.bunga_per.toUpperCase() === "PER ANGSURAN", lama: p.lama,
            persenAdm: persenToMicro(jk.persen_adm), persenProvisi: persenToMicro(jk.persen_provisi) }
        const baris: Jadwal[] = jadwal(t).map((c) => ({ ke: c.ke, tanggal: jatuhTempo(p.tglPinjaman, jk.jatuh_tempo, c.ke),
            pokok: rp(c.pokok), jasa: rp(c.jasa), adm: rp(c.adm), provisi: rp(c.provisi) }))
        return { jasaTotal: rp(jasaTotal(t)), adm: rp(rpAdm(t)), provisi: rp(rpProvisi(t)), makCicilan: jk.mak_cicilan, jadwal: baris }
    } catch {
        return null
    }
}

export async function cairkanPinjamanAction(_: Hasil, f: FormData): Promise<Hasil> {
    return posting([MENU.cairKoperasi, MENU.cairBank], async (o) => {
        const opr = o.nama
        const [jk] = await query<{ group_pinjaman: string }>("SELECT group_pinjaman FROM jenis_kredit WHERE kode_kredit = $1", [teks(f, "kodeKredit")])
        if (!jk) throw new InputSalah("Jenis kredit tidak ada")
        if (!MENU_CAIR_GRUP[jk.group_pinjaman]) throw new InputSalah(`Jenis kredit grup ${jk.group_pinjaman} dicairkan lewat form KPR`)
        wajibMenu(o, [MENU_CAIR_GRUP[jk.group_pinjaman]])
        const r = await tx((db) => cairkanPinjaman(db, {
            kodeAgt: teks(f, "kodeAgt"), kodeKredit: teks(f, "kodeKredit"), tglPinjaman: tanggal(f),
            pokok: uang(f, "pokok", "Pokok pinjaman"), lama: bulat(f, "lama", "Lama angsuran"), kasPerkiraanId: teks(f, "kas"), opr,
            persenBunga: uangOpsional(f, "persenBunga", "Persen bunga"),
        }))
        return { ok: true, pesan: `Pinjaman ${r.noPinjaman} dicairkan`,
            rincian: { "No. Pinjaman": r.noPinjaman, "Total jasa": rp(r.jasaTotal) },
            jadwal: r.jadwal.map((j) => ({ ke: j.ke, tanggal: j.tanggal, pokok: rp(j.pokok), jasa: rp(j.jasa), adm: 0, provisi: 0 })) }
    })
}

/** Angsuran berikutnya dari pinjaman tunai, dihitung dengan rumus mesin posting. */
export async function angsuranBerikutnyaAction(noPinjaman: string) {
    const o = await wajibLogin() // sesi habis: alihkan ke login
    if (!punyaIzin(o.izin, [MENU.angsurKoperasi, MENU.angsurBank])) return null
    const [p] = await query<{ rp_pinjaman_pokok: string; persen_bunga: string; bunga_per: number; lama_angsuran: number; jml_cicilan: number;
        persen_adm: string; persen_provisi: string }>(
        `SELECT rp_pinjaman_pokok::text, persen_bunga::text, bunga_per, lama_angsuran, jml_cicilan, persen_adm::text, persen_provisi::text
           FROM pinjaman_tunai WHERE no_pinjaman = $1`, [noPinjaman])
    if (!p || p.jml_cicilan >= p.lama_angsuran) return null
    const t: Terms = { pokok: toUnits(p.rp_pinjaman_pokok), persenBunga: persenToMicro(p.persen_bunga), perAngsuran: p.bunga_per === 1,
        lama: p.lama_angsuran, persenAdm: persenToMicro(p.persen_adm), persenProvisi: persenToMicro(p.persen_provisi) }
    const c = cicilan(t, p.jml_cicilan + 1)
    return { ke: c.ke, lama: p.lama_angsuran, pokok: rp(c.pokok), jasa: rp(c.jasa), adm: rp(c.adm), provisi: rp(c.provisi) }
}

export async function bayarAngsuranAction(_: Hasil, f: FormData): Promise<Hasil> {
    return posting([MENU.angsurKoperasi, MENU.angsurBank], async (o) => {
        const opr = o.nama
        const [jk] = await query<{ group_pinjaman: string }>(
            "SELECT jk.group_pinjaman FROM pinjaman_tunai p JOIN jenis_kredit jk ON jk.id = p.jenis_kredit_id WHERE p.no_pinjaman = $1", [teks(f, "noPinjaman")])
        if (jk) wajibMenu(o, [MENU_ANGSUR_GRUP[jk.group_pinjaman] ?? MENU.angsurKoperasi])
        const override = {
            jasa: uangOpsional(f, "jasa", "Jasa"), adm: uangOpsional(f, "adm", "Adm"), provisi: uangOpsional(f, "provisi", "Provisi"),
        }
        const r = await tx((db) => bayarAngsuran(db, {
            noPinjaman: teks(f, "noPinjaman"), tanggal: tanggal(f), kasPerkiraanId: teks(f, "kas"), opr,
            override: Object.values(override).some((v) => v !== undefined) ? override : undefined,
        }))
        const total = toUnits(r.pokok) + toUnits(r.jasa) + toUnits(r.adm) + toUnits(r.provisi)
        return { ok: true, pesan: `Angsuran ke-${r.ke} tercatat dengan nomor ${r.noBukti}${r.lunas ? " (LUNAS)" : ""}`,
            rincian: { "No. Bukti": r.noBukti, "Pokok": rp(r.pokok), "Jasa": rp(r.jasa), "Adm": rp(r.adm), "Provisi": rp(r.provisi),
                "Total": rp(total), "Sisa pokok": rp(r.sisaPokok) } }
    })
}

// ---------- KPR ----------

export async function cairkanKprAction(_: Hasil, f: FormData): Promise<Hasil> {
    return posting([MENU.cairKpr], async ({ nama: opr }) => {
        const r = await tx((db) => cairkanKpr(db, {
            kodeAgt: teks(f, "kodeAgt"), kodeKredit: teks(f, "kodeKredit"), tglPinjaman: tanggal(f),
            pokok: uang(f, "pokok", "Pokok KPR"), lama: bulat(f, "lama", "Lama angsuran"), kasPerkiraanId: teks(f, "kas"), opr,
            angsuranPerBulan: uangOpsional(f, "angsuran", "Angsuran per bulan"),
        }))
        return { ok: true, pesan: `KPR ${r.noPinjaman} dicatat`,
            rincian: { "No. KPR": r.noPinjaman, "Angsuran per bulan": rp(r.angsuranPerBulan) } }
    })
}

export async function bayarAngsuranKprAction(_: Hasil, f: FormData): Promise<Hasil> {
    return posting([MENU.angsurKpr], async ({ nama: opr }) => {
        const r = await tx((db) => bayarAngsuranKpr(db, {
            noPinjaman: teks(f, "noPinjaman"), tanggal: tanggal(f), kasPerkiraanId: teks(f, "kas"), opr,
            jumlah: uangOpsional(f, "jumlah", "Jumlah"),
        }))
        return { ok: true, pesan: `Angsuran KPR ke-${r.ke} tercatat dengan nomor ${r.noBukti}${r.lunas ? " (LUNAS)" : ""}`,
            rincian: { "No. Bukti": r.noBukti, "Jumlah": rp(r.jumlah), "Sisa pokok": rp(r.sisaPokok) } }
    })
}

// ---------- jurnal umum ----------

export async function jurnalUmumAction(_: Hasil, f: FormData): Promise<Hasil> {
    return posting([MENU.jurnalUmum], async ({ nama: opr }) => {
        const akun = f.getAll("akun").map(String), debit = f.getAll("debit").map(String), kredit = f.getAll("kredit").map(String)
        const ket = f.getAll("ketBaris").map(String)
        const lines = akun.map((a, i) => {
            const d = (debit[i] || "0").replace(/,/g, "."), k = (kredit[i] || "0").replace(/,/g, ".")
            if (!UANG.test(d) || !UANG.test(k)) throw new InputSalah(`Baris ${i + 1}: nilai harus angka`)
            if (toUnits(d) > 0n && toUnits(k) > 0n) throw new InputSalah(`Baris ${i + 1}: isi debit atau kredit, bukan keduanya`)
            return { kodePerkiraan: a.trim(), debit: d, kredit: k, deskripsi: ket[i]?.trim() || undefined }
        }).filter((l) => l.kodePerkiraan && (toUnits(l.debit) > 0n || toUnits(l.kredit) > 0n))
        if (lines.length < 2) throw new InputSalah("Jurnal minimal dua baris berisi nilai")
        const r = await tx((db) => postJurnalUmum(db, { tanggal: tanggal(f), deskripsi: teks(f, "deskripsi"), opr, lines }))
        const total = lines.reduce((s, l) => s + toUnits(l.debit), 0n)
        return { ok: true, pesan: `Jurnal ${r.nomorBukti} tercatat (${r.baris} baris)`,
            rincian: { "No. Bukti": r.nomorBukti, "Total debit = kredit": rp(total) } }
    })
}
