import Link from "next/link"
import { FormCard, selectClass } from "@/components/transaksi/common"
import { TombolBankBookBaru } from "@/components/bankbook/BankBook"
import { HarianBankBook } from "@/components/bankbook/HarianBankBook"
import { TombolCetak } from "@/components/ui/TombolCetak"
import { akunBankBook, harianBankBook } from "@/lib/queries/laporan"
import { semuaAkun } from "@/lib/queries/akuntansi"
import { formatAngka, hariIni } from "@/lib/format"
import { sp } from "@/lib/list"
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
    const masuk = rows.reduce((t, r) => t + Number(r.debit), 0), keluar = rows.reduce((t, r) => t + Number(r.kredit), 0)
    const formProps = { akunBank: { id: akun.id, kode_perkiraan: akun.kode_perkiraan, nama_perkiraan: akun.nama_perkiraan }, semuaAkun: await semuaAkun(), hariIni: hari }
    const ke = (o: { akun?: string }) => `?akun=${o.akun ?? kode}&bulan=${bulan}&tahun=${tahun}`
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

                    <HarianBankBook rows={rows} formProps={formProps} />
                </div>
            </div>
        </div>
    )
}
