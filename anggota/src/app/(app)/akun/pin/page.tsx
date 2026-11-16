import type { Metadata } from "next"
import { adaPin } from "@kopkar/backend/src/anggota/pin.ts"
import { Kepala } from "@/components/ui"
import { wajibAnggota } from "@/lib/anggota"
import { pool } from "@/lib/db"
import { FormPin } from "./FormPin"

export const metadata: Metadata = { title: "PIN Transaksi" }

export default async function PinPage() {
    const a = await wajibAnggota()
    const ada = await adaPin(pool, a.anggotaId)
    return (
        <main>
            <Kepala judul={ada ? "Ganti PIN transaksi" : "Atur PIN transaksi"} sub="Untuk menyetujui pembayaran dari Simpanan Sukarela" kembali="/akun" />
            <div className="px-5"><FormPin adaPin={ada} /></div>
        </main>
    )
}
