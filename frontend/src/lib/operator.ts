import "server-only"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { query } from "@/lib/db"
import { bacaSesi, COOKIE_SESI, sidikPassword } from "@/lib/sesi"

export interface Operator {
    id: number
    nama: string
    namaLengkap: string
    status: string | null
    grup: string | null
    wajibGantiPassword: boolean
}

export interface BarisOpr {
    id: number; nama: string; nama_lengkap: string | null; status: string | null; nama_grup: string | null
    password_hash: string | null; wajib_ganti_password: boolean; status_aktif: string
}

/** Operator boleh login bila status_aktif bukan 'NON AKTIF' (desktop memakai '' untuk aktif). */
export const oprAktif = (o: Pick<BarisOpr, "status_aktif">) => o.status_aktif.trim().toUpperCase() !== "NON AKTIF"

export async function cariOpr(by: { id?: number; nama?: string }) {
    const [o] = await query<BarisOpr>(
        `SELECT o.id, o.nama, o.nama_lengkap, o.status, g.nama_grup, o.password_hash, o.wajib_ganti_password, o.status_aktif
           FROM opr o LEFT JOIN opr_grup g ON g.id = o.grup_id
          WHERE ${by.id !== undefined ? "o.id = $1" : "lower(o.nama) = lower($1)"}`, [by.id ?? by.nama])
    return o ?? null
}

/**
 * Operator dari cookie sesi, diperiksa ulang ke tabel opr: masih aktif dan password belum diganti
 * sejak login. Null bila tidak ada sesi yang berlaku.
 */
export async function operatorSesi(): Promise<Operator | null> {
    const s = bacaSesi((await cookies()).get(COOKIE_SESI)?.value)
    if (!s) return null
    const o = await cariOpr({ id: s.id })
    if (!o || !oprAktif(o) || !o.password_hash || sidikPassword(o.password_hash) !== s.pv) return null
    return { id: o.id, nama: o.nama, namaLengkap: o.nama_lengkap || o.nama, status: o.status, grup: o.nama_grup,
        wajibGantiPassword: o.wajib_ganti_password }
}

/** Untuk halaman: alihkan ke login bila belum masuk, ke ganti password bila wajib. */
export async function wajibLogin(opsi: { bolehWajibGanti?: boolean } = {}) {
    const o = await operatorSesi()
    if (!o) redirect("/login")
    if (o.wajibGantiPassword && !opsi.bolehWajibGanti) redirect("/ganti-password")
    return o
}

/** Galat sesi (bukan kegagalan posting); pesannya ditampilkan ke kasir tanpa dicatat di log. */
export class GalatSesi extends Error {}

/** Untuk server action: operator yang sah dan sudah mengganti password awal, atau galat. */
export async function operatorAktif(): Promise<Operator> {
    const o = await operatorSesi()
    if (!o) throw new GalatSesi("Sesi berakhir, silakan login kembali")
    if (o.wajibGantiPassword) throw new GalatSesi("Ganti password awal terlebih dahulu")
    return o
}
