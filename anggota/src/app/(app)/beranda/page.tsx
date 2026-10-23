import type { Metadata } from "next"
import Link from "next/link"
import { Bell, CalendarDays, ChevronRight, Coins, ReceiptText, Wallet, type LucideIcon } from "lucide-react"
import { AjakanPasang } from "@/components/AjakanPasang"
import { KartuSaldo } from "@/components/KartuSaldo"
import { KarosselPengumuman } from "@/components/KarosselPengumuman"
import { BarisTautan, JudulBagian, Kartu, Kemajuan } from "@/components/ui"
import { wajibMasuk } from "@/lib/anggota"
import { pinjamanAktif, potonganBulanIni, profil, saldoSimpanan, shu, slidePengumuman, tahunShu } from "@/lib/data"
import { bulanIni, rupiah, tanggal } from "@/lib/format"
import { namaKoperasi } from "@/lib/koperasi"

export const metadata: Metadata = { title: "Beranda" }

function salam() {
    const jam = Number(new Intl.DateTimeFormat("id-ID", { hour: "numeric", hour12: false, timeZone: "Asia/Jakarta" }).format(new Date()))
    return jam < 11 ? "Selamat pagi" : jam < 15 ? "Selamat siang" : jam < 19 ? "Selamat sore" : "Selamat malam"
}

const PINTASAN: { href: string; label: string; ikon: LucideIcon }[] = [
    { href: "/potongan", label: "Potongan", ikon: Wallet },
    { href: "/shu", label: "SHU", ikon: Coins },
    { href: "/riwayat", label: "Riwayat", ikon: ReceiptText },
    { href: "/notifikasi", label: "Notifikasi", ikon: Bell },
]

export default async function BerandaPage() {
    const a = await wajibMasuk()
    const kepala = (
        <header className="flex items-center justify-between gap-4 pb-5">
            <div className="min-w-0">
                <p className="text-sm text-redup">{salam()},</p>
                <h1 className="truncate text-xl font-bold tracking-tight">{a.nama}</h1>
            </div>
            <Link href="/notifikasi" aria-label="Notifikasi"
                className="grid size-11 shrink-0 place-items-center rounded-full border border-garis bg-permukaan text-redup hover:text-teks">
                <Bell size={20} strokeWidth={1.75} />
            </Link>
        </header>
    )

    // Karyawan Mattel yang sudah punya akun tetapi belum terdaftar sebagai anggota (keputusan K5).
    if (a.anggotaId === null) {
        return (
            <main className="px-5 pt-[max(1.5rem,env(safe-area-inset-top))]">
                {kepala}
                <Kartu className="p-5">
                    <h2 className="font-semibold">Akun Anda belum terhubung ke keanggotaan</h2>
                    <p className="mt-2 text-sm leading-relaxed text-redup">
                        NIK {a.kodeAgt} terdaftar sebagai karyawan, tetapi belum tercatat sebagai anggota {await namaKoperasi()}.
                        Untuk menjadi anggota, hubungi pengurus koperasi. Setelah terdaftar, simpanan, pinjaman, dan SHU Anda tampil di sini.
                    </p>
                </Kartu>
            </main>
        )
    }

    const id = a.anggotaId
    const dataAnggota = profil(id)
    const [simpanan, pinjaman, potongan, data, tahun, slide] = await Promise.all([
        saldoSimpanan(id), pinjamanAktif(id), potonganBulanIni(id), dataAnggota, tahunShu(), dataAnggota.then((d) => slidePengumuman(d?.status_staff ?? "")),
    ])
    const shuTerakhir = tahun[0] ? await shu(id, tahun[0]) : null
    const totalSimpanan = simpanan.filter((s) => s.kode !== "01").reduce((t, s) => t + s.saldo, 0)
    const sisaTunai = pinjaman.filter((p) => p.jenis === "tunai").reduce((t, p) => t + p.sisa, 0)

    return (
        <main className="px-5 pt-[max(1.5rem,env(safe-area-inset-top))]">
            {kepala}

            <KartuSaldo simpanan={rupiah(totalSimpanan)} pinjaman={rupiah(sisaTunai)} plafon={rupiah(data?.rp_grade ?? 0)} />

            <nav aria-label="Pintasan" className="mt-5 grid grid-cols-4 gap-2">
                {PINTASAN.map(({ href, label, ikon: Ikon }) => (
                    <Link key={href} href={href} className="flex flex-col items-center gap-2 rounded-2xl py-2 text-xs font-medium hover:bg-permukaan">
                        <span className="grid size-12 place-items-center rounded-2xl bg-utama-lembut text-utama">
                            <Ikon size={22} strokeWidth={1.75} />
                        </span>
                        {label}
                    </Link>
                ))}
            </nav>

            <AjakanPasang />

            <KarosselPengumuman slide={slide} />

            <JudulBagian>Bulan ini</JudulBagian>
            <Kartu className="divide-y divide-garis overflow-hidden">
                <Link href="/potongan" className="flex items-center gap-3 px-4 py-3.5 hover:bg-latar/70">
                    <CalendarDays size={20} strokeWidth={1.75} className="shrink-0 text-redup" />
                    <div className="min-w-0 flex-1">
                        <p className="text-sm text-redup">Potongan gaji {bulanIni()}</p>
                        <p className="angka text-lg font-bold">{rupiah(potongan?.total ?? 0)}</p>
                    </div>
                    <ChevronRight size={18} className="text-redup" />
                </Link>
                {shuTerakhir && (
                    <Link href={`/shu?tahun=${tahun[0]}`} className="flex items-center gap-3 px-4 py-3.5 hover:bg-latar/70">
                        <Coins size={20} strokeWidth={1.75} className="shrink-0 text-redup" />
                        <div className="min-w-0 flex-1">
                            <p className="text-sm text-redup">SHU tahun buku {tahun[0]}</p>
                            <p className="angka text-lg font-bold">{rupiah(shuTerakhir.diterima)}</p>
                        </div>
                        <ChevronRight size={18} className="text-redup" />
                    </Link>
                )}
            </Kartu>

            <JudulBagian href={pinjaman.length ? "/pinjaman" : undefined}>Pinjaman berjalan</JudulBagian>
            {pinjaman.length === 0 ? (
                <Kartu className="px-4 py-5 text-sm text-redup">Tidak ada pinjaman berjalan.</Kartu>
            ) : (
                <Kartu className="divide-y divide-garis overflow-hidden">
                    {pinjaman.slice(0, 2).map((p) => (
                        <div key={`${p.jenis}-${p.id}`}>
                            <BarisTautan href={`/pinjaman/${p.jenis}/${p.id}`} judul={p.nama_kredit ?? p.no_pinjaman}
                                sub={p.jatuh_tempo ? `Angsuran berikutnya ${tanggal(p.jatuh_tempo)}` : p.no_pinjaman}
                                nilai={rupiah(p.sisa)} nilaiSub={`Cicilan ${p.jml_cicilan}/${p.lama_angsuran}`} />
                            <div className="-mt-1 px-4 pb-3.5"><Kemajuan ke={p.jml_cicilan} dari={p.lama_angsuran} /></div>
                        </div>
                    ))}
                </Kartu>
            )}
        </main>
    )
}
