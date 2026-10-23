import type { Metadata } from "next"
import { cookies } from "next/headers"
import Link from "next/link"
import { CircleCheckBig, MessageCircle } from "lucide-react"
import { HalamanAuth } from "@/components/HalamanAuth"
import { COOKIE_DAFTAR_DITERIMA } from "@/lib/google"
import { kontakWa } from "@/lib/koperasi"
import { bacaToken } from "@/lib/sesi"

export const metadata: Metadata = { title: "Pendaftaran Diterima" }
export const dynamic = "force-dynamic"

// Halaman terbuka: akun baru belum aktif sampai admin koperasi memverifikasi. Nama dan foto dari cookie bertanda tangan
// yang dibuat saat pendaftaran selesai (bila tidak ada, tampil pesan umum).
export default async function PendaftaranDiterimaPage() {
    const d = bacaToken("daftar-diterima", (await cookies()).get(COOKIE_DAFTAR_DITERIMA)?.value)
    const wa = await kontakWa()
    const pesanWa = `Halo admin Kopkar MJS, saya${d?.nama ? ` ${d.nama}` : ""}${d?.email ? ` (${d.email})` : ""} sudah mendaftar di aplikasi anggota. Mohon diverifikasi. Terima kasih.`
    return (
        <HalamanAuth judul="Pendaftaran diterima" kembali="/masuk">
            <div className="rounded-2xl border border-garis bg-permukaan p-5 text-center">
                {d?.foto
                    // eslint-disable-next-line @next/next/no-img-element
                    ? <img src={d.foto} alt="" referrerPolicy="no-referrer" className="mx-auto size-20 rounded-full object-cover" />
                    : <span className="mx-auto grid size-20 place-items-center rounded-full bg-masuk/10 text-masuk"><CircleCheckBig size={40} strokeWidth={1.6} /></span>}
                {d?.nama && <p className="mt-3 text-lg font-semibold">{d.nama}</p>}
                {d?.email && <p className="text-sm text-redup">{d.email}</p>}
                <p className="mt-4 text-[0.9375rem] leading-relaxed">
                    Terima kasih, data Anda sudah kami terima. <strong>Akun Anda aktif setelah diverifikasi oleh admin koperasi.</strong> Anda akan
                    mendapat pemberitahuan lewat email begitu akun disetujui.
                </p>
            </div>
            {wa && (
                <a href={`https://wa.me/${wa}?text=${encodeURIComponent(pesanWa)}`} target="_blank" rel="noopener noreferrer"
                    className="mt-5 flex h-13 w-full items-center justify-center gap-2 rounded-xl bg-utama text-base font-semibold text-pada-utama transition active:scale-[0.99]">
                    <MessageCircle size={20} strokeWidth={1.9} />Hubungi kami lewat WhatsApp
                </a>
            )}
            <Link href="/masuk" className="mt-4 block text-center text-sm font-semibold text-utama">Kembali ke halaman masuk</Link>
        </HalamanAuth>
    )
}
