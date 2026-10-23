"use client"

import { useRef, useState } from "react"
import { Bell, ChevronRight, HandCoins, MessageSquare, ShieldCheck, Wallet, type LucideIcon } from "lucide-react"
import { selesaiIntroAction } from "@/app/actions/intro"

const HALAMAN: { ikon: LucideIcon; judul: string; isi: string; butir?: string[] }[] = [
    {
        ikon: Wallet, judul: "Simpanan Anda, kapan saja",
        isi: "Pantau saldo semua jenis simpanan dan riwayat setoran serta penarikannya, langsung dari HP.",
        butir: ["Total dan saldo per jenis simpanan", "Mutasi lengkap dengan saldo berjalan", "SHU per tahun buku"],
    },
    {
        ikon: HandCoins, judul: "Pinjaman dan angsuran",
        isi: "Lihat pinjaman yang berjalan, jadwal angsuran, dan pembayaran yang sudah masuk.",
        butir: ["Sisa pokok dan angsuran berikutnya", "Jadwal angsuran per bulan", "Perkiraan potongan gaji bulan ini"],
    },
    {
        ikon: ChevronRight, judul: "Ajukan pinjaman sendiri",
        isi: "Hitung perkiraan angsuran, kirim pengajuan, lalu pantau keputusannya. Pengurus memprosesnya dan Anda dikabari lewat notifikasi.",
        butir: ["Perkiraan angsuran sebelum mengirim", "Aturan dicek otomatis oleh sistem", "Status: menunggu, disetujui, atau ditolak"],
    },
    {
        ikon: MessageSquare, judul: "Tanya pengurus, dapat kabar",
        isi: "Kirim pesan ke pengurus koperasi dari menu Akun. Balasan, keputusan pengajuan, dan pengumuman datang sebagai notifikasi, bahkan saat aplikasi ditutup.",
        butir: ["Aktifkan notifikasi di halaman Notifikasi", "Pesan dan balasan tampil seperti chat"],
    },
    {
        ikon: ShieldCheck, judul: "Aman dan menjaga privasi",
        isi: "Data diri dan rekening Anda tidak ditampilkan di aplikasi. Nominal saldo bisa disembunyikan dengan ikon mata di Beranda.",
        butir: ["Ganti password dan email di menu Akun", "Pilih tampilan terang atau gelap", "Pasang ke layar utama agar terbuka seperti aplikasi"],
    },
]

/** Pengantar aplikasi untuk anggota baru: slide yang digeser, dengan Lewati dan Mulai. Ditampilkan sekali per akun. */
export function Pengantar() {
    const jalur = useRef<HTMLDivElement>(null)
    const [aktif, setAktif] = useState(0)
    const terakhir = aktif === HALAMAN.length - 1

    const geser = () => {
        const el = jalur.current
        if (el) setAktif(Math.round(el.scrollLeft / el.clientWidth))
    }
    const ke = (i: number) => jalur.current?.scrollTo({ left: i * jalur.current.clientWidth, behavior: "smooth" })

    return (
        <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))]">
            <div className="flex items-center justify-between px-5">
                <span className="flex items-center gap-2 text-sm font-bold">
                    <img src="/ikon/ikon-192.png" alt="" className="size-8 rounded-lg" />Kopkar MJS
                </span>
                {!terakhir && (
                    <form action={selesaiIntroAction}>
                        <button className="h-10 rounded-full px-4 text-sm font-medium text-redup hover:bg-garis/60">Lewati</button>
                    </form>
                )}
            </div>

            <div ref={jalur} onScroll={geser} aria-roledescription="carousel" aria-label="Pengenalan aplikasi"
                className="mt-4 flex flex-1 snap-x snap-mandatory overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {HALAMAN.map(({ ikon: Ikon, judul, isi, butir }, i) => (
                    <section key={judul} aria-roledescription="slide" aria-label={`${i + 1} dari ${HALAMAN.length}`}
                        className="flex w-full shrink-0 snap-center flex-col justify-center px-8">
                        <span className="hero grid size-20 place-items-center rounded-3xl"><Ikon size={36} strokeWidth={1.6} /></span>
                        <h1 className="mt-8 text-[1.75rem] font-bold leading-tight tracking-tight">{judul}</h1>
                        <p className="mt-3 text-[0.9375rem] leading-relaxed text-redup">{isi}</p>
                        {butir && (
                            <ul className="mt-5 space-y-2.5 text-sm">
                                {butir.map((b) => (
                                    <li key={b} className="flex gap-3"><span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-utama" />{b}</li>
                                ))}
                            </ul>
                        )}
                    </section>
                ))}
            </div>

            {/* Menempel di dasar layar supaya Mulai/Lanjut tetap terlihat di layar pendek. */}
            <div className="sticky bottom-0 bg-latar px-5 pt-3">
                <div className="mb-5 flex justify-center gap-1.5">
                    {HALAMAN.map((h, i) => (
                        <button key={h.judul} type="button" onClick={() => ke(i)} aria-label={`Halaman ${i + 1}`} aria-current={i === aktif} className="grid size-5 place-items-center">
                            <span className={`block h-1.5 rounded-full transition-all ${i === aktif ? "w-6 bg-utama" : "w-1.5 bg-garis"}`} />
                        </button>
                    ))}
                </div>
                {terakhir ? (
                    <form action={selesaiIntroAction}>
                        <button className="flex h-13 w-full items-center justify-center rounded-xl bg-utama text-base font-semibold text-pada-utama transition hover:bg-utama-tekan active:scale-[0.99]">
                            Mulai
                        </button>
                    </form>
                ) : (
                    <button type="button" onClick={() => ke(aktif + 1)}
                        className="flex h-13 w-full items-center justify-center rounded-xl bg-utama text-base font-semibold text-pada-utama transition hover:bg-utama-tekan active:scale-[0.99]">
                        Lanjut
                    </button>
                )}
            </div>
        </div>
    )
}
