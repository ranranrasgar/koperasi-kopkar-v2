"use server"

import { cookies, headers } from "next/headers"
import { redirect } from "next/navigation"
import {
    akunUntukResetEmail, aturEmail, aturPassword, cariAkun, cekPasswordBaruAnggota, daftarAkun, gantiPassword, pertanyaanUntuk,
    resetLewatJawaban,
} from "@kopkar/backend/src/anggota/akun.ts"
import { anggotaSesi } from "@/lib/anggota"
import { cobaLagi, pesanTunggu } from "@/lib/batas"
import { pool } from "@/lib/db"
import { alamatAplikasi, kirimEmail, kirimSekarang } from "@/lib/email"
import { COOKIE_GOOGLE_DAFTAR, simpanFotoGoogle } from "@/lib/google"
import { bacaToken, bacaTokenReset, buatSesi, buatTokenReset, buatTokenVerifikasi, COOKIE_SESI, LAMA_SESI_DETIK, sidikPassword } from "@/lib/sesi"
import { kirimKodeVerifikasi } from "@kopkar/backend/src/anggota/verifikasi-email.ts"
import { withTx } from "@kopkar/backend/src/db.ts"

// Akun anggota sendiri: daftar, lupa password, ganti password/email. Tidak lewat mode uji (sama seperti ganti
// password operator di admin): akun harus benar-benar tersimpan supaya anggota bisa masuk.

export type Hasil = { ok: true; pesan: string } | { ok: false; error: string } | null
export type HasilPertanyaan = { ok: true; username: string; pertanyaan: string } | { ok: false; error: string } | null

const teks = (f: FormData, k: string) => String(f.get(k) ?? "")
const MENIT = 60_000

async function ip() {
    const h = await headers()
    return (h.get("x-forwarded-for")?.split(",")[0] ?? h.get("x-real-ip") ?? "lokal").trim()
}

async function pasangSesi(userId: number, passwordHash: string) {
    (await cookies()).set(COOKIE_SESI, buatSesi({ u: userId, pv: sidikPassword(passwordHash) }), {
        httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: LAMA_SESI_DETIK,
    })
}

export async function daftarAction(_: Hasil, f: FormData): Promise<Hasil> {
    const tunggu = cobaLagi(`daftar:${await ip()}`, 10, 60 * MENIT)
    if (tunggu) return { ok: false, error: pesanTunggu(tunggu) }
    let hasil
    try {
        hasil = await withTx(pool, (db) => daftarAkun(db, {
            username: teks(f, "username"), password: teks(f, "password"), ulangi: teks(f, "ulangi"), nik: teks(f, "nik"),
            email: teks(f, "email"), pertanyaanId: Number(teks(f, "pertanyaan")) || 0, jawaban: teks(f, "jawaban"),
        }))
    } catch (e) {
        console.error("daftar akun gagal:", e)
        return { ok: false, error: "Pendaftaran gagal. Coba lagi beberapa saat lagi." }
    }
    // Akun dibuat belum aktif; kode verifikasi sudah masuk antrean email. Lanjut ke halaman verifikasi.
    if (hasil.ok && hasil.userId) {
        void kirimSekarang()
        redirect(`/verifikasi-email?u=${buatTokenVerifikasi(hasil.userId)}`)
    }
    return hasil
}

/** Langkah 1 lupa password lewat pertanyaan: tampilkan pertanyaan (username fiktif tetap mendapat pertanyaan). */
export async function pertanyaanAction(_: HasilPertanyaan, f: FormData): Promise<HasilPertanyaan> {
    const username = teks(f, "username").trim()
    if (!username) return { ok: false, error: "Username wajib diisi" }
    const tunggu = cobaLagi(`tanya:${await ip()}`, 20, 15 * MENIT)
    if (tunggu) return { ok: false, error: pesanTunggu(tunggu) }
    const pertanyaan = await pertanyaanUntuk(pool, username)
    return pertanyaan ? { ok: true, username, pertanyaan } : { ok: false, error: "Pertanyaan keamanan belum tersedia" }
}

/** Langkah 2: jawaban + password baru. Dibatasi per username dan per alamat IP. */
export async function resetJawabanAction(_: Hasil, f: FormData): Promise<Hasil> {
    const username = teks(f, "username").trim()
    const tunggu = cobaLagi(`jawab:${username.toLowerCase()}`, 5, 15 * MENIT) || cobaLagi(`jawab-ip:${await ip()}`, 20, 15 * MENIT)
    if (tunggu) return { ok: false, error: pesanTunggu(tunggu) }
    return withTx(pool, (db) => resetLewatJawaban(db, username, teks(f, "jawaban"), teks(f, "password"), teks(f, "ulangi")))
}

/** Lupa password lewat email: kirim tautan bila username dan email cocok. Balasan selalu sama (tidak membocorkan akun). */
export async function resetEmailAction(_: Hasil, f: FormData): Promise<Hasil> {
    const username = teks(f, "username").trim(), email = teks(f, "email").trim()
    if (!username || !email) return { ok: false, error: "Username dan email wajib diisi" }
    const tunggu = cobaLagi(`reset-email:${await ip()}`, 5, 15 * MENIT)
    if (tunggu) return { ok: false, error: pesanTunggu(tunggu) }
    const akun = await akunUntukResetEmail(pool, username, email)
    if (akun) {
        const tautan = `${await alamatAplikasi()}/atur-password?token=${buatTokenReset(Number(akun.id), akun.password_hash)}`
        await kirimEmail({
            ke: akun.email, judul: "Atur ulang password aplikasi anggota",
            teks: `Buka tautan berikut dalam 30 menit untuk membuat password baru:\n${tautan}\n\nAbaikan email ini bila Anda tidak memintanya.`,
        })
    }
    return { ok: true, pesan: "Bila username dan email cocok, tautan untuk membuat password baru dikirim ke email tersebut. Tautan berlaku 30 menit." }
}

/** Password baru dari tautan email. Token tidak berlaku lagi setelah password diganti. */
export async function aturPasswordTokenAction(_: Hasil, f: FormData): Promise<Hasil> {
    const t = bacaTokenReset(teks(f, "token"))
    if (!t) return { ok: false, error: "Tautan tidak berlaku atau sudah kedaluwarsa. Minta tautan baru." }
    const baru = teks(f, "password")
    if (baru !== teks(f, "ulangi")) return { ok: false, error: "Ulangi password baru dengan sama persis" }
    const salah = cekPasswordBaruAnggota(baru)
    if (salah) return { ok: false, error: salah }
    const akun = await cariAkun(pool, { id: t.u })
    if (!akun?.akun_aktif || !akun.password_hash || sidikPassword(akun.password_hash) !== t.pv) {
        return { ok: false, error: "Tautan tidak berlaku atau sudah dipakai. Minta tautan baru." }
    }
    await aturPassword(pool, t.u, baru)
    return { ok: true, pesan: "Password berhasil diganti. Silakan masuk dengan password baru." }
}

/**
 * Simpan email (wajib isi setelah masuk, dan ganti email dari menu Akun), lalu kirim kode verifikasi ke email baru.
 * Notifikasi lewat email hanya dikirim ke email yang sudah terverifikasi; verifikasi boleh dilewati sementara.
 */
export async function emailAction(_: Hasil, f: FormData): Promise<Hasil> {
    const a = await anggotaSesi()
    if (!a) redirect("/masuk")
    const r = await aturEmail(pool, a.userId, teks(f, "email"))
    if (!r.ok) return r
    const email = teks(f, "email").trim().toLowerCase()
    if (a.email && a.email.trim().toLowerCase() !== email) {
        await kirimEmail({ ke: a.email, judul: "Email aplikasi anggota diganti",
            teks: `Email akun ${a.username} diganti ke ${email}. Hubungi pengurus koperasi bila ini bukan Anda.` })
    }
    const k = await kirimKodeVerifikasi(pool, a.userId, email, a.nama || a.username)
    if (!k.ok && /sudah terverifikasi/.test(k.error)) return { ok: true, pesan: "Email tersimpan dan sudah terverifikasi." }
    void kirimSekarang()
    // Bila kode baru saja dikirim (jeda 60 detik), tetap ke halaman verifikasi: kode sebelumnya masih berlaku.
    redirect(`/verifikasi-email?u=${buatTokenVerifikasi(a.userId)}&lanjut=${encodeURIComponent(teks(f, "tujuan") === "/beranda" ? "/beranda" : "/akun")}`)
}

/** Minta kode verifikasi untuk email yang sudah tersimpan tetapi belum terverifikasi (tombol di Akun > Email). */
export async function mintaVerifikasiEmailAction() {
    const a = await anggotaSesi()
    if (!a || !a.email) redirect("/masuk")
    const tunggu = cobaLagi(`minta-verif:${a.userId}`, 6, 60 * MENIT)
    if (!tunggu) {
        const k = await kirimKodeVerifikasi(pool, a.userId, a.email, a.nama || a.username)
        if (k.ok) void kirimSekarang()
    }
    redirect(`/verifikasi-email?u=${buatTokenVerifikasi(a.userId)}&lanjut=${encodeURIComponent("/akun")}`)
}

export async function gantiPasswordAction(_: Hasil, f: FormData): Promise<Hasil> {
    const a = await anggotaSesi()
    if (!a) redirect("/masuk")
    const tunggu = cobaLagi(`ganti:${a.userId}`, 5, 15 * MENIT)
    if (tunggu) return { ok: false, error: pesanTunggu(tunggu) }
    const r = await gantiPassword(pool, a.userId, teks(f, "lama"), teks(f, "password"), teks(f, "ulangi"))
    if (!r.ok) return r
    await pasangSesi(a.userId, r.hash) // perangkat ini tetap masuk; sesi di perangkat lain berakhir
    return { ok: true, pesan: "Password berhasil diganti." }
}

/** Lengkapi pendaftaran setelah login Google: NIK, username, password, pertanyaan keamanan. Email dari Google (sudah terverifikasi). */
export async function daftarGoogleAction(_: Hasil, f: FormData): Promise<Hasil> {
    const jar = await cookies()
    const g = bacaToken("google-daftar", jar.get(COOKIE_GOOGLE_DAFTAR)?.value)
    if (!g) return { ok: false, error: "Sesi Google berakhir. Mulai lagi dengan tombol Lanjut dengan Google." }
    const tunggu = cobaLagi(`daftar:${await ip()}`, 10, 60 * MENIT)
    if (tunggu) return { ok: false, error: pesanTunggu(tunggu) }
    let hasil
    try {
        hasil = await withTx(pool, (db) => daftarAkun(db, {
            username: teks(f, "username"), password: teks(f, "password"), ulangi: teks(f, "ulangi"), nik: teks(f, "nik"),
            email: g.email, pertanyaanId: Number(teks(f, "pertanyaan")) || 0, jawaban: teks(f, "jawaban"),
        }, { sub: g.sub }))
    } catch (e) {
        console.error("daftar akun Google gagal:", e)
        return { ok: false, error: "Pendaftaran gagal. Coba lagi beberapa saat lagi." }
    }
    if (!hasil.ok || !hasil.userId) return hasil
    jar.delete(COOKIE_GOOGLE_DAFTAR)
    if (g.foto) await simpanFotoGoogle(hasil.userId, g.foto)
    const akun = await cariAkun(pool, { id: hasil.userId })
    if (!akun?.password_hash) return hasil
    await pasangSesi(hasil.userId, akun.password_hash)
    redirect("/beranda")
}
