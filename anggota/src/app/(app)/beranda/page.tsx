import type { Metadata } from "next"
import Link from "next/link"
import { CalendarDays, ChevronRight, Coins, FilePen, ReceiptText, Wallet, type LucideIcon } from "lucide-react"
import { AjakanPasang } from "@/components/AjakanPasang"
import { BarisRiwayat } from "@/components/BarisRiwayat"
import { KartuSaldo } from "@/components/KartuSaldo"
import { KarosselPengumuman } from "@/components/KarosselPengumuman"
import { BarisTautan, JudulBagian, Kartu, Kemajuan } from "@/components/ui"
import { wajibMasuk } from "@/lib/anggota"
import { pinjamanAktif, potonganBulanIni, profil, riwayat, saldoSimpanan, shu, slidePengumuman, tahunShu } from "@/lib/data"
import { bulanIni, rupiah, tanggal } from "@/lib/format"
import { namaKoperasi } from "@/lib/koperasi"

export const metadata: Metadata = { title: "Beranda" }

function salam() {
    const jam = Number(new Intl.DateTimeFormat("id-ID", { hour: "numeric", hour12: false, timeZone: "Asia/Jakarta" }).format(new Date()))
    return jam < 11 ? "Selamat pagi" : jam < 15 ? "Selamat siang" : jam < 19 ? "Selamat sore" : "Selamat malam"
}

const PINTASAN: { href: string; label: string; ikon: LucideIcon }[] = [
    { href: "/ajukan", label: "Ajukan pinjaman", ikon: FilePen },
    { href: "/potongan", label: "Potongan", ikon: Wallet },
    { href: "/shu", label: "SHU", ikon: Coins },
    { href: "/riwayat", label: "Riwayat", ikon: ReceiptText },
]

export default async function BerandaPage() {
    const a = await wajibMasuk()
    const sapaan = (
        <header className="pb-4 pt-1">
            <p className="text-sm text-redup">{salam()},</p>
            <div className="mt-0.5 flex items-center justify-between gap-3">
                <h1 className="truncate text-2xl font-bold tracking-tight">{a.nama}</h1>
                {a.anggotaId !== null && (
                    <span className="shrink-0 rounded-full bg-utama-lembut px-3 py-1 text-xs font-semibold text-utama">No. {a.kodeAgt}</span>
                )}
            </div>
        </header>
    )

    // Karyawan Mattel yang sudah punya akun tetapi belum terdaftar sebagai anggota (keputusan K5).
    if (a.anggotaId === null) {
        return (
            <main className="px-5 pt-1">
                {sapaan}
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
    const [simpanan, pinjaman, potongan, data, tahun, slide, aktivitas] = await Promise.all([
        saldoSimpanan(id), pinjamanAktif(id), potonganBulanIni(id), dataAnggota, tahunShu(), dataAnggota.then((d) => slidePengumuman(d?.status_staff ?? "")),
        riwayat(id, 4),
    ])
    const shuTerakhir = tahun[0] ? await shu(id, tahun[0]) : null
    const totalSimpanan = simpanan.filter((s) => s.kode !== "01").reduce((t, s) => t + s.saldo, 0)
    const sisaTunai = pinjaman.filter((p) => p.jenis === "tunai").reduce((t, p) => t + p.sisa, 0)
    const [utama, ...lainnya] = pinjaman

    return (
        <main className="px-5 pt-1">
            {sapaan}

            <KartuSaldo simpanan={rupiah(totalSimpanan)} pinjaman={rupiah(sisaTunai)} plafon={rupiah(data?.rp_grade ?? 0)} />

            <nav aria-label="Pintasan" className="mt-4 grid grid-cols-4 gap-2.5">
                {PINTASAN.map(({ href, label, ikon: Ikon }) => (
                    <Link key={href} href={href}
                        className="flex flex-col items-center gap-2 rounded-2xl border border-garis bg-permukaan px-1 py-3 text-center text-xs font-medium leading-tight transition-colors hover:bg-latar active:scale-[0.98]">
                        <span className="grid size-11 place-items-center rounded-full bg-utama-lembut text-utama">
                            <Ikon size={21} strokeWidth={1.75} />
                        </span>
                        {label}
                    </Link>
                ))}
            </nav>

            <AjakanPasang />

            <KarosselPengumuman slide={slide} />

            <JudulBagian href={pinjaman.length ? "/pinjaman" : undefined}>Pinjaman berjalan</JudulBagian>
            {!utama ? (
                <Kartu className="px-4 py-5 text-sm text-redup">Tidak ada pinjaman berjalan.</Kartu>
            ) : (
                <>
                    <Link href={`/pinjaman/${utama.jenis}/${utama.id}`} className="block rounded-[var(--radius-kartu)] border border-garis bg-permukaan p-4 transition-colors hover:bg-latar/60">
                        <div className="flex items-center justify-between gap-3">
                            <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-redup">
                                <span className="size-2 rounded-full bg-masuk" />Angsuran berjalan
                            </span>
                            <span className="angka rounded-full bg-utama-lembut px-3 py-1 text-xs font-semibold text-utama">Cicilan {utama.jml_cicilan} dari {utama.lama_angsuran}</span>
                        </div>
                        <div className="mt-3 flex items-start justify-between gap-3">
                            <div className="min-w-0">
                                <p className="truncate text-lg font-bold leading-snug">{utama.nama_kredit ?? utama.no_pinjaman}</p>
                                <p className="text-sm text-redup">{utama.jatuh_tempo ? `Jatuh tempo ${tanggal(utama.jatuh_tempo)}` : utama.no_pinjaman}</p>
                            </div>
                            <div className="shrink-0 text-right">
                                <p className="angka text-lg font-bold">{utama.angsuran !== null ? rupiah(utama.angsuran) : "-"}</p>
                                <p className="text-xs text-redup">angsuran berikutnya</p>
                            </div>
                        </div>
                        <div className="mt-3.5"><Kemajuan ke={utama.jml_cicilan} dari={utama.lama_angsuran} /></div>
                        <div className="angka mt-2 flex justify-between gap-3 text-xs text-redup">
                            <span>Terbayar {rupiah(Math.max(0, utama.pokok - utama.sisa))}</span>
                            <span>Sisa pokok {rupiah(utama.sisa)}</span>
                        </div>
                    </Link>
                    {lainnya.length > 0 && (
                        <Kartu className="mt-3 divide-y divide-garis overflow-hidden">
                            {lainnya.slice(0, 2).map((p) => (
                                <div key={`${p.jenis}-${p.id}`}>
                                    <BarisTautan href={`/pinjaman/${p.jenis}/${p.id}`} judul={p.nama_kredit ?? p.no_pinjaman}
                                        sub={p.jatuh_tempo ? `Angsuran berikutnya ${tanggal(p.jatuh_tempo)}` : p.no_pinjaman}
                                        nilai={rupiah(p.sisa)} nilaiSub={`Cicilan ${p.jml_cicilan}/${p.lama_angsuran}`} />
                                    <div className="-mt-1 px-4 pb-3.5"><Kemajuan ke={p.jml_cicilan} dari={p.lama_angsuran} /></div>
                                </div>
                            ))}
                        </Kartu>
                    )}
                </>
            )}

            <JudulBagian>Bulan ini</JudulBagian>
            <Kartu className="divide-y divide-garis overflow-hidden">
                <Link href="/potongan" className="flex items-center gap-3 px-4 py-3.5 hover:bg-latar/70">
                    <span className="grid size-10 shrink-0 place-items-center rounded-full bg-latar text-redup"><CalendarDays size={20} strokeWidth={1.75} /></span>
                    <div className="min-w-0 flex-1">
                        <p className="text-sm text-redup">Potongan gaji {bulanIni()}</p>
                        <p className="angka text-lg font-bold">{rupiah(potongan?.total ?? 0)}</p>
                    </div>
                    <ChevronRight size={18} className="text-redup" />
                </Link>
                {shuTerakhir && (
                    <Link href={`/shu?tahun=${tahun[0]}`} className="flex items-center gap-3 px-4 py-3.5 hover:bg-latar/70">
                        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-latar text-redup"><Coins size={20} strokeWidth={1.75} /></span>
                        <div className="min-w-0 flex-1">
                            <p className="text-sm text-redup">SHU tahun buku {tahun[0]}</p>
                            <p className="angka text-lg font-bold">{rupiah(shuTerakhir.diterima)}</p>
                        </div>
                        <ChevronRight size={18} className="text-redup" />
                    </Link>
                )}
            </Kartu>

            <JudulBagian href={aktivitas.length ? "/riwayat" : undefined}>Aktivitas terakhir</JudulBagian>
            {aktivitas.length === 0 ? (
                <Kartu className="px-4 py-5 text-sm text-redup">Belum ada transaksi.</Kartu>
            ) : (
                <Kartu className="divide-y divide-garis overflow-hidden">
                    {aktivitas.map((r, i) => <BarisRiwayat key={`${r.ref}-${i}`} r={r} />)}
                </Kartu>
            )}
        </main>
    )
}
