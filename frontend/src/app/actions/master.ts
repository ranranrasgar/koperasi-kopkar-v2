"use server"

import { revalidatePath } from "next/cache"
import { modeUji, tx } from "@/lib/db"
import type { Db } from "@kopkar/backend/src/db.ts"
import { GalatSesi, operatorAktif } from "@/lib/operator"
import { jenisGambar } from "@/lib/gambar"
import { MENU } from "@/config/akses"

export type HasilSimpan = { ok: true; pesan: string } | { ok: false; error: string } | null

class Salah extends Error {}

/**
 * Semua tulis master dalam satu transaksi lewat tx(), sehingga ikut di-rollback di mode uji.
 * `jenis` "layout": segarkan layout di bawah `path` juga (identitas koperasi tampil di sidebar semua halaman).
 */
async function simpan(menu: string, path: string, fn: (db: Db) => Promise<string>, jenis?: "layout"): Promise<HasilSimpan> {
    try {
        await operatorAktif([menu])
        const pesan = await tx(fn)
        if (await modeUji()) return { ok: true, pesan: `MODE UJI, tidak tersimpan: ${pesan}` }
        revalidatePath(path, jenis)
        return { ok: true, pesan }
    } catch (e) {
        if (!(e instanceof Salah) && !(e instanceof GalatSesi)) console.error("simpan master gagal:", e)
        return { ok: false, error: e instanceof Error ? e.message : "Gagal menyimpan" }
    }
}

const teks = (f: FormData, k: string, label: string, wajib = false, maks = 200) => {
    const v = String(f.get(k) ?? "").trim()
    if (wajib && !v) throw new Salah(`${label} wajib diisi`)
    if (v.length > maks) throw new Salah(`${label} maksimal ${maks} karakter`)
    return v
}
const angka = (f: FormData, k: string, label: string, opsi: { min?: number; maks?: number; bulat?: boolean } = {}) => {
    const s = String(f.get(k) ?? "").trim().replace(",", ".")
    const n = Number(s || "0")
    if (!Number.isFinite(n) || (opsi.bulat && !Number.isInteger(n))) throw new Salah(`${label} harus angka${opsi.bulat ? " bulat" : ""}`)
    if (opsi.min !== undefined && n < opsi.min) throw new Salah(`${label} minimal ${opsi.min}`)
    if (opsi.maks !== undefined && n > opsi.maks) throw new Salah(`${label} maksimal ${opsi.maks}`)
    return s || "0"
}
/** Akun COA dari form: id perkiraan beserta pr_id lama (kolom coa_* desktop menyimpan pr_id). */
async function akun(db: Db, f: FormData, k: string, label: string) {
    const id = Number(f.get(k))
    const { rows: [p] } = await db.query<{ id: string; pr_id: string }>("SELECT id, pr_id FROM perkiraan WHERE id = $1", [id])
    if (!p) throw new Salah(`${label} wajib dipilih`)
    return p
}

// ---------- perusahaan ----------

export async function simpanPerusahaanAction(_: HasilSimpan, f: FormData): Promise<HasilSimpan> {
    return simpan(MENU.company, "/", async (db) => {
        const v = [
            teks(f, "nama_perusahaan", "Nama koperasi", true, 100), teks(f, "alamat_perusahaan1", "Alamat"), teks(f, "alamat_perusahaan2", "Alamat 2 / telepon"),
            teks(f, "kota_perusahaan", "Kota"), teks(f, "email", "Email"), teks(f, "http", "Website"), teks(f, "npwp", "NPWP"),
            teks(f, "siup", "SIUP"), teks(f, "tdp", "TDP"), teks(f, "nama_manager", "Nama manager"),
            angka(f, "rp_adm_bank", "Biaya adm bank", { min: 0 }), angka(f, "persen_pajak_pendapatan", "Pajak pendapatan", { min: 0, maks: 100 }),
            teks(f, "ket_nota", "Keterangan nota", false, 1000),
        ]
        const { rows: r } = await db.query(`UPDATE perusahaan SET nama_perusahaan=$1, alamat_perusahaan1=$2, alamat_perusahaan2=$3, kota_perusahaan=$4,
            email=$5, http=$6, npwp=$7, siup=$8, tdp=$9, nama_manager=$10, rp_adm_bank=$11, persen_pajak_pendapatan=$12, ket_nota=$13
            WHERE id = (SELECT MIN(id) FROM perusahaan) RETURNING id`, v)
        if (r.length === 0) throw new Salah("Data perusahaan tidak ada")
        return "Data perusahaan disimpan"
    }, "layout")
}

/**
 * Nomor WhatsApp koperasi untuk tombol "Hubungi kami" di aplikasi anggota (pengaturan_web.wa_kontak). Disimpan sebagai angka
 * berawalan 62; kosong = tombol tidak tampil.
 */
export async function simpanKontakWaAction(_: HasilSimpan, f: FormData): Promise<HasilSimpan> {
    return simpan(MENU.company, "/dashboard/settings", async (db) => {
        const mentah = teks(f, "wa_kontak", "Nomor WhatsApp", false, 30)
        if (mentah && !/^[0-9+\s().-]+$/.test(mentah)) throw new Salah("Nomor WhatsApp hanya boleh angka")
        const nomor = mentah.replace(/\D/g, "").replace(/^0/, "62")
        if (nomor && (nomor.length < 9 || nomor.length > 15)) throw new Salah("Nomor WhatsApp tidak valid (contoh: 081234567890)")
        if (!nomor) await db.query("DELETE FROM pengaturan_web WHERE kunci = 'wa_kontak'")
        else await db.query(`INSERT INTO pengaturan_web (kunci, nilai, diubah_pada) VALUES ('wa_kontak', $1, now())
            ON CONFLICT (kunci) DO UPDATE SET nilai = EXCLUDED.nilai, diubah_pada = now()`, [nomor])
        return nomor ? "Nomor WhatsApp disimpan" : "Nomor WhatsApp dihapus"
    })
}

const MAKS_LOGO = 500 * 1024

/** Unggah logo koperasi ke perusahaan.logo, atau hapus (aksi=hapus) supaya web memakai logo bawaan. */
export async function simpanLogoAction(_: HasilSimpan, f: FormData): Promise<HasilSimpan> {
    return simpan(MENU.company, "/", async (db) => {
        let isi: Buffer | null = null
        if (f.get("aksi") !== "hapus") {
            const file = f.get("logo")
            if (!(file instanceof File) || file.size === 0) throw new Salah("Pilih file logo dulu")
            if (file.size > MAKS_LOGO) throw new Salah("Ukuran logo maksimal 500 KB")
            isi = Buffer.from(await file.arrayBuffer())
            if (!jenisGambar(isi)) throw new Salah("Logo harus berupa gambar PNG, JPG, WebP, atau GIF")
        }
        const { rows: r } = await db.query("UPDATE perusahaan SET logo = $1 WHERE id = (SELECT MIN(id) FROM perusahaan) RETURNING id", [isi])
        if (r.length === 0) throw new Salah("Data perusahaan tidak ada")
        return isi ? "Logo disimpan" : "Logo dihapus, aplikasi memakai logo bawaan"
    }, "layout")
}

// ---------- jenis simpanan ----------

export async function simpanJenisSimpananAction(_: HasilSimpan, f: FormData): Promise<HasilSimpan> {
    return simpan(MENU.jenisSimpanan, "/dashboard/settings/jenis-simpanan", async (db) => {
        const id = Number(f.get("id"))
        const coa = await akun(db, f, "coa_id", "Akun simpanan")
        const { rows: r } = await db.query(`UPDATE jenis_simpanan SET nama_simpanan=$1, persen_laba=$2, up_persen=$3, endapan=$4, coa_id=$5, coa_simpanan=$6
            WHERE id=$7 RETURNING kode_simpanan`,
            [teks(f, "nama_simpanan", "Nama simpanan", true, 50), angka(f, "persen_laba", "Persen laba", { min: 0, maks: 100 }),
             angka(f, "up_persen", "Kenaikan (%)", { min: 0, maks: 100 }), f.get("endapan") ? 1 : 0, coa.id, coa.pr_id, id])
        if (r.length === 0) throw new Salah("Jenis simpanan tidak ada")
        return "Jenis simpanan disimpan"
    })
}

// ---------- jenis pinjaman ----------

export async function simpanJenisPinjamanAction(_: HasilSimpan, f: FormData): Promise<HasilSimpan> {
    return simpan(MENU.jenisPinjaman, "/dashboard/settings/jenis-pinjaman", async (db) => {
        const id = Number(f.get("id") || 0)
        const grup = teks(f, "group_pinjaman", "Grup", true)
        if (!["KOPERASI", "BANK / PIHAK LAIN", "KPR"].includes(grup)) throw new Salah("Grup tidak dikenal")
        const bungaPer = teks(f, "bunga_per", "Bunga per", true)
        if (!["PER ANGSURAN", "PER LAMA ANGSURAN"].includes(bungaPer)) throw new Salah("Bunga per tidak dikenal")
        const jenis = teks(f, "jenis_pinjaman", "Jenis", true)
        if (!["Pinjaman Uang", "Pinjaman Barang"].includes(jenis)) throw new Salah("Jenis tidak dikenal")
        // Berurutan: satu koneksi transaksi tidak bisa menjalankan query paralel.
        const k = await akun(db, f, "coa_kredit_id", "Akun piutang/titipan"), j = await akun(db, f, "coa_jasa_id", "Akun jasa")
        const a = await akun(db, f, "coa_adm_id", "Akun adm"), p = await akun(db, f, "coa_provisi_id", "Akun provisi")
        const v = [teks(f, "nama_kredit", "Nama", true, 50), grup, jenis, bungaPer,
            angka(f, "bunga_kredit", "Bunga (%)", { min: 0, maks: 100 }), angka(f, "persen_adm", "Adm (%)", { min: 0, maks: 100 }),
            angka(f, "persen_provisi", "Provisi (%)", { min: 0, maks: 100 }), angka(f, "mak_cicilan", "Maks. cicilan", { min: 0, bulat: true }),
            angka(f, "jatuh_tempo", "Tanggal jatuh tempo", { min: 1, maks: 31, bulat: true }), f.get("hide") === "on",
            k.id, k.pr_id, j.id, j.pr_id, a.id, a.pr_id, p.id, p.pr_id]
        if (id) {
            const { rows: r } = await db.query(`UPDATE jenis_kredit SET nama_kredit=$1, group_pinjaman=$2, jenis_pinjaman=$3, bunga_per=$4, bunga_kredit=$5,
                persen_adm=$6, persen_provisi=$7, mak_cicilan=$8, jatuh_tempo=$9, hide=$10, coa_kredit_id=$11, coa_kredit=$12, coa_jasa_id=$13,
                coa_jasa=$14, coa_adm_id=$15, coa_adm=$16, coa_provisi_id=$17, coa_provisi=$18 WHERE id=$19 RETURNING kode_kredit`, [...v, id])
            if (r.length === 0) throw new Salah("Jenis pinjaman tidak ada")
            return "Jenis pinjaman disimpan"
        }
        const kode = teks(f, "kode_kredit", "Kode", true, 10).toUpperCase()
        if (!/^[A-Z0-9]{2,10}$/.test(kode)) throw new Salah("Kode: 2-10 huruf/angka, mis. C37")
        const { rows: [ada] } = await db.query("SELECT 1 FROM jenis_kredit WHERE kode_kredit = $1", [kode])
        if (ada) throw new Salah(`Kode ${kode} sudah dipakai`)
        await db.query(`INSERT INTO jenis_kredit (nama_kredit, group_pinjaman, jenis_pinjaman, bunga_per, bunga_kredit, persen_adm, persen_provisi,
            mak_cicilan, jatuh_tempo, hide, coa_kredit_id, coa_kredit, coa_jasa_id, coa_jasa, coa_adm_id, coa_adm, coa_provisi_id, coa_provisi,
            kode_kredit, type_angsuran) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,'BULANAN')`, [...v, kode])
        return `Jenis pinjaman ${kode} ditambahkan`
    })
}
