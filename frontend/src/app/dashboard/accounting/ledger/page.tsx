import { PilihAkun } from "@/components/laporan/PilihAkun"
import { PaginasiUrl } from "@/components/ui/PaginasiUrl"
import { ukuranHalaman } from "@/lib/halaman"
import { HalamanLaporan } from "@/components/laporan/HalamanLaporan"
import { FormPeriode, KopLaporan } from "@/components/laporan/Periode"
import { bukuBesar } from "@/lib/queries/laporan"
import { akunKas, semuaAkun } from "@/lib/queries/akuntansi"
import { formatAngka, formatTanggal, hariIni } from "@/lib/format"
import { isTanggal, sp } from "@/lib/list"
import { MENU } from "@/config/akses"
import { wajibIzin } from "@/lib/operator"

export default async function BukuKasBankPage(props: PageProps<"/dashboard/accounting/ledger">) {
    const o = await wajibIzin("/dashboard/accounting/ledger") // layout tidak dijalankan ulang pada navigasi antarhalaman
    const s = await props.searchParams
    // Buku Besar boleh semua akun; Buku Kas & Bank hanya akun kas/bank.
    const daftar = o.izin.includes(MENU.bukuBesar) ? await semuaAkun() : await akunKas()
    const kode = daftar.some((a) => a.kode_perkiraan === sp(s, "akun")) ? sp(s, "akun") : (await akunKas())[0]?.kode_perkiraan ?? ""
    const sampai = isTanggal(sp(s, "sampai")) ? sp(s, "sampai") : hariIni()
    const dari = isTanggal(sp(s, "dari")) ? sp(s, "dari") : `${sampai.slice(0, 7)}-01`
    const akun = daftar.find((a) => a.kode_perkiraan === kode)
    const pageSize = ukuranHalaman(sp(s, "pageSize"), 100)
    const hal = await bukuBesar(kode, dari, sampai, { page: 1, pageSize })
    const totalPages = Math.max(1, Math.ceil(hal.jumlahBaris / pageSize))
    const page = Math.min(totalPages, Math.max(1, parseInt(sp(s, "page") || "1", 10) || 1))
    // Halaman 1 sudah dibaca di atas; halaman lain dibaca ulang. Ekspor selalu seluruh periode (maks. 5.000 baris), bukan hanya halaman ini.
    const { awal, baris, debit: totD, kredit: totK } = page === 1 ? hal : await bukuBesar(kode, dari, sampai, { page, pageSize })
    const akhir = awal + totD - totK
    const semua = hal.jumlahBaris <= pageSize ? hal.baris : (await bukuBesar(kode, dari, sampai)).baris
    // Saldo yang dibawa dari halaman sebelumnya = saldo setelah baris terakhir halaman itu.
    const bawa = page > 1 && baris[0] ? Number(baris[0].saldo) - Number(baris[0].debit) + Number(baris[0].kredit) : awal

    return (
        <HalamanLaporan title="Buku Besar" description="Mutasi satu akun dengan saldo berjalan (debit menambah, kredit mengurangi)."
            ekspor={{ nama: `buku-besar_${kode}_${sampai}`, baris: [["Tanggal", "No. Bukti", "Keterangan", "Debit", "Kredit", "Saldo"], ["", "", "Saldo awal", "", "", String(awal)],
                ...semua.map((b) => [b.tanggal_jurnalumum, b.nomor_bukti, b.deskripsi ?? "", String(b.debit), String(b.kredit), String(b.saldo)]),
                ["", "", "Total mutasi / saldo akhir", String(totD), String(totK), String(akhir)]] }}
            filter={
                <FormPeriode dari={dari} sampai={sampai} tanpaCetak>
                    <PilihAkun akun={daftar} awal={kode} />
                    <input type="hidden" name="pageSize" value={sp(s, "pageSize") || String(pageSize)} />
                </FormPeriode>}>
            <div>
                <KopLaporan judul={`Buku ${akun ? `${akun.kode_perkiraan} ${akun.nama_perkiraan}` : kode}`}
                    periode={`${formatTanggal(dari, "long")} s/d ${formatTanggal(sampai, "long")}`} />
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-muted text-muted-foreground text-xs">
                            <tr>
                                <th className="px-2 py-2 text-left">Tanggal</th>
                                <th className="px-2 py-2 text-left">No. Bukti</th>
                                <th className="px-2 py-2 text-left">Keterangan</th>
                                <th className="px-2 py-2 text-right">Debit</th>
                                <th className="px-2 py-2 text-right">Kredit</th>
                                <th className="px-2 py-2 text-right">Saldo</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr className="border-t bg-muted/20 italic">
                                <td colSpan={5} className="px-2 py-1.5">{page === 1 ? "Saldo awal" : `Saldo dari halaman sebelumnya (halaman ${page - 1})`}</td>
                                <td className="px-2 py-1.5 text-right tabular-nums">{formatAngka(page === 1 ? awal : bawa)}</td>
                            </tr>
                            {baris.map((b, i) => (
                                <tr key={i} className="border-t">
                                    <td className="px-2 py-1 whitespace-nowrap">{formatTanggal(b.tanggal_jurnalumum)}</td>
                                    <td className="px-2 py-1 font-mono text-xs">{b.nomor_bukti}</td>
                                    <td className="px-2 py-1">{b.deskripsi}</td>
                                    <td className="px-2 py-1 text-right tabular-nums">{b.debit ? formatAngka(b.debit) : ""}</td>
                                    <td className="px-2 py-1 text-right tabular-nums">{b.kredit ? formatAngka(b.kredit) : ""}</td>
                                    <td className="px-2 py-1 text-right tabular-nums">{formatAngka(b.saldo)}</td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot className="border-t-2 font-semibold bg-muted/40">
                            <tr>
                                <td colSpan={3} className="px-2 py-2 text-right">Total mutasi / saldo akhir</td>
                                <td className="px-2 py-2 text-right tabular-nums">{formatAngka(totD)}</td>
                                <td className="px-2 py-2 text-right tabular-nums">{formatAngka(totK)}</td>
                                <td className="px-2 py-2 text-right tabular-nums">{formatAngka(akhir)}</td>
                            </tr>
                        </tfoot>
                    </table>
                    {pageSize >= 5000 && hal.jumlahBaris > pageSize && <p className="mt-2 text-xs text-amber-700">Pilihan Semua dibatasi 5.000 baris; gunakan halaman untuk melihat sisanya.</p>}
                </div>
                <PaginasiUrl className="border-t" page={page} totalPages={totalPages} pageSize={pageSize} total={hal.jumlahBaris} />
            </div>
        </HalamanLaporan>
    )
}
