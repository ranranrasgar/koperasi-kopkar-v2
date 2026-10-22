import "server-only"
import { query } from "@/lib/db"
import { AKSES_HALAMAN, GRUP_SUPERADMIN, MENU } from "@/config/akses"

export interface Grup { id: number; urut: number; nama_grup: string }

/** Grup yang hak aksesnya diatur lewat matriks (superadmin tidak, karena selalu lolos). */
export const grupBiasa = () =>
    query<Grup>("SELECT id, urut, nama_grup FROM opr_grup WHERE nama_grup IS DISTINCT FROM $1 ORDER BY urut", [GRUP_SUPERADMIN])

export const semuaGrup = () => query<Grup>("SELECT id, urut, nama_grup FROM opr_grup ORDER BY urut")

/** Menu web yang dipakai halaman (selain Kelola Akses, yang khusus superadmin). */
export const MENU_WEB = new Set(Object.values(AKSES_HALAMAN).flat().filter((m) => m !== MENU.kelolaAkses))

export async function matriksAkses() {
    const [grup, baris] = await Promise.all([
        grupBiasa(),
        query<{ menu: string; grup_id: number; akses: string }>("SELECT menu, grup_id, akses FROM opr_hak_akses"),
    ])
    const menu = [...new Set([...baris.map((b) => b.menu), ...MENU_WEB])].filter((m) => m !== MENU.kelolaAkses)
        .sort((a, b) => a.localeCompare(b, "id"))
    const izin: Record<string, number[]> = {}
    for (const b of baris) if (b.akses === "T") (izin[b.menu] ??= []).push(b.grup_id)
    return { grup, menu: menu.map((m) => ({ nama: m, web: MENU_WEB.has(m), grupIzin: izin[m] ?? [] })) }
}

export interface OperatorBaris {
    id: number; nama: string; nama_lengkap: string | null; grup_id: number; nama_grup: string | null
    aktif: boolean; punya_password: boolean; wajib_ganti_password: boolean
}

export const daftarOperator = () =>
    query<OperatorBaris>(`
        SELECT o.id, o.nama, o.nama_lengkap, o.grup_id, g.nama_grup, upper(trim(o.status_aktif)) <> 'NON AKTIF' AS aktif,
               o.password_hash IS NOT NULL AS punya_password, o.wajib_ganti_password
          FROM opr o LEFT JOIN opr_grup g ON g.id = o.grup_id ORDER BY o.nama`)
