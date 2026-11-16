"use server"

import { revalidatePath } from "next/cache"
import { bersihkanYatim, GambarSalah, lepasGambar, simpanGambar, tautkanGambar } from "@kopkar/backend/src/anggota/gambar.ts"
import type { Db } from "@kopkar/backend/src/db.ts"
import { KantinSalah, simpanProduk, simpanUnit, type UnitInput } from "@kopkar/backend/src/unit-usaha/kantin.ts"
import { batalJual, bukaSesi, jualTunai, ringkasSesi, sesiTerbuka, stokMasuk, tutupSesi } from "@kopkar/backend/src/posting/kantin.ts"
import { catatAksi } from "@/lib/aktivitas"
import { modeUji, pool, tx } from "@/lib/db"
import { unitBoleh } from "@/lib/kantin"
import { GalatSesi, operatorAktif, wajibAksi, type Operator } from "@/lib/operator"
import { MENU, type AksiIzin } from "@/config/akses"
import type { HasilSimpan } from "./master"

// Server action unit usaha kantin. Aturan dan validasi di backend/src/unit-usaha/kantin.ts.

export type HasilKantin<T> = { ok: true; pesan: string; data: T } | { ok: false; error: string }

async function jalankanData<T>(menu: string, path: string, aksi: AksiIzin, fn: (db: Db, o: Operator) => Promise<{ pesan: string; data: T }>): Promise<HasilKantin<T>> {
    try {
        const o = await operatorAktif([menu])
        wajibAksi(o, [menu], aksi)
        const { pesan, data } = await tx((db) => fn(db, o))
        await catatAksi(menu, pesan, o)
        if (await modeUji()) return { ok: true, pesan: `MODE UJI, tidak tersimpan: ${pesan}`, data }
        revalidatePath(path)
        return { ok: true, pesan, data }
    } catch (e) {
        if (!(e instanceof KantinSalah) && !(e instanceof GalatSesi) && !(e instanceof GambarSalah)) console.error("aksi kantin gagal:", e)
        return { ok: false, error: e instanceof Error ? e.message : "Gagal menyimpan" }
    }
}

async function jalankan(menu: string, path: string, aksi: AksiIzin, fn: (db: Db, o: Operator) => Promise<string>): Promise<HasilSimpan> {
    const h = await jalankanData(menu, path, aksi, async (db, o) => ({ pesan: await fn(db, o), data: null }))
    return h.ok ? { ok: true, pesan: h.pesan } : h
}

const hariIni = () => new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Jakarta" })

/** Kantin tugas operator; galat bila bukan tugasnya atau perannya tidak cukup. */
async function unitTugas(db: Db, o: Operator, unitId: number, pengelola = false) {
    const u = (await unitBoleh(db, o)).find((x) => x.id === unitId)
    if (!u) throw new KantinSalah("Kantin tidak ditemukan atau bukan tugas Anda")
    if (pengelola && u.peran === "kasir") throw new KantinSalah("Hanya pengelola kantin yang boleh melakukan ini")
    return u
}

export async function bukaSesiAction(unitId: number, modalAwal: string): Promise<HasilSimpan> {
    return jalankan(MENU.kasirKantin, "/dashboard/kantin/kasir", "tambah", async (db, o) => {
        const u = await unitTugas(db, o, unitId)
        await bukaSesi(db, { unitId, oprId: o.id, opr: o.nama, modalAwal })
        return `Sesi kasir ${u.nama} dibuka (${o.nama})`
    })
}

export async function ringkasSesiAction(unitId: number) {
    try {
        const o = await operatorAktif([MENU.kasirKantin])
        const s = await sesiTerbuka(pool, unitId, o.id)
        return s ? { ok: true as const, data: { ...(await ringkasSesi(pool, Number(s.id))), sesiId: Number(s.id), dibuka: s.dibuka_pada } } : { ok: false as const, error: "Tidak ada sesi terbuka" }
    } catch (e) {
        return { ok: false as const, error: e instanceof Error ? e.message : "Gagal membaca sesi" }
    }
}

export async function tutupSesiAction(unitId: number, sesiId: number, uangFisik: string, catatan: string) {
    return jalankanData(MENU.kasirKantin, "/dashboard/kantin/kasir", "tambah", async (db, o) => {
        const u = await unitTugas(db, o, unitId)
        const r = await tutupSesi(db, { sesiId, oprId: o.id, opr: o.nama, uangFisik, catatan, tanggal: hariIni() })
        return { pesan: `Sesi kasir ${u.nama} ditutup, selisih Rp ${Number(r.selisih).toLocaleString("id-ID")}`, data: r }
    })
}

export async function jualTunaiAction(i: { unitId: number; kodeAgt: string | null; items: { produkId: number; qty: string }[]; diskon: string; uangDiterima: string; kunci: string }) {
    return jalankanData(MENU.kasirKantin, "/dashboard/kantin/kasir", "tambah", async (db, o) => {
        const u = await unitTugas(db, o, i.unitId)
        const r = await jualTunai(db, { ...i, oprId: o.id, opr: o.nama, tanggal: hariIni() })
        return { pesan: `Penjualan ${u.nama} ${r.noBukti} Rp ${Number(r.total).toLocaleString("id-ID")}`, data: { ...r, waktu: new Date().toISOString(), kasir: o.namaLengkap } }
    })
}

export async function stokMasukAction(i: { unitId: number; tanggal: string; akunBayar: string | null; keterangan: string; items: { produkId: number; qty: string; hargaBeli: string }[] }) {
    return jalankanData(MENU.stokKantin, "/dashboard/kantin/stok", "tambah", async (db, o) => {
        const u = await unitTugas(db, o, i.unitId, true)
        const r = await stokMasuk(db, { ...i, opr: o.nama })
        return { pesan: `Stok masuk ${u.nama} ${r.noBukti} Rp ${Number(r.total).toLocaleString("id-ID")}`, data: r }
    })
}

export async function batalJualAction(unitId: number, id: number, alasan: string): Promise<HasilSimpan> {
    return jalankan(MENU.penjualanKantin, "/dashboard/kantin/penjualan", "hapus", async (db, o) => {
        const u = await unitTugas(db, o, unitId, true)
        const r = await batalJual(db, { id, unitId, alasan, opr: o.nama, hariIni: hariIni(), semuaHari: u.peran === "admin" })
        return `Nota ${r.noBukti} ${u.nama} dibatalkan: ${alasan.trim().slice(0, 100)}`
    })
}

export async function simpanUnitAction(data: UnitInput): Promise<HasilSimpan> {
    return jalankan(MENU.unitUsaha, "/dashboard/unit-usaha", data.id ? "ubah" : "tambah", async (db, o) => {
        const r = await simpanUnit(db, data, o.nama)
        return `Unit ${data.kode.toUpperCase()} ${data.nama} ${data.id ? "diubah" : "ditambahkan"}${r.akunBaru.length ? `; akun baru: ${r.akunBaru.join(", ")}` : ""}`
    })
}

export async function simpanProdukAction(_: HasilSimpan, f: FormData): Promise<HasilSimpan> {
    const id = Number(f.get("id")) || null
    return jalankan(MENU.produkKantin, "/dashboard/kantin/produk", id ? "ubah" : "tambah", async (db, o) => {
        const unitId = Number(f.get("unitId"))
        const unit = (await unitBoleh(db, o)).find((u) => u.id === unitId)
        if (!unit) throw new KantinSalah("Kantin tidak ditemukan atau bukan tugas Anda")
        if (unit.peran === "kasir") throw new KantinSalah("Kasir tidak boleh mengubah produk; minta pengelola kantin")
        const cek = (k: string) => f.get(k) === "on"
        const p = await simpanProduk(db, {
            id, unitId, kode: String(f.get("kode") ?? ""), barcode: String(f.get("barcode") ?? ""), nama: String(f.get("nama") ?? ""),
            kategori: String(f.get("kategori") ?? ""), satuan: String(f.get("satuan") ?? ""), hargaBeli: String(f.get("hargaBeli") ?? ""),
            hargaJual: String(f.get("hargaJual") ?? ""), kelolaStok: cek("kelolaStok"), stokMinimal: String(f.get("stokMinimal") ?? ""),
            tampilAnggota: cek("tampilAnggota"), aktif: cek("aktif"), keterangan: String(f.get("keterangan") ?? ""),
        }, o.nama)
        const berkas = f.get("gambar")
        if (berkas instanceof File && berkas.size > 0) {
            const g = await simpanGambar(db, new Uint8Array(await berkas.arrayBuffer()))
            await tautkanGambar(db, "produk", p.id, g.id)
            await bersihkanYatim(db) // gambar lama yang diganti
        } else if (f.get("hapusGambar") === "on") await lepasGambar(db, "produk", p.id)
        return `Produk ${p.kode} ${String(f.get("nama") ?? "").trim()} di ${unit.nama} ${id ? "diubah" : "ditambahkan"}`
    })
}
