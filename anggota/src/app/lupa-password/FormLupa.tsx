"use client"

import Link from "next/link"
import { useActionState, useState } from "react"
import { pertanyaanAction, resetEmailAction, resetJawabanAction } from "@/app/actions/akun"
import { ATURAN_PASSWORD, Kolom, KolomPassword, PesanBerhasil, PesanGalat, tanpaReset, Tombol } from "@/components/form"

/** Dua cara: pertanyaan keamanan (langsung di aplikasi) dan tautan lewat email (butuh email terdaftar). */
export function FormLupa({ emailAktif }: { emailAktif: boolean }) {
    const [cara, setCara] = useState<"jawaban" | "email">("jawaban")
    const tab = (aktif: boolean) =>
        `flex h-10 flex-1 items-center justify-center rounded-lg text-sm font-semibold transition-colors ${aktif ? "bg-permukaan text-teks shadow-sm" : "text-redup"}`
    return (
        <>
            <div role="tablist" aria-label="Cara" className="mb-6 flex gap-1 rounded-xl bg-garis/60 p-1">
                <button type="button" role="tab" aria-selected={cara === "jawaban"} className={tab(cara === "jawaban")} onClick={() => setCara("jawaban")}>
                    Pertanyaan keamanan
                </button>
                <button type="button" role="tab" aria-selected={cara === "email"} className={tab(cara === "email")} onClick={() => setCara("email")}>
                    Lewat email
                </button>
            </div>
            {cara === "jawaban" ? <LewatJawaban /> : <LewatEmail aktif={emailAktif} />}
        </>
    )
}

function LewatJawaban() {
    const [tanya, kirimTanya, prosesTanya] = useActionState(pertanyaanAction, null)
    const [hasil, kirim, proses] = useActionState(resetJawabanAction, null)

    if (hasil?.ok) {
        return (
            <PesanBerhasil judul="Password diganti" pesan={hasil.pesan}>
                <Link href="/masuk" className="inline-flex h-12 items-center rounded-xl bg-utama px-6 font-semibold text-pada-utama">Masuk</Link>
            </PesanBerhasil>
        )
    }
    if (!tanya?.ok) {
        return (
            <form onSubmit={tanpaReset(kirimTanya)} className="space-y-5">
                <Kolom label="Username" name="username" autoComplete="username" autoCapitalize="none" autoCorrect="off" spellCheck={false} required />
                <PesanGalat pesan={tanya && !tanya.ok ? tanya.error : null} />
                <Tombol proses={prosesTanya}>Lanjut</Tombol>
            </form>
        )
    }
    return (
        <form onSubmit={tanpaReset(kirim)} className="space-y-5">
            <input type="hidden" name="username" value={tanya.username} />
            <div className="rounded-2xl bg-utama-lembut px-4 py-3.5">
                <p className="text-xs text-redup">Pertanyaan keamanan untuk {tanya.username}</p>
                <p className="mt-0.5 font-semibold">{tanya.pertanyaan}</p>
            </div>
            <Kolom label="Jawaban" name="jawaban" autoComplete="off" required catatan="Huruf besar/kecil tidak dibedakan." />
            <KolomPassword label="Password baru" name="password" autoComplete="new-password" required catatan={ATURAN_PASSWORD} />
            <KolomPassword label="Ulangi password baru" name="ulangi" autoComplete="new-password" required />
            <PesanGalat pesan={hasil && !hasil.ok ? hasil.error : null} />
            <Tombol proses={proses}>Simpan password baru</Tombol>
        </form>
    )
}

function LewatEmail({ aktif }: { aktif: boolean }) {
    const [hasil, kirim, proses] = useActionState(resetEmailAction, null)
    if (hasil?.ok) return <PesanBerhasil judul="Periksa email Anda" pesan={hasil.pesan} />
    return (
        <form onSubmit={tanpaReset(kirim)} className="space-y-5">
            {!aktif && (
                <p className="rounded-xl bg-tunggu/15 px-4 py-3 text-sm leading-relaxed">
                    Pengiriman email belum aktif. Untuk sementara gunakan pertanyaan keamanan atau hubungi pengurus koperasi.
                </p>
            )}
            <Kolom label="Username" name="username" autoComplete="username" autoCapitalize="none" autoCorrect="off" spellCheck={false} required />
            <Kolom label="Email terdaftar" name="email" type="email" autoComplete="email" required />
            <PesanGalat pesan={hasil && !hasil.ok ? hasil.error : null} />
            <Tombol proses={proses}>Kirim tautan</Tombol>
        </form>
    )
}
