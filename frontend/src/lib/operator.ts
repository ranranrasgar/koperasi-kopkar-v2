import "server-only"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { query } from "@/lib/db"
import { bacaSesi, COOKIE_SESI, sidikPassword } from "@/lib/sesi"
import { AKSES_HALAMAN, GRUP_SUPERADMIN, MENU, punyaIzin } from "@/config/akses"

export interface Operator {
    id: number
    nama: string
    namaLengkap: string
    status: string | null
    grup: string | null
    wajibGantiPassword: boolean
    /** Nama menu desktop yang berizin ('T') untuk grup operator, dari opr_hak_akses. */
    izin: string[]
    /** Grup superadmin: semua menu berizin, termasuk Kelola Akses. */
    superadmin: boolean
}

export interface BarisOpr {
    id: number; nama: string; nama_lengkap: string | null; status: string | null; grup_id: number; nama_grup: string | null
    password_hash: string | null; wajib_ganti_password: boolean; status_aktif: string
}

/** Operator boleh login bila status_aktif bukan 'NON AKTIF' (desktop memakai '' untuk aktif). */
export const oprAktif = (o: Pick<BarisOpr, "status_aktif">) => o.status_aktif.trim().toUpperCase() !== "NON AKTIF"

export async function cariOpr(by: { id?: number; nama?: string }) {
    const [o] = await query<BarisOpr>(
        `SELECT o.id, o.nama, o.nama_lengkap, o.status, o.grup_id, g.nama_grup, o.password_hash, o.wajib_ganti_password, o.status_aktif
           FROM opr o LEFT JOIN opr_grup g ON g.id = o.grup_id
          WHERE ${by.id !== undefined ? "o.id = $1" : "lower(o.nama) = lower($1)"}`, [by.id ?? by.nama])
    return o ?? null
}

/**
 * Operator dari cookie sesi, diperiksa ulang ke tabel opr: masih aktif dan password belum diganti
 * sejak login. Hak akses dibaca setiap kali, jadi perubahan grup berlaku tanpa login ulang.
 */
export async function operatorSesi(): Promise<Operator | null> {
    const s = bacaSesi((await cookies()).get(COOKIE_SESI)?.value)
    if (!s) return null
    const o = await cariOpr({ id: s.id })
    if (!o || !oprAktif(o) || !o.password_hash || sidikPassword(o.password_hash) !== s.pv) return null
    const superadmin = o.nama_grup === GRUP_SUPERADMIN
    // Superadmin: semua menu yang dikenal (desktop dan web), tanpa melihat opr_hak_akses grupnya.
    const izin = superadmin
        ? [...new Set([...(await query<{ menu: string }>("SELECT DISTINCT menu FROM opr_hak_akses")).map((r) => r.menu), ...Object.values(MENU)])]
        : (await query<{ menu: string }>("SELECT DISTINCT menu FROM opr_hak_akses WHERE grup_id = $1 AND akses = 'T'", [o.grup_id])).map((r) => r.menu)
    return { id: o.id, nama: o.nama, namaLengkap: o.nama_lengkap || o.nama, status: o.status, grup: o.nama_grup,
        wajibGantiPassword: o.wajib_ganti_password, izin, superadmin }
}

/** Untuk halaman: alihkan ke login bila belum masuk, ke ganti password bila wajib. */
export async function wajibLogin(opsi: { bolehWajibGanti?: boolean } = {}) {
    const o = await operatorSesi()
    if (!o) redirect("/login")
    if (o.wajibGantiPassword && !opsi.bolehWajibGanti) redirect("/ganti-password")
    return o
}

/** Untuk halaman yang dibatasi: seperti wajibLogin, lalu tolak bila grup tidak punya izin halaman ini. */
export async function wajibIzin(href: string) {
    const o = await wajibLogin()
    const perlu = AKSES_HALAMAN[href]
    if (perlu && !punyaIzin(o.izin, perlu)) redirect("/dashboard?akses=ditolak")
    return o
}

/** Galat sesi atau hak akses (bukan kegagalan posting); pesannya ditampilkan ke kasir tanpa dicatat di log. */
export class GalatSesi extends Error {}

/** Boleh membaca panduan khusus admin: superadmin atau grup admin. */
export const adminPanduan = (o: Pick<Operator, "superadmin" | "grup">) => o.superadmin || (o.grup ?? "").trim().toLowerCase() === "admin"

/** Untuk server action: operator yang sah, sudah mengganti password awal, dan (bila diberi) berizin salah satu menu. */
export async function operatorAktif(menu?: readonly string[]): Promise<Operator> {
    const o = await operatorSesi()
    if (!o) throw new GalatSesi("Sesi berakhir, silakan login kembali")
    if (o.wajibGantiPassword) throw new GalatSesi("Ganti password awal terlebih dahulu")
    if (menu) wajibMenu(o, menu)
    return o
}

export function wajibMenu(o: Operator, menu: readonly string[]) {
    if (!punyaIzin(o.izin, menu)) throw new GalatSesi(`Grup ${o.grup ?? "-"} tidak punya akses ke ${menu.join(" / ")}`)
}
