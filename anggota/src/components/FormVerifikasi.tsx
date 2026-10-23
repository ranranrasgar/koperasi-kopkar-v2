"use client"

import Link from "next/link"
import { useActionState } from "react"
import { kirimUlangKodeAction, verifikasiKodeAction } from "@/app/actions/verifikasi"
import { kelasKolom, PesanBerhasil, PesanGalat, tanpaReset, Tombol } from "@/components/form"

/** Masukkan kode 6 angka dari email. lanjut: tujuan setelah selesai bagi yang sudah punya akun aktif (boleh dilewati). */
export function FormVerifikasi({ token, emailSamar, lanjut }: { token: string; emailSamar: string; lanjut?: string }) {
    const [hasil, kirim, proses] = useActionState(verifikasiKodeAction, null)
    const [ulang, kirimUlang, prosesUlang] = useActionState(kirimUlangKodeAction, null)

    if (hasil?.ok) {
        return (
            <PesanBerhasil judul="Terverifikasi" pesan={hasil.pesan}>
                <Link href={hasil.aktivasi ? "/masuk" : (lanjut ?? "/beranda")} className="inline-flex h-12 items-center rounded-xl bg-utama px-6 font-semibold text-pada-utama">
                    {hasil.aktivasi ? "Masuk" : "Lanjut"}
                </Link>
            </PesanBerhasil>
        )
    }
    return (
        <div className="space-y-5">
            <form onSubmit={tanpaReset(kirim)} className="space-y-5">
                <input type="hidden" name="token" value={token} />
                <div className="space-y-2">
                    <label htmlFor="kode" className="text-sm font-medium">Kode verifikasi</label>
                    <input id="kode" name="kode" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required
                        placeholder="••••••" className={`${kelasKolom} text-center text-2xl font-semibold tracking-[0.5em]`} />
                    <p className="text-xs text-redup">Kode 6 angka dikirim ke {emailSamar} dan berlaku 15 menit. Periksa juga folder spam.</p>
                </div>
                <PesanGalat pesan={hasil && !hasil.ok ? hasil.error : null} />
                <Tombol proses={proses} label="Memeriksa…">Verifikasi</Tombol>
            </form>

            <form onSubmit={tanpaReset(kirimUlang)} className="text-center text-sm">
                <input type="hidden" name="token" value={token} />
                <button disabled={prosesUlang} className="font-semibold text-utama disabled:opacity-60">{prosesUlang ? "Mengirim…" : "Belum menerima kode? Kirim ulang"}</button>
                {ulang && <p role="status" className={`mt-2 ${ulang.ok ? "text-masuk" : "text-keluar"}`}>{ulang.ok ? ulang.pesan : ulang.error}</p>}
            </form>

            {lanjut && <p className="text-center text-sm"><Link href={lanjut} className="text-redup">Lewati dulu</Link></p>}
        </div>
    )
}
