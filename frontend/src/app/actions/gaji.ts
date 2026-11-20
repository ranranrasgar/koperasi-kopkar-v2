"use server"

import { revalidatePath } from "next/cache"
import { catatAksi } from "@/lib/aktivitas"
import { modeUji, tx } from "@/lib/db"
import { GalatSesi, operatorAktif, wajibAksi } from "@/lib/operator"
import { MENU, type AksiIzin } from "@/config/akses"
import type { Db } from "@kopkar/backend/src/db.ts"
import { STATUS_PTKP } from "@kopkar/backend/src/gaji/hitung.ts"
import { simpanPengaturanGaji } from "@kopkar/backend/src/gaji/pengaturan.ts"
import { aturHadir, bukaPeriode, GalatGaji, hapusLembur, isiHadirKosong, simpanLembur } from "@kopkar/backend/src/gaji/periode.ts"
import type { HasilSimpan } from "@/app/actions/master"

class Salah extends Error {}

/** Tulis data penggajian dalam satu transaksi (ikut di-rollback di mode uji), dengan izin dan catatan aktivitas seperti actions/master.ts. */
async function simpan(menu: string, path: string, aksi: AksiIzin, fn: (db: Db, opr: string) => Promise<string>): Promise<HasilSimpan> {
    try {
        const o = await operatorAktif([menu])
        wajibAksi(o, [menu], aksi)
        const pesan = await tx((db) => fn(db, o.nama))
        await catatAksi(menu, pesan, o)
        if (await modeUji()) return { ok: true, pesan: `MODE UJI, tidak tersimpan: ${pesan}` }
        revalidatePath(path)
        return { ok: true, pesan }
    } catch (e) {
        if (!(e instanceof Salah) && !(e instanceof GalatSesi) && !(e instanceof GalatGaji)) console.error("simpan penggajian gagal:", e)
        return { ok: false, error: e instanceof Error ? e.message : "Gagal menyimpan" }
    }
}

const teks = (f: FormData, k: string, label: string, maks: number, wajib = false) => {
    const v = String(f.get(k) ?? "").trim()
    if (wajib && !v) throw new Salah(`${label} wajib diisi`)
    if (v.length > maks) throw new Salah(`${label} maksimal ${maks} karakter`)
    return v || null
}
const tanggal = (f: FormData, k: string, label: string) => {
    const v = String(f.get(k) ?? "").trim()
    if (v && !/^\d{4}-\d{2}-\d{2}$/.test(v)) throw new Salah(`${label} tidak valid`)
    return v || null
}
const rupiah = (f: FormData, k: string, label: string) => {
    const s = String(f.get(k) ?? "").replace(/[^\d]/g, "")
    const n = Number(s || "0")
    if (!Number.isSafeInteger(n) || n > 1_000_000_000) throw new Salah(`${label} tidak valid`)
    return String(n)
}

/** Tambah atau ubah karyawan koperasi. Kode tidak bisa diubah setelah dibuat (dipakai sebagai nomor karyawan di slip). */
export async function simpanKaryawanAction(_: HasilSimpan, f: FormData): Promise<HasilSimpan> {
    const id = Number(f.get("id") || 0)
    return simpan(MENU.dataKaryawan, "/dashboard/kepegawaian/karyawan", id ? "ubah" : "tambah", async (db, opr) => {
        const nama = teks(f, "nama", "Nama", 100, true)!
        const jk = teks(f, "jenis_kelamin", "Jenis kelamin", 1)
        if (jk && jk !== "L" && jk !== "P") throw new Salah("Jenis kelamin tidak dikenal")
        const status = teks(f, "status_kerja", "Status kerja", 10, true)!
        if (status !== "Tetap" && status !== "Kontrak") throw new Salah("Status kerja tidak dikenal")
        const ptkp = teks(f, "status_ptkp", "Status PTKP", 5, true)!
        if (!(STATUS_PTKP as string[]).includes(ptkp)) throw new Salah("Status PTKP tidak dikenal")
        const masuk = tanggal(f, "tgl_masuk", "Tanggal masuk"), akhir = tanggal(f, "akhir_kontrak", "Akhir kontrak")
        if (masuk && akhir && akhir < masuk) throw new Salah("Akhir kontrak sebelum tanggal masuk")
        const kodeAgt = teks(f, "kode_agt", "Kode anggota", 20)
        let anggotaId: string | null = null
        if (kodeAgt) {
            const a = (await db.query<{ id: string }>("SELECT id FROM anggota WHERE kode_agt = $1", [kodeAgt])).rows[0]
            if (!a) throw new Salah(`Anggota ${kodeAgt} tidak ditemukan`)
            const lain = (await db.query<{ kode: string }>("SELECT kode FROM karyawan WHERE anggota_id = $1 AND id <> $2", [a.id, id])).rows[0]
            if (lain) throw new Salah(`Anggota ${kodeAgt} sudah tertaut ke karyawan ${lain.kode}`)
            anggotaId = a.id
        }
        const nilai = [nama, teks(f, "nik_ktp", "NIK KTP", 30), jk, status, masuk, akhir, teks(f, "bidang", "Bidang", 60), teks(f, "jabatan", "Jabatan", 60),
            teks(f, "atasan", "Atasan", 60), teks(f, "bank", "Bank", 50), teks(f, "no_rek", "No. rekening", 40), teks(f, "atas_nama_rek", "Atas nama rekening", 100),
            teks(f, "npwp", "NPWP", 30), ptkp, rupiah(f, "umk", "UMK"), rupiah(f, "tunj_jabatan", "Tunjangan jabatan"), f.get("aktif") === "on", anggotaId,
            teks(f, "catatan", "Catatan", 255), opr.slice(0, 50)]
        const kolom = "nama, nik_ktp, jenis_kelamin, status_kerja, tgl_masuk, akhir_kontrak, bidang, jabatan, atasan, bank, no_rek, atas_nama_rek, npwp, status_ptkp, umk, tunj_jabatan, aktif, anggota_id, catatan, diubah_oleh"
        if (id) {
            const set = kolom.split(", ").map((k, i) => `${k} = $${i + 1}`).join(", ")
            const r = await db.query(`UPDATE karyawan SET ${set}, diubah_pada = now() WHERE id = $${nilai.length + 1} RETURNING kode`, [...nilai, id])
            if (!r.rowCount) throw new Salah("Karyawan tidak ditemukan")
            return `Karyawan ${r.rows[0].kode} ${nama} disimpan`
        }
        const kode = teks(f, "kode", "Kode karyawan", 20, true)!.toUpperCase()
        if (!/^[A-Z0-9.-]+$/.test(kode)) throw new Salah("Kode karyawan hanya huruf, angka, titik, atau tanda hubung (mis. K015)")
        if ((await db.query("SELECT 1 FROM karyawan WHERE kode = $1", [kode])).rowCount) throw new Salah(`Kode ${kode} sudah dipakai`)
        await db.query(`INSERT INTO karyawan (kode, ${kolom}) VALUES ($1, ${nilai.map((_, i) => `$${i + 2}`).join(", ")})`, [kode, ...nilai])
        return `Karyawan ${kode} ${nama} ditambahkan`
    })
}

export async function simpanPengaturanGajiAction(_: HasilSimpan, f: FormData): Promise<HasilSimpan> {
    return simpan(MENU.pengaturanGaji, "/dashboard/kepegawaian/pengaturan", "ubah", async (db, opr) => {
        try {
            await simpanPengaturanGaji(db, Object.fromEntries([...f.entries()].map(([k, v]) => [k, String(v)])), opr)
        } catch (e) {
            throw new Salah(e instanceof Error ? e.message : "Pengaturan tidak valid")
        }
        return "Pengaturan gaji disimpan"
    })
}

// ---------- periode dan kehadiran (izin menu Absensi Karyawan) ----------

const ABSEN = "/dashboard/attendance"

export async function bukaPeriodeAction(periode: string): Promise<HasilSimpan> {
    return simpan(MENU.absensi, ABSEN, "tambah", async (db, opr) => {
        const p = await bukaPeriode(db, periode, opr)
        return `Periode gaji ${p.periode} (${p.dari} s/d ${p.sampai}) dibuka`
    })
}

export async function aturHadirAction(periodeId: number, karyawanId: number, tanggal: string, kode: string): Promise<HasilSimpan> {
    return simpan(MENU.absensi, ABSEN, "tambah", (db) => aturHadir(db, { periodeId, karyawanId, tanggal, kode: kode || null }))
}

/** Isi hari kosong: dari pindai QR, dan bila `pola` hari kerja ATN / hari istirahat RD. Isian yang sudah ada tidak ditimpa. */
export async function isiHadirKosongAction(periodeId: number, karyawanId: number | null, pola: boolean): Promise<HasilSimpan> {
    return simpan(MENU.absensi, ABSEN, "tambah", async (db) => {
        const r = await isiHadirKosong(db, { periodeId, karyawanId, pola })
        return `${r.qr} hari terisi dari pindai QR${pola ? `, ${r.pola} hari terisi pola hari kerja/istirahat` : ""}`
    })
}

// ---------- lembur (izin menu Lembur Karyawan) ----------

const LEMBUR = "/dashboard/kepegawaian/lembur"

export async function simpanLemburAction(_: HasilSimpan, f: FormData): Promise<HasilSimpan> {
    return simpan(MENU.lemburKaryawan, LEMBUR, "tambah", async (db, opr) => {
        const jenis = String(f.get("jenis_hari") ?? "")
        const r = await simpanLembur(db, {
            periodeId: Number(f.get("periode_id")), karyawanId: Number(f.get("karyawan_id")), tanggal: String(f.get("tanggal") ?? ""),
            mulai: String(f.get("mulai") ?? ""), selesai: String(f.get("selesai") ?? ""),
            jenisHari: jenis === "kerja" || jenis === "istirahat" ? jenis : null, keterangan: String(f.get("keterangan") ?? ""), opr,
        })
        return r.pesan
    })
}

export async function hapusLemburAction(id: number): Promise<HasilSimpan> {
    return simpan(MENU.lemburKaryawan, LEMBUR, "hapus", (db) => hapusLembur(db, id))
}
