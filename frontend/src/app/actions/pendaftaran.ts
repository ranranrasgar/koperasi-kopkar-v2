"use server"

import { catatAksi } from "@/lib/aktivitas"
import { revalidatePath } from "next/cache"
import { aturEmail, dataLengkapiAnggota, hapusAkunAplikasi, hapusKeanggotaan, jadikanAnggota, putuskanPendaftaran, ubahStatusAkun, type DataLengkapi, type LengkapAnggota } from "@kopkar/backend/src/anggota/akun.ts"
import { antreEmail } from "@kopkar/backend/src/email/antrean.ts"
import { kirimNotifikasi } from "@kopkar/backend/src/anggota/push.ts"
import { kirimKodeVerifikasi, statusEmail } from "@kopkar/backend/src/anggota/verifikasi-email.ts"
import { buatTokenVerifikasi } from "@kopkar/backend/src/anggota/token.ts"
import { modeUji, pool, query, tx } from "@/lib/db"
import { GalatSesi, operatorAktif, wajibAksi, type Operator } from "@/lib/operator"
import { MENU } from "@/config/akses"

export type HasilPendaftaran = { ok: true; pesan: string } | { ok: false; error: string }

const MENU_USER = [MENU.user, MENU.requestUser] as const
/** Mengganti email dan mengirim verifikasi juga boleh dari Pengajuan Kredit: petugas yang meninjau pengajuan membantu anggota yang emailnya belum terverifikasi. */
const MENU_EMAIL = [...MENU_USER, MENU.pengajuan] as const

/** Hapus akun yang sudah terhubung ke anggota hanya boleh oleh superadmin atau grup admin. */
const bolehHapusAkunAnggota = (o: Pick<Operator, "superadmin" | "grup">) => o.superadmin || (o.grup ?? "").trim().toLowerCase() === "admin"

/**
 * Setujui atau tolak pendaftaran akun baru dari aplikasi anggota. Lewat tx() supaya ikut di-rollback di mode uji.
 * Pendaftar diberi tahu lewat email (ke email yang sudah terverifikasi); gagal kirim tidak membatalkan keputusan.
 */
export async function putuskanPendaftaranAction(id: number, setuju: boolean, lengkap?: LengkapAnggota): Promise<HasilPendaftaran> {
    try {
        const o = await operatorAktif(MENU_USER)
        wajibAksi(o, MENU_USER, "ubah")
        const r = await tx((db) => putuskanPendaftaran(db as never, id, setuju, { id: o.id, nama: o.nama }, lengkap))
        if (!r.ok) return r
        await catatAksi("User Mobile", r.pesan)
        if (await modeUji()) return { ok: true, pesan: `MODE UJI, tidak tersimpan: ${r.pesan}` }
        revalidatePath("/dashboard/members", "layout")
        if (r.email) {
            const dasar = (process.env.ANGGOTA_URL ?? "").replace(/\/+$/, "")
            await tx((db) => antreEmail(db, setuju
                ? {
                    jenis: "pendaftaran", ke: r.email!, judul: "Akun aplikasi anggota Anda sudah aktif",
                    teks: [
                        `Yth. ${r.username},`,
                        `Dengan hormat, pendaftaran akun Anda di aplikasi anggota koperasi telah diverifikasi dan disetujui oleh pengurus. Akun Anda kini aktif dan dapat digunakan.`,
                        "## Informasi akun",
                        [`Username | ${r.username}`, `Email terdaftar | ${r.email}`, ...(r.kodeAnggota ? [`Kode anggota | ${r.kodeAnggota}`] : []), "Status akun | Aktif"].join("\n"),
                        "## Cara masuk",
                        ["- Buka aplikasi anggota lewat tombol di bawah, atau alamat yang tertera di bagian akhir email ini.",
                            "- Masukkan username dan password yang Anda buat saat mendaftar, atau pilih Masuk dengan Google bila akun Google Anda sudah dihubungkan.",
                            "- Setelah masuk, Anda dapat melihat simpanan, pinjaman, potongan gaji, SHU, riwayat transaksi, dan notifikasi, serta mengajukan kredit."].join("\n"),
                        "## Keamanan password",
                        ["- Gunakan password yang kuat dan hanya Anda yang mengetahuinya. Pengurus koperasi tidak pernah meminta password Anda.",
                            "- Mengganti password: masuk ke aplikasi, buka menu Akun, pilih Ganti password, isi password lama lalu password baru. Perangkat lain akan otomatis keluar dari akun Anda.",
                            "- Bila password diberikan atau diatur oleh pengurus (bukan Anda sendiri), segera gantilah dengan langkah di atas pada saat masuk pertama kali.",
                            "- Lupa password: pada halaman masuk pilih Lupa password, lalu ikuti tautan yang dikirim ke email Anda (berlaku 30 menit)."].join("\n"),
                        "## Bantuan",
                        "Bila ada data yang tidak sesuai atau Anda mengalami kendala saat masuk, hubungi pengurus koperasi melalui menu Pesan di aplikasi atau langsung ke sekretariat koperasi.",
                        "Hormat kami,\nPengurus Koperasi",
                    ].join("\n\n"),
                    tautan: dasar ? `${dasar}/masuk` : null,
                }
                : {
                    jenis: "pendaftaran", ke: r.email!, judul: "Pendaftaran aplikasi anggota tidak disetujui",
                    teks: `Halo ${r.username},\n\nMohon maaf, pendaftaran Anda di aplikasi anggota Kopkar MJS belum dapat kami setujui. Silakan hubungi pengurus koperasi untuk keterangan lebih lanjut.`,
                })).catch((e) => console.error("antre email keputusan pendaftaran gagal:", e))
        }
        return { ok: true, pesan: r.pesan }
    } catch (e) {
        if (!(e instanceof GalatSesi)) console.error("putuskan pendaftaran gagal:", e)
        return { ok: false, error: e instanceof Error ? e.message : "Gagal" }
    }
}

/**
 * Aktifkan atau nonaktifkan akun yang sudah diputuskan (Aktif/Tidak Aktif), kapan saja. Lewat tx() supaya ikut di-rollback di mode uji.
 * Pemilik akun diberi tahu lewat email bila emailnya terverifikasi; gagal kirim tidak membatalkan perubahan.
 */
export async function ubahStatusAkunAction(id: number, aktif: boolean): Promise<HasilPendaftaran> {
    try {
        wajibAksi(await operatorAktif(MENU_USER), MENU_USER, "ubah")
        const r = await tx((db) => ubahStatusAkun(db as never, id, aktif))
        if (!r.ok) return r
        await catatAksi("User Mobile", r.pesan)
        if (await modeUji()) return { ok: true, pesan: `MODE UJI, tidak tersimpan: ${r.pesan}` }
        revalidatePath("/dashboard/members", "layout")
        if (r.email) {
            const dasar = (process.env.ANGGOTA_URL ?? "").replace(/\/+$/, "")
            await tx((db) => antreEmail(db, aktif
                ? {
                    jenis: "status_akun", ke: r.email!, judul: "Akun aplikasi anggota Anda aktif kembali",
                    teks: [
                        `Yth. ${r.username},`,
                        "Dengan hormat, pengurus koperasi telah mengaktifkan kembali akun aplikasi anggota Anda. Anda dapat masuk lagi dengan username dan password seperti biasa.",
                        "Bila lupa password, pilih Lupa password pada halaman masuk lalu ikuti tautan yang dikirim ke email Anda.",
                        "Hormat kami,\nPengurus Koperasi",
                    ].join("\n\n"),
                    tautan: dasar ? `${dasar}/masuk` : null,
                }
                : {
                    jenis: "status_akun", ke: r.email!, judul: "Akun aplikasi anggota Anda dinonaktifkan",
                    teks: [
                        `Yth. ${r.username},`,
                        "Dengan hormat, akun aplikasi anggota Anda telah dinonaktifkan oleh pengurus koperasi. Untuk sementara Anda tidak dapat masuk ke aplikasi anggota.",
                        "Data simpanan dan pinjaman Anda tetap tercatat di koperasi. Untuk keterangan lebih lanjut atau mengaktifkan kembali akun, hubungi pengurus koperasi di sekretariat.",
                        "Hormat kami,\nPengurus Koperasi",
                    ].join("\n\n"),
                })).catch((e) => console.error("antre email status akun gagal:", e))
        }
        return { ok: true, pesan: r.pesan }
    } catch (e) {
        if (!(e instanceof GalatSesi)) console.error("ubah status akun gagal:", e)
        return { ok: false, error: e instanceof Error ? e.message : "Gagal" }
    }
}

/**
 * Ubah email akun anggota atas permintaan anggota (mis. email lama tidak aktif). Email baru belum terverifikasi: kode verifikasi (berlaku 24 jam)
 * dan tautan ke halaman verifikasi aplikasi anggota langsung dikirim ke email itu, jadi anggota tinggal membukanya. Notifikasi lewat email baru
 * berjalan setelah terverifikasi. Email lama diberi tahu, dan anggota dikabari lewat notifikasi HP.
 * Kode di-hash dengan ANGGOTA_SESSION_SECRET aplikasi anggota; tanpa rahasia yang sama di .env.local admin kode tidak akan cocok, jadi tidak dikirim.
 */
export async function ubahEmailAkunAction(id: number, email: string): Promise<HasilPendaftaran> {
    try {
        const o = await operatorAktif(MENU_EMAIL)
        wajibAksi(o, MENU_EMAIL, "ubah")
        const r = await tx(async (db) => {
            const lama = (await db.query<{ username: string; email: string | null; anggota_id: string | null; nama: string }>(
                `SELECT u.username, u.email, u.anggota_id::text, COALESCE(NULLIF(btrim(a.nama), ''), u.username) AS nama
                   FROM app_user u LEFT JOIN anggota a ON a.id = u.anggota_id WHERE u.id = $1 FOR UPDATE OF u`, [id])).rows[0]
            if (!lama) return { ok: false as const, error: "Akun tidak ditemukan" }
            const h = await aturEmail(db as never, id, email)
            if (!h.ok) return h
            const baru = email.trim().toLowerCase()
            const sama = (lama.email ?? "").trim().toLowerCase() === baru
            if (!sama && lama.email?.trim()) {
                await antreEmail(db, { jenis: "status_akun", ke: lama.email.trim().toLowerCase(), judul: "Email aplikasi anggota diganti",
                    teks: `Yth. ${lama.username},

Email akun aplikasi anggota Anda diganti oleh pengurus koperasi menjadi ${baru}. Hubungi pengurus koperasi bila ini bukan permintaan Anda.` })
            }
            // Kirim kode dan tautan verifikasi ke email baru (juga bila email sama tetapi belum terverifikasi).
            let kirim: "terkirim" | "terverifikasi" | "tanpa_rahasia" = "tanpa_rahasia"
            const dasar = (process.env.ANGGOTA_URL ?? "").replace(/\/+$/, "")
            if ((process.env.ANGGOTA_SESSION_SECRET ?? "").length >= 32) {
                const k = await kirimKodeVerifikasi(db, id, baru, lama.nama, { abaikanJeda: true, berlakuMenit: 24 * 60,
                    tautan: dasar ? `${dasar}/verifikasi-email?u=${buatTokenVerifikasi(id, 24 * 60 * 60)}` : undefined })
                kirim = k.ok ? "terkirim" : "terverifikasi"
            }
            const catatan = {
                terkirim: `Kode verifikasi${dasar ? " dan tombol tautan" : ""} sudah dikirim ke email itu (berlaku 24 jam); anggota tinggal membukanya.${dasar ? "" : " Tombol tautan tidak disertakan karena ANGGOTA_URL belum diisi di .env.local admin."}`,
                terverifikasi: "Email ini sudah terverifikasi.",
                tanpa_rahasia: "Kode verifikasi BELUM dikirim karena ANGGOTA_SESSION_SECRET belum diisi di .env.local admin (samakan dengan anggota/.env.local). Minta anggota memverifikasi di aplikasi: Akun, Email.",
            }[kirim]
            return { ok: true as const, pesan: `Email ${lama.username} disimpan: ${baru}. ${catatan}`, username: lama.username, anggotaId: lama.anggota_id, sama, kirim }
        })
        if (!r.ok) return r
        await catatAksi("User Mobile", `Email akun ${r.username} diubah`, o)
        if (await modeUji()) return { ok: true, pesan: `MODE UJI, tidak tersimpan: ${r.pesan}` }
        revalidatePath("/dashboard/members", "layout")
        if (r.anggotaId && r.kirim !== "terverifikasi") {
            await kirimNotifikasi(pool, Number(r.anggotaId), { judul: "Email akun diperbarui", url: "/akun/email", email: false,
                isi: r.kirim === "terkirim"
                    ? "Pengurus memperbarui email akun Anda dan mengirim kode verifikasi ke email itu. Buka emailnya lalu verifikasi agar notifikasi juga dikirim ke email."
                    : "Pengurus memperbarui email akun Anda. Buka Akun, Email, lalu tekan Verifikasi agar notifikasi juga dikirim ke email." })
                .catch((e) => console.error("notifikasi ubah email gagal:", e))
        }
        return { ok: true, pesan: r.pesan }
    } catch (e) {
        if (!(e instanceof GalatSesi)) console.error("ubah email akun gagal:", e)
        return { ok: false, error: e instanceof Error ? e.message : "Gagal" }
    }
}

/** Email dan status verifikasi sebuah akun (ya, belum, kosong), untuk menyegarkan tampilan setelah anggota memverifikasi. Hanya membaca. */
export async function statusEmailAkunAction(id: number): Promise<{ ok: true; email: string | null; status: "ya" | "belum" | "kosong" } | { ok: false; error: string }> {
    try {
        await operatorAktif(MENU_EMAIL)
        const st = await statusEmail(pool, id)
        return { ok: true, email: st.email, status: !st.email?.trim() ? "kosong" : st.terverifikasi ? "ya" : "belum" }
    } catch (e) {
        return { ok: false, error: e instanceof Error ? e.message : "Gagal" }
    }
}

/** Bahan form kelengkapan anggota (isian awal dari data karyawan Mattel dan nilai awal simpanan) untuk akun yang akan disetujui atau dijadikan anggota. */
export async function dataLengkapiAnggotaAction(id: number): Promise<DataLengkapi> {
    try {
        await operatorAktif(MENU_USER)
        return await dataLengkapiAnggota({ query: (t: string, p?: unknown[]) => pool.query(t, p) } as never, id)
    } catch (e) {
        if (!(e instanceof GalatSesi)) console.error("data kelengkapan anggota gagal:", e)
        return { ok: false, error: e instanceof Error ? e.message : "Gagal memuat data" }
    }
}

/**
 * Jadikan akun karyawan Mattel yang sudah aktif (disetujui sebelum ada fitur ini) sebagai anggota: dibuatkan data anggota
 * dengan kode anggota berformat lama, atau ditautkan ke data anggota yang sudah ada untuk NIK itu.
 */
export async function jadikanAnggotaAction(id: number, lengkap?: LengkapAnggota): Promise<HasilPendaftaran> {
    try {
        const o = await operatorAktif(MENU_USER)
        wajibAksi(o, MENU_USER, "ubah")
        const r = await tx((db) => jadikanAnggota(db as never, id, { id: o.id, nama: o.nama }, lengkap))
        if (!r.ok) return r
        const pesan = r.dibuat ? `Akun dijadikan anggota, kode anggota ${r.kode}` : `Akun ditautkan ke anggota ${r.kode}`
        await catatAksi("User Mobile", pesan)
        if (await modeUji()) return { ok: true, pesan: `MODE UJI, tidak tersimpan: ${pesan}` }
        revalidatePath("/dashboard/members", "layout")
        return { ok: true, pesan }
    } catch (e) {
        if (!(e instanceof GalatSesi)) console.error("jadikan anggota gagal:", e)
        return { ok: false, error: e instanceof Error ? e.message : "Gagal" }
    }
}

/**
 * Hapus akun aplikasi anggota beserta data aplikasinya. Akun yang sudah terhubung ke anggota hanya boleh dihapus
 * superadmin atau grup admin; data keuangan anggota tidak ikut terhapus.
 */
export async function hapusUserMobileAction(id: number, kodeHapusAnggota?: string): Promise<HasilPendaftaran> {
    try {
        const o = await operatorAktif(MENU_USER)
        wajibAksi(o, [MENU.user], "hapus")
        const [u] = await query<{ anggota_id: string | null; kode: string | null }>(
            "SELECT u.anggota_id::text, a.kode_agt AS kode FROM app_user u LEFT JOIN anggota a ON a.id = u.anggota_id WHERE u.id = $1", [id])
        if (!u) return { ok: false, error: "Akun tidak ditemukan" }
        if (u.anggota_id && !bolehHapusAkunAnggota(o)) throw new GalatSesi("Akun yang sudah terhubung ke anggota hanya boleh dihapus oleh superadmin atau admin")
        // Menghapus keanggotaan juga: verifikasi dengan mengetikkan kode anggota; ditolak bila anggota sudah punya transaksi pembukuan.
        const hapusAnggota = !!kodeHapusAnggota?.trim()
        if (hapusAnggota && (!u.anggota_id || kodeHapusAnggota!.trim().toLowerCase() !== (u.kode ?? "").toLowerCase())) throw new GalatSesi("Kode anggota yang diketik tidak sama; tidak ada yang dihapus")
        const r = await tx(async (db) => {
            const h = await hapusAkunAplikasi(db as never, id)
            if (!h.ok || !hapusAnggota) return h
            const k = await hapusKeanggotaan(db as never, u.anggota_id!)
            if (!k.ok) throw new GalatSesi(k.error) // batalkan juga penghapusan akunnya
            return { ...h, pesan: `${h.pesan}; ${k.pesan}` }
        })
        if (!r.ok) return r
        await catatAksi("User Mobile", r.pesan)
        if (await modeUji()) return { ok: true, pesan: `MODE UJI, tidak tersimpan: ${r.pesan}` }
        revalidatePath("/dashboard/members", "layout")
        return { ok: true, pesan: r.pesan }
    } catch (e) {
        if (!(e instanceof GalatSesi)) console.error("hapus user mobile gagal:", e)
        return { ok: false, error: e instanceof Error ? e.message : "Gagal" }
    }
}
