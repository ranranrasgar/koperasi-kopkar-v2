import { FormCard, selectClass } from "@/components/transaksi/common"
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
    const { awal, baris, debit: totD, kredit: totK } = await bukuBesar(kode, dari, sampai)
    const akhir = awal + totD - totK

    return (
        <FormCard title="Buku Kas & Bank" description="Mutasi satu akun dengan saldo berjalan (debit menambah, kredit mengurangi).">
            <FormPeriode dari={dari} sampai={sampai}>
                <label className="text-xs text-muted-foreground space-y-1">
                    <span className="block font-semibold">Akun</span>
                    <select name="akun" defaultValue={kode} className={`${selectClass} w-72`}>
                        {daftar.map((a) => <option key={a.id} value={a.kode_perkiraan}>{a.kode_perkiraan} {a.nama_perkiraan}</option>)}
                    </select>
                </label>
            </FormPeriode>
            <div className="mt-4">
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
                                <td colSpan={5} className="px-2 py-1.5">Saldo awal</td>
                                <td className="px-2 py-1.5 text-right tabular-nums">{formatAngka(awal)}</td>
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
                    {baris.length === 5000 && <p className="mt-2 text-xs text-amber-700">Hanya 5.000 baris pertama yang ditampilkan (total dan saldo akhir tetap untuk seluruh periode); persempit periode untuk melihat semua baris.</p>}
                </div>
            </div>
        </FormCard>
    )
}
