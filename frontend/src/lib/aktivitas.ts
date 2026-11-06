import "server-only"
import { catatAktivitas } from "@kopkar/backend/src/aktivitas.ts"
import { modeUji, pool } from "@/lib/db"
import { operatorSesi, type Operator } from "@/lib/operator"

/** Catat aksi simpan operator di riwayat Aktivitas Pengguna. Dipanggil dari pembungkus server action; gagal mencatat tidak menggagalkan aksinya. */
export async function catatAksi(modul: string, pesan: string, o?: Pick<Operator, "id" | "nama">) {
    try {
        const op = o ?? await operatorSesi()
        if (!op) return
        const uji = await modeUji()
        await catatAktivitas(pool, { kanal: "admin", penggunaId: op.id, nama: op.nama, aksi: "simpan", modul, ket: `${uji ? "[Mode uji] " : ""}${pesan}` })
    } catch (e) {
        console.error("catat aksi gagal:", e)
    }
}
