import "server-only"
import { temaSah, type Tema } from "@kopkar/backend/src/tampilan.ts"
import { pool } from "@/lib/db"

/** Tema tersimpan operator, atau null bila memakai tampilan awal (atau tabel belum dipasang). */
export async function temaOperator(operatorId: number): Promise<Tema | null> {
    try {
        const r = await pool.query("SELECT tema FROM opr_tampilan WHERE operator_id = $1", [operatorId])
        return temaSah(r.rows[0]?.tema)
    } catch (e) {
        if ((e as { code?: string }).code === "42P01") return null
        throw e
    }
}
