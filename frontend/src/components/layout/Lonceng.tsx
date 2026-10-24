"use client"

import { useEffect, useState, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { jumlahBadgeAction } from "@/app/actions/pesan"
import { isiNavbarAction, tandaiDibacaAction, type IsiNavbar, type ItemNavbar } from "@/app/actions/navbar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { MENU } from "@/config/akses"
import { useSidebar } from "./SidebarContext"
import { tanganiVersiLama } from "@/lib/versi-lama"

const JEDA_MS = 10_000

function Lencana({ jumlah }: { jumlah: number }) {
    if (jumlah <= 0) return null
    return (
        <span className="absolute -right-0.5 -top-0.5 min-w-4 rounded-full bg-red-600 px-1 py-0.5 text-center text-[10px] font-bold leading-none text-white">
            {jumlah > 99 ? "99+" : jumlah}
        </span>
    )
}

function Baris({ item, tutup }: { item: ItemNavbar; tutup: () => void }) {
    const router = useRouter()
    const [, mulai] = useTransition()
    const buka = (e: React.MouseEvent) => {
        e.preventDefault()
        tutup()
        mulai(async () => {
            if (item.idSistem) await tandaiDibacaAction([item.idSistem])
            router.push(item.url)
        })
    }
    return (
        <Link href={item.url} onClick={buka} className="flex gap-2.5 rounded-md px-2 py-2 hover:bg-muted">
            <span className={`mt-1.5 size-2 shrink-0 rounded-full ${item.baru ? "bg-red-600" : "bg-transparent"}`} aria-label={item.baru ? "Belum dibaca" : undefined} />
            <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{item.judul}</span>
                <span className="line-clamp-2 text-xs text-muted-foreground">{item.isi}</span>
                <span className="mt-0.5 block text-[11px] text-muted-foreground">{item.waktu}</span>
            </span>
        </Link>
    )
}

function Kepala({ ikon, label, baru }: { ikon: string; label: string; baru: number }) {
    return (
        <div className="flex items-center gap-2 px-2 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            <span className="material-symbols-outlined text-[16px]" aria-hidden>{ikon}</span>
            <span className="flex-1">{label}</span>
            {baru > 0 && <span className="rounded-full bg-red-600 px-1.5 py-0.5 text-[10px] font-bold leading-none text-white">{baru}</span>}
        </div>
    )
}

/** Satu ikon navbar yang membuka dropdown; isi dimuat dari server setiap dibuka. */
function Dropdown({ ikon, judul, jumlah, children, onBuka, lebar = "w-[22rem]" }: {
    ikon: string; judul: string; jumlah: number; onBuka: () => void; lebar?: string; children: (tutup: () => void) => React.ReactNode
}) {
    const [buka, setBuka] = useState(false)
    const label = jumlah ? `${judul}: ${jumlah} belum dibaca` : judul
    return (
        <Popover open={buka} onOpenChange={(v) => { setBuka(v); if (v) onBuka() }}>
            <PopoverTrigger asChild>
                <button type="button" title={label} aria-label={label}
                    className="relative flex h-9 w-9 items-center justify-center rounded-full text-on-surface-variant transition-colors hover:bg-surface-variant hover:text-on-surface print:hidden">
                    <span className="material-symbols-outlined text-[1.35rem]">{ikon}</span>
                    <Lencana jumlah={jumlah} />
                </button>
            </PopoverTrigger>
            <PopoverContent align="end" sideOffset={8} className={`${lebar} max-w-[calc(100vw-1rem)] p-0`}>
                <div className="max-h-[70vh] overflow-y-auto p-2">{children(() => setBuka(false))}</div>
            </PopoverContent>
        </Popover>
    )
}

/**
 * Dua ikon di navbar dengan dropdown: pesan anggota (hanya bila berizin) dan lonceng (notifikasi dikelompokkan per jenis:
 * pendaftaran baru, pengajuan kredit, himbauan, promo, lainnya). Angka awal dari layout, lalu diperbarui tiap 10 detik
 * saat tab terlihat dan saat tab dibuka kembali. Selengkapnya di halaman Notifikasi dan Pesan Anggota.
 */
export function Lonceng() {
    const { lencana, izin } = useSidebar()
    const [angka, setAngka] = useState({ pesan: lencana["/dashboard/pesan"] ?? 0, pengumuman: lencana["/dashboard/pengumuman"] ?? 0 })
    const [isi, setIsi] = useState<IsiNavbar | null | undefined>(undefined) // undefined = belum dimuat

    useEffect(() => setAngka({ pesan: lencana["/dashboard/pesan"] ?? 0, pengumuman: lencana["/dashboard/pengumuman"] ?? 0 }), [lencana])

    useEffect(() => {
        let batal = false
        const segarkan = async () => {
            if (document.visibilityState !== "visible") return
            const n = await jumlahBadgeAction().catch(tanganiVersiLama)
            if (!batal && n) setAngka(n)
        }
        const t = setInterval(segarkan, JEDA_MS)
        document.addEventListener("visibilitychange", segarkan)
        return () => { batal = true; clearInterval(t); document.removeEventListener("visibilitychange", segarkan) }
    }, [])

    const muat = () => { isiNavbarAction().then(setIsi).catch(() => setIsi(null)) }
    const kosong = (teks: string) => <p className="px-3 py-6 text-center text-sm text-muted-foreground">{isi === undefined ? "Memuat…" : teks}</p>

    return (
        <>
            {izin.includes(MENU.pesanAnggota) && (
                <Dropdown ikon="chat" judul="Pesan anggota" jumlah={angka.pesan} onBuka={muat}>
                    {(tutup) => (
                        <>
                            <Kepala ikon="forum" label="Pesan anggota" baru={isi?.pesanBaru ?? 0} />
                            {isi && isi.pesan.length > 0 ? isi.pesan.map((p) => <Baris key={p.kunci} item={p} tutup={tutup} />) : kosong("Tidak ada pesan terbuka.")}
                            <Link href="/dashboard/pesan" onClick={tutup} className="mt-1 block rounded-md border-t px-3 py-2.5 text-center text-sm font-semibold text-primary hover:bg-muted">
                                Lihat semua pesan
                            </Link>
                        </>
                    )}
                </Dropdown>
            )}
            <Dropdown ikon="notifications" judul="Notifikasi" jumlah={angka.pengumuman} onBuka={muat}>
                {(tutup) => (
                    <>
                        {isi && isi.notif.length > 0
                            ? isi.notif.map((g) => (
                                <div key={g.kunci}>
                                    <Kepala ikon={g.ikon} label={g.label} baru={g.baru} />
                                    {g.item.map((x) => <Baris key={x.kunci} item={x} tutup={tutup} />)}
                                </div>
                            ))
                            : kosong("Belum ada notifikasi.")}
                        <Link href="/dashboard/pengumuman" onClick={tutup} className="mt-1 block rounded-md border-t px-3 py-2.5 text-center text-sm font-semibold text-primary hover:bg-muted">
                            Lihat semua notifikasi
                        </Link>
                    </>
                )}
            </Dropdown>
        </>
    )
}
