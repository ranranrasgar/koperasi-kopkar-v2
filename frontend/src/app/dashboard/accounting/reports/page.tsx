import Link from "next/link"
import { HalamanLaporan } from "@/components/laporan/HalamanLaporan"
import { FormPeriode, KopLaporan } from "@/components/laporan/Periode"
import { query } from "@/lib/db"
import { saldoPerAkun, type SaldoAkun } from "@/lib/queries/laporan"
import { formatAngka, formatAngka2, formatTanggal, hariIni } from "@/lib/format"
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

interface Butir { kode: string; nama: string; nilai: number }
interface Kelompok { kode: string; nama: string; butir: Butir[] }

/** Kelompokkan akun menurut akun induknya (kelompok perkiraan), urut kode induk; akun tanpa induk masuk kelompok sendiri. */
function kelompokkan(akun: SaldoAkun[], induk: Map<string, { kode: string; nama: string }>, nilai: (a: SaldoAkun) => number): Kelompok[] {
    const peta = new Map<string, Kelompok>()
    for (const a of akun) {
        const i = induk.get(a.kode_perkiraan) ?? { kode: a.kode_perkiraan, nama: a.nama_perkiraan }
        const k = peta.get(i.kode) ?? { kode: i.kode, nama: i.nama, butir: [] }
        k.butir.push({ kode: a.kode_perkiraan, nama: a.nama_perkiraan, nilai: nilai(a) })
        peta.set(i.kode, k)
    }
    return [...peta.values()].sort((x, y) => x.kode.localeCompare(y.kode))
}

function KelompokTabel({ k }: { k: Kelompok }) {
    const jumlah = k.butir.reduce((t, b) => t + b.nilai, 0)
    return (
        <div className="mb-3 break-inside-avoid">
            <div className="font-semibold text-sm py-1">{k.nama}</div>
            <table className="w-full text-sm">
                <tbody>
                    {k.butir.map((b) => (
                        <tr key={b.kode}>
                            <td className="py-0.5 pl-4 pr-2 font-mono text-xs w-28">{b.kode}</td>
                            <td className="py-0.5">{b.nama}</td>
                            <td className="py-0.5 text-right tabular-nums w-40">{formatAngka(b.nilai)}</td>
                        </tr>
                    ))}
                    <tr className="border-t font-semibold">
                        <td colSpan={2} className="py-1 pl-4">Total {k.nama}</td>
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
        <Link href={`?lap=${k}`} className={cn("px-3 py-1 rounded text-sm font-medium", lap === k ? "bg-primary text-primary-foreground" : "hover:bg-muted")}>{label}</Link>
    )

    let isi: React.ReactNode
    const ekspor: string[][] = [["Kelompok", "Kode", "Nama Akun", "Nilai"]]
    const nilai = (n: number) => String(Math.round(n * 100) / 100)
    if (lap === "neraca") {
        const akun = await saldoPerAkun(`${sampai.slice(0, 4)}-01-01`, sampai)
        const klas = (k: number) => akun.filter((a) => a.kode_klasifikasi === k && ada(a, a.akhir))
        const aktiva = klas(10), hutang = klas(20), modal = klas(30)
        // Pendapatan dan biaya belum ditutup = SHU tahun berjalan (tutup buku menolkan akun ini tiap 31-12).
        const shu = -akun.filter((a) => a.kode_klasifikasi === 40 || a.kode_klasifikasi === 50).reduce((t, a) => t + a.akhir, 0)
        const lain = akun.filter((a) => a.kode_klasifikasi === null && ada(a, a.akhir))
        const totAktiva = aktiva.reduce((t, a) => t + a.akhir, 0)
        const totPasiva = -[...hutang, ...modal].reduce((t, a) => t + a.akhir, 0) + shu
        for (const [nama, daftar, f] of [["AKTIVA", aktiva, (a: SaldoAkun) => a.akhir], ["HUTANG", hutang, (a: SaldoAkun) => -a.akhir], ["MODAL", modal, (a: SaldoAkun) => -a.akhir]] as const)
            for (const a of daftar) ekspor.push([nama, a.kode_perkiraan, a.nama_perkiraan, nilai(f(a))])
        ekspor.push(["SHU Tahun Berjalan", "", "", nilai(shu)], ["TOTAL AKTIVA", "", "", nilai(totAktiva)], ["TOTAL PASIVA", "", "", nilai(totPasiva)])
        isi = (
            <>
                <KopLaporan judul="Neraca" periode={`Per ${formatTanggal(sampai, "long")}`} />
                <div data-cetak-kolom data-cetak-polos className="grid gap-8 md:grid-cols-2">
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
                <div data-cetak-kolom data-cetak-polos className="grid gap-8 md:grid-cols-2 border-t-2 pt-2 font-bold">
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
        // Pajak pendapatan = persen di Pengaturan Perusahaan x pendapatan sebelum pajak (nol bila rugi), seperti Rugi Laba desktop.
        const [{ persen }] = await query<{ persen: number }>("SELECT COALESCE(MAX(persen_pajak_pendapatan), 0)::float8 AS persen FROM perusahaan")
        const sebelumPajak = totP - totB
        const pajak = Math.max(0, sebelumPajak) * persen / 100
        const parent = await query<{ kode: string; ik: string; inama: string }>(
            "SELECT p.kode_perkiraan AS kode, pp.kode_perkiraan AS ik, pp.nama_perkiraan AS inama FROM perkiraan p JOIN perkiraan pp ON pp.id = p.parent_id")
        const induk = new Map(parent.map((r) => [r.kode, { kode: r.ik, nama: r.inama }]))
        const kelP = kelompokkan(pendapatan, induk, (a) => a.kredit - a.debit), kelB = kelompokkan(biaya, induk, (a) => a.debit - a.kredit)
        for (const [bagian, kel] of [["PENDAPATAN", kelP], ["BIAYA", kelB]] as const)
            for (const k of kel) for (const b of k.butir) ekspor.push([`${bagian} - ${k.nama}`, b.kode, b.nama, nilai(b.nilai)])
        ekspor.push(["Jumlah Pendapatan", "", "", nilai(totP)], ["Jumlah Biaya", "", "", nilai(totB)], ["Pendapatan sebelum pajak", "", "", nilai(sebelumPajak)],
            [`Pajak pendapatan (${persen}%)`, "", "", nilai(pajak)], ["Pendapatan setelah pajak (SHU)", "", "", nilai(sebelumPajak - pajak)])
        isi = (
            <>
                <KopLaporan judul="Laporan Rugi Laba" periode={`${formatTanggal(dari, "long")} s/d ${formatTanggal(sampai, "long")}`} />
                <div data-cetak-polos className="max-w-3xl mx-auto">
                    <div className="font-bold border-b pb-1 mb-2">PENDAPATAN</div>
                    {kelP.map((k) => <KelompokTabel key={k.kode} k={k} />)}
                    <div className="flex justify-between font-bold border-t-2 py-1 mb-4"><span>Jumlah Pendapatan</span><span className="tabular-nums">{formatAngka(totP)}</span></div>
                    <div className="font-bold border-b pb-1 mb-2">BIAYA</div>
                    {kelB.map((k) => <KelompokTabel key={k.kode} k={k} />)}
                    <div className="flex justify-between font-bold border-t-2 py-1 mb-4"><span>Jumlah Biaya</span><span className="tabular-nums">{formatAngka(totB)}</span></div>
                    <div className="flex justify-between border-t-2 pt-2 font-bold">
                        <span>PENDAPATAN SEBELUM PAJAK</span><span className="tabular-nums">{formatAngka(sebelumPajak)}</span>
                    </div>
                    <div className="flex justify-between py-1 font-semibold">
                        <span>PAJAK PENDAPATAN ({String(persen).replace(".", ",")}%)</span><span className="tabular-nums">{formatAngka2(pajak)}</span>
                    </div>
                    <div className="flex justify-between border-t-2 pt-2 font-bold">
                        <span>PENDAPATAN SETELAH PAJAK (SHU)</span><span className="tabular-nums">{formatAngka2(sebelumPajak - pajak)}</span>
                    </div>
                    <p className="mt-2 text-[11px] text-muted-foreground">Jurnal tutup buku (TBT) tidak dihitung supaya periode yang mencakup 31 Desember tetap menunjukkan hasil usaha. Persen pajak diatur di Pengaturan Perusahaan; pajak hanya tampil sebagai angka laporan dan tidak dijurnal.</p>
                </div>
            </>
        )
    }

    const tabs = (
        <div className="flex gap-1 rounded-md border p-0.5">{tab("neraca", "Neraca", bolehNeraca)}{tab("rugilaba", "Rugi Laba", bolehRL)}</div>
    )
    return (
        <HalamanLaporan title={lap === "neraca" ? "Neraca" : "Laporan Rugi Laba"}
            description={lap === "neraca" ? "Posisi aktiva, hutang, dan modal per tanggal, dari jurnal umum dengan saldo awal tahun dari jurnal tutup buku."
                : "Pendapatan dan biaya per kelompok perkiraan, lengkap dengan pajak pendapatan menurut Pengaturan Perusahaan."}
            ekspor={{ nama: `${lap === "neraca" ? "neraca" : "rugi-laba"}_${sampai}`, baris: ekspor }}
            filter={<>{tabs}<FormPeriode dari={dari} sampai={sampai} satuTanggal={lap === "neraca"} tanpaCetak><input type="hidden" name="lap" value={lap} /></FormPeriode></>}>
            {isi}
        </HalamanLaporan>
    )
}
