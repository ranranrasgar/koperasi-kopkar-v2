import Link from "next/link"
import { FormCard } from "@/components/transaksi/common"
import { ModalGenerate } from "@/components/potongan/FormPotongan"
import { STATUS_PERIODE, daftarPeriode, namaPeriode } from "@/lib/queries/potongan-gaji"
import { formatAngka, formatTanggal, hariIni } from "@/lib/format"
import { wajibIzin } from "@/lib/operator"

export const dynamic = "force-dynamic"

export default async function PeriodePotonganPage() {
    await wajibIzin("/dashboard/deductions/periode") // layout tidak dijalankan ulang pada navigasi antarhalaman
    const daftar = await daftarPeriode()
    return (
        <div className="space-y-6">
            <FormCard title="Periode Potongan Gaji" description="Riwayat potongan gaji per bulan. Rumus sama dengan halaman Transaksi Potongan Gaji dan Generate aplikasi desktop.">
                <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
                    <ol className="list-decimal pl-5 text-xs text-muted-foreground space-y-1">
                        <li>Generate potongan bulan ini (boleh diulang selama belum diposting).</li>
                        <li>Buka periodenya, matikan saklar anggota yang tidak terpotong atau ubah nominalnya sesuai laporan potongan perusahaan/bank.</li>
                        <li>Posting per bagian (Simpanan Pokok/Wajib/Sukarela, Pinjaman Koperasi, Bank, KPR), sekaligus atau bertahap seperti desktop; tiap bagian diposting sekali beserta jurnalnya.</li>
                    </ol>
                    <ModalGenerate periodeAwal={hariIni().slice(0, 7)} sudahAda={daftar.filter((d) => d.status === "draf").map((d) => d.periode)} />
                </div>
                {daftar.length === 0 ? <p className="text-sm text-muted-foreground">Belum ada periode. Klik Generate potongan untuk bulan pertama.</p> : (
                    <div className="overflow-x-auto rounded-md border">
                        <table className="w-full text-sm">
                            <thead className="bg-muted text-muted-foreground text-xs">
                                <tr>
                                    <th className="px-3 py-2 text-left">Periode</th>
                                    <th className="px-3 py-2 text-left">Status</th>
                                    <th className="px-3 py-2 text-right">Anggota</th>
                                    <th className="px-3 py-2 text-right">Tidak dipotong</th>
                                    <th className="px-3 py-2 text-right">Total dipotong</th>
                                    <th className="px-3 py-2 text-left">Generate</th>
                                    <th className="px-3 py-2 text-left">Posting</th>
                                </tr>
                            </thead>
                            <tbody>
                                {daftar.map((d) => (
                                    <tr key={d.periode} className="border-t hover:bg-muted/40">
                                        <td className="px-3 py-2 font-medium">
                                            <Link href={`/dashboard/deductions/periode/${d.periode}`} className="text-blue-600 dark:text-blue-400 hover:underline">{namaPeriode(d.periode)}</Link>
                                        </td>
                                        <td className="px-3 py-2">
                                            <span className={`rounded px-2 py-0.5 text-xs font-semibold ${d.status === "diposting"
                                                ? "bg-green-100 text-green-800 dark:bg-green-500/15 dark:text-green-400"
                                                : d.status === "sebagian" ? "bg-blue-100 text-blue-800 dark:bg-blue-500/15 dark:text-blue-400"
                                                : "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-400"}`}>
                                                {STATUS_PERIODE[d.status]}
                                            </span>
                                        </td>
                                        <td className="px-3 py-2 text-right tabular-nums">{formatAngka(d.anggota)}</td>
                                        <td className="px-3 py-2 text-right tabular-nums">{formatAngka(d.tidak_dipotong)}</td>
                                        <td className="px-3 py-2 text-right tabular-nums">{formatAngka(d.total)}</td>
                                        <td className="px-3 py-2 text-xs">{d.digenerate_pada} · {d.dibuat_oleh}</td>
                                        <td className="px-3 py-2 text-xs">{d.tgl_posting ? `${formatTanggal(d.tgl_posting)} · ${d.diposting_oleh}` : "-"}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </FormCard>
        </div>
    )
}
