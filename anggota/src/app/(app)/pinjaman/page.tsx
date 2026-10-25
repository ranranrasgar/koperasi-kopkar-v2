import type { Metadata } from "next"
import Link from "next/link"
import { Archive, CalendarClock, ChevronDown, Landmark } from "lucide-react"
import { HeroKewajiban } from "@/components/HeroKewajiban"
import { JudulBagian, Kartu, Kemajuan, Kosong } from "@/components/ui"
import { wajibAnggota } from "@/lib/anggota"
import { pinjamanAktif, pinjamanLunas, profil, type PinjamanAktif } from "@/lib/data"
import { hariIni, rupiah, selisihHari, tanggal } from "@/lib/format"

export const metadata: Metadata = { title: "Pinjaman" }

const persen = (n: number | null) => (n === null ? "-" : `${Number(n).toLocaleString("id-ID", { maximumFractionDigits: 3 })}%`)

function Chip({ children, kelas }: { children: React.ReactNode; kelas: string }) {
    return <span className={`shrink-0 rounded-full px-2.5 py-1 text-[0.6875rem] font-semibold uppercase tracking-wide ${kelas}`}>{children}</span>
}

/** Kontrak pinjaman berjalan: statistik, kemajuan, dan jatuh tempo berikutnya. Seluruh kartu membuka rincian dan jadwal pinjaman. */
function KontrakBerjalan({ p, hari }: { p: PinjamanAktif; hari: string }) {
    const terbayar = Math.max(0, p.pokok - p.sisa)
    const persenBayar = p.pokok > 0 ? Math.min(100, Math.round((terbayar / p.pokok) * 100)) : 0
    const sisaHari = p.jatuh_tempo ? selisihHari(hari, p.jatuh_tempo) : null
    return (
        <Link href={`/pinjaman/${p.jenis}/${p.id}`} className="block rounded-[var(--radius-kartu)] border border-garis bg-permukaan p-4 transition-colors active:bg-garis/30">
            <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-3">
                    <span className="mt-0.5 grid size-10 shrink-0 place-items-center rounded-full bg-utama-lembut text-utama"><Landmark size={19} strokeWidth={1.75} /></span>
                    <div className="min-w-0">
                        <p className="text-[1.0625rem] font-bold leading-snug">{p.nama_kredit ?? "Pinjaman"}</p>
                        <p className="text-xs text-redup">{p.no_pinjaman} · cair {tanggal(p.tgl_pinjaman)}</p>
                    </div>
                </div>
                <Chip kelas="bg-utama-lembut text-utama">{p.jenis === "kpr" ? "KPR" : p.grup === "KOPERASI" ? "Koperasi" : "Bank"}</Chip>
            </div>

            <dl className="mt-4 grid grid-cols-3 gap-px overflow-hidden rounded-2xl bg-garis text-center">
                {[["Pokok awal", rupiah(p.pokok)], ["Sisa pokok", rupiah(p.sisa)], ["Jasa", persen(p.persen_bunga)]].map(([l, v]) => (
                    <div key={l} className="bg-utama-lembut px-1.5 py-2.5">
                        <dt className="text-[0.6875rem] text-redup">{l}</dt>
                        <dd className="angka mt-0.5 text-[0.8125rem] font-bold leading-tight">{v}</dd>
                    </div>
                ))}
            </dl>

            <div className="mt-4 flex items-baseline justify-between text-sm">
                <span className="font-semibold">{persenBayar}% terbayar</span>
                <span className="angka text-xs text-redup">{p.jml_cicilan} dari {p.lama_angsuran} bulan</span>
            </div>
            <div className="mt-1.5"><Kemajuan ke={p.jml_cicilan} dari={p.lama_angsuran} /></div>
            {p.angsuran !== null && p.jatuh_tempo && (
                <div className="mt-4 flex items-center gap-3 rounded-2xl bg-utama-lembut p-3.5">
                    <span className="grid size-11 shrink-0 place-items-center rounded-full bg-permukaan text-utama"><CalendarClock size={20} strokeWidth={1.75} /></span>
                    <div className="min-w-0 flex-1">
                        <p className="text-[0.6875rem] font-semibold uppercase tracking-wide text-redup">Jatuh tempo berikutnya</p>
                        <p className="text-sm font-medium">{tanggal(p.jatuh_tempo, true)}</p>
                    </div>
                    <div className="text-right">
                        <p className="angka text-[1.0625rem] font-bold">{rupiah(p.angsuran)}</p>
                        {sisaHari !== null && (
                            <p className={`text-[0.6875rem] font-semibold ${sisaHari < 0 ? "text-keluar" : sisaHari <= 7 ? "text-tunggu" : "text-redup"}`}>
                                {sisaHari < 0 ? `Lewat ${-sisaHari} hari` : sisaHari === 0 ? "Hari ini" : `H-${sisaHari}`}
                            </p>
                        )}
                    </div>
                </div>
            )}
        </Link>
    )
}

export default async function PinjamanPage() {
    const a = await wajibAnggota()
    const [daftar, lunas, data] = await Promise.all([pinjamanAktif(a.anggotaId), pinjamanLunas(a.anggotaId), profil(a.anggotaId)])
    const hari = hariIni()
    const tunai = daftar.filter((p) => p.jenis === "tunai"), kpr = daftar.filter((p) => p.jenis === "kpr")
    const sisaTunai = tunai.reduce((t, p) => t + p.sisa, 0), sisaKpr = kpr.reduce((t, p) => t + p.sisa, 0)
    return (
        <main>
            <div className="px-5 pt-2">
                {/* Ringkasan kewajiban; KPR dipisah dari pinjaman tunai (keputusan K3). */}
                <HeroKewajiban judul={kpr.length ? "Sisa pinjaman tunai" : "Total sisa pinjaman aktif"} sisa={rupiah(sisaTunai)} sisaKpr={kpr.length ? rupiah(sisaKpr) : null}
                    kontrak={daftar.length} plafon={rupiah(data?.rp_grade ?? 0)} />

                <JudulBagian>Kontrak berjalan</JudulBagian>
                {daftar.length === 0 ? (
                    <Kartu><Kosong judul="Tidak ada pinjaman berjalan" isi={lunas.length ? "Pinjaman yang sudah lunas ada di riwayat di bawah." : undefined} /></Kartu>
                ) : (
                    <div className="space-y-3">{daftar.map((p) => <KontrakBerjalan key={`${p.jenis}-${p.id}`} p={p} hari={hari} />)}</div>
                )}

                {lunas.length > 0 && (
                    <details className="group mt-8">
                        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 [&::-webkit-details-marker]:hidden">
                            <span className="text-[0.9375rem] font-semibold">Riwayat pinjaman</span>
                            <span className="flex items-center gap-1 text-sm text-redup">{lunas.length} arsip <ChevronDown size={16} className="transition-transform group-open:rotate-180" /></span>
                        </summary>
                        <Kartu className="mt-2 divide-y divide-garis">
                            {lunas.map((p) => (
                                <Link key={`${p.jenis}-${p.id}`} href={`/pinjaman/${p.jenis}/${p.id}`} className="flex items-center gap-3 px-5 py-3 transition-colors active:bg-garis/40">
                                    <span className="grid size-10 shrink-0 place-items-center rounded-full bg-utama-lembut text-utama"><Archive size={18} strokeWidth={1.75} /></span>
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-[0.9375rem] font-medium">{p.nama_kredit ?? "Pinjaman"}</p>
                                        <p className="truncate text-xs text-redup">{p.no_pinjaman} · {tanggal(p.tgl_pinjaman)} · {p.lama_angsuran} bulan</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="angka text-[0.9375rem] font-semibold">{rupiah(p.pokok)}</p>
                                        <Chip kelas="bg-masuk/15 text-masuk">Lunas</Chip>
                                    </div>
                                </Link>
                            ))}
                        </Kartu>
                    </details>
                )}
            </div>
        </main>
    )
}
