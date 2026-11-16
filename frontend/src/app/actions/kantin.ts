"use server"

import { revalidatePath } from "next/cache"
import { bersihkanYatim, GambarSalah, lepasGambar, simpanGambar, tautkanGambar } from "@kopkar/backend/src/anggota/gambar.ts"
import type { Db } from "@kopkar/backend/src/db.ts"
import { KantinSalah, simpanProduk, simpanUnit, type UnitInput } from "@kopkar/backend/src/unit-usaha/kantin.ts"
import { catatAksi } from "@/lib/aktivitas"
import { modeUji, tx } from "@/lib/db"
import { unitBoleh } from "@/lib/kantin"
import { GalatSesi, operatorAktif, wajibAksi, type Operator } from "@/lib/operator"
import { MENU, type AksiIzin } from "@/config/akses"
import type { HasilSimpan } from "./master"

// Server action unit usaha kantin. Aturan dan validasi di backend/src/unit-usaha/kantin.ts.

async function jalankan(menu: string, path: string, aksi: AksiIzin, fn: (db: Db, o: Operator) => Promise<string>): Promise<HasilSimpan> {
    try {
        const o = await operatorAktif([menu])
        wajibAksi(o, [menu], aksi)
        const pesan = await tx((db) => fn(db, o))
        await catatAksi(menu, pesan, o)
        if (await modeUji()) return { ok: true, pesan: `MODE UJI, tidak tersimpan: ${pesan}` }
        revalidatePath(path)
        return { ok: true, pesan }
    } catch (e) {
        if (!(e instanceof KantinSalah) && !(e instanceof GalatSesi) && !(e instanceof GambarSalah)) console.error("aksi kantin gagal:", e)
        return { ok: false, error: e instanceof Error ? e.message : "Gagal menyimpan" }
    }
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
