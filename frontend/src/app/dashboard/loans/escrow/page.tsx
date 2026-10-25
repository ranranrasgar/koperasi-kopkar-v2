import Link from "next/link"
import { FormPeriode, KopLaporan } from "@/components/laporan/Periode"
import { HalamanLaporan } from "@/components/laporan/HalamanLaporan"
import { saldoPerAkun, type SaldoAkun } from "@/lib/queries/laporan"
import { formatAngka, formatTanggal, hariIni } from "@/lib/format"
import { isTanggal, sp } from "@/lib/list"
import { wajibIzin } from "@/lib/operator"

export const dynamic = "force-dynamic"

/*
 * Titipan di aplikasi ini = uang yang dititipkan ke koperasi dan belum disalurkan: angsuran KPR yang dikumpulkan untuk bank (BTN, BRI),
 * fee kolektif, dan titipan pajak/BPJS. Desktop mencatatnya sebagai jurnal ke akun "Titipan ..." (2.1.00.xx, saldo normal kredit); tabel
 * pinjaman_tunai_titipan yang dulu dibaca halaman ini kosong dan tidak dipakai. Karena itu halaman ini merangkum akun-akun titipan dari jurnal.
 */
const KELOMPOK = [
    { nama: "Titipan angsuran pinjaman dan KPR", cocok: (a: SaldoAkun) => /^titipan angs|^titipan tab/i.test(a.nama_perkiraan) },
    { nama: "Fee titipan kolektif", cocok: (a: SaldoAkun) => /^fee titipan/i.test(a.nama_perkiraan) },
    { nama: "Titipan pajak, BPJS, dan dana", cocok: () => true },
]

export default async function TitipanPage(props: PageProps<"/dashboard/loans/escrow">) {
    await wajibIzin("/dashboard/loans/escrow") // layout tidak dijalankan ulang pada navigasi antarhalaman
    const s = await props.searchParams
    const sampai = isTanggal(sp(s, "sampai")) ? sp(s, "sampai") : hariIni()
    const dari = isTanggal(sp(s, "dari")) ? sp(s, "dari") : `${sampai.slice(0, 4)}-01-01`
    const semua = (await saldoPerAkun(dari, sampai)).filter((a) => /titip/i.test(a.nama_perkiraan) && (a.awal || a.debit || a.kredit || a.akhir))
    // Akun bersaldo normal kredit: tampil positif sebagai kewajiban titipan (awal/akhir = kredit - debit).
    const sisa = new Set(semua.map((a) => a.kode_perkiraan))
    const kelompok = KELOMPOK.map((k) => {
        const isi = semua.filter((a) => sisa.has(a.kode_perkiraan) && k.cocok(a))
        isi.forEach((a) => sisa.delete(a.kode_perkiraan))
        return { nama: k.nama, isi }
    }).filter((k) => k.isi.length > 0)
    const jml = (daftar: SaldoAkun[]) => ({
        awal: daftar.reduce((t, a) => t - a.awal, 0), masuk: daftar.reduce((t, a) => t + a.kredit, 0),
        keluar: daftar.reduce((t, a) => t + a.debit, 0), akhir: daftar.reduce((t, a) => t - a.akhir, 0),
    })
    const total = jml(semua)
    const bukuBesar = (kode: string) => `/dashboard/accounting/ledger?akun=${encodeURIComponent(kode)}&dari=${dari}&sampai=${sampai}`
    const ekspor = [["Kelompok", "Kode", "Nama Akun", "Saldo Awal", "Titipan Masuk", "Disalurkan / Keluar", "Saldo Akhir"],
        ...kelompok.flatMap((k) => k.isi.map((a) => [k.nama, a.kode_perkiraan, a.nama_perkiraan, String(-a.awal), String(a.kredit), String(a.debit), String(-a.akhir)])),
        ["Total", "", "", String(total.awal), String(total.masuk), String(total.keluar), String(total.akhir)]]

    return (
        <HalamanLaporan title="Setoran Titipan" description="Saldo titipan angsuran (KPR dan pinjaman bank), fee kolektif, dan titipan lain dari jurnal, per akun titipan."
            filter={<FormPeriode dari={dari} sampai={sampai} tanpaCetak />} ekspor={{ nama: `titipan_${sampai}`, baris: ekspor }}>
            <KopLaporan judul="Saldo Titipan" periode={`${formatTanggal(dari, "long")} s/d ${formatTanggal(sampai, "long")}`} />
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead className="bg-muted text-muted-foreground text-xs">
                        <tr>
                            <th className="px-2 py-2 text-left">Kode</th><th className="px-2 py-2 text-left">Nama Akun</th>
                            <th className="px-2 py-2 text-right">Saldo Awal</th><th className="px-2 py-2 text-right">Titipan Masuk</th>
                            <th className="px-2 py-2 text-right">Disalurkan / Keluar</th><th className="px-2 py-2 text-right">Saldo Akhir</th>
                        </tr>
                    </thead>
                    {kelompok.length === 0 && <tbody><tr><td colSpan={6} className="p-8 text-center text-muted-foreground">Tidak ada akun titipan yang bergerak pada periode ini.</td></tr></tbody>}
                    {kelompok.map((k) => {
                        const j = jml(k.isi)
                        return (
                            <tbody key={k.nama}>
                                <tr className="border-t bg-muted/30"><td colSpan={6} className="px-2 py-1.5 text-xs font-bold uppercase tracking-wide text-muted-foreground">{k.nama}</td></tr>
                                {k.isi.map((a) => (
                                    <tr key={a.kode_perkiraan} className="border-t">
                                        <td className="px-2 py-1 font-mono text-xs"><Link href={bukuBesar(a.kode_perkiraan)} className="text-blue-600 hover:underline print:text-inherit">{a.kode_perkiraan}</Link></td>
                                        <td className="px-2 py-1">{a.nama_perkiraan}</td>
                                        <td className="px-2 py-1 text-right tabular-nums">{formatAngka(-a.awal)}</td>
                                        <td className="px-2 py-1 text-right tabular-nums">{a.kredit ? formatAngka(a.kredit) : ""}</td>
                                        <td className="px-2 py-1 text-right tabular-nums">{a.debit ? formatAngka(a.debit) : ""}</td>
                                        <td className="px-2 py-1 text-right tabular-nums font-medium">{formatAngka(-a.akhir)}</td>
                                    </tr>
                                ))}
                                <tr className="border-t font-semibold">
                                    <td colSpan={2} className="px-2 py-1.5">Jumlah {k.nama.toLowerCase()}</td>
                                    <td className="px-2 py-1.5 text-right tabular-nums">{formatAngka(j.awal)}</td><td className="px-2 py-1.5 text-right tabular-nums">{formatAngka(j.masuk)}</td>
                                    <td className="px-2 py-1.5 text-right tabular-nums">{formatAngka(j.keluar)}</td><td className="px-2 py-1.5 text-right tabular-nums">{formatAngka(j.akhir)}</td>
                                </tr>
                            </tbody>
                        )
                    })}
                    {kelompok.length > 0 && (
                        <tfoot className="border-t-2 bg-muted/40 font-bold">
                            <tr>
                                <td colSpan={2} className="px-2 py-2">Total titipan</td>
                                <td className="px-2 py-2 text-right tabular-nums">{formatAngka(total.awal)}</td><td className="px-2 py-2 text-right tabular-nums">{formatAngka(total.masuk)}</td>
                                <td className="px-2 py-2 text-right tabular-nums">{formatAngka(total.keluar)}</td><td className="px-2 py-2 text-right tabular-nums">{formatAngka(total.akhir)}</td>
                            </tr>
                        </tfoot>
                    )}
                </table>
            </div>
            <p className="mt-3 text-xs text-muted-foreground" data-tanpa-cetak>
                Titipan dicatat oleh transaksi lain (angsuran KPR di Setoran Angsuran tab KPR, fee kolektif, dan jurnal umum); halaman ini hanya merangkumnya. Klik kode akun untuk melihat mutasinya di Buku Besar.
            </p>
        </HalamanLaporan>
    )
}
