import Link from "next/link"
import { Search } from "lucide-react"
import { FormCard } from "@/components/transaksi/common"
import { Input } from "@/components/ui/input"
import { TombolCetak } from "@/components/ui/TombolCetak"
import { cariAnggotaSemua, kartuSimpanan } from "@/lib/queries/simpanan-lap"
import { jenisSimpanan } from "@/lib/queries/simpanan"
import { formatAngka, formatTanggal, hariIni } from "@/lib/format"
import { isTanggal, sp } from "@/lib/list"
import { wajibIzin } from "@/lib/operator"

export default async function KartuSimpananPage(props: PageProps<"/dashboard/savings/cards">) {
    await wajibIzin("/dashboard/savings/cards") // layout tidak dijalankan ulang pada navigasi antarhalaman
    const s = await props.searchParams
    const q = sp(s, "q"), kode = sp(s, "kode")
    const dari = isTanggal(sp(s, "dari")) ? sp(s, "dari") : "1900-01-01"
    const sampai = isTanggal(sp(s, "sampai")) ? sp(s, "sampai") : hariIni()
    const [hasilCari, kartu, jenis] = await Promise.all([
        q.length >= 2 && !kode ? cariAnggotaSemua(q) : Promise.resolve([]),
        kode ? kartuSimpanan(kode, dari, sampai) : Promise.resolve(null),
        jenisSimpanan(),
    ])

    return (
        <div className="space-y-6">
            <div className="print:hidden">
                <FormCard title="Kartu Simpanan" description="Mutasi simpanan satu anggota per jenis, dengan saldo berjalan.">
                    <form method="get" className="flex flex-wrap items-end gap-3">
                        {kode && <input type="hidden" name="kode" value={kode} />}
                        {!kode && (
                            <div className="relative w-full sm:w-80">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input name="q" defaultValue={q} placeholder="Kode anggota, KPK, atau nama" className="pl-8" autoFocus />
                            </div>
                        )}
                        <label className="text-xs text-muted-foreground space-y-1">
                            <span className="block font-semibold">Dari</span>
                            <Input type="date" name="dari" defaultValue={dari === "1900-01-01" ? "" : dari} />
                        </label>
                        <label className="text-xs text-muted-foreground space-y-1">
                            <span className="block font-semibold">Sampai</span>
                            <Input type="date" name="sampai" defaultValue={sampai} />
                        </label>
                        <button type="submit" className="h-9 px-4 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold">
                            {kode ? "Tampilkan" : "Cari"}
                        </button>
                        {kode && <Link href="?" className="h-9 px-3 inline-flex items-center text-sm text-primary hover:underline">Ganti anggota</Link>}
                        {kartu && <TombolCetak />}
                    </form>
                    {!kode && q.length >= 2 && (
                        <ul className="mt-4 divide-y rounded-md border">
                            {hasilCari.length === 0 && <li className="p-3 text-sm text-muted-foreground">Anggota tidak ditemukan.</li>}
                            {hasilCari.map((a) => (
                                <li key={a.kode_agt}>
                                    <Link href={`?kode=${encodeURIComponent(a.kode_agt)}`} className="flex justify-between p-3 hover:bg-muted/40 text-sm">
                                        <span className="font-medium">{a.nama}{!a.aktif && <span className="ml-2 text-xs text-muted-foreground">(non-aktif)</span>}</span>
                                        <span className="font-mono text-xs text-muted-foreground">{a.kode_agt} | {a.nik ?? "-"}</span>
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    )}
                </FormCard>
            </div>

            {kode && !kartu && <p className="text-sm text-muted-foreground">Anggota {kode} tidak ditemukan.</p>}
            {kartu && (
                <div className="space-y-4">
                    <div>
                        <h2 className="text-xl font-bold">{kartu.anggota.nama}</h2>
                        <p className="text-sm text-muted-foreground">
                            {kartu.anggota.kode_agt} | KPK {kartu.anggota.nik ?? "-"} | {kartu.anggota.status_staff ?? "-"} |
                            terdaftar {formatTanggal(kartu.anggota.tglpencatatan)} | periode {dari === "1900-01-01" ? "awal" : formatTanggal(dari)} s/d {formatTanggal(sampai)}
                        </p>
                    </div>
                    {jenis.map((j) => {
                        const baris = kartu.mutasi.filter((m) => m.jenis_simpanan === j.kode_simpanan)
                        const awal = kartu.saldoAwal[j.kode_simpanan] ?? 0
                        if (baris.length === 0 && awal === 0) return null
                        const akhir = baris.length ? baris[baris.length - 1].saldo : awal
                        return (
                            <div key={j.kode_simpanan} className="rounded-lg border bg-background break-inside-avoid">
                                <div className="flex justify-between px-4 py-2 border-b bg-muted/40">
                                    <span className="font-semibold">{j.nama_simpanan}</span>
                                    <span className="text-sm">Saldo akhir <b className="tabular-nums">{formatAngka(akhir)}</b></span>
                                </div>
                                <table className="w-full text-sm">
                                    <thead className="text-xs text-muted-foreground">
                                        <tr className="border-b">
                                            <th className="px-3 py-1.5 text-left">Tanggal</th>
                                            <th className="px-3 py-1.5 text-left">No. Bukti</th>
                                            <th className="px-3 py-1.5 text-left">Keterangan</th>
                                            <th className="px-3 py-1.5 text-right">Setor</th>
                                            <th className="px-3 py-1.5 text-right">Ambil</th>
                                            <th className="px-3 py-1.5 text-right">Saldo</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {dari !== "1900-01-01" && (
                                            <tr className="border-b bg-muted/20">
                                                <td colSpan={5} className="px-3 py-1.5 italic text-muted-foreground">Saldo awal</td>
                                                <td className="px-3 py-1.5 text-right tabular-nums">{formatAngka(awal)}</td>
                                            </tr>
                                        )}
                                        {baris.map((m) => (
                                            <tr key={m.no_bukti} className="border-b last:border-0">
                                                <td className="px-3 py-1.5 whitespace-nowrap">{formatTanggal(m.tgl_transaksi)}</td>
                                                <td className="px-3 py-1.5 font-mono text-xs">{m.no_bukti}</td>
                                                <td className="px-3 py-1.5">{m.deskripsi}</td>
                                                <td className="px-3 py-1.5 text-right tabular-nums">{m.rp_setoran ? formatAngka(m.rp_setoran) : ""}</td>
                                                <td className="px-3 py-1.5 text-right tabular-nums">{m.rp_pengambilan ? formatAngka(m.rp_pengambilan) : ""}</td>
                                                <td className="px-3 py-1.5 text-right tabular-nums font-semibold">{formatAngka(m.saldo)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )
                    })}
                    {kartu.mutasi.length === 0 && <p className="text-sm text-muted-foreground">Tidak ada mutasi pada periode ini.</p>}
                </div>
            )}
        </div>
    )
}
