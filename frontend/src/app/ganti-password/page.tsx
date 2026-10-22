import { AuthCard, GantiPasswordForm } from "@/components/auth/AuthForms"
import { identitasKoperasi } from "@/lib/koperasi"
import { wajibLogin } from "@/lib/operator"

export default async function GantiPasswordPage() {
    const o = await wajibLogin({ bolehWajibGanti: true })
    const { nama, logo } = await identitasKoperasi()
    return (
        <AuthCard title="Ganti Password" koperasi={{ nama, logo }}
            description={o.wajibGantiPassword
                ? `Halo ${o.namaLengkap}, ganti password sementara dari admin sebelum memakai aplikasi.`
                : `Ganti password untuk ${o.namaLengkap}.`}>
            <GantiPasswordForm wajib={o.wajibGantiPassword} />
        </AuthCard>
    )
}
