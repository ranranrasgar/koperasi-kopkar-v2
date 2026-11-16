import Link from "next/link"
import { FormCard } from "@/components/transaksi/common"
import type { UnitOperator } from "@kopkar/backend/src/unit-usaha/kantin.ts"

/** Pilihan kantin bila operator memegang lebih dari satu (atau belum ada yang ditugaskan). */
export function PilihKantin({ judul, unit }: { judul: string; unit: UnitOperator[] }) {
    return (
        <div className="max-w-3xl">
            <FormCard title={judul} description={unit.length ? "Pilih kantin." : "Belum ada kantin aktif yang ditugaskan kepada Anda. Minta admin menambahkan Anda sebagai petugas di Daftar Unit Usaha."}>
                <div className="grid gap-3 sm:grid-cols-2">
                    {unit.map((u) => (
                        <Link key={u.id} href={`?unit=${u.id}`} className="rounded-lg border p-4 hover:border-primary hover:bg-muted/40">
                            <div className="font-semibold">{u.nama}</div>
                            <div className="text-xs text-muted-foreground">{u.kode} · {u.peran === "admin" ? "admin" : u.peran}</div>
                        </Link>
                    ))}
                </div>
            </FormCard>
        </div>
    )
}
