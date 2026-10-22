import Link from "next/link"
import { Users, Wallet, Receipt, Home, ChevronRight, Calendar } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { query } from "@/lib/db"
import { formatRupiah, formatAngka, formatTanggal } from "@/lib/format"
import { wajibLogin } from "@/lib/operator"
import { bolehHalaman, MENU } from "@/config/akses"
import { sp } from "@/lib/list"

const NAMA_BULAN = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"]

export default async function DashboardPage(props: PageProps<"/dashboard">) {
    const o = await wajibLogin() // layout tidak dijalankan ulang pada navigasi antarhalaman
    const ditolak = sp(await props.searchParams, "akses") === "ditolak"
    // Halaman awal untuk semua operator; ringkasan angka hanya untuk grup dengan menu desktop "Dashboard".
    const lihat = o.izin.includes(MENU.dashboard)
    const [[stat], bulanan, terakhir] = !lihat ? [[{ anggota: 0, saldo: 0, pinjaman: 0, kpr: 0 }], [], []] : await Promise.all([
        query<{ anggota: number; saldo: number; pinjaman: number; kpr: number }>(`
            SELECT (SELECT COUNT(*) FROM anggota WHERE aktif) AS anggota,
                   (SELECT COALESCE(SUM(rp_setoran - rp_pengambilan), 0) FROM simpanan) AS saldo,
                   (SELECT COUNT(*) FROM pinjaman_tunai WHERE jml_cicilan < lama_angsuran) AS pinjaman,
                   (SELECT COUNT(*) FROM (SELECT kpr_id FROM kpr_rincian GROUP BY kpr_id
                        HAVING SUM(kredit_pokok - debit_pokok) > 0) t) AS kpr`),
        query<{ bln: string; setor: number; ambil: number }>(`
            SELECT to_char(tgl_transaksi, 'YYYY-MM') AS bln, SUM(rp_setoran) AS setor, SUM(rp_pengambilan) AS ambil
              FROM simpanan
             WHERE tgl_transaksi >= date_trunc('month', current_date) - interval '5 months' AND tgl_transaksi <= current_date
             GROUP BY 1 ORDER BY 1`),
        query<{ no_bukti: string; tgl_transaksi: string; nama: string; nama_simpanan: string; rp_setoran: number; rp_pengambilan: number }>(`
            SELECT s.no_bukti, s.tgl_transaksi, a.nama, j.nama_simpanan, s.rp_setoran, s.rp_pengambilan
              FROM simpanan s JOIN anggota a ON a.id = s.anggota_id LEFT JOIN jenis_simpanan j ON j.id = s.jenis_simpanan_id
             WHERE s.tgl_transaksi <= current_date
             ORDER BY s.tgl_transaksi DESC, s.urut DESC LIMIT 6`),
    ])
    const maks = Math.max(1, ...bulanan.map((b) => Math.max(b.setor, b.ambil)))

    const kartu = [
        { judul: "Anggota Aktif", nilai: formatAngka(stat.anggota), ket: "Anggota berstatus aktif", icon: Users, warna: "bg-primary/10 text-primary" },
        { judul: "Saldo Simpanan", nilai: formatRupiah(stat.saldo), ket: "Seluruh jenis simpanan", icon: Wallet, warna: "bg-green-500/10 text-green-600" },
        { judul: "Pinjaman Tunai Berjalan", nilai: formatAngka(stat.pinjaman), ket: "Kontrak belum lunas", icon: Receipt, warna: "bg-amber-500/10 text-amber-600" },
        { judul: "KPR Berjalan", nilai: formatAngka(stat.kpr), ket: "Sisa pokok titipan > 0", icon: Home, warna: "bg-blue-500/10 text-blue-600" },
    ]
    const menuCepat = [
        { href: "/dashboard/savings/deposit", label: "Setoran Simpanan", ket: "Input setoran simpanan anggota" },
        { href: "/dashboard/savings/withdraw", label: "Pengambilan Simpanan", ket: "Penarikan saldo simpanan" },
        { href: "/dashboard/loans/create-cash", label: "Pencairan Pinjaman Tunai", ket: "Input pencairan kredit baru" },
        { href: "/dashboard/loans/payment", label: "Setoran Angsuran", ket: "Angsuran pinjaman tunai dan KPR" },
        { href: "/dashboard/accounting/journal/new", label: "Jurnal Umum", ket: "Input jurnal memorial" },
    ].filter((m) => bolehHalaman(m.href, o.izin))

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-1">
                <h1 className="text-2xl font-extrabold tracking-tight text-foreground">Dashboard Ringkasan</h1>
                <p className="text-sm text-muted-foreground">Panel administrasi Koperasi Kopkar Mattel MJS 2000. Login sebagai {o.namaLengkap} (grup {o.grup ?? "-"}).</p>
            </div>

            {ditolak && (
                <div role="alert" className="rounded-md border border-red-300 bg-red-50 dark:bg-red-500/10 px-4 py-2 text-sm text-red-700 dark:text-red-400">
                    Grup {o.grup ?? "-"} tidak punya akses ke halaman yang dibuka.
                </div>
            )}

            {lihat && (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    {kartu.map((k) => (
                        <Card key={k.judul} className="shadow-sm border">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{k.judul}</CardTitle>
                                <div className={`h-8 w-8 rounded-full flex items-center justify-center ${k.warna}`}>
                                    <k.icon className="h-4 w-4" />
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="text-xl font-black tabular-nums whitespace-nowrap">{k.nilai}</div>
                                <p className="text-xs text-muted-foreground mt-1">{k.ket}</p>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
                {lihat && (
                    <Card className="shadow-sm border lg:col-span-4">
                        <CardHeader>
                            <CardTitle className="text-base font-extrabold text-foreground flex items-center gap-1.5">
                                <Calendar className="h-4 w-4 text-primary" /> Setoran dan Pengambilan Simpanan
                            </CardTitle>
                            <CardDescription>Enam bulan terakhir, semua jenis simpanan.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4 pt-2">
                            {bulanan.map((b) => {
                                const [y, m] = b.bln.split("-").map(Number)
                                return (
                                    <div key={b.bln} className="space-y-1">
                                        <div className="flex items-center justify-between text-xs font-semibold">
                                            <span className="text-foreground">{NAMA_BULAN[m - 1]} {y}</span>
                                            <span className="text-muted-foreground">
                                                <span className="text-green-600 dark:text-green-400">{formatRupiah(b.setor)}</span>
                                                {" / "}
                                                <span className="text-error">{formatRupiah(b.ambil)}</span>
                                            </span>
                                        </div>
                                        <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                                            <div className="bg-green-600 h-full rounded-full" style={{ width: `${(b.setor / maks) * 100}%` }} />
                                        </div>
                                        <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                                            <div className="bg-error h-full rounded-full" style={{ width: `${(b.ambil / maks) * 100}%` }} />
                                        </div>
                                    </div>
                                )
                            })}
                        </CardContent>
                    </Card>
                )}

                <Card className={`shadow-sm border ${lihat ? "lg:col-span-3" : "lg:col-span-4"}`}>
                    <CardHeader>
                        <CardTitle className="text-base font-extrabold text-foreground">Akses Menu Cepat</CardTitle>
                        <CardDescription>Transaksi harian kasir.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {menuCepat.length === 0 && <p className="text-sm text-muted-foreground">Grup ini tidak punya menu transaksi di web.</p>}
                        {menuCepat.map((m) => (
                            <Link key={m.href} href={m.href}
                                className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/40 transition-colors text-xs font-semibold group">
                                <div className="flex flex-col">
                                    <span>{m.label}</span>
                                    <span className="text-[10px] font-normal text-muted-foreground">{m.ket}</span>
                                </div>
                                <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
                            </Link>
                        ))}
                    </CardContent>
                </Card>
            </div>

            {lihat && (
                <Card className="shadow-sm border">
                    <CardHeader>
                        <CardTitle className="text-base font-extrabold text-foreground">Transaksi Simpanan Terakhir</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0 overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b bg-muted/40 text-muted-foreground text-left">
                                    <th className="px-4 py-2.5">Tanggal</th>
                                    <th className="px-4 py-2.5">No. Bukti</th>
                                    <th className="px-4 py-2.5">Anggota</th>
                                    <th className="px-4 py-2.5">Jenis</th>
                                    <th className="px-4 py-2.5 text-right">Setoran</th>
                                    <th className="px-4 py-2.5 text-right">Pengambilan</th>
                                </tr>
                            </thead>
                            <tbody>
                                {terakhir.map((t) => (
                                    <tr key={t.no_bukti} className="border-b last:border-0">
                                        <td className="px-4 py-2.5 whitespace-nowrap">{formatTanggal(t.tgl_transaksi)}</td>
                                        <td className="px-4 py-2.5 font-mono text-xs">{t.no_bukti}</td>
                                        <td className="px-4 py-2.5">{t.nama}</td>
                                        <td className="px-4 py-2.5">{t.nama_simpanan ?? "-"}</td>
                                        <td className="px-4 py-2.5 text-right tabular-nums">{formatRupiah(t.rp_setoran)}</td>
                                        <td className="px-4 py-2.5 text-right tabular-nums">{formatRupiah(t.rp_pengambilan)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </CardContent>
                </Card>
            )}
        </div>
    )
}
