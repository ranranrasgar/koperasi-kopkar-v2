import { daftarMenungguAdmin, type PendaftaranBaru } from "@kopkar/backend/src/anggota/akun.ts"
import { DaftarPendaftaran } from "@/components/master/DaftarPendaftaran"
import { pool } from "@/lib/db"
import { wajibIzin } from "@/lib/operator"

export const dynamic = "force-dynamic"

export default async function PendaftaranBaruPage() {
    await wajibIzin("/dashboard/members/pendaftaran") // layout tidak dijalankan ulang pada navigasi antarhalaman
    let data: PendaftaranBaru[]
    try {
        data = await daftarMenungguAdmin(pool)
    } catch (e) {
        const kode = (e as { code?: string }).code
        if (kode === "42703" || kode === "42P01")
            return <p className="text-sm text-red-600">Kolom pendaftaran belum dipasang di database ini. Jalankan npm run anggota:pasang.</p>
        throw e
    }
    return <DaftarPendaftaran data={data} />
}
