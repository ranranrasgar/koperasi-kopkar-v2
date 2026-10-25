import { TEMA_BAWAAN } from "@kopkar/backend/src/tampilan.ts"
import { wajibLogin } from "@/lib/operator"
import { temaOperator } from "@/lib/tampilan"
import { EditorTampilan } from "@/components/settings/EditorTampilan"

export const dynamic = "force-dynamic"

export default async function TampilanPage() {
    const o = await wajibLogin() // preferensi pribadi: semua operator boleh mengatur tampilannya sendiri
    const tersimpan = await temaOperator(o.id)
    return (
        <div className="max-w-5xl space-y-4">
            <div>
                <h2 className="text-lg font-semibold">Pengaturan Tampilan</h2>
                <p className="text-sm text-muted-foreground">Pilih tema atau atur warna sendiri. Berlaku untuk akun Anda saja, dan tidak mengubah tampilan operator lain.</p>
            </div>
            <EditorTampilan awal={tersimpan ?? TEMA_BAWAAN} adaTersimpan={!!tersimpan} />
        </div>
    )
}
