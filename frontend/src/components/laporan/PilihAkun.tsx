"use client"

import { useState } from "react"
import { AkunBox } from "@/components/bankbook/AkunBox"
import type { Akun } from "@/components/transaksi/common"

/** Pilihan akun yang bisa dicari (kode atau nama) untuk form filter laporan (GET); nilainya dikirim sebagai `name`. */
export function PilihAkun({ akun, awal, name = "akun", lebar = "w-80" }: { akun: Akun[]; awal: string; name?: string; lebar?: string }) {
    const [kode, setKode] = useState(awal)
    return (
        <label className="flex items-center gap-1.5">
            <span className="text-xs font-medium text-muted-foreground">Akun</span>
            <span className={lebar}><AkunBox akun={akun} nilai={kode} onUbah={setKode} dataF={`filter-${name}`} name={name} label="Akun" /></span>
        </label>
    )
}
