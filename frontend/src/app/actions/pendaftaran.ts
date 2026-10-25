"use server"

import { revalidatePath } from "next/cache"
import { dataLengkapiAnggota, hapusAkunAplikasi, hapusKeanggotaan, jadikanAnggota, putuskanPendaftaran, type DataLengkapi, type LengkapAnggota } from "@kopkar/backend/src/anggota/akun.ts"
import { antreEmail } from "@kopkar/backend/src/email/antrean.ts"
import { modeUji, pool, query, tx } from "@/lib/db"
import { GalatSesi, operatorAktif, type Operator } from "@/lib/operator"
import { MENU } from "@/config/akses"

export type HasilPendaftaran = { ok: true; pesan: string } | { ok: false; error: string }

const MENU_USER = [MENU.user, MENU.requestUser] as const

/** Hapus akun yang sudah terhubung ke anggota hanya boleh oleh superadmin atau grup admin. */
const bolehHapusAkunAnggota = (o: Pick<Operator, "superadmin" | "grup">) => o.superadmin || (o.grup ?? "").trim().toLowerCase() === "admin"

/**
 * Setujui atau tolak pendaftaran akun baru dari aplikasi anggota. Lewat tx() supaya ikut di-rollback di mode uji.
 * Pendaftar diberi tahu lewat email (ke email yang sudah terverifikasi); gagal kirim tidak membatalkan keputusan.
 */
export async function putuskanPendaftaranAction(id: number, setuju: boolean, lengkap?: LengkapAnggota): Promise<HasilPendaftaran> {
    try {
        const o = await operatorAktif(MENU_USER)
        const r = await tx((db) => putuskanPendaftaran(db as never, id, setuju, { id: o.id, nama: o.nama }, lengkap))
        if (!r.ok) return r
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
        const r = await tx((db) => jadikanAnggota(db as never, id, { id: o.id, nama: o.nama }, lengkap))
        if (!r.ok) return r
        const pesan = r.dibuat ? `Akun dijadikan anggota, kode anggota ${r.kode}` : `Akun ditautkan ke anggota ${r.kode}`
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
        if (await modeUji()) return { ok: true, pesan: `MODE UJI, tidak tersimpan: ${r.pesan}` }
        revalidatePath("/dashboard/members", "layout")
        return { ok: true, pesan: r.pesan }
    } catch (e) {
        if (!(e instanceof GalatSesi)) console.error("hapus user mobile gagal:", e)
        return { ok: false, error: e instanceof Error ? e.message : "Gagal" }
    }
}
