import Link from "next/link"
import { FormCard, selectClass } from "@/components/transaksi/common"
import { TombolBankBookBaru, TombolBankBookHapus, TombolBankBookUbah } from "@/components/bankbook/BankBook"
import { TombolCetak } from "@/components/ui/TombolCetak"
import { akunBankBook, harianBankBook, transaksiBankBook } from "@/lib/queries/laporan"
import { semuaAkun } from "@/lib/queries/akuntansi"
import { formatAngka, formatTanggal, hariIni } from "@/lib/format"
import { isTanggal, sp } from "@/lib/list"
import { wajibIzin } from "@/lib/operator"

const BULAN = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"]

export default async function BankBookPage(props: PageProps<"/dashboard/accounting/bank-book">) {
    await wajibIzin("/dashboard/accounting/bank-book") // layout tidak dijalankan ulang pada navigasi antarhalaman
    const s = await props.searchParams
    const hari = hariIni()
    const tahun = /^\d{4}$/.test(sp(s, "tahun")) ? Number(sp(s, "tahun")) : Number(hari.slice(0, 4))
    const bulan = /^(?:[1-9]|1[0-2])$/.test(sp(s, "bulan")) ? Number(sp(s, "bulan")) : Number(hari.slice(5, 7))
    const dari = `${tahun}-${String(bulan).padStart(2, "0")}-01`
    const sampai = `${tahun}-${String(bulan).padStart(2, "0")}-${String(new Date(tahun, bulan, 0).getDate()).padStart(2, "0")}`
    const daftar = await akunBankBook(sampai)
    const kode = daftar.some((a) => a.kode_perkiraan === sp(s, "akun")) ? sp(s, "akun") : daftar[0]?.kode_perkiraan ?? ""
    const akun = daftar.find((a) => a.kode_perkiraan === kode)
    if (!akun) return <FormCard title="Bank Book" description="Belum ada akun kas/bank (keterangan GC atau BANK) di Chart of Accounts.">{null}</FormCard>

    const { awal, rows } = await harianBankBook(kode, dari, sampai)
    const tglDipilih = sp(s, "tgl")
    const tgl = isTanggal(tglDipilih) && tglDipilih >= dari && tglDipilih <= sampai ? tglDipilih
        : (rows.find((r) => r.tanggal === hari && r.bukti > 0) ?? [...rows].reverse().find((r) => r.bukti > 0) ?? rows[0])?.tanggal ?? dari
    const transaksi = await transaksiBankBook(kode, tgl)
    const masuk = rows.reduce((t, r) => t + Number(r.debit), 0), keluar = rows.reduce((t, r) => t + Number(r.kredit), 0)
    const formProps = { akunBank: { id: akun.id, kode_perkiraan: akun.kode_perkiraan, nama_perkiraan: akun.nama_perkiraan }, semuaAkun: await semuaAkun(), hariIni: hari }
    const ke = (o: { akun?: string; tgl?: string }) => `?akun=${o.akun ?? kode}&bulan=${bulan}&tahun=${tahun}${o.tgl ? `&tgl=${o.tgl}` : ""}`
    const tahunPilihan = Array.from({ length: 8 }, (_, i) => Number(hari.slice(0, 4)) + 1 - i)
    if (!tahunPilihan.includes(tahun)) tahunPilihan.push(tahun)

    return (
        <div className="space-y-3">
            <h1 className="text-lg font-bold">Bank Book</h1>
            <div className="grid gap-4 lg:grid-cols-[17rem_minmax(0,1fr)]">
                <nav aria-label="Akun kas dan bank" className="self-start rounded-md border print:hidden">
                    <div className="border-b bg-muted px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Kas / Bank</div>
                    <ul>
                        {daftar.map((a) => (
                            <li key={a.id}>
                                <Link href={ke({ akun: a.kode_perkiraan })} aria-current={a.kode_perkiraan === kode ? "page" : undefined}
                                    className={`block border-b px-3 py-2 text-sm hover:bg-muted/60 ${a.kode_perkiraan === kode ? "bg-blue-50 font-semibold text-blue-700 dark:bg-blue-500/10 dark:text-blue-300" : ""}`}>
                                    <span className="block font-mono text-xs text-muted-foreground">{a.kode_perkiraan}</span>
                                    <span className="flex justify-between gap-2"><span>{a.nama_perkiraan}</span><span className="tabular-nums text-xs">{formatAngka(a.saldo)}</span></span>
                                </Link>
                            </li>
                        ))}
                    </ul>
                </nav>

                <div className="min-w-0 space-y-4">
                    <div className="flex flex-wrap items-end justify-between gap-3">
                        <form method="get" className="flex flex-wrap items-end gap-3 print:hidden">
                            <input type="hidden" name="akun" value={kode} />
                            <label className="text-xs text-muted-foreground space-y-1">
                                <span className="block font-semibold">Bulan</span>
                                <select name="bulan" defaultValue={bulan} className={`${selectClass} w-36`}>{BULAN.map((b, i) => <option key={b} value={i + 1}>{b}</option>)}</select>
                            </label>
                            <label className="text-xs text-muted-foreground space-y-1">
                                <span className="block font-semibold">Tahun</span>
                                <select name="tahun" defaultValue={tahun} className={`${selectClass} w-28`}>{tahunPilihan.sort((a, b) => b - a).map((t) => <option key={t} value={t}>{t}</option>)}</select>
                            </label>
                            <button type="submit" className="h-9 px-4 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold">Tampilkan</button>
                            <TombolCetak />
                        </form>
                        <TombolBankBookBaru {...formProps} />
                    </div>

                    <h2 className="text-base font-bold">Bank Book: {akun.kode_perkiraan} {akun.nama_perkiraan} <span className="font-normal text-muted-foreground">· {BULAN[bulan - 1]} {tahun}</span></h2>

                    <dl className="grid gap-3 sm:grid-cols-4 text-sm">
                        {([["Saldo awal", awal], ["Debit", masuk], ["Kredit", keluar], ["Saldo akhir", awal + masuk - keluar]] as const).map(([l, v]) => (
                            <div key={l} className="rounded-md border p-3"><dt className="text-xs text-muted-foreground">{l}</dt><dd className="text-lg font-bold tabular-nums">{formatAngka(v)}</dd></div>
                        ))}
                    </dl>

                    <div className="overflow-x-auto rounded-md border">
                        <table className="w-full text-sm">
                            <thead className="bg-muted text-muted-foreground text-xs">
                                <tr><th className="px-2 py-2 text-left">Tanggal</th><th className="px-2 py-2 text-right">Saldo Awal</th><th className="px-2 py-2 text-right">Debit</th><th className="px-2 py-2 text-right">Kredit</th><th className="px-2 py-2 text-right">Saldo Akhir</th></tr>
                            </thead>
                            <tbody>
                                {rows.map((r) => (
                                    <tr key={r.tanggal} className={`border-t ${r.tanggal === tgl ? "bg-blue-50 dark:bg-blue-500/10" : ""}`}>
                                        <td className="px-2 py-0.5 whitespace-nowrap"><Link href={ke({ tgl: r.tanggal })} className="hover:underline">{formatTanggal(r.tanggal)}</Link>{r.bukti > 0 && <span className="ml-1 text-[10px] text-muted-foreground">{r.bukti} bukti</span>}</td>
                                        <td className="px-2 py-0.5 text-right tabular-nums">{formatAngka(r.awal)}</td>
                                        <td className="px-2 py-0.5 text-right tabular-nums">{formatAngka(r.debit)}</td>
                                        <td className="px-2 py-0.5 text-right tabular-nums">{formatAngka(r.kredit)}</td>
                                        <td className="px-2 py-0.5 text-right tabular-nums">{formatAngka(r.akhir)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="overflow-x-auto rounded-md border">
                        <div className="border-b bg-muted px-3 py-2 text-xs font-semibold text-muted-foreground">Bukti tanggal {formatTanggal(tgl, "long")}</div>
                        <table className="w-full text-sm">
                            <thead className="text-muted-foreground text-xs">
                                <tr><th className="px-2 py-2 text-left">No. Bukti</th><th className="px-2 py-2 text-left">Keterangan / lawan</th><th className="px-2 py-2 text-right">Debit</th><th className="px-2 py-2 text-right">Kredit</th><th className="w-20"></th></tr>
                            </thead>
                            <tbody>
                                {transaksi.length === 0 && <tr><td colSpan={5} className="px-2 py-6 text-center text-muted-foreground">Tidak ada transaksi pada tanggal ini</td></tr>}
                                {transaksi.map((t) => (
                                    <tr key={t.nomor_bukti} className="border-t align-top">
                                        <td className="px-2 py-1.5 font-mono text-xs whitespace-nowrap">{t.nomor_bukti}</td>
                                        <td className="px-2 py-1.5"><div>{t.deskripsi}</div><div className="text-xs text-muted-foreground">{t.lawan}</div></td>
                                        <td className="px-2 py-1.5 text-right tabular-nums">{Number(t.debit) ? formatAngka(t.debit) : ""}</td>
                                        <td className="px-2 py-1.5 text-right tabular-nums">{Number(t.kredit) ? formatAngka(t.kredit) : ""}</td>
                                        <td className="px-1 py-1 whitespace-nowrap print:hidden">
                                            {t.rekonsiliasi ? <span className="text-[10px] text-muted-foreground">Rekon</span>
                                                : t.bankbook ? <><TombolBankBookUbah nomorBukti={t.nomor_bukti} {...formProps} /><TombolBankBookHapus nomorBukti={t.nomor_bukti} /></>
                                                : <span className="text-[10px] text-muted-foreground" title="Dibuat transaksi lain; ubah dari asalnya">Sistem</span>}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    )
}
