import { FormCard } from "@/components/transaksi/common"
import { PilihTahun, TombolTutupBuku } from "@/components/shu/ShuAksi"
import { riwayatTutupBuku } from "@/lib/queries/laporan"
import { rencanaShu, tahunTutupBuku } from "@/lib/queries/shu"
import { formatAngka, formatAngka2, formatTanggal, hariIni } from "@/lib/format"
import { sp } from "@/lib/list"
import { wajibIzin } from "@/lib/operator"

export const dynamic = "force-dynamic"

export default async function TutupBukuPage(props: PageProps<"/dashboard/accounting/closing">) {
    const o = await wajibIzin("/dashboard/accounting/closing") // layout tidak dijalankan ulang pada navigasi antarhalaman
    const s = await props.searchParams
    const tahunIni = Number(hariIni().slice(0, 4))
    const [riwayat, daftar] = await Promise.all([riwayatTutupBuku(), tahunTutupBuku(tahunIni)])
    const pilih = Number(sp(s, "tahun"))
    // Bawaan: tahun terbaru yang belum ditutup, atau tahun lalu bila semuanya sudah.
    const tahun = daftar.some((d) => d.tahun === pilih) ? pilih : (daftar.find((d) => !d.ditutup)?.tahun ?? tahunIni - 1)
    const r = await rencanaShu(tahun)
    const admin = o.superadmin || o.grup?.trim().toLowerCase() === "admin"
    const persen = r.persenPajak.replace(/\.?0+$/, "").replace(".", ",")

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex flex-col gap-1">
                    <h1 className="text-2xl font-semibold tracking-tight text-foreground">Tutup Buku Tahunan</h1>
                    <p className="text-sm text-muted-foreground">Menutup pendapatan dan biaya ke pos SHU (31 Desember) dan membuat saldo awal tahun berikutnya (1 Januari). Hanya tahun sebelum tahun berjalan yang bisa ditutup.</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <PilihTahun tahun={tahun} daftar={daftar.map((d) => d.tahun)} />
                    {admin && <TombolTutupBuku tahun={tahun} sudahDitutup={r.sudahDitutup} adaPencairan={r.adaPencairan} />}
                </div>
            </div>

            <FormCard title={`Pratinjau Tutup Buku ${tahun}`} description="Angka dihitung dari jurnal tahun itu; tidak ada yang diposting sebelum Anda menekan Proses tutup buku.">
                <div className="space-y-4 text-sm">
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                        <div className="rounded-md border p-3"><div className="text-xs text-muted-foreground">Status {tahun}</div><div className="font-bold">{r.sudahDitutup ? "Sudah ditutup" : "Belum ditutup"}</div></div>
                        <div className="rounded-md border p-3"><div className="text-xs text-muted-foreground">Pendapatan sebelum pajak</div><div className="font-bold tabular-nums">Rp {formatAngka2(Number(r.pendapatan))}</div></div>
                        <div className="rounded-md border p-3"><div className="text-xs text-muted-foreground">Pajak ({persen}%)</div><div className="font-bold tabular-nums">Rp {formatAngka2(Number(r.pajak))}</div></div>
                        <div className="rounded-md border p-3"><div className="text-xs text-muted-foreground">Laba ditahan (setelah pajak)</div><div className="font-bold tabular-nums">Rp {formatAngka2(Number(r.labaDitahan))}</div></div>
                        <div className="rounded-md border p-3"><div className="text-xs text-muted-foreground">SHU anggota</div><div className="font-bold tabular-nums">Rp {formatAngka2(Number(r.shuAnggota))}</div></div>
                    </div>
                    <div className="overflow-x-auto rounded-md border">
                        <table className="w-full">
                            <thead className="bg-muted text-muted-foreground text-xs">
                                <tr><th className="px-3 py-2 text-left">Pos SHU</th><th className="px-3 py-2 text-left">Akun</th><th className="px-3 py-2 text-right">Persen</th><th className="px-3 py-2 text-right">Nominal</th></tr>
                            </thead>
                            <tbody>
                                {r.pos.map((p) => (
                                    <tr key={p.urut} className="border-t">
                                        <td className="px-3 py-1.5">{p.nama}</td><td className="px-3 py-1.5 font-mono text-xs">{p.kode}</td>
                                        <td className="px-3 py-1.5 text-right tabular-nums">{formatAngka2(Number(p.persen))}%</td>
                                        <td className="px-3 py-1.5 text-right tabular-nums">{formatAngka2(Number(p.nominal))}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {!admin && <p className="text-muted-foreground">Proses tutup buku hanya untuk superadmin atau admin.</p>}
                </div>
            </FormCard>

            <FormCard title="Riwayat Tutup Buku" description="Jurnal TBT per tahun: penutupan rugi-laba 31 Desember dan saldo pembuka 1 Januari.">
                <div className="overflow-x-auto rounded-md border">
                    <table className="w-full text-sm">
                        <thead className="bg-muted text-muted-foreground text-xs">
                            <tr><th className="px-3 py-2 text-left">Tanggal</th><th className="px-3 py-2 text-left">No. Bukti</th><th className="px-3 py-2 text-left">Bagian</th>
                                <th className="px-3 py-2 text-right">Baris</th><th className="px-3 py-2 text-right">Debit</th><th className="px-3 py-2 text-right">Kredit</th>
                                <th className="px-3 py-2 text-left">Operator</th></tr>
                        </thead>
                        <tbody>
                            {riwayat.map((x) => (
                                <tr key={`${x.nomor_bukti}-${x.tanggal}`} className="border-t">
                                    <td className="px-3 py-1.5 whitespace-nowrap">{formatTanggal(x.tanggal)}</td>
                                    <td className="px-3 py-1.5 font-mono text-xs">{x.nomor_bukti}</td>
                                    <td className="px-3 py-1.5">{x.bagian}</td>
                                    <td className="px-3 py-1.5 text-right">{x.baris}</td>
                                    <td className="px-3 py-1.5 text-right tabular-nums">{formatAngka(x.debit)}</td>
                                    <td className="px-3 py-1.5 text-right tabular-nums">{formatAngka(x.kredit)}</td>
                                    <td className="px-3 py-1.5">{x.opr}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </FormCard>
        </div>
    )
}
