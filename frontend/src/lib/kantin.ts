import "server-only"
import { unitOperator } from "@kopkar/backend/src/unit-usaha/kantin.ts"
import type { Db } from "@kopkar/backend/src/db.ts"
import { MENU, punyaIzin } from "@/config/akses"
import type { Operator } from "@/lib/operator"

/** Kantin yang boleh dipegang operator ini: pemegang izin Unit Usaha (dan superadmin) semua kantin, selain itu yang ditugaskan saja. */
export const unitBoleh = (db: Pick<Db, "query">, o: Operator) => unitOperator(db, o.id, o.superadmin || punyaIzin(o.izin, [MENU.unitUsaha]))
