import { KelolaGrade, type BarisGrade } from "@/components/master/KelolaGrade"
import { query } from "@/lib/db"
import { wajibIzin } from "@/lib/operator"

export const dynamic = "force-dynamic"

export default async function GradePage() {
    await wajibIzin("/dashboard/settings/grade") // layout tidak dijalankan ulang pada navigasi antarhalaman
    const [baris, [lepas]] = await Promise.all([
        query<BarisGrade>(`SELECT g.id, g.nama, g.nominal::float8 AS nominal, COUNT(a.id) FILTER (WHERE a.aktif) AS aktif, COUNT(a.id) AS jumlah,
                COUNT(a.id) FILTER (WHERE a.rp_grade <> g.nominal) AS beda
            FROM grade g LEFT JOIN anggota a ON a.grade_id = g.id GROUP BY g.id ORDER BY g.nama`),
        // Anggota aktif yang gradenya cocok dengan nama di tabel tetapi belum tertaut (grade_id kosong).
        query<{ n: string }>(`SELECT COUNT(*) AS n FROM anggota a JOIN grade g ON g.nama = a.grade WHERE a.grade_id IS NULL`),
    ])
    return <KelolaGrade baris={baris} belumTertaut={Number(lepas?.n ?? 0)} />
}
