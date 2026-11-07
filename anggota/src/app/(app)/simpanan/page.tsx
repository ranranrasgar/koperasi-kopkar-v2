import type { Metadata } from "next"
import Link from "next/link"
import { ArrowDownLeft, ArrowUpRight, CalendarCheck, ChevronRight, Lock, Sprout, Wallet, type LucideIcon } from "lucide-react"
import { GrafikTren } from "@/components/GrafikTren"
import { HeroSimpanan } from "@/components/HeroSimpanan"
import { Arus, JudulBagian, Kartu, Kosong } from "@/components/ui"
import { wajibAnggota } from "@/lib/anggota"
import { mutasiSimpananTerakhir, saldoSimpanan, shu, tahunShu, trenSimpanan } from "@/lib/data"
import { rupiah, tanggal } from "@/lib/format"

export const metadata: Metadata = { title: "Simpanan" }

/** Ikon menurut nama jenis simpanan (pokok, wajib, sukarela, lainnya). */
function ikonJenis(nama: string): LucideIcon {
    const n = nama.toLowerCase()
    return n.includes("pokok") ? Lock : n.includes("wajib") ? CalendarCheck : n.includes("sukarela") ? Sprout : Wallet
}

export default async function SimpananPage(props: PageProps<"/simpanan">) {
    const a = await wajibAnggota()
    const daftar = await saldoSimpanan(a.anggotaId)
    const dipilih = String((await props.searchParams).jenis ?? "")
    const kodeFilter = daftar.some((s) => s.kode === dipilih) ? dipilih : null
    const [tren, mutasi, tahun] = await Promise.all([
        trenSimpanan(a.anggotaId, 6), mutasiSimpananTerakhir(a.anggotaId, kodeFilter, 6), tahunShu(),
    ])
    // SHU: dua tahun buku terbaru yang ada nilainya.
    const daftarShu = (await Promise.all(tahun.slice(0, 3).map(async (t) => ({ tahun: t, ...(await shu(a.anggotaId, t)) }))))
        .filter((x) => x.diterima > 0).slice(0, 2)
    const total = daftar.reduce((t, s) => t + s.saldo, 0)
    const terakhir = (await mutasiSimpananTerakhir(a.anggotaId, null, 1))[0]?.tgl_transaksi

    return (
        <main>
            <div className="px-5 pt-2">
                <HeroSimpanan total={rupiah(total)} jumlahJenis={daftar.length} terakhir={terakhir ? tanggal(terakhir) : "-"} />

                <JudulBagian>Rincian tabungan</JudulBagian>
                {daftar.length === 0 ? (
                    <Kartu><Kosong judul="Belum ada simpanan" isi="Setoran simpanan Anda akan tampil di sini." /></Kartu>
                ) : (
                    <Kartu className="divide-y divide-garis">
                        {daftar.map((s) => {
                            const Ikon = ikonJenis(s.nama)
                            return (
                                <Link key={s.kode} href={`/simpanan/${s.kode}`} className="flex items-center gap-3 px-5 py-3.5 transition-colors active:bg-garis/40">
                                    <span className="grid size-10 shrink-0 place-items-center rounded-full bg-utama-lembut text-utama"><Ikon size={19} strokeWidth={1.75} /></span>
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-[0.9375rem] font-medium">{s.nama}</p>
                                        <p className="text-xs text-redup">Lihat mutasi</p>
                                    </div>
                                    <p className="angka shrink-0 text-[0.9375rem] font-semibold">{rupiah(s.saldo)}</p>
                                    <ChevronRight size={18} className="shrink-0 text-redup" />
                                </Link>
                            )
                        })}
                    </Kartu>
                )}

                {tren.length > 0 && <div className="mt-8"><GrafikTren data={tren} /></div>}

                {daftarShu.length > 0 && (
                    <>
                        <JudulBagian href="/shu" tautan="Detail">Riwayat pembagian SHU</JudulBagian>
                        <div className="grid grid-cols-2 gap-3">
                            {daftarShu.map((x) => (
                                <Link key={x.tahun} href={`/shu?tahun=${x.tahun}`} className="rounded-2xl bg-utama-lembut p-4 transition-colors active:opacity-80">
                                    <p className="text-xs text-redup">Tahun buku {x.tahun}</p>
                                    <p className="angka mt-1 text-lg font-bold">{rupiah(x.diterima)}</p>
                                </Link>
                            ))}
                        </div>
                    </>
                )}

                <JudulBagian href={kodeFilter ? `/simpanan/${kodeFilter}` : "/riwayat"} tautan={kodeFilter ? "Semua mutasi" : "Riwayat"}>Mutasi terakhir</JudulBagian>
                <nav aria-label="Filter jenis simpanan" className="-mx-5 mb-1 flex gap-2 overflow-x-auto px-5 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                    {[{ kode: "", nama: "Semua" }, ...daftar.map((s) => ({ kode: s.kode, nama: s.nama.replace(/^Simpanan\s+/i, "") }))].map((c) => {
                        const aktif = (kodeFilter ?? "") === c.kode
                        return (
                            <Link key={c.kode || "semua"} href={c.kode ? `/simpanan?jenis=${c.kode}` : "/simpanan"} replace scroll={false} aria-current={aktif ? "page" : undefined}
                                className={`h-9 shrink-0 rounded-full border px-4 text-sm font-medium leading-[2.15rem] ${aktif ? "border-utama bg-utama text-pada-utama" : "border-garis"}`}>
                                {c.nama}
                            </Link>
                        )
                    })}
                </nav>
                {mutasi.length === 0 ? (
                    <Kartu className="mt-2"><Kosong judul="Belum ada mutasi" /></Kartu>
                ) : (
                    <Kartu className="mt-2 divide-y divide-garis">
                        {mutasi.map((m) => {
                            const setor = m.rp_setoran > 0
                            const Ikon = setor ? ArrowDownLeft : ArrowUpRight
                            return (
                                <div key={m.id} className="flex items-center gap-3 px-5 py-3">
                                    <span className={`grid size-10 shrink-0 place-items-center rounded-full ${setor ? "bg-masuk/15 text-masuk" : "bg-keluar/15 text-keluar"}`}><Ikon size={19} strokeWidth={1.9} /></span>
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-[0.9375rem] font-medium">{setor ? "Setoran" : "Penarikan"} {m.jenis.replace(/^Simpanan\s+/i, "")}</p>
                                        <p className="truncate text-xs text-redup">{tanggal(m.tgl_transaksi)} · {m.no_bukti}</p>
                                    </div>
                                    <Arus n={setor ? m.rp_setoran : -m.rp_pengambilan} />
                                </div>
                            )
                        })}
                    </Kartu>
                )}
            </div>
        </main>
    )
}
