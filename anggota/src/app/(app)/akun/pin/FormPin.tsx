"use client"

import Link from "next/link"
import { useActionState } from "react"
import { aturPinAction } from "@/app/actions/kantin"
import { KolomPassword, PesanBerhasil, PesanGalat, tanpaReset, Tombol } from "@/components/form"

type Hasil = { ok: true } | { ok: false; error: string } | null

/** Atur atau ganti PIN transaksi (6 angka). Password akun wajib supaya PIN tidak bisa diganti orang yang memegang HP yang sedang masuk. */
export function FormPin({ adaPin }: { adaPin: boolean }) {
    const [hasil, kirim, proses] = useActionState<Hasil, FormData>(
        (_, f) => aturPinAction(String(f.get("password") ?? ""), String(f.get("pin") ?? ""), String(f.get("ulangi") ?? "")), null)
    if (hasil?.ok) {
        return (
            <PesanBerhasil judul="PIN tersimpan" pesan="Pakai PIN ini untuk menyetujui pembayaran dari Simpanan Sukarela.">
                <Link href="/kantin" className="inline-flex h-11 items-center rounded-xl border border-garis px-5 text-sm font-semibold">Ke Kantin</Link>
            </PesanBerhasil>
        )
    }
    return (
        <form onSubmit={tanpaReset(kirim)} className="space-y-5">
            <KolomPassword label="Password akun" name="password" autoComplete="current-password" required />
            <KolomPassword label={adaPin ? "PIN baru (6 angka)" : "PIN (6 angka)"} name="pin" inputMode="numeric" maxLength={6} pattern="\d{6}" autoComplete="off" required
                catatan="Bukan angka sama semua (111111) atau berurutan (123456). Jangan pakai tanggal lahir." />
            <KolomPassword label="Ulangi PIN" name="ulangi" inputMode="numeric" maxLength={6} pattern="\d{6}" autoComplete="off" required />
            <PesanGalat pesan={hasil && !hasil.ok ? hasil.error : null} />
            <Tombol proses={proses} label="Menyimpan…">{adaPin ? "Ganti PIN" : "Simpan PIN"}</Tombol>
        </form>
    )
}
