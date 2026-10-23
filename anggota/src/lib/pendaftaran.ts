import "server-only"
import { cariAkun } from "@kopkar/backend/src/anggota/akun.ts"
import { beritahuAdmin, MENU_REQUEST_USER } from "@kopkar/backend/src/anggota/notif-admin.ts"
import { pool } from "@/lib/db"

/** Beri tahu admin (lonceng, push, dan email pengurus) bahwa ada pendaftaran baru yang menunggu persetujuan. Tidak pernah melempar. */
export async function beritahuPendaftaranBaru(userId: number) {
    try {
        const a = await cariAkun(pool, { id: userId })
        if (!a) return
        await beritahuAdmin(pool, {
            menu: MENU_REQUEST_USER, judul: "Pendaftaran baru menunggu verifikasi",
            isi: `${a.nama?.trim() || a.username} (${a.nik ?? a.kode_agt}) mendaftar di aplikasi anggota. Periksa dan putuskan di Keanggotaan, User Mobile.`,
            url: "/dashboard/members/mobile-users?status=menunggu",
        })
    } catch (e) {
        console.error("beritahu admin pendaftaran gagal:", e)
    }
}
