import { daftarMenungguAdmin } from "@kopkar/backend/src/anggota/akun.ts"
import { DaftarPendaftaran } from "@/components/master/DaftarPendaftaran"
import { ModuleTable } from "@/components/ui/ModuleTable"
import { userMobileConfig } from "@/config/modules"
import { pool } from "@/lib/db"
import { daftarUserMobile } from "@/lib/queries/keanggotaan"
import { wajibIzin } from "@/lib/operator"

export const dynamic = "force-dynamic"

/** Pendaftaran baru yang menunggu persetujuan; kosong bila belum ada (atau kolom menunggu_admin belum dipasang di database ini). */
async function pendaftaranBaru() {
    try {
        return await daftarMenungguAdmin(pool)
    } catch (e) {
        if ((e as { code?: string }).code === "42703" || (e as { code?: string }).code === "42P01") return []
        throw e
    }
}

export default async function UserMobilePage(props: PageProps<"/dashboard/members/mobile-users">) {
    await wajibIzin("/dashboard/members/mobile-users") // layout tidak dijalankan ulang pada navigasi antarhalaman
    const [antre, data] = await Promise.all([pendaftaranBaru(), daftarUserMobile(await props.searchParams)])
    return (
        <div className="space-y-6">
            {antre.length > 0 && <DaftarPendaftaran data={antre} />}
            <ModuleTable config={userMobileConfig} data={data} />
        </div>
    )
}
