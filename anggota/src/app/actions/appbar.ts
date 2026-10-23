"use server"

import { anggotaSesi } from "@/lib/anggota"
import { statusAppBar } from "@/lib/status-appbar"

// Hanya action ini yang diekspor: anggotaId selalu dari sesi, tidak pernah dari klien.
export async function statusAppBarAction() {
    const a = await anggotaSesi()
    if (!a || a.anggotaId === null) return null
    return statusAppBar(a.anggotaId)
}
