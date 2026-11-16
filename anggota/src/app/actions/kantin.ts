"use server"

import { buatQr, tokenQr } from "@kopkar/backend/src/anggota/qr.ts"
import { adaPin, aturPin, cekPin, PinSalah } from "@kopkar/backend/src/anggota/pin.ts"
import { kirimKeOperator, kirimNotifikasi } from "@kopkar/backend/src/anggota/push.ts"
import { aturTas, batalPesanan, checkout } from "@kopkar/backend/src/posting/kantin-pesanan.ts"

// Harus sama dengan MENU.kasirKantin di frontend/src/config/akses.ts: operator berizin menu ini menerima Web Push pesanan baru.
const MENU_KASIR_KANTIN = "Kasir Kantin (web)"
import { cobaLagi, pesanTunggu } from "@kopkar/backend/src/batas.ts"
import { bacaTagihan, bayarTagihan, type RincianTagihan } from "@kopkar/backend/src/posting/kantin.ts"
import { KantinSalah } from "@kopkar/backend/src/unit-usaha/kantin.ts"
import { anggotaSesi } from "@/lib/anggota"
import { modeUji, pool, query, tx } from "@/lib/db"

export type HasilQrBayar = { ok: true; teks: string; detik: number } | { ok: false; error: string }
export type StatusBayar = { lunas: false } | { lunas: true; noBukti: string; kantin: string; total: number; status: string }

/** QR bayar belanja kantin dari Simpanan Sukarela: 60 detik, sekali pakai. anggotaId selalu dari sesi. */
export async function buatQrBayarAction(): Promise<HasilQrBayar> {
    const a = await anggotaSesi()
    if (!a?.anggotaId) return { ok: false, error: "Sesi berakhir. Silakan masuk kembali." }
    const qr = await buatQr(pool, a.anggotaId, "bayar")
    return qr ? { ok: true, ...qr } : { ok: false, error: "Data tidak ditemukan." }
}

/** Rincian tagihan QR kantin yang dipindai anggota (sebelum disetujui). */
export async function bacaTagihanAction(teks: string): Promise<{ ok: true; data: RincianTagihan; adaPin: boolean } | { ok: false; error: string }> {
    const a = await anggotaSesi()
    if (!a?.anggotaId) return { ok: false, error: "Sesi berakhir. Silakan masuk kembali." }
    const r = await bacaTagihan(pool, teks)
    if (!r) return { ok: false, error: "Ini bukan QR tagihan kantin." }
    return { ok: true, data: r, adaPin: await adaPin(pool, a.anggotaId) }
}

/**
 * Setujui tagihan dengan PIN: PIN diperiksa dulu di luar transaksi (hitungan salah tetap tersimpan), lalu pembayaran diposting
 * dari Simpanan Sukarela anggota yang sedang masuk. Aturannya sama dengan kasir (backend/src/posting/kantin.ts).
 */
export async function bayarTagihanAction(teks: string, pin: string): Promise<{ ok: true; noBukti: string; total: number; saldo: number; ujicoba: boolean } | { ok: false; error: string }> {
    const a = await anggotaSesi()
    if (!a?.anggotaId) return { ok: false, error: "Sesi berakhir. Silakan masuk kembali." }
    const id = a.anggotaId
    const tunggu = cobaLagi(`pin-kantin:${id}`, 20, 15 * 60_000)
    if (tunggu) return { ok: false, error: pesanTunggu(tunggu) }
    try {
        await cekPin(pool, id, pin)
        const tanggal = new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Jakarta" })
        const r = await tx((db) => bayarTagihan(db, { teks, anggotaId: id, tanggal }))
        const ujicoba = await modeUji()
        if (!ujicoba && !r.ulang) await kirimNotifikasi(pool, id, { judul: "Pembayaran berhasil", url: "/kantin", email: false,
            isi: `Belanja Rp ${Number(r.total).toLocaleString("id-ID", { maximumFractionDigits: 0 })} dibayar dari Simpanan Sukarela (${r.noBukti}). Sisa saldo sukarela Rp ${Number(r.saldoSukarela ?? 0).toLocaleString("id-ID", { maximumFractionDigits: 0 })}.` })
            .catch((e) => console.error("notifikasi bayar kantin gagal:", e))
        return { ok: true, noBukti: r.noBukti, total: Number(r.total), saldo: Number(r.saldoSukarela ?? 0), ujicoba }
    } catch (e) {
        if (!(e instanceof PinSalah) && !(e instanceof KantinSalah)) console.error("bayar tagihan kantin gagal:", e)
        return { ok: false, error: e instanceof Error ? e.message : "Pembayaran gagal" }
    }
}

/** Ubah jumlah produk di tas (0 = hapus). */
export async function aturTasAction(unitId: number, produkId: number, qty: number): Promise<{ ok: true } | { ok: false; error: string }> {
    const a = await anggotaSesi()
    if (!a?.anggotaId) return { ok: false, error: "Sesi berakhir. Silakan masuk kembali." }
    try {
        await aturTas(pool, { anggotaId: a.anggotaId, unitId, produkId, qty })
        return { ok: true }
    } catch (e) {
        return { ok: false, error: e instanceof Error ? e.message : "Gagal mengubah tas" }
    }
}

/** Checkout tas satu kantin. Sukarela: PIN diperiksa dulu (di luar transaksi), lalu penjualan langsung diposting. */
export async function checkoutAction(i: { unitId: number; metode: "tunai" | "sukarela"; catatan: string; totalDilihat: string; pin: string }): Promise<{ ok: true; id: number } | { ok: false; error: string }> {
    const a = await anggotaSesi()
    if (!a?.anggotaId) return { ok: false, error: "Sesi berakhir. Silakan masuk kembali." }
    const id = a.anggotaId
    const tunggu = cobaLagi(`checkout-kantin:${id}`, 20, 15 * 60_000)
    if (tunggu) return { ok: false, error: pesanTunggu(tunggu) }
    try {
        if (i.metode === "sukarela") await cekPin(pool, id, i.pin)
        const tanggal = new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Jakarta" })
        const r = await tx((db) => checkout(db, { anggotaId: id, unitId: i.unitId, metode: i.metode, catatan: i.catatan, totalDilihat: i.totalDilihat, tanggal }))
        if (await modeUji()) return { ok: false, error: `MODE UJI: pesanan Rp ${Number(r.total).toLocaleString("id-ID")} dicoba lalu dibatalkan otomatis.` }
        await kirimKeOperator(pool, MENU_KASIR_KANTIN, { judul: "Pesanan kantin baru", isi: `${r.kantin}: pesanan #${r.id} ${i.metode === "sukarela" ? "dibayar Simpanan Sukarela" : "bayar tunai saat ambil"}, Rp ${Number(r.total).toLocaleString("id-ID", { maximumFractionDigits: 0 })}`, url: "/dashboard/kantin/kasir" })
            .catch((e) => console.error("notifikasi pesanan kantin gagal:", e))
        return { ok: true, id: r.id }
    } catch (e) {
        if (!(e instanceof PinSalah) && !(e instanceof KantinSalah)) console.error("checkout kantin gagal:", e)
        return { ok: false, error: e instanceof Error ? e.message : "Pesanan gagal" }
    }
}

/** Anggota membatalkan pesanannya selama belum diproses kantin. */
export async function batalPesananAction(pesananId: number): Promise<{ ok: true } | { ok: false; error: string }> {
    const a = await anggotaSesi()
    if (!a?.anggotaId) return { ok: false, error: "Sesi berakhir. Silakan masuk kembali." }
    const [p] = await query<{ unit_usaha_id: number }>("SELECT unit_usaha_id FROM kantin_pesanan WHERE id = $1 AND anggota_id = $2", [pesananId, a.anggotaId])
    if (!p) return { ok: false, error: "Pesanan tidak ditemukan" }
    try {
        const hariIni = new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Jakarta" })
        await tx((db) => batalPesanan(db, { id: pesananId, unitId: Number(p.unit_usaha_id), alasan: "Dibatalkan anggota", opr: "anggota", hariIni, olehAnggota: a.anggotaId! }))
        return { ok: true }
    } catch (e) {
        return { ok: false, error: e instanceof Error ? e.message : "Gagal membatalkan" }
    }
}

/** Atur atau ganti PIN transaksi; password akun wajib. */
export async function aturPinAction(password: string, pin: string, ulangi: string): Promise<{ ok: true } | { ok: false; error: string }> {
    const a = await anggotaSesi()
    if (!a?.anggotaId) return { ok: false, error: "Sesi berakhir. Silakan masuk kembali." }
    const tunggu = cobaLagi(`atur-pin:${a.userId}`, 10, 15 * 60_000)
    if (tunggu) return { ok: false, error: pesanTunggu(tunggu) }
    return aturPin(pool, { userId: a.userId, anggotaId: a.anggotaId, password, pin, ulangi })
}

/** Apakah QR bayar ini sudah dipakai kasir untuk nota milik anggota yang sedang masuk. */
export async function statusBayarAction(teks: string): Promise<StatusBayar> {
    const a = await anggotaSesi()
    const token = tokenQr(teks)
    if (!a?.anggotaId || !token) return { lunas: false }
    const [p] = await query<{ no_bukti: string; kantin: string; total: number; status: string }>(
        `SELECT p.no_bukti, u.nama kantin, p.total, p.status FROM kantin_penjualan p JOIN unit_usaha u ON u.id = p.unit_usaha_id
          WHERE p.qr_token = $1 AND p.anggota_id = $2`, [token, a.anggotaId])
    return p ? { lunas: true, noBukti: p.no_bukti, kantin: p.kantin, total: Number(p.total), status: p.status } : { lunas: false }
}
