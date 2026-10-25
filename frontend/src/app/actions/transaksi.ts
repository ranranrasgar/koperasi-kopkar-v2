"use server"

import { revalidatePath } from "next/cache"
import { setorSimpanan, ambilSimpanan } from "@kopkar/backend/src/posting/simpanan.ts"
import { cairkanPinjaman, bayarAngsuran } from "@kopkar/backend/src/posting/pinjaman.ts"
import { cairkanKpr, bayarAngsuranKpr } from "@kopkar/backend/src/posting/kpr.ts"
import { bacaJurnalUmum, hapusJurnalUmum, postJurnalUmum, ubahJurnalUmum, type BuktiJurnal } from "@kopkar/backend/src/posting/jurnal-umum.ts"
import { bacaBankBook, hapusBankBook, simpanBankBook, type BuktiBankBook } from "@kopkar/backend/src/posting/bankbook.ts"
import { cicilan, jadwal, jasaTotal, jatuhTempo, persenToMicro, rpAdm, rpProvisi, type Terms } from "@kopkar/backend/src/posting/pinjaman-calc.ts"
import { toUnits, fromUnits } from "@kopkar/backend/src/posting/money.ts"
import { modeUji, pool, query, tx } from "@/lib/db"
import { GalatSesi, operatorAktif, wajibLogin, wajibMenu, type Operator } from "@/lib/operator"
import { MENU, MENU_ANGSUR_GRUP, MENU_CAIR_GRUP, MENU_TRANSAKSI, punyaIzin } from "@/config/akses"
import { cariAnggota, type AnggotaRingkas } from "@/lib/queries/anggota"
import { transaksiBankBook, type TransaksiBankBook } from "@/lib/queries/laporan"
import { riwayatAnggota, type RiwayatAnggota } from "@/lib/queries/pinjaman-riwayat"
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
        if (res.ok && await modeUji()) return { ...res, pesan: `MODE UJI, tidak tersimpan: ${res.pesan}` }
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
    if (!punyaIzin(o.izin, [...MENU_TRANSAKSI, MENU.kirimNotifikasi])) return []
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

/** Hanya superadmin atau grup admin yang boleh mengubah bunga saat pencairan; operator lain memakai bunga dari pengaturan jenis kredit. */
const bolehUbahBunga = (o: Operator) => o.superadmin || o.grup?.trim().toLowerCase() === "admin"

/** Pratinjau pencairan dengan rumus mesin posting yang sama (tanpa menulis ke database). */
export async function pratinjauPinjamanAction(p: { kodeKredit: string; tglPinjaman: string; pokok: string; lama: number; persenBunga?: string }) {
    const o = await wajibLogin() // sesi habis: alihkan ke login
    if (!punyaIzin(o.izin, [MENU.cairKoperasi, MENU.cairBank])) return null
    try {
        if (!UANG.test(p.pokok) || toUnits(p.pokok) <= 0n || !Number.isInteger(p.lama) || p.lama < 1 || !TANGGAL.test(p.tglPinjaman)) return null
        if (p.persenBunga && !UANG.test(p.persenBunga)) return null
        const persenBunga = bolehUbahBunga(o) ? p.persenBunga : undefined
        const [jk] = await query<{ bunga_kredit: string; bunga_per: string; persen_adm: string; persen_provisi: string; jatuh_tempo: number; mak_cicilan: number }>(
            "SELECT bunga_kredit::text, bunga_per, persen_adm::text, persen_provisi::text, jatuh_tempo, mak_cicilan FROM jenis_kredit WHERE kode_kredit = $1", [p.kodeKredit])
        if (!jk) return null
        const t: Terms = { pokok: toUnits(p.pokok), persenBunga: persenToMicro(persenBunga || jk.bunga_kredit),
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
        const [jk] = await query<{ group_pinjaman: string; bunga_kredit: string }>("SELECT group_pinjaman, bunga_kredit::text FROM jenis_kredit WHERE kode_kredit = $1", [teks(f, "kodeKredit")])
        if (!jk) throw new InputSalah("Jenis kredit tidak ada")
        // Bunga hanya bisa diubah admin/superadmin: dari operator lain, isian yang berbeda dari bunga jenis kredit ditolak (bukan diam-diam diabaikan).
        const bungaIsian = uangOpsional(f, "persenBunga", "Persen bunga")
        if (bungaIsian !== undefined && !bolehUbahBunga(o) && Number(bungaIsian) !== Number(jk.bunga_kredit)) throw new InputSalah("Bunga hanya bisa diubah oleh admin atau superadmin")
        if (!MENU_CAIR_GRUP[jk.group_pinjaman]) throw new InputSalah(`Jenis kredit grup ${jk.group_pinjaman} dicairkan lewat form KPR`)
        wajibMenu(o, [MENU_CAIR_GRUP[jk.group_pinjaman]])
        const r = await tx((db) => cairkanPinjaman(db, {
            kodeAgt: teks(f, "kodeAgt"), kodeKredit: teks(f, "kodeKredit"), tglPinjaman: tanggal(f),
            pokok: uang(f, "pokok", "Pokok pinjaman"), lama: bulat(f, "lama", "Lama angsuran"), kasPerkiraanId: teks(f, "kas"), opr,
            persenBunga: bolehUbahBunga(o) ? bungaIsian : undefined,
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
        const nomor = teks(f, "nomorBukti", false)
        const input = { tanggal: tanggal(f), deskripsi: teks(f, "deskripsi"), opr, lines }
        const r = await tx((db) => nomor ? ubahJurnalUmum(db, nomor, input) : postJurnalUmum(db, input))
        const total = lines.reduce((s, l) => s + toUnits(l.debit), 0n)
        return { ok: true, pesan: `Jurnal ${r.nomorBukti} ${nomor ? "diubah" : "tercatat"} (${r.baris} baris)`,
            rincian: { "No. Bukti": r.nomorBukti, "Total debit = kredit": rp(total) } }
    })
}

// ---------- bank book (kas & bank) ----------

/** Simpan bukti Bank Book baru, atau ubah bukti lama bila `nomorBukti` terisi. */
export async function bankBookAction(_: Hasil, f: FormData): Promise<Hasil> {
    return posting([MENU.bankBook], async ({ nama: opr }) => {
        const kode = f.getAll("lawan").map(String), debit = f.getAll("debit").map(String), kredit = f.getAll("kredit").map(String), ket = f.getAll("ketBaris").map(String)
        const lawan = kode.map((k, i) => {
            const d = (debit[i] || "0").replace(/,/g, "."), c = (kredit[i] || "0").replace(/,/g, ".")
            if (!UANG.test(d) || !UANG.test(c)) throw new InputSalah(`Baris ${i + 1}: nominal harus angka`)
            return { kodePerkiraan: k.trim(), debit: d, kredit: c, deskripsi: ket[i]?.trim() || undefined }
        })
        const nomor = teks(f, "nomorBukti", false) || undefined
        const r = await tx((db) => simpanBankBook(db, { akunBank: teks(f, "akunBank"), tanggal: tanggal(f),
            deskripsi: teks(f, "deskripsi"), lawan, opr, nomorBukti: nomor }))
        return { ok: true, pesan: `Bukti ${r.nomorBukti} ${nomor ? "diubah" : "tercatat"}`, rincian: { "No. Bukti": r.nomorBukti, "Total": rp(r.total) } }
    })
}

export async function hapusBankBookAction(nomorBukti: string): Promise<Hasil> {
    return posting([MENU.bankBook], async () => {
        await tx((db) => hapusBankBook(db, nomorBukti))
        return { ok: true, pesan: `Bukti ${nomorBukti} dihapus` }
    })
}

/** Isi form ubah: bukti dilihat dari akun kas/bank yang sedang dibuka. */
export async function bacaBankBookAction(nomorBukti: string, akunBank: string): Promise<{ bukti: BuktiBankBook } | { error: string }> {
    try {
        await operatorAktif([MENU.bankBook])
        const b = await bacaBankBook(pool, nomorBukti, akunBank)
        return b ? { bukti: b } : { error: `Bukti ${nomorBukti} tidak ditemukan` }
    } catch (e) {
        return { error: e instanceof Error ? e.message : "Gagal membaca bukti" }
    }
}

/** Bukti satu akun kas/bank pada satu tanggal, untuk modal harian Bank Book. */
export async function transaksiBankBookAction(akunBank: string, tgl: string): Promise<{ items: TransaksiBankBook[] } | { error: string }> {
    try {
        await operatorAktif([MENU.bankBook])
        if (!TANGGAL.test(tgl)) throw new InputSalah("Tanggal tidak valid")
        return { items: await transaksiBankBook(akunBank, tgl) }
    } catch (e) {
        return { error: e instanceof Error ? e.message : "Gagal membaca transaksi" }
    }
}

// ---------- ubah, hapus, voucher bukti jurnal ----------

const MENU_BUKTI = [MENU.jurnalUmum, MENU.bankBook, MENU.shu] // voucher juga untuk bukti pencairan SHU

/** Isi form ubah jurnal umum, beserta daftar akun (dimuat saat form dibuka, bukan di tiap baris daftar). */
export async function bacaJurnalAction(nomorBukti: string): Promise<{ bukti: BuktiJurnal; akun: { id: number; kode_perkiraan: string; nama_perkiraan: string }[] } | { error: string }> {
    try {
        await operatorAktif([MENU.jurnalUmum])
        const bukti = await bacaJurnalUmum(pool, nomorBukti)
        if (!bukti) return { error: `Bukti ${nomorBukti} tidak ditemukan` }
        return { bukti, akun: await query("SELECT id, kode_perkiraan, nama_perkiraan FROM perkiraan ORDER BY kode_perkiraan") }
    } catch (e) {
        return { error: e instanceof Error ? e.message : "Gagal membaca bukti" }
    }
}

/** Hapus bukti JU/ (izin Jurnal Umum) atau BB/ (izin Bank Book) yang belum direkonsiliasi. */
export async function hapusJurnalAction(nomorBukti: string): Promise<Hasil> {
    return posting(nomorBukti.startsWith("BB/") ? [MENU.bankBook] : [MENU.jurnalUmum], async () => {
        await tx((db) => hapusJurnalUmum(db, nomorBukti))
        return { ok: true, pesan: `Bukti ${nomorBukti} dihapus` }
    })
}

/** Data voucher: satu bukti dengan semua barisnya, untuk dicetak. */
export async function dataVoucherAction(nomorBukti: string): Promise<{ bukti: BuktiJurnal } | { error: string }> {
    try {
        await operatorAktif(MENU_BUKTI)
        const bukti = await bacaJurnalUmum(pool, nomorBukti)
        return bukti ? { bukti } : { error: `Bukti ${nomorBukti} tidak ditemukan` }
    } catch (e) {
        return { error: e instanceof Error ? e.message : "Gagal membaca bukti" }
    }
}

/** Profil dan riwayat pinjaman anggota untuk keputusan pencairan (sisa utang, tunggakan, keterlambatan dulu, pernah macet). */
export async function riwayatAnggotaAction(kodeAgt: string): Promise<RiwayatAnggota | null> {
    const o = await wajibLogin() // sesi habis: alihkan ke login
    if (!punyaIzin(o.izin, [MENU.cairKoperasi, MENU.cairBank, MENU.cairKpr, MENU.angsurKoperasi, MENU.angsurBank, MENU.angsurKpr])) return null
    return riwayatAnggota(kodeAgt)
}
