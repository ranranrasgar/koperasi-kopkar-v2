import Link from "next/link"
import { ArrowRight, CalendarClock, CheckCircle2, Circle } from "lucide-react"
import { PilihTahun, TombolTutupBuku } from "@/components/shu/ShuAksi"
import { riwayatTutupBuku } from "@/lib/queries/laporan"
import { rencanaShu, tahunShu, tahunTutupBuku } from "@/lib/queries/shu"
import { formatAngka, formatAngka2, formatTanggal, hariIni } from "@/lib/format"
import { sp } from "@/lib/list"
import { wajibIzin } from "@/lib/operator"

export const dynamic = "force-dynamic"

const kartu = "rounded-md border p-3"

export default async function TutupBukuPage(props: PageProps<"/dashboard/accounting/closing">) {
    const o = await wajibIzin("/dashboard/accounting/closing") // layout tidak dijalankan ulang pada navigasi antarhalaman
    const s = await props.searchParams
    const tahunIni = Number(hariIni().slice(0, 4))
    const [riwayat, tutup, shu] = await Promise.all([riwayatTutupBuku(), tahunTutupBuku(tahunIni), tahunShu()])
    // Tahun berjalan ikut dipilih sebagai pratinjau (angka sementara), tetapi baru bisa ditutup buku setelah tahunnya berakhir.
    const daftar = [{ tahun: tahunIni, ditutup: false }, ...tutup]
    const pilih = Number(sp(s, "tahun"))
    // Bawaan: tahun lalu yang belum ditutup, atau tahun lalu bila semuanya sudah.
    const tahun = daftar.some((d) => d.tahun === pilih) ? pilih : (tutup.find((d) => !d.ditutup)?.tahun ?? tahunIni - 1)
    const berjalan = tahun >= tahunIni
    const r = await rencanaShu(tahun)
    const ringkas = shu.find((x) => x.tahun === tahun)
    const admin = o.superadmin || o.grup?.trim().toLowerCase() === "admin"
    const persen = r.persenPajak.replace(/\.?0+$/, "").replace(".", ",")
    const kolam = Number(r.shuAnggota)

    const langkah = [
        { no: 1, judul: "Periksa pratinjau", ket: "Angka dihitung dari jurnal tahun itu", ok: !berjalan },
        { no: 2, judul: "Proses tutup buku", ket: `Jurnal TBT 31 Des ${tahun} dan saldo awal 1 Jan ${tahun + 1}`, ok: r.sudahDitutup },
        { no: 3, judul: "Hitung SHU", ket: ringkas && ringkas.anggota > 0 ? `${formatAngka(ringkas.anggota)} anggota dihitung` : "Menu SHU: bagian tiap anggota", ok: Boolean(ringkas && ringkas.anggota > 0) },
        { no: 4, judul: "Posting SHU", ket: "Hasil hitung siap dicairkan", ok: ringkas?.status === "posting" },
        { no: 5, judul: "Pencairan", ket: ringkas ? `${formatAngka(ringkas.dicairkan)} dicairkan, ${formatAngka(ringkas.belum)} belum` : "Tunai atau ke simpanan sukarela", ok: Boolean(ringkas && ringkas.anggota > 0 && ringkas.belum === 0) },
    ]
    const aktif = langkah.find((l) => !l.ok)?.no

    return (
        <div className="space-y-4">
            <div className="flex flex-col gap-1">
                <h1 className="text-2xl font-semibold tracking-tight text-foreground">Tutup Buku Tahunan</h1>
                <p className="text-sm text-muted-foreground">Menutup pendapatan dan biaya ke pos SHU (31 Desember) dan membuat saldo awal tahun berikutnya (1 Januari).</p>
            </div>

            <section className="rounded-lg border bg-background p-4 space-y-3" aria-label="Alur tutup buku dan SHU">
                <div className="flex flex-wrap items-center gap-3 print:hidden">
                    <PilihTahun tahun={tahun} daftar={daftar.map((d) => d.tahun)} berjalan={tahunIni} />
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${berjalan ? "bg-blue-100 text-blue-700" : r.sudahDitutup ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>
                        {berjalan ? "Tahun berjalan" : r.sudahDitutup ? "Sudah ditutup" : "Belum ditutup"}
                    </span>
                    <div className="ml-auto flex items-center gap-2">
                        {r.sudahDitutup && (
                            <Link href={`/dashboard/shu?tahun=${tahun}`} className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md border text-sm font-medium shadow-sm hover:bg-muted">
                                Lanjut ke SHU {tahun} <ArrowRight className="h-4 w-4" />
                            </Link>
                        )}
                        {admin && !berjalan && <TombolTutupBuku tahun={tahun} sudahDitutup={r.sudahDitutup} adaPencairan={r.adaPencairan} />}
                    </div>
                </div>

                <ol className="grid gap-3 border-t pt-3 md:grid-cols-5">
                    {langkah.map((l) => (
                        <li key={l.no} className="flex items-start gap-2.5">
                            {l.ok ? <CheckCircle2 className="h-5 w-5 shrink-0 text-green-600" /> : <Circle className={`h-5 w-5 shrink-0 ${l.no === aktif && !berjalan ? "text-blue-600" : "text-muted-foreground/50"}`} />}
                            <div className="leading-tight">
                                <div className={`text-sm font-semibold ${l.no === aktif && !berjalan ? "text-blue-700" : ""}`}>{l.no}. {l.judul}</div>
                                <div className="text-xs text-muted-foreground">{l.ket}</div>
                            </div>
                        </li>
                    ))}
                </ol>

                {berjalan && (
                    <div role="note" className="flex items-start gap-2 rounded-md border border-blue-300 bg-blue-50 dark:bg-blue-500/10 px-3 py-2 text-sm text-blue-900 dark:text-blue-200">
                        <CalendarClock className="mt-0.5 h-4 w-4 shrink-0" />
                        <span>Tahun {tahun} masih berjalan, jadi angka di bawah masih sementara (sampai hari ini). Tutup buku {tahun} baru bisa diproses mulai 1 Januari {tahun + 1}, sama seperti di aplikasi desktop.</span>
                    </div>
                )}
                {!admin && !berjalan && <p className="text-sm text-muted-foreground">Proses tutup buku hanya untuk superadmin atau admin.</p>}
            </section>

            <section className="rounded-lg border bg-background" aria-label={`Pratinjau tutup buku ${tahun}`}>
                <div className="border-b px-4 py-3">
                    <h2 className="font-semibold">Pratinjau Tutup Buku {tahun}</h2>
                    <p className="text-xs text-muted-foreground">Tidak ada yang diposting sebelum Anda menekan Proses tutup buku. Nilai dibulatkan 2 desimal seperti desktop.</p>
                </div>
                <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4 text-sm">
                    <div className={kartu}><div className="text-xs text-muted-foreground">Pendapatan sebelum pajak</div><div className="text-lg font-bold tabular-nums">Rp {formatAngka2(Number(r.pendapatan))}</div></div>
                    <div className={kartu}><div className="text-xs text-muted-foreground">Pajak pendapatan ({persen}%)</div><div className="text-lg font-bold tabular-nums">Rp {formatAngka2(Number(r.pajak))}</div></div>
                    <div className={kartu}><div className="text-xs text-muted-foreground">Laba ditahan (setelah pajak)</div><div className="text-lg font-bold tabular-nums">Rp {formatAngka2(Number(r.labaDitahan))}</div></div>
                    <div className={`${kartu} bg-blue-50/60 dark:bg-blue-500/10`}><div className="text-xs text-muted-foreground">SHU anggota (kolam pembagian)</div><div className="text-lg font-bold tabular-nums">Rp {formatAngka2(kolam)}</div></div>
                </div>
                <div className="px-4 pb-4">
                    <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Laba setelah pajak dibagi ke pos SHU</div>
                    <div className="overflow-x-auto rounded-md border">
                        <table className="w-full text-sm">
                            <thead className="bg-muted text-muted-foreground text-xs">
                                <tr><th className="px-3 py-2 text-left">Pos SHU</th><th className="px-3 py-2 text-left">Akun</th><th className="px-3 py-2 text-right">Persen</th><th className="px-3 py-2 text-right">Nominal</th></tr>
                            </thead>
                            <tbody>
                                {r.pos.map((p) => (
                                    <tr key={p.urut} className={`border-t ${p.urut === 2 ? "bg-blue-50/60 dark:bg-blue-500/10 font-medium" : ""}`}>
                                        <td className="px-3 py-1.5">{p.nama}</td><td className="px-3 py-1.5 font-mono text-xs">{p.kode}</td>
                                        <td className="px-3 py-1.5 text-right tabular-nums">{formatAngka2(Number(p.persen))}%</td>
                                        <td className="px-3 py-1.5 text-right tabular-nums">{formatAngka2(Number(p.nominal))}</td>
                                    </tr>
                                ))}
                                <tr className="border-t-2 font-semibold bg-muted/40">
                                    <td colSpan={2} className="px-3 py-2">Jumlah</td>
                                    <td className="px-3 py-2 text-right tabular-nums">{formatAngka2(r.pos.reduce((t, p) => t + Number(p.persen), 0))}%</td>
                                    <td className="px-3 py-2 text-right tabular-nums">{formatAngka2(r.pos.reduce((t, p) => t + Number(p.nominal), 0))}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </section>

            <section className="rounded-lg border bg-background" aria-label="Riwayat tutup buku">
                <div className="border-b px-4 py-3">
                    <h2 className="font-semibold">Riwayat Tutup Buku</h2>
                    <p className="text-xs text-muted-foreground">Jurnal TBT per tahun: penutupan rugi-laba 31 Desember dan saldo pembuka 1 Januari.</p>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-muted text-muted-foreground text-xs">
                            <tr><th className="px-4 py-2 text-left">Tanggal</th><th className="px-4 py-2 text-left">No. Bukti</th><th className="px-4 py-2 text-left">Bagian</th>
                                <th className="px-4 py-2 text-right">Baris</th><th className="px-4 py-2 text-right">Debit</th><th className="px-4 py-2 text-right">Kredit</th>
                                <th className="px-4 py-2 text-left">Operator</th></tr>
                        </thead>
                        <tbody>
                            {riwayat.map((x) => (
                                <tr key={`${x.nomor_bukti}-${x.tanggal}`} className="border-t">
                                    <td className="px-4 py-1.5 whitespace-nowrap">{formatTanggal(x.tanggal)}</td>
                                    <td className="px-4 py-1.5 font-mono text-xs">{x.nomor_bukti}</td>
                                    <td className="px-4 py-1.5">{x.bagian}</td>
                                    <td className="px-4 py-1.5 text-right">{x.baris}</td>
                                    <td className="px-4 py-1.5 text-right tabular-nums">{formatAngka(x.debit)}</td>
                                    <td className="px-4 py-1.5 text-right tabular-nums">{formatAngka(x.kredit)}</td>
                                    <td className="px-4 py-1.5">{x.opr}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>
        </div>
    )
}
