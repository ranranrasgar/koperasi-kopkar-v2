import "server-only"
import { query } from "@/lib/db"
import { AKSES_HALAMAN, AKSI_IZIN, GRUP_SUPERADMIN, LABEL_IZIN, MENU, type AksiIzin } from "@/config/akses"
import { allGroups } from "@/config/menu"

export interface Grup { id: number; urut: number; nama_grup: string }

/** Grup yang hak aksesnya diatur lewat matriks (superadmin tidak, karena selalu lolos). */
export const grupBiasa = () =>
    query<Grup>("SELECT id, urut, nama_grup FROM opr_grup WHERE nama_grup IS DISTINCT FROM $1 ORDER BY urut", [GRUP_SUPERADMIN])

export const semuaGrup = () => query<Grup>("SELECT id, urut, nama_grup FROM opr_grup ORDER BY urut")

/** Satu kotak centang per grup: izin di opr_hak_akses. `label` terisi bila menunya punya lebih dari satu izin. */
export interface IzinBaris {
    nama: string; label: string | null; grupIzin: number[]
    /** Aksi yang bisa diatur untuk menu ini, dan grup yang aksinya dimatikan. */
    aksi: readonly AksiIzin[]; tolak: Partial<Record<AksiIzin, number[]>>
}
/** Satu menu sidebar. `tetap` terisi bila izinnya tidak bisa diatur lewat matriks. */
export interface MenuBaris { label: string; tetap: string | null; izin: IzinBaris[] }
export interface KelompokBaris { label: string; menu: MenuBaris[] }

/** Dashboard selalu tampil di sidebar; izinnya hanya mengatur isi ringkasan, jadi tidak ada di AKSES_HALAMAN. */
const izinItem = (href: string) => href === "/dashboard" ? [MENU.dashboard] : AKSES_HALAMAN[href] ?? []

export async function matriksAkses() {
    const [grup, baris] = await Promise.all([
        grupBiasa(),
        query<{ menu: string; grup_id: number; akses: string; boleh_tambah: boolean; boleh_ubah: boolean; boleh_hapus: boolean }>(
            "SELECT menu, grup_id, akses, boleh_tambah, boleh_ubah, boleh_hapus FROM opr_hak_akses"),
    ])
    const izin: Record<string, number[]> = {}
    const tolak: Record<string, Partial<Record<AksiIzin, number[]>>> = {}
    for (const b of baris) {
        if (b.akses === "T") (izin[b.menu] ??= []).push(b.grup_id)
        for (const a of ["tambah", "ubah", "hapus"] as const) if (!b[`boleh_${a}`]) ((tolak[b.menu] ??= {})[a] ??= []).push(b.grup_id)
    }
    const menuBaris = (label: string, nama: string[]): MenuBaris => nama.includes(MENU.kelolaAkses)
        ? { label, tetap: "Khusus superadmin", izin: [] }
        : { label, tetap: nama.length ? null : "Semua operator",
            izin: nama.map((m) => ({ nama: m, label: nama.length > 1 ? LABEL_IZIN[m] ?? m : null, grupIzin: izin[m] ?? [], aksi: AKSI_IZIN[m] ?? [], tolak: tolak[m] ?? {} })) }
    const kelompok: KelompokBaris[] = allGroups.map((g) => ({ label: g.groupLabel, menu: g.items.map((i) => menuBaris(i.label, izinItem(i.href))) }))
    // Pesan Anggota dibuka dari ikon di navbar, bukan dari sidebar, tetapi izinnya tetap diatur di sini.
    kelompok.push({ label: "Navbar", menu: [menuBaris("Pesan Anggota", AKSES_HALAMAN["/dashboard/pesan"])] })
    return { grup, kelompok }
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
