import { FormCard, selectClass } from "@/components/transaksi/common"
import { TombolCetak } from "@/components/ui/TombolCetak"
import { Input } from "@/components/ui/input"
import { posShu, shuAnggota, tanggalShu } from "@/lib/queries/pinjaman-lap"
import { saldoPerAkun } from "@/lib/queries/laporan"
import { formatAngka, formatAngka2, formatTanggal, hariIni } from "@/lib/format"
import { sp } from "@/lib/list"
import { wajibIzin } from "@/lib/operator"

export default async function ShuPage(props: PageProps<"/dashboard/shu">) {
    await wajibIzin("/dashboard/shu") // layout tidak dijalankan ulang pada navigasi antarhalaman
    const s = await props.searchParams
    const [daftarTgl, pos] = await Promise.all([tanggalShu(), posShu()])
    const tgl = daftarTgl.some((d) => d.tgl === sp(s, "tgl")) ? sp(s, "tgl") : daftarTgl[0]?.tgl
    const cari = sp(s, "q").toLowerCase()
    const tahunIni = hariIni().slice(0, 4)
    const [anggota, akun] = await Promise.all([
        tgl ? shuAnggota(tgl) : Promise.resolve([]),
        saldoPerAkun(`${tahunIni}-01-01`, hariIni(), { tanpaTutupBuku: true }),
    ])
    // SHU tahun berjalan = pendapatan - biaya sejak awal tahun (sebelum tutup buku).
    const shuBerjalan = akun.filter((a) => a.kode_klasifikasi === 40 || a.kode_klasifikasi === 50).reduce((t, a) => t + a.kredit - a.debit, 0)
    const data = anggota.filter((a) => !cari || a.nama.toLowerCase().includes(cari) || a.kode_agt.toLowerCase().includes(cari) || (a.nik ?? "").includes(cari))
    const tot = data.reduce((t, a) => ({ ju: t.ju + a.rp_jasa_uang, jb: t.jb + a.rp_jasa_barang, su: t.su + a.rp_sukarela, cair: t.cair + a.rp_pencairan }),
        { ju: 0, jb: 0, su: 0, cair: 0 })

    return (
        <div className="space-y-6">
            <FormCard title="Pembagian SHU" description={`Alokasi SHU per pos (jenis_pos_shu). SHU tahun berjalan ${tahunIni} sampai hari ini dari jurnal: Rp ${formatAngka(shuBerjalan)}.`}>
                <div className="overflow-x-auto rounded-md border">
                    <table className="w-full text-sm">
                        <thead className="bg-muted text-muted-foreground text-xs">
                            <tr><th className="px-3 py-2 text-left">Pos SHU</th><th className="px-3 py-2 text-left">Akun</th>
                                <th className="px-3 py-2 text-right">Persen</th><th className="px-3 py-2 text-right">Proyeksi dari SHU berjalan</th></tr>
                        </thead>
                        <tbody>
                            {pos.map((p) => (
                                <tr key={p.urut} className="border-t">
                                    <td className="px-3 py-1.5">{p.nama_pos_shu}</td>
                                    <td className="px-3 py-1.5"><span className="font-mono text-xs">{p.kode_coa}</span> {p.nama_perkiraan}</td>
                                    <td className="px-3 py-1.5 text-right">{formatAngka2(p.prosentase)}%</td>
                                    <td className="px-3 py-1.5 text-right tabular-nums">{formatAngka((shuBerjalan * p.prosentase) / 100)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </FormCard>

            <FormCard title="SHU per Anggota" description="Hasil perhitungan SHU anggota per tanggal tutup buku (dari aplikasi desktop).">
                {daftarTgl.length === 0 ? <p className="text-sm text-muted-foreground">Belum ada data SHU anggota.</p> : (
                    <>
                        <form method="get" className="flex flex-wrap items-end gap-3 print:hidden">
                            <select name="tgl" defaultValue={tgl} className={`${selectClass} w-48`} aria-label="Tanggal tutup buku">
                                {daftarTgl.map((d) => <option key={d.tgl} value={d.tgl}>Tutup buku {formatTanggal(d.tgl)} ({d.n})</option>)}
                            </select>
                            <Input name="q" defaultValue={sp(s, "q")} placeholder="Cari kode, KPK, atau nama" className="w-64" />
                            <button type="submit" className="h-9 px-4 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold">Tampilkan</button>
                            <TombolCetak />
                        </form>
                        <div className="mt-3 overflow-x-auto rounded-md border" data-area-cetak data-judul-cetak="SHU per Anggota" data-subjudul-cetak={`Tutup buku ${formatTanggal(tgl)}`}>
                            <table className="w-full text-sm">
                                <thead className="bg-muted text-muted-foreground text-xs">
                                    <tr>
                                        <th className="px-2 py-2 text-left">Anggota</th>
                                        <th className="px-2 py-2 text-center">Lama (bln)</th>
                                        <th className="px-2 py-2 text-right">Jasa Uang</th>
                                        <th className="px-2 py-2 text-right">Jasa Barang</th>
                                        <th className="px-2 py-2 text-right">Saldo Sukarela</th>
                                        <th className="px-2 py-2 text-right">Dicairkan</th>
                                        <th className="px-2 py-2 text-left">No. Ref</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.map((a) => (
                                        <tr key={a.kode_agt} className="border-t">
                                            <td className="px-2 py-1">
                                                <div className="font-medium">{a.nama}</div>
                                                <div className="text-[11px] text-muted-foreground font-mono">{a.kode_agt} | {a.nik ?? "-"} | {a.status_staff ?? "-"}</div>
                                            </td>
                                            <td className="px-2 py-1 text-center">{a.lama_agt ?? "-"}</td>
                                            <td className="px-2 py-1 text-right tabular-nums">{formatAngka(a.rp_jasa_uang)}</td>
                                            <td className="px-2 py-1 text-right tabular-nums">{formatAngka(a.rp_jasa_barang)}</td>
                                            <td className="px-2 py-1 text-right tabular-nums">{formatAngka(a.rp_sukarela)}</td>
                                            <td className="px-2 py-1 text-right tabular-nums">{formatAngka(a.rp_pencairan)}</td>
                                            <td className="px-2 py-1 font-mono text-xs">{a.no_reff}</td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot className="border-t-2 bg-muted/40 font-semibold">
                                    <tr>
                                        <td colSpan={2} className="px-2 py-2 text-right">Total ({data.length} anggota)</td>
                                        <td className="px-2 py-2 text-right tabular-nums">{formatAngka(tot.ju)}</td>
                                        <td className="px-2 py-2 text-right tabular-nums">{formatAngka(tot.jb)}</td>
                                        <td className="px-2 py-2 text-right tabular-nums">{formatAngka(tot.su)}</td>
                                        <td className="px-2 py-2 text-right tabular-nums">{formatAngka(tot.cair)}</td>
                                        <td></td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </>
                )}
            </FormCard>
        </div>
    )
}
