import { AuthCard, GantiPasswordForm } from "@/components/auth/AuthForms"
import { wajibLogin } from "@/lib/operator"

export default async function GantiPasswordPage() {
    const o = await wajibLogin({ bolehWajibGanti: true })
    return (
        <AuthCard title="Ganti Password"
            description={o.wajibGantiPassword
                ? `Halo ${o.namaLengkap}, ganti password sementara dari admin sebelum memakai aplikasi.`
                : `Ganti password untuk ${o.namaLengkap}.`}>
            <GantiPasswordForm wajib={o.wajibGantiPassword} />
        </AuthCard>
    )
}
