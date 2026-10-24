import Link from "next/link"
import { FormCard, selectClass } from "@/components/transaksi/common"
import { FormPeriode } from "@/components/laporan/Periode"
import { TombolBankBookBaru, TombolBankBookHapus, TombolBankBookUbah } from "@/components/bankbook/BankBook"
import { akunBankBook, harianBankBook, transaksiBankBook } from "@/lib/queries/laporan"
import { semuaAkun } from "@/lib/queries/akuntansi"
import { formatAngka, formatTanggal, hariIni } from "@/lib/format"
import { isTanggal, sp } from "@/lib/list"
import { wajibIzin } from "@/lib/operator"

export default async function BankBookPage(props: PageProps<"/dashboard/accounting/bank-book">) {
    await wajibIzin("/dashboard/accounting/bank-book") // layout tidak dijalankan ulang pada navigasi antarhalaman
    const s = await props.searchParams
    const sampai = isTanggal(sp(s, "sampai")) ? sp(s, "sampai") : hariIni()
    const dari = isTanggal(sp(s, "dari")) ? sp(s, "dari") : `${sampai.slice(0, 7)}-01`
    const daftar = await akunBankBook(sampai)
    const kode = daftar.some((a) => a.kode_perkiraan === sp(s, "akun")) ? sp(s, "akun") : daftar[0]?.kode_perkiraan ?? ""
    const akun = daftar.find((a) => a.kode_perkiraan === kode)
    if (!akun) return <FormCard title="Bank Book" description="Belum ada akun kas/bank (keterangan GC atau BANK) di Chart of Accounts." children={null} />

    const { awal, rows } = await harianBankBook(kode, dari, sampai)
    const tgl = isTanggal(sp(s, "tgl")) && sp(s, "tgl") >= dari && sp(s, "tgl") <= sampai ? sp(s, "tgl") : (rows.find((r) => r.bukti > 0) ?? rows[0])?.tanggal ?? sampai
    const transaksi = await transaksiBankBook(kode, tgl)
    const masuk = rows.reduce((t, r) => t + Number(r.debit), 0), keluar = rows.reduce((t, r) => t + Number(r.kredit), 0)
    const semua = await semuaAkun()
    const props_ = { akunBank: daftar.map(({ id, kode_perkiraan, nama_perkiraan }) => ({ id, kode_perkiraan, nama_perkiraan })), akunBankDipilih: kode, semuaAkun: semua, hariIni: hariIni() }
    const href = (t: string) => `?akun=${kode}&dari=${dari}&sampai=${sampai}&tgl=${t}`

    return (
        <FormCard title="Bank Book" description="Buku kas & bank harian: uang masuk dan keluar per akun, lengkap dengan entri, ubah, dan hapus bukti BB.">
            <div className="flex flex-wrap items-end justify-between gap-3">
                <FormPeriode dari={dari} sampai={sampai}>
                    <label className="text-xs text-muted-foreground space-y-1">
                        <span className="block font-semibold">Akun kas / bank</span>
                        <select name="akun" defaultValue={kode} className={`${selectClass} w-72`}>
                            {daftar.map((a) => <option key={a.id} value={a.kode_perkiraan}>{a.kode_perkiraan} {a.nama_perkiraan}</option>)}
                        </select>
                    </label>
                </FormPeriode>
                <TombolBankBookBaru {...props_} />
            </div>

            <dl className="mt-4 grid gap-3 sm:grid-cols-4 text-sm">
                {([["Saldo awal", awal], ["Uang masuk", masuk], ["Uang keluar", keluar], ["Saldo akhir", awal + masuk - keluar]] as const).map(([l, v]) => (
                    <div key={l} className="rounded-md border p-3"><dt className="text-xs text-muted-foreground">{l}</dt><dd className="text-lg font-bold tabular-nums">{formatAngka(v)}</dd></div>
                ))}
            </dl>

            <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
                <div className="max-h-[32rem] overflow-auto rounded-md border">
                    <table className="w-full text-sm">
                        <thead className="sticky top-0 bg-muted text-muted-foreground text-xs">
                            <tr><th className="px-2 py-2 text-left">Tanggal</th><th className="px-2 py-2 text-right">Masuk</th><th className="px-2 py-2 text-right">Keluar</th><th className="px-2 py-2 text-right">Saldo akhir</th></tr>
                        </thead>
                        <tbody>
                            {rows.map((r) => (
                                <tr key={r.tanggal} className={`border-t ${r.tanggal === tgl ? "bg-blue-50 dark:bg-blue-500/10" : ""}`}>
                                    <td className="px-2 py-1 whitespace-nowrap"><Link href={href(r.tanggal)} className="hover:underline">{formatTanggal(r.tanggal)}</Link>{r.bukti > 0 && <span className="ml-1 text-[10px] text-muted-foreground">{r.bukti} bukti</span>}</td>
                                    <td className="px-2 py-1 text-right tabular-nums">{Number(r.debit) ? formatAngka(r.debit) : ""}</td>
                                    <td className="px-2 py-1 text-right tabular-nums">{Number(r.kredit) ? formatAngka(r.kredit) : ""}</td>
                                    <td className="px-2 py-1 text-right tabular-nums">{formatAngka(r.akhir)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="overflow-x-auto rounded-md border">
                    <div className="border-b bg-muted px-3 py-2 text-xs font-semibold text-muted-foreground">Bukti tanggal {formatTanggal(tgl, "long")}</div>
                    <table className="w-full text-sm">
                        <thead className="text-muted-foreground text-xs">
                            <tr><th className="px-2 py-2 text-left">No. Bukti</th><th className="px-2 py-2 text-left">Keterangan / lawan</th><th className="px-2 py-2 text-right">Masuk</th><th className="px-2 py-2 text-right">Keluar</th><th className="w-20"></th></tr>
                        </thead>
                        <tbody>
                            {transaksi.length === 0 && <tr><td colSpan={5} className="px-2 py-6 text-center text-muted-foreground">Tidak ada transaksi pada tanggal ini</td></tr>}
                            {transaksi.map((t) => (
                                <tr key={t.nomor_bukti} className="border-t align-top">
                                    <td className="px-2 py-1.5 font-mono text-xs whitespace-nowrap">{t.nomor_bukti}</td>
                                    <td className="px-2 py-1.5"><div>{t.deskripsi}</div><div className="text-xs text-muted-foreground">{t.lawan}</div></td>
                                    <td className="px-2 py-1.5 text-right tabular-nums">{Number(t.debit) ? formatAngka(t.debit) : ""}</td>
                                    <td className="px-2 py-1.5 text-right tabular-nums">{Number(t.kredit) ? formatAngka(t.kredit) : ""}</td>
                                    <td className="px-1 py-1 whitespace-nowrap">
                                        {t.rekonsiliasi ? <span className="text-[10px] text-muted-foreground">Rekon</span>
                                            : t.bankbook ? <><TombolBankBookUbah nomorBukti={t.nomor_bukti} {...props_} /><TombolBankBookHapus nomorBukti={t.nomor_bukti} /></>
                                            : <span className="text-[10px] text-muted-foreground" title="Dibuat transaksi lain; ubah dari asalnya">Sistem</span>}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </FormCard>
    )
}
