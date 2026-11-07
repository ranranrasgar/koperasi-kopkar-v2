import Link from "next/link"
import type { LucideIcon } from "lucide-react"
import { ArrowDownLeft, ArrowUpRight, Banknote, CalendarClock, CheckCircle2, ChevronRight, ClipboardCheck, Fingerprint, HandCoins, Landmark, MessageSquareText, NotebookPen, PiggyBank, ReceiptText, TriangleAlert, UserPlus, Users, WalletCards } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Donat, GarisMini, GrafikArus, rupiahRingkas } from "@/components/dashboard/Grafik"
import { hitungBelumDibaca } from "@kopkar/backend/src/anggota/pesan.ts"
import { pool } from "@/lib/db"
import { formatAngka, formatRupiah, formatTanggal, hariIni } from "@/lib/format"
import { wajibLogin } from "@/lib/operator"
import { bolehHalaman, grupPinjamanBoleh, MENU } from "@/config/akses"
import { sp } from "@/lib/list"
import { aktivitasTerakhir, arusBulanan, jatuhTempoDekat, jumlahDaftarMenunggu, jumlahPengajuanMenunggu, jumlahStaffBelumAbsen, ringkasAnggota, ringkasPinjaman, saldoKas, saldoSimpanan } from "@/lib/queries/dashboard"
import { cn } from "@/lib/utils"

const LABEL_GRUP: Record<string, string> = { "KOPERASI": "Koperasi", "BANK / PIHAK LAIN": "Bank", "KPR": "KPR" }
const MENU_CEPAT: { href: string; label: string; icon: LucideIcon }[] = [
    { href: "/dashboard/savings/deposit", label: "Setoran", icon: PiggyBank },
    { href: "/dashboard/savings/withdraw", label: "Pengambilan", icon: WalletCards },
    { href: "/dashboard/loans/payment", label: "Angsuran", icon: ReceiptText },
    { href: "/dashboard/loans/create-cash", label: "Pencairan", icon: HandCoins },
    { href: "/dashboard/accounting/journal/new", label: "Jurnal", icon: NotebookPen },
]

function KartuAngka({ judul, nilai, ket, icon: Icon, tren, href, title }: { judul: string; nilai: string; ket: React.ReactNode; icon: LucideIcon; tren?: number[]; href?: string; title?: string }) {
    const isi = (
        <Card className="h-full overflow-hidden border shadow-sm transition-colors group-hover:border-primary/40">
            <CardContent className="flex h-full flex-col gap-1 p-4">
                <div className="flex items-center justify-between gap-2 text-xs font-semibold text-muted-foreground">
                    {judul}<span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary"><Icon className="h-4 w-4" /></span>
                </div>
                <p title={title} className="text-2xl font-extrabold tracking-tight tabular-nums">{nilai}</p>
                <p className="text-xs text-muted-foreground">{ket}</p>
                {tren && <GarisMini nilai={tren} className="mt-auto pt-2" />}
            </CardContent>
        </Card>
    )
    return href ? <Link href={href} className="group block">{isi}</Link> : isi
}

export default async function DashboardPage(props: PageProps<"/dashboard">) {
    const o = await wajibLogin() // layout tidak dijalankan ulang pada navigasi antarhalaman
    const ditolak = sp(await props.searchParams, "akses") === "ditolak"
    // Tiap bagian mengikuti izin menu asalnya. Izin menu "Dashboard" menambah ringkasan keuangan; tanpa izin itu operator tetap melihat pekerjaannya.
    const ringkasan = o.izin.includes(MENU.dashboard)
    const boleh = (href: string) => bolehHalaman(href, o.izin)
    const grup = grupPinjamanBoleh(o.izin)
    const bolehSimpanan = boleh("/dashboard/savings")
    const [anggota, saldo, arus, kas, pinjaman, tempo, aktivitas, pengajuan, daftar, belumAbsen, pesan] = await Promise.all([
        ringkasan && boleh("/dashboard/members") ? ringkasAnggota() : null,
        ringkasan && bolehSimpanan ? saldoSimpanan() : null,
        ringkasan && bolehSimpanan ? arusBulanan() : [],
        ringkasan && boleh("/dashboard/accounting/bank-book") ? saldoKas() : null,
        Promise.all(grup.map(ringkasPinjaman)),
        grup.length ? jatuhTempoDekat(grup) : [],
        bolehSimpanan || grup.length ? aktivitasTerakhir(grup, bolehSimpanan) : [],
        boleh("/dashboard/loans/apply") ? jumlahPengajuanMenunggu() : 0,
        boleh("/dashboard/members/mobile-users") ? jumlahDaftarMenunggu() : 0,
        boleh("/dashboard/attendance") ? jumlahStaffBelumAbsen() : 0,
        o.izin.includes(MENU.pesanAnggota) ? hitungBelumDibaca(pool, "admin") : 0,
    ])

    const netBulanIni = arus.length ? arus[arus.length - 1].setor - arus[arus.length - 1].ambil : 0
    // Saldo akhir tiap bulan dihitung mundur dari saldo sekarang.
    const trenSaldo = arus.reduceRight<number[]>((hasil, b) => [hasil[0] - (b.setor - b.ambil), ...hasil], [saldo ?? 0]).slice(1)
    const sisaTotal = pinjaman.reduce((n, p) => n + p.sisa, 0), kontrakTotal = pinjaman.reduce((n, p) => n + p.kontrak, 0)
    const tunggak = pinjaman.reduce((n, p) => n + p.tunggak, 0)
    const tugas = [
        { n: pengajuan, label: "pengajuan pinjaman menunggu", href: "/dashboard/loans/apply?status=P", icon: ClipboardCheck, warna: "text-amber-600 bg-amber-500/10" },
        { n: daftar, label: "pendaftaran anggota baru", href: "/dashboard/members/mobile-users?status=menunggu", icon: UserPlus, warna: "text-primary bg-primary/10" },
        { n: pesan, label: "pesan anggota belum dibaca", href: "/dashboard/pesan", icon: MessageSquareText, warna: "text-sky-600 bg-sky-500/10" },
        { n: boleh("/dashboard/loans/bad-debts") ? tunggak : 0, label: "kontrak menunggak", href: "/dashboard/loans/bad-debts", icon: TriangleAlert, warna: "text-rose-600 bg-rose-500/10" },
        { n: belumAbsen, label: "staff belum absen hari ini", href: "/dashboard/attendance", icon: Fingerprint, warna: "text-violet-600 bg-violet-500/10" },
    ].filter((t) => t.n > 0)
    const menuCepat = MENU_CEPAT.filter((m) => boleh(m.href))
    const kartuPinjaman = ringkasan && pinjaman.length > 0
    const kartuTugas = (
        <Card className="border shadow-sm">
            <CardHeader className="pb-3">
                <CardTitle className="text-base font-bold">Perlu Tindakan</CardTitle>
                <CardDescription>Pekerjaan yang menunggu Anda.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
                {tugas.length === 0 && <p className="flex items-center gap-2 py-6 text-sm text-muted-foreground"><CheckCircle2 className="h-4 w-4 text-emerald-600" /> Tidak ada yang menunggu.</p>}
                {tugas.map((t) => (
                    <Link key={t.href} href={t.href} className="group flex items-center gap-3 rounded-lg border p-2.5 text-sm transition-colors hover:border-primary/40">
                        <span className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-lg", t.warna)}><t.icon className="h-4 w-4" /></span>
                        <span className="min-w-0 flex-1"><b className="tabular-nums">{formatAngka(t.n)}</b> {t.label}</span>
                        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                    </Link>
                ))}
            </CardContent>
        </Card>
    )

    return (
        <div className="space-y-5">
            <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-extrabold tracking-tight text-foreground">Dashboard</h1>
                    <p className="text-sm text-muted-foreground">{formatTanggal(hariIni(), "long")} · {o.namaLengkap} ({o.grup ?? "-"})</p>
                </div>
                {menuCepat.length > 0 && (
                    <nav aria-label="Menu cepat" className="flex flex-wrap gap-2">
                        {menuCepat.map((m) => (
                            <Link key={m.href} href={m.href} className="inline-flex h-9 items-center gap-1.5 rounded-full border bg-background px-3.5 text-xs font-semibold transition-colors hover:border-primary/40 hover:text-primary">
                                <m.icon className="h-4 w-4" /> {m.label}
                            </Link>
                        ))}
                    </nav>
                )}
            </div>

            {ditolak && (
                <div role="alert" className="rounded-md border border-red-300 bg-red-50 dark:bg-red-500/10 px-4 py-2 text-sm text-red-700 dark:text-red-400">
                    Grup {o.grup ?? "-"} tidak punya akses ke halaman yang dibuka.
                </div>
            )}

            {(saldo !== null || kartuPinjaman || kas || anggota) && (
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    {saldo !== null && <KartuAngka judul="Saldo Simpanan" nilai={rupiahRingkas(saldo)} title={formatRupiah(saldo)} icon={PiggyBank} tren={trenSaldo} href="/dashboard/savings"
                        ket={<span className={netBulanIni < 0 ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"}>{netBulanIni < 0 ? "" : "+"}{rupiahRingkas(netBulanIni)} bulan ini</span>} />}
                    {kartuPinjaman && <KartuAngka judul="Sisa Pokok Pinjaman" nilai={rupiahRingkas(sisaTotal)} title={formatRupiah(sisaTotal)} icon={Landmark} ket={`${formatAngka(kontrakTotal)} kontrak berjalan`} />}
                    {kas && <KartuAngka judul="Kas & Bank" nilai={rupiahRingkas(kas.saldo)} title={formatRupiah(kas.saldo)} icon={Banknote} ket={`${kas.akun} akun, menurut jurnal`} href="/dashboard/accounting/bank-book" />}
                    {anggota && <KartuAngka judul="Anggota Aktif" nilai={formatAngka(anggota.aktif)} icon={Users} ket={`+${anggota.masuk} masuk, -${anggota.keluar} keluar bulan ini`} href="/dashboard/members" />}
                </div>
            )}

            {arus.length > 0 && (
                <div className="grid gap-5 lg:grid-cols-3">
                    <Card className="border shadow-sm lg:col-span-2">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base font-bold">Arus 12 Bulan</CardTitle>
                            <CardDescription>Setoran dan pengambilan simpanan, serta angsuran pinjaman masuk.</CardDescription>
                        </CardHeader>
                        <CardContent><GrafikArus data={arus} /></CardContent>
                    </Card>
                    {kartuTugas}
                </div>
            )}

            <div className="grid gap-5 lg:grid-cols-3">
                    {arus.length === 0 && kartuTugas}
                    {kartuPinjaman && (
                        <Card className="border shadow-sm">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-base font-bold">Komposisi Pinjaman</CardTitle>
                                <CardDescription>Sisa pokok kontrak berjalan.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Donat tengah={rupiahRingkas(sisaTotal).replace("Rp ", "")} bagian={pinjaman.map((p) => ({
                                    label: LABEL_GRUP[p.grup] ?? p.grup, nilai: p.sisa, ket: `${rupiahRingkas(p.sisa)} · ${formatAngka(p.kontrak)} kontrak` }))} />
                            </CardContent>
                        </Card>
                    )}
                    {grup.length > 0 && <Card className="border shadow-sm">
                        <CardHeader className="pb-3">
                            <CardTitle className="flex items-center gap-1.5 text-base font-bold"><CalendarClock className="h-4 w-4 text-primary" /> Jatuh Tempo Terdekat</CardTitle>
                            <CardDescription>Angsuran koperasi dan bank anggota aktif, perkiraan dari jadwal.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {tempo.length === 0 && <p className="text-sm text-muted-foreground">Tidak ada jadwal.</p>}
                            {tempo.map((t) => (
                                <div key={t.tanggal} className="flex items-baseline justify-between gap-3 text-sm">
                                    <span className="font-medium">{formatTanggal(t.tanggal)} <span className="text-xs font-normal text-muted-foreground">{formatAngka(t.kontrak)} kontrak</span></span>
                                    <span className="tabular-nums" title={formatRupiah(t.jumlah)}>{rupiahRingkas(t.jumlah)}</span>
                                </div>
                            ))}
                        </CardContent>
                    </Card>}
                    {(bolehSimpanan || grup.length > 0) && <Card className="border shadow-sm">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base font-bold">Aktivitas Terakhir</CardTitle>
                            <CardDescription>Transaksi menurut tanggal buku.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {aktivitas.length === 0 && <p className="text-sm text-muted-foreground">Belum ada transaksi.</p>}
                            {aktivitas.slice(0, 6).map((a) => (
                                <div key={`${a.no_bukti}-${a.aksi}-${a.jumlah}`} className="flex items-center gap-2.5 text-sm">
                                    <span className={cn("grid h-7 w-7 shrink-0 place-items-center rounded-full", a.jumlah < 0 ? "bg-rose-500/10 text-rose-600" : "bg-emerald-500/10 text-emerald-600")}>
                                        {a.jumlah < 0 ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownLeft className="h-3.5 w-3.5" />}
                                    </span>
                                    <span className="min-w-0 flex-1">
                                        <span className="block truncate font-medium">{a.nama}</span>
                                        <span className="block truncate text-xs text-muted-foreground">{a.aksi} {a.jenis ?? ""} · {formatTanggal(a.tanggal)}</span>
                                    </span>
                                    <span className="shrink-0 tabular-nums" title={formatRupiah(Math.abs(a.jumlah))}>{rupiahRingkas(Math.abs(a.jumlah))}</span>
                                </div>
                            ))}
                        </CardContent>
                    </Card>}
            </div>
        </div>
    )
}
