import Link from "next/link"
import { FormCard } from "@/components/transaksi/common"
import { FormPeriode, KopLaporan } from "@/components/laporan/Periode"
import { saldoPerAkun, type SaldoAkun } from "@/lib/queries/laporan"
import { formatAngka, formatTanggal, hariIni } from "@/lib/format"
import { isTanggal, sp } from "@/lib/list"
import { MENU } from "@/config/akses"
import { wajibIzin } from "@/lib/operator"
import { cn } from "@/lib/utils"

function Bagian({ judul, akun, nilai, total }: { judul: string; akun: SaldoAkun[]; nilai: (a: SaldoAkun) => number; total: string }) {
    const jumlah = akun.reduce((s, a) => s + nilai(a), 0)
    return (
        <div className="mb-4 break-inside-avoid">
            <div className="font-bold border-b pb-1 mb-1">{judul}</div>
            <table className="w-full text-sm">
                <tbody>
                    {akun.map((a) => (
                        <tr key={a.kode_perkiraan}>
                            <td className="py-0.5 pr-2 font-mono text-xs w-24">{a.kode_perkiraan}</td>
                            <td className="py-0.5">{a.nama_perkiraan}</td>
                            <td className="py-0.5 text-right tabular-nums">{formatAngka(nilai(a))}</td>
                        </tr>
                    ))}
                    <tr className="border-t font-semibold">
                        <td colSpan={2} className="py-1">{total}</td>
                        <td className="py-1 text-right tabular-nums">{formatAngka(jumlah)}</td>
                    </tr>
                </tbody>
            </table>
        </div>
    )
}

const ada = (a: SaldoAkun, v: number) => Math.abs(v) >= 0.005

export default async function LaporanKeuanganPage(props: PageProps<"/dashboard/accounting/reports">) {
    const o = await wajibIzin("/dashboard/accounting/reports") // layout tidak dijalankan ulang pada navigasi antarhalaman
    const s = await props.searchParams
    const bolehNeraca = o.izin.includes(MENU.neraca), bolehRL = o.izin.includes(MENU.rugiLaba)
    const lap = sp(s, "lap") === "rugilaba" && bolehRL ? "rugilaba" : bolehNeraca ? "neraca" : "rugilaba"
    const sampai = isTanggal(sp(s, "sampai")) ? sp(s, "sampai") : hariIni()
    const dari = isTanggal(sp(s, "dari")) ? sp(s, "dari") : `${sampai.slice(0, 4)}-01-01`
    const tab = (k: string, label: string, boleh: boolean) => boleh && (
        <Link href={`?lap=${k}`} className={cn("px-3 py-1.5 rounded-md text-sm", lap === k ? "bg-primary text-primary-foreground" : "hover:bg-muted")}>{label}</Link>
    )

    let isi: React.ReactNode
    if (lap === "neraca") {
        const akun = await saldoPerAkun(`${sampai.slice(0, 4)}-01-01`, sampai)
        const klas = (k: number) => akun.filter((a) => a.kode_klasifikasi === k && ada(a, a.akhir))
        const aktiva = klas(10), hutang = klas(20), modal = klas(30)
        // Pendapatan dan biaya belum ditutup = SHU tahun berjalan (tutup buku menolkan akun ini tiap 31-12).
        const shu = -akun.filter((a) => a.kode_klasifikasi === 40 || a.kode_klasifikasi === 50).reduce((t, a) => t + a.akhir, 0)
        const lain = akun.filter((a) => a.kode_klasifikasi === null && ada(a, a.akhir))
        const totAktiva = aktiva.reduce((t, a) => t + a.akhir, 0)
        const totPasiva = -[...hutang, ...modal].reduce((t, a) => t + a.akhir, 0) + shu
        isi = (
            <>
                <KopLaporan judul="Neraca" periode={`Per ${formatTanggal(sampai, "long")}`} />
                <div className="grid gap-8 md:grid-cols-2">
                    <div>
                        <Bagian judul="AKTIVA" akun={aktiva} nilai={(a) => a.akhir} total="Jumlah Aktiva" />
                    </div>
                    <div>
                        <Bagian judul="HUTANG" akun={hutang} nilai={(a) => -a.akhir} total="Jumlah Hutang" />
                        <Bagian judul="MODAL" akun={modal} nilai={(a) => -a.akhir} total="Jumlah Modal" />
                        <div className="flex justify-between text-sm font-semibold border-b pb-1 mb-3">
                            <span>SHU Tahun Berjalan (pendapatan - biaya belum ditutup)</span><span className="tabular-nums">{formatAngka(shu)}</span>
                        </div>
                    </div>
                </div>
                <div className="grid gap-8 md:grid-cols-2 border-t-2 pt-2 font-bold">
                    <div className="flex justify-between"><span>TOTAL AKTIVA</span><span className="tabular-nums">{formatAngka(totAktiva)}</span></div>
                    <div className="flex justify-between"><span>TOTAL PASIVA</span><span className="tabular-nums">{formatAngka(totPasiva)}</span></div>
                </div>
                {(Math.abs(totAktiva - totPasiva) >= 0.5 || lain.length > 0) && (
                    <p className="mt-3 text-sm text-amber-700 dark:text-amber-400">
                        Selisih aktiva - pasiva {formatAngka(totAktiva - totPasiva)}
                        {lain.length > 0 && `; di luar itu ada saldo di akun yang tidak ada di COA dan tidak masuk neraca: ${lain.map((a) => `${a.kode_perkiraan} = ${formatAngka(a.akhir)}`).join(", ")}`}.
                        Selisih berasal dari jurnal lama yang tidak seimbang di data.
                    </p>
                )}
            </>
        )
    } else {
        const akun = await saldoPerAkun(dari, sampai, { tanpaTutupBuku: true })
        const pendapatan = akun.filter((a) => a.kode_klasifikasi === 40 && ada(a, a.kredit - a.debit))
        const biaya = akun.filter((a) => a.kode_klasifikasi === 50 && ada(a, a.debit - a.kredit))
        const totP = pendapatan.reduce((t, a) => t + a.kredit - a.debit, 0), totB = biaya.reduce((t, a) => t + a.debit - a.kredit, 0)
        isi = (
            <>
                <KopLaporan judul="Laporan Rugi Laba" periode={`${formatTanggal(dari, "long")} s/d ${formatTanggal(sampai, "long")}`} />
                <div className="max-w-3xl mx-auto">
                    <Bagian judul="PENDAPATAN" akun={pendapatan} nilai={(a) => a.kredit - a.debit} total="Jumlah Pendapatan" />
                    <Bagian judul="BIAYA" akun={biaya} nilai={(a) => a.debit - a.kredit} total="Jumlah Biaya" />
                    <div className="flex justify-between border-t-2 pt-2 font-bold">
                        <span>SISA HASIL USAHA (SHU)</span><span className="tabular-nums">{formatAngka(totP - totB)}</span>
                    </div>
                    <p className="mt-2 text-[11px] text-muted-foreground">Jurnal tutup buku (TBT) tidak dihitung supaya periode yang mencakup 31 Desember tetap menunjukkan hasil usaha.</p>
                </div>
            </>
        )
    }

    return (
        <FormCard title="Laporan Keuangan" description="Neraca dan rugi laba dari jurnal umum, dengan saldo awal tahun dari jurnal tutup buku.">
            <div className="flex gap-2 mb-3 print:hidden">{tab("neraca", "Neraca", bolehNeraca)}{tab("rugilaba", "Rugi Laba", bolehRL)}</div>
            <FormPeriode dari={dari} sampai={sampai} satuTanggal={lap === "neraca"}>
                <input type="hidden" name="lap" value={lap} />
            </FormPeriode>
            <div className="mt-4">{isi}</div>
        </FormCard>
    )
}
