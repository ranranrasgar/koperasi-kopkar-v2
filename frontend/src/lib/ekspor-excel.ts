import { kopCetakAction } from "@/app/actions/cetak"
import { bukaCetak, esc, tabelHtml, type KolomTabel, type Orientasi } from "@/lib/cetak-klien"
import { buatXlsx, kolomExcel, type Gaya, type SelGaya } from "@/lib/xlsx"

// Ekspor Excel yang isinya sama dengan dokumen cetak: kop koperasi, judul, tabel berbingkai, angka sungguhan, baris total, keterangan operator.

export type Nilai = string | number | null

export interface BagianTabel {
    judul?: string
    kolom: KolomTabel[]
    baris: Nilai[][]
    total?: Nilai[]
    /** Tambahkan kolom nomor urut di depan, seperti dokumen cetak. */
    nomor?: boolean
    /** Tabel keterangan (label dan nilai): tanpa kolom nomor dan tanpa baris jumlah data. */
    polos?: boolean
    /** Indeks baris yang ditebalkan (mis. LABA BERSIH di tengah tabel). */
    tebal?: number[]
    /** Jumlah seluruh baris bila data terpotong batas, supaya ada keterangannya. */
    jumlahTotal?: number
}

/** Data dari server component: semua sel berupa teks mentah, baris pertama = judul kolom. */
export interface BagianMentah { judul?: string; baris: string[][]; polos?: boolean; jumlahTotal?: number }

export interface OpsiBagian { nama: string; judul: string; subjudul?: string; orientasi?: Orientasi; bagian: BagianTabel[] }

const BUKAN_ANGKA = /^(no\b|no\.|kode|kpk|nik|akun|bukti|rekening)/i
const BARIS_TOTAL = /^(Total|Jumlah|LABA BERSIH|RUGI BERSIH)/

/** Baris "Total ..." dikenali dari sel pertama yang terisi, jadi akun bernama "Laba ..." di tengah baris tidak ikut. */
const adalahTotal = (r: string[]) => BARIS_TOTAL.test(r.find((v) => v !== "") ?? "")

/** Kenali kolom angka dan tanggal dari teks mentah. Kode, KPK, dan nomor tetap teks walau isinya digit. */
export function dariMentah(b: BagianMentah): BagianTabel {
    const [kepalaPenuh = [], ...isiPenuh] = b.baris
    const lepasNo = kepalaPenuh[0] === "No."
    const kepala = lepasNo ? kepalaPenuh.slice(1) : kepalaPenuh
    const isi = lepasNo ? isiPenuh.map((r) => r.slice(1)) : isiPenuh
    const angka = kepala.map((k, j) => {
        const sel = isi.map((r) => r[j] ?? "").filter((v) => v !== "")
        return !BUKAN_ANGKA.test(k) && sel.length > 0 && sel.every((v) => /^-?\d+(\.\d+)?$/.test(v))
    })
    const nilai = (v: string, j: number): Nilai => {
        if (v === "" || v === undefined) return null
        if (angka[j]) return Number(v)
        const t = /^(\d{4})-(\d{2})-(\d{2})(T|$)/.exec(v)
        return t ? `${t[3]}/${t[2]}/${t[1]}` : v
    }
    const akhirTotal = isi.length > 0 && adalahTotal(isi[isi.length - 1])
    const utama = akhirTotal ? isi.slice(0, -1) : isi
    return {
        judul: b.judul, polos: b.polos, nomor: lepasNo, jumlahTotal: b.jumlahTotal,
        kolom: kepala.map((label, j) => ({ label, kanan: angka[j] })),
        baris: utama.map((r) => kepala.map((_, j) => nilai(r[j], j))),
        total: akhirTotal ? kepala.map((_, j) => nilai(isi[isi.length - 1][j], j)) : undefined,
        tebal: utama.flatMap((r, i) => (adalahTotal(r) ? [i] : [])),
    }
}

/** Teks angka dokumen cetak (1.234.567 / 1.234,56 / Rp 1.234) menjadi angka Excel; selain itu null. */
export function angkaDariTeks(s: string): number | null {
    const t = s.replace(/\s+\*$/, "").replace(/ /g, " ").replace(/Rp\s?/, "").trim()
    const m = /^(-?)(\d{1,3}(?:\.\d{3})*|\d+)(?:,(\d+))?$/.exec(t)
    return m ? Number(`${m[1]}${m[2].replace(/\./g, "")}.${m[3] ?? "0"}`) : null
}

const teks = (v: Nilai) => v === null ? "" : typeof v === "number" ? v.toLocaleString("id-ID", { maximumFractionDigits: 2 }) : v

/** Dokumen cetak dari bagian yang sama dengan isi Excel, jadi keduanya selalu cocok. */
export async function cetakBagian(o: Omit<OpsiBagian, "nama">) {
    const isi = o.bagian.map((b) => (b.judul ? `<h3 style="margin:12px 0 4px;font-size:12px">${esc(b.judul)}</h3>` : "")
        + tabelHtml(b.kolom, b.baris.map((r) => r.map(teks)), b.polos ? undefined : b.jumlahTotal, { total: b.total?.map(teks), polos: b.polos })).join("")
    return bukaCetak({ judul: o.judul, subjudul: o.subjudul, orientasi: o.orientasi, isi })
}

/** Buat dan unduh file .xlsx. Mengembalikan galat teks bila gagal. */
export async function unduhExcel(o: OpsiBagian): Promise<string | null> {
    try {
        const kop = await kopCetakAction()
        const bagian = o.bagian.map((b) => {
            const kolom: KolomTabel[] = b.nomor ? [{ label: "No.", tengah: true }, ...b.kolom] : b.kolom
            const nomor = (r: Nilai[], i: number): Nilai[] => (b.nomor ? [i + 1, ...r] : r)
            // Teks angka di kolom kanan menjadi angka sungguhan supaya bisa dijumlahkan di Excel.
            const ubah = (r: Nilai[]) => r.map((v, j) => (typeof v === "string" && kolom[b.nomor ? j + 1 : j]?.kanan ? angkaDariTeks(v) ?? v : v))
            return { ...b, kolom, baris: b.baris.map(ubah).map(nomor), total: b.total ? (b.nomor ? [null, ...ubah(b.total)] : ubah(b.total)) : undefined }
        })
        const lebar = Math.max(1, ...bagian.map((b) => b.kolom.length))
        const baris: SelGaya[][] = [], gabung: string[] = []
        const satuSel = (v: string, g: Gaya) => baris.push([{ v, g }])
        const tengah = (v: string, g: Gaya) => {
            baris.push([{ v, g }, ...Array.from({ length: lebar - 1 }, () => ({ v: null, g }))])
            if (lebar > 1) gabung.push(`A${baris.length}:${kolomExcel(lebar - 1)}${baris.length}`)
        }

        satuSel(kop?.nama ?? "", "kopNama")
        for (const b of [...(kop?.alamat ?? []), ...(kop?.kontak ?? [])]) satuSel(b, "kopBaris")
        baris.push([])
        tengah(o.judul, "judul")
        if (o.subjudul) tengah(o.subjudul, "sub")
        baris.push([])

        const lebarKolom = Array.from({ length: lebar }, () => 6)
        const ukur = (j: number, s: string) => { lebarKolom[j] = Math.min(45, Math.max(lebarKolom[j], s.length + 2)) }
        let bekuBaris: number | undefined
        for (const b of bagian) {
            if (b.judul) satuSel(b.judul, "bagian")
            // Desimal mengikuti kolom, bukan sel, supaya satu kolom angka tampil seragam.
            const pecahan = b.kolom.map((_, j) => [...b.baris, b.total ?? []].some((r) => typeof r[j] === "number" && !Number.isInteger(r[j])))
            const gaya = (v: Nilai, j: number, tot: boolean): Gaya => {
                if (typeof v === "number" && j > 0 || typeof v === "number" && !b.nomor) return tot ? (pecahan[j] ? "totalAngka2" : "totalAngka") : pecahan[j] ? "angka2" : "angka"
                if (tot) return "total"
                return b.kolom[j]?.tengah ? "tengah" : "teks"
            }
            if (!b.polos) {
                baris.push(b.kolom.map((k) => ({ v: k.label, g: "kepala" as const })))
                if (bagian.length === 1) bekuBaris = baris.length
            }
            b.kolom.forEach((k, j) => { if (!b.polos) ukur(j, k.label) })
            const tulis = (r: Nilai[], tot: boolean) => {
                baris.push(b.kolom.map((_, j) => ({ v: r[j] ?? null, g: gaya(r[j] ?? null, j, tot) })))
                r.forEach((v, j) => ukur(j, typeof v === "number" ? v.toLocaleString("id-ID", { maximumFractionDigits: 2 }) : v ?? ""))
            }
            const tebal = new Set(b.tebal)
            b.baris.forEach((r, i) => tulis(r, tebal.has(i)))
            if (b.total) tulis(b.total, true)
            if (b.jumlahTotal !== undefined && b.jumlahTotal > b.baris.length)
                satuSel(`Ditampilkan ${b.baris.length.toLocaleString("id-ID")} dari ${b.jumlahTotal.toLocaleString("id-ID")} baris. Persempit filter untuk mengekspor sisanya.`, "peringatan")
            baris.push([])
        }
        satuSel(`Diekspor oleh ${kop?.petugas ?? "-"}, ${kop?.waktu ?? ""}`, "kaki")

        const isi = buatXlsx({ nama: o.judul.replace(/[\\/?*[\]:]/g, " "), baris, lebarKolom, gabung, bekuBaris, bergaya: true, lanskap: lebar > 6 })
        const link = document.createElement("a")
        link.href = URL.createObjectURL(new Blob([isi as BlobPart], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }))
        link.download = `${o.nama}.xlsx`
        link.click()
        URL.revokeObjectURL(link.href)
        return null
    } catch (e) {
        return e instanceof Error ? e.message : "Gagal membuat file Excel"
    }
}
