import { FormCard } from "@/components/transaksi/common"
import { riwayatTutupBuku, saldoPerAkun } from "@/lib/queries/laporan"
import { formatAngka, formatTanggal, hariIni } from "@/lib/format"
import { wajibIzin } from "@/lib/operator"

export default async function TutupBukuPage() {
    await wajibIzin("/dashboard/accounting/closing") // layout tidak dijalankan ulang pada navigasi antarhalaman
    const tahun = hariIni().slice(0, 4)
    const [riwayat, akun] = await Promise.all([riwayatTutupBuku(), saldoPerAkun(`${tahun}-01-01`, hariIni(), { tanpaTutupBuku: true })])
    const rl = akun.filter((a) => (a.kode_klasifikasi === 40 || a.kode_klasifikasi === 50) && Math.abs(a.debit - a.kredit) >= 0.005)
    const shu = rl.reduce((t, a) => t + a.kredit - a.debit, 0)
    const sudahDitutup = riwayat.some((r) => r.tanggal === `${tahun}-12-31`)

    return (
        <div className="space-y-6">
            <FormCard title={`Tutup Buku ${tahun}`} description="Tutup buku tahunan menutup akun pendapatan dan biaya ke pos SHU (31 Desember) dan membuat saldo pembuka tahun berikutnya (1 Januari).">
                <div className="space-y-3 text-sm">
                    <div className="grid gap-3 sm:grid-cols-3">
                        <div className="rounded-md border p-3"><div className="text-xs text-muted-foreground">Status {tahun}</div>
                            <div className="font-bold">{sudahDitutup ? "Sudah ditutup" : "Belum ditutup"}</div></div>
                        <div className="rounded-md border p-3"><div className="text-xs text-muted-foreground">SHU berjalan s/d hari ini</div>
                            <div className="font-bold tabular-nums">Rp {formatAngka(shu)}</div></div>
                        <div className="rounded-md border p-3"><div className="text-xs text-muted-foreground">Akun pendapatan/biaya yang akan ditutup</div>
                            <div className="font-bold">{rl.length}</div></div>
                    </div>
                    <div role="note" className="rounded-md border border-amber-400 bg-amber-50 dark:bg-amber-500/10 px-3 py-2 text-amber-800 dark:text-amber-300">
                        Proses tutup buku dari web belum diaktifkan. Jurnal TBT desktop juga membagi SHU ke pos-pos SHU dan memindahkan saldo pos tertentu;
                        posting otomatisnya perlu diuji paritas dulu terhadap tutup buku 2024 dan 2025 sebelum dipakai. Sampai saat itu tutup buku tetap
                        dilakukan di aplikasi desktop.
                    </div>
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
                            {riwayat.map((r) => (
                                <tr key={`${r.nomor_bukti}-${r.tanggal}`} className="border-t">
                                    <td className="px-3 py-1.5 whitespace-nowrap">{formatTanggal(r.tanggal)}</td>
                                    <td className="px-3 py-1.5 font-mono text-xs">{r.nomor_bukti}</td>
                                    <td className="px-3 py-1.5">{r.bagian}</td>
                                    <td className="px-3 py-1.5 text-right">{r.baris}</td>
                                    <td className="px-3 py-1.5 text-right tabular-nums">{formatAngka(r.debit)}</td>
                                    <td className="px-3 py-1.5 text-right tabular-nums">{formatAngka(r.kredit)}</td>
                                    <td className="px-3 py-1.5">{r.opr}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </FormCard>
        </div>
    )
}
