import Link from "next/link"
import { HalamanLaporan } from "@/components/laporan/HalamanLaporan"
import { KopLaporan } from "@/components/laporan/Periode"
import { jurnalBermasalah } from "@/lib/queries/laporan"
import { formatAngka, formatTanggal, hariIni } from "@/lib/format"
import { isTanggal, sp } from "@/lib/list"
import { wajibIzin } from "@/lib/operator"

export const dynamic = "force-dynamic"

const cari = (bukti: string) => `/dashboard/accounting/journal?search=${encodeURIComponent(bukti)}`

/** Daftar jurnal yang menyebabkan selisih di neraca dan neraca saldo: bukti tidak seimbang dan baris ke akun yang tidak ada di COA. */
export default async function JurnalTidakSeimbangPage(props: PageProps<"/dashboard/accounting/journal/tidak-seimbang">) {
    await wajibIzin("/dashboard/accounting/journal/tidak-seimbang") // layout tidak dijalankan ulang pada navigasi antarhalaman
    const s = await props.searchParams
    const sampai = isTanggal(sp(s, "sampai")) ? sp(s, "sampai") : hariIni()
    const { tidakSeimbang, tanpaAkun, sejak } = await jurnalBermasalah(sampai)
    const totSelisih = tidakSeimbang.reduce((t, b) => t + b.selisih, 0)
    return (
        <HalamanLaporan title="Jurnal Bermasalah" description="Jurnal yang membuat neraca dan neraca saldo berselisih: bukti yang debit dan kreditnya tidak sama, dan baris ke akun yang tidak ada di COA."
            filter={
                <form method="get" className="flex items-center gap-2 text-sm">
                    <label htmlFor="sampai" className="text-muted-foreground">Per tanggal</label>
                    <input id="sampai" type="date" name="sampai" defaultValue={sampai} className="h-9 rounded-md border bg-background px-2" />
                    <button type="submit" className="h-9 rounded-md bg-blue-600 px-3 text-sm font-medium text-white hover:bg-blue-700">Tampilkan</button>
                </form>
            }
            ekspor={{ nama: `jurnal-bermasalah_${sampai}`, baris: [["Bukti", "Tanggal", "Debit", "Kredit", "Selisih", "Keterangan"],
                ...tidakSeimbang.map((b) => [b.nomor_bukti, b.tanggal, String(b.debit), String(b.kredit), String(b.selisih), b.deskripsi ?? ""])] }}>
            <div className="space-y-6">
                <KopLaporan judul="Jurnal Bermasalah" periode={`Per ${formatTanggal(sampai, "long")}${sejak ? `, sejak saldo pembuka ${formatTanggal(sejak, "long")}` : ""}`} />

                <section>
                    <h2 className="mb-2 font-semibold">Bukti tidak seimbang ({tidakSeimbang.length}), total selisih {formatAngka(totSelisih)}</h2>
                    {tidakSeimbang.length === 0 ? <p className="text-sm text-muted-foreground">Tidak ada bukti yang tidak seimbang pada cakupan ini.</p> : (
                        <div className="overflow-x-auto rounded-md border">
                            <table className="w-full text-sm">
                                <thead className="bg-muted text-xs text-muted-foreground">
                                    <tr><th className="px-3 py-2 text-left">Bukti</th><th className="px-3 py-2 text-left">Tanggal</th><th className="px-3 py-2 text-left">Keterangan</th>
                                        <th className="px-3 py-2 text-right">Baris</th><th className="px-3 py-2 text-right">Debit</th><th className="px-3 py-2 text-right">Kredit</th><th className="px-3 py-2 text-right">Selisih</th></tr>
                                </thead>
                                <tbody>
                                    {tidakSeimbang.map((b) => (
                                        <tr key={b.nomor_bukti} className="border-t hover:bg-muted/30">
                                            <td className="px-3 py-1.5 font-mono text-xs"><Link href={cari(b.nomor_bukti)} className="text-blue-700 hover:underline dark:text-blue-400">{b.nomor_bukti}</Link>
                                                {b.tanpa_akun > 0 && <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800">akun tak ada di COA</span>}</td>
                                            <td className="px-3 py-1.5 whitespace-nowrap">{formatTanggal(b.tanggal)}</td>
                                            <td className="px-3 py-1.5 max-w-[22rem] truncate">{b.deskripsi ?? "-"}</td>
                                            <td className="px-3 py-1.5 text-right tabular-nums">{b.baris}</td>
                                            <td className="px-3 py-1.5 text-right tabular-nums">{formatAngka(b.debit)}</td>
                                            <td className="px-3 py-1.5 text-right tabular-nums">{formatAngka(b.kredit)}</td>
                                            <td className="px-3 py-1.5 text-right font-semibold tabular-nums text-amber-700">{formatAngka(b.selisih)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </section>

                <section>
                    <h2 className="mb-2 font-semibold">Baris ke akun yang tidak ada di COA ({tanpaAkun.length})</h2>
                    {tanpaAkun.length === 0 ? <p className="text-sm text-muted-foreground">Tidak ada.</p> : (
                        <div className="overflow-x-auto rounded-md border">
                            <table className="w-full text-sm">
                                <thead className="bg-muted text-xs text-muted-foreground">
                                    <tr><th className="px-3 py-2 text-left">Bukti</th><th className="px-3 py-2 text-left">Tanggal</th><th className="px-3 py-2 text-left">Kode akun</th>
                                        <th className="px-3 py-2 text-left">Keterangan</th><th className="px-3 py-2 text-right">Debit</th><th className="px-3 py-2 text-right">Kredit</th></tr>
                                </thead>
                                <tbody>
                                    {tanpaAkun.map((b) => (
                                        <tr key={b.id} className="border-t hover:bg-muted/30">
                                            <td className="px-3 py-1.5 font-mono text-xs"><Link href={cari(b.nomor_bukti)} className="text-blue-700 hover:underline dark:text-blue-400">{b.nomor_bukti}</Link></td>
                                            <td className="px-3 py-1.5 whitespace-nowrap">{formatTanggal(b.tanggal)}</td>
                                            <td className="px-3 py-1.5 font-mono">{b.kode_perkiraan || "(kosong)"}</td>
                                            <td className="px-3 py-1.5 max-w-[22rem] truncate">{b.deskripsi ?? "-"}</td>
                                            <td className="px-3 py-1.5 text-right tabular-nums">{formatAngka(b.debit)}</td>
                                            <td className="px-3 py-1.5 text-right tabular-nums">{formatAngka(b.kredit)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </section>
                <p className="text-xs text-muted-foreground">Klik nomor bukti untuk membuka jurnalnya di Jurnal Umum (bisa diedit atau dihapus di sana). Selisih neraca hilang bila bukti diperbaiki sampai debit sama dengan kredit dan akunnya ada di COA.</p>
            </div>
        </HalamanLaporan>
    )
}
