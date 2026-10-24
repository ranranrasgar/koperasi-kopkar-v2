"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Loader2 } from "lucide-react"
import { transaksiBankBookAction } from "@/app/actions/transaksi"
import { Paginasi } from "@/components/ui/Paginasi"
import { ModalForm } from "@/components/ui/Modal"
import { TombolBankBookHapus, TombolBankBookUbah } from "@/components/bankbook/BankBook"
import { MAKS_SEMUA } from "@/lib/halaman"
import { formatAngka, formatTanggal } from "@/lib/format"
import type { HarianBankBook } from "@/lib/queries/laporan"
import type { TransaksiBankBook } from "@/lib/queries/laporan"
import type { Akun } from "@/components/transaksi/common"

interface FormProps { akunBank: Akun; semuaAkun: Akun[]; hariIni: string }

/** Isi modal satu tanggal: bukti pada tanggal itu dengan ubah/hapus, dan tautan ke Buku Besar tanggal yang sama. */
function IsiHari({ tgl, formProps, versi }: { tgl: string; formProps: FormProps; versi: string }) {
    const kode = formProps.akunBank.kode_perkiraan
    const [data, setData] = useState<{ items: TransaksiBankBook[] } | { error: string } | null>(null)
    // Muat ulang bila angka hari itu berubah (setelah ubah/hapus, halaman dirender ulang dan `versi` ikut berubah).
    useEffect(() => { void transaksiBankBookAction(kode, tgl).then(setData) }, [kode, tgl, versi])
    if (!data) return <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" />
    if ("error" in data) return <p role="alert" className="text-sm text-red-700">{data.error}</p>
    return (
        <div className="space-y-3">
            <div className="overflow-x-auto rounded-md border">
                <table className="w-full text-sm">
                    <thead className="bg-muted text-muted-foreground text-xs">
                        <tr><th className="px-2 py-2 text-left">No. Bukti</th><th className="px-2 py-2 text-left">Keterangan / lawan</th><th className="px-2 py-2 text-right">Debit</th><th className="px-2 py-2 text-right">Kredit</th><th className="w-20"></th></tr>
                    </thead>
                    <tbody>
                        {data.items.length === 0 && <tr><td colSpan={5} className="px-2 py-6 text-center text-muted-foreground">Tidak ada transaksi pada tanggal ini</td></tr>}
                        {data.items.map((t) => (
                            <tr key={t.nomor_bukti} className="border-t align-top">
                                <td className="px-2 py-1.5 font-mono text-xs whitespace-nowrap">{t.nomor_bukti}</td>
                                <td className="px-2 py-1.5"><div>{t.deskripsi}</div><div className="text-xs text-muted-foreground">{t.lawan}</div></td>
                                <td className="px-2 py-1.5 text-right tabular-nums">{Number(t.debit) ? formatAngka(t.debit) : ""}</td>
                                <td className="px-2 py-1.5 text-right tabular-nums">{Number(t.kredit) ? formatAngka(t.kredit) : ""}</td>
                                <td className="px-1 py-1 whitespace-nowrap">
                                    {t.rekonsiliasi ? <span className="text-[10px] text-muted-foreground">Rekon</span>
                                        : t.bankbook ? <><TombolBankBookUbah nomorBukti={t.nomor_bukti} {...formProps} /><TombolBankBookHapus nomorBukti={t.nomor_bukti} /></>
                                        : <span className="text-[10px] text-muted-foreground" title="Dibuat transaksi lain; ubah dari asalnya">Sistem</span>}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <Link href={`/dashboard/accounting/ledger?akun=${encodeURIComponent(kode)}&dari=${tgl}&sampai=${tgl}`} className="inline-block text-sm text-blue-600 hover:underline">
                Buka di Buku Besar tanggal ini
            </Link>
        </div>
    )
}

/** Ringkasan harian satu bulan dengan halaman dan baris per halaman; klik tanggal membuka bukti hari itu di modal. */
export function HarianBankBook({ rows, formProps }: { rows: HarianBankBook[]; formProps: FormProps }) {
    const [halaman, setHalaman] = useState(1)
    const [ukuran, setUkuran] = useState(31)
    const [tgl, setTgl] = useState<string | null>(null)
    const total = rows.length
    const totalPages = Math.max(1, Math.ceil(total / ukuran))
    const page = Math.min(halaman, totalPages)
    const tampil = rows.slice((page - 1) * ukuran, page * ukuran)
    const hari = rows.find((r) => r.tanggal === tgl)

    return (
        <div className="rounded-md border">
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead className="bg-muted text-muted-foreground text-xs">
                        <tr><th className="px-2 py-2 text-left">Tanggal</th><th className="px-2 py-2 text-right">Saldo Awal</th><th className="px-2 py-2 text-right">Debit</th><th className="px-2 py-2 text-right">Kredit</th><th className="px-2 py-2 text-right">Saldo Akhir</th></tr>
                    </thead>
                    <tbody>
                        {tampil.map((r) => (
                            <tr key={r.tanggal} className="border-t hover:bg-muted/40">
                                <td className="px-2 py-0.5 whitespace-nowrap">
                                    <button type="button" onClick={() => setTgl(r.tanggal)} className="text-blue-600 hover:underline">{formatTanggal(r.tanggal)}</button>
                                    {r.bukti > 0 && <span className="ml-1 text-[10px] text-muted-foreground">{r.bukti} bukti</span>}
                                </td>
                                <td className="px-2 py-0.5 text-right tabular-nums">{formatAngka(r.awal)}</td>
                                <td className="px-2 py-0.5 text-right tabular-nums">{formatAngka(r.debit)}</td>
                                <td className="px-2 py-0.5 text-right tabular-nums">{formatAngka(r.kredit)}</td>
                                <td className="px-2 py-0.5 text-right tabular-nums">{formatAngka(r.akhir)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <Paginasi className="border-t" page={page} totalPages={totalPages} pageSize={ukuran} total={total}
                onHalaman={setHalaman} onBaris={(v) => { setUkuran(v === "semua" ? MAKS_SEMUA : Number(v)); setHalaman(1) }} />
            <ModalForm open={tgl !== null} onOpenChange={(b) => !b && setTgl(null)} judul={`Bukti ${tgl ? formatTanggal(tgl, "long") : ""}`}
                keterangan={`${formProps.akunBank.kode_perkiraan} ${formProps.akunBank.nama_perkiraan}`} lebar="sm:max-w-4xl" kunci={false}>
                {tgl && <IsiHari tgl={tgl} formProps={formProps} versi={hari ? `${hari.debit}|${hari.kredit}|${hari.bukti}` : ""} />}
            </ModalForm>
        </div>
    )
}
