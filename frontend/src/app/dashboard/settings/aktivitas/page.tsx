import Link from "next/link"
import { HARI_SIMPAN, MENIT_ONLINE } from "@kopkar/backend/src/aktivitas.ts"
import { BersihkanRiwayat } from "@/components/laporan/BersihkanRiwayat"
import { HalamanLaporan } from "@/components/laporan/HalamanLaporan"
import { SegarkanOtomatis } from "@/components/laporan/SegarkanOtomatis"
import { selectClass } from "@/components/transaksi/common"
import { Input } from "@/components/ui/input"
import { PaginasiUrl } from "@/components/ui/PaginasiUrl"
import { allGroups } from "@/config/menu"
import { formatAngka, hariIni } from "@/lib/format"
import { ukuranHalaman } from "@/lib/halaman"
import { isTanggal, sp } from "@/lib/list"
import { wajibIzin } from "@/lib/operator"
import { BATAS_RIWAYAT, penggunaOnline, riwayatAktivitas, ringkasHariIni } from "@/lib/queries/aktivitas"
import { cn } from "@/lib/utils"

export const dynamic = "force-dynamic"

const MENU_WEB = allGroups.flatMap((g) => g.items).sort((a, b) => b.href.length - a.href.length)
const MENU_PWA: Record<string, string> = {
    "/beranda": "Beranda", "/simpanan": "Simpanan", "/pinjaman": "Pinjaman", "/ajukan": "Ajukan Pinjaman", "/potongan": "Potongan", "/riwayat": "Riwayat",
    "/shu": "SHU", "/notifikasi": "Notifikasi", "/pesan": "Pesan", "/akun": "Akun",
}
const JENIS: Record<string, string> = { admin: "Admin", pwa: "Anggota (PWA)", android: "Anggota (Android)" }
const AKSI: Record<string, string> = { simpan: "Simpan", login: "Login", login_gagal: "Login gagal", logout: "Logout", buka: "Buka halaman" }

function labelHalaman(kanal: string, h: string | null) {
    if (kanal === "android") return "Aplikasi Android"
    if (!h) return "-"
    if (kanal === "pwa") return MENU_PWA[h] ?? h
    return MENU_WEB.find((m) => h === m.href || h.startsWith(`${m.href}/`))?.label ?? h
}
const lalu = (d: number) => d < 60 ? `${d} detik lalu` : `${Math.floor(d / 60)} menit lalu`
const geser = (hari: string, n: number) => new Date(Date.parse(`${hari}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10)

const Kartu = ({ label, nilai, ket }: { label: string; nilai: number; ket?: string }) => (
    <div className="rounded-lg border bg-background p-4 shadow-sm">
        <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="mt-1 text-2xl font-semibold tabular-nums">{formatAngka(nilai)}</p>
        {ket && <p className="text-xs text-muted-foreground">{ket}</p>}
    </div>
)

export default async function AktivitasPenggunaPage(props: PageProps<"/dashboard/settings/aktivitas">) {
    const o = await wajibIzin("/dashboard/settings/aktivitas") // layout tidak dijalankan ulang pada navigasi antarhalaman
    const s = await props.searchParams
    const tab = sp(s, "tab") === "riwayat" ? "riwayat" : "online"
    const hari = hariIni()
    const filter = {
        dari: isTanggal(sp(s, "dari")) ? sp(s, "dari") : geser(hari, -6), sampai: isTanggal(sp(s, "sampai")) ? sp(s, "sampai") : hari,
        kanal: sp(s, "kanal"), aksi: sp(s, "aksi") in AKSI ? sp(s, "aksi") : "", cari: sp(s, "cari").trim().slice(0, 60),
    }
    const [online, ringkas, log] = await Promise.all([penggunaOnline(), ringkasHariIni(), tab === "riwayat" ? riwayatAktivitas(filter) : []])
    const admin = online.filter((x) => x.kanal === "admin")
    const anggota = online.filter((x) => x.kanal !== "admin")

    const pageSize = ukuranHalaman(sp(s, "pageSize"), 25)
    const totalPages = Math.max(1, Math.ceil(log.length / pageSize))
    const page = Math.min(totalPages, Math.max(1, parseInt(sp(s, "page") || "1", 10) || 1))
    const baris = log.slice((page - 1) * pageSize, page * pageSize)
    const th = "px-3 py-2 text-left whitespace-nowrap"
    const tabLink = (k: string, label: string, n?: number) => (
        <Link href={`?tab=${k}`} scroll={false} aria-current={tab === k ? "page" : undefined}
            className={cn("rounded-md px-3 py-1.5 text-sm font-medium", tab === k ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted")}>
            {label}{n !== undefined && <span className="ml-1 text-xs opacity-70">{n}</span>}
        </Link>
    )

    return (
        <HalamanLaporan title="Aktivitas Pengguna" berhalaman
            description={`Siapa yang sedang online dan apa yang dikerjakan. Online berarti aktif dalam ${MENIT_ONLINE} menit terakhir. Riwayat disimpan ${HARI_SIMPAN} hari.`}
            filter={<div className="flex flex-wrap items-center gap-1">{tabLink("online", "Sedang Online", online.length)}{tabLink("riwayat", "Riwayat Aktivitas")}</div>}
            ekspor={tab === "online"
                ? { nama: `pengguna-online_${hari}`, baris: [["Pengguna", "Kode / Grup", "Jenis", "Sedang di", "Perangkat", "Terakhir aktif"],
                    ...online.map((o) => [o.nama, o.kode ?? "", JENIS[o.kanal] ?? o.kanal, labelHalaman(o.kanal, o.halaman), o.perangkat ?? "", lalu(o.detik)])] }
                : { nama: `riwayat-aktivitas_${filter.dari}_${filter.sampai}`, baris: [["Waktu", "Pengguna", "Jenis", "Aksi", "Modul", "Keterangan"],
                    ...log.map((l) => [l.waktu, l.nama, JENIS[l.kanal] ?? l.kanal, AKSI[l.aksi] ?? l.aksi, l.modul ?? "", l.ket ?? ""])] }}>
            <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 print:hidden">
                    <Kartu label="Admin online" nilai={admin.length} />
                    <Kartu label="Anggota online" nilai={anggota.length} ket={`${anggota.filter((o) => o.kanal === "android").length} lewat Android`} />
                    <Kartu label="Aksi simpan hari ini" nilai={ringkas.simpan} />
                    <Kartu label="Login hari ini" nilai={ringkas.login} ket={`${ringkas.gagal} gagal`} />
                </div>

                {tab === "online" ? (
                    <>
                        <SegarkanOtomatis detik={30} />
                        <div className="overflow-x-auto rounded-md border">
                            <table className="w-full text-sm">
                                <thead className="bg-muted text-xs text-muted-foreground">
                                    <tr><th className={th}>Pengguna</th><th className={th}>Kode / Grup</th><th className={th}>Jenis</th><th className={th}>Sedang di</th><th className={th}>Perangkat</th><th className={th}>Terakhir aktif</th></tr>
                                </thead>
                                <tbody>
                                    {online.length === 0 && <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">Tidak ada pengguna yang online.</td></tr>}
                                    {online.map((o) => (
                                        <tr key={`${o.kanal}-${o.pengguna_id}`} className="border-t">
                                            <td className="px-3 py-1.5 font-medium">{o.nama}</td>
                                            <td className="px-3 py-1.5 font-mono text-xs">{o.kode ?? "-"}</td>
                                            <td className="px-3 py-1.5 whitespace-nowrap">{JENIS[o.kanal] ?? o.kanal}</td>
                                            <td className="px-3 py-1.5">{labelHalaman(o.kanal, o.halaman)}</td>
                                            <td className="px-3 py-1.5 whitespace-nowrap">{o.perangkat ?? "-"}</td>
                                            <td className="px-3 py-1.5 whitespace-nowrap text-muted-foreground">{lalu(o.detik)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </>
                ) : (
                    <>
                        <form method="get" className="flex flex-wrap items-center gap-2 text-sm print:hidden">
                            <input type="hidden" name="tab" value="riwayat" />
                            <Input type="date" name="dari" aria-label="Dari" defaultValue={filter.dari} className="h-9 w-40" />
                            <Input type="date" name="sampai" aria-label="Sampai" defaultValue={filter.sampai} className="h-9 w-40" />
                            <select name="kanal" aria-label="Jenis pengguna" defaultValue={filter.kanal} className={`${selectClass} h-9 w-auto`}>
                                <option value="">Semua Pengguna</option><option value="admin">Admin</option><option value="anggota">Anggota</option>
                            </select>
                            <select name="aksi" aria-label="Aksi" defaultValue={filter.aksi} className={`${selectClass} h-9 w-auto`}>
                                <option value="">Semua Aksi (tanpa buka halaman)</option>
                                {Object.entries(AKSI).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                            </select>
                            <Input name="cari" aria-label="Cari" defaultValue={filter.cari} placeholder="Nama, modul, keterangan" className="h-9 w-56" />
                            <button type="submit" className="h-9 rounded-md bg-primary px-4 font-medium text-primary-foreground hover:bg-primary/90">Terapkan</button>
                            {o.superadmin && <BersihkanRiwayat />}
                        </form>
                        {log.length >= BATAS_RIWAYAT && <p className="text-xs text-muted-foreground">Menampilkan {formatAngka(BATAS_RIWAYAT)} aktivitas terbaru; persempit penyaringan untuk melihat yang lain.</p>}
                        <div className="rounded-md border">
                            <PaginasiUrl className="border-b" page={page} totalPages={totalPages} pageSize={pageSize} total={log.length} />
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead className="bg-muted text-xs text-muted-foreground">
                                        <tr><th className={th}>Waktu</th><th className={th}>Pengguna</th><th className={th}>Jenis</th><th className={th}>Aksi</th><th className={th}>Modul</th><th className={th}>Keterangan</th></tr>
                                    </thead>
                                    <tbody>
                                        {baris.length === 0 && <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">Tidak ada aktivitas pada penyaringan ini.</td></tr>}
                                        {baris.map((l) => (
                                            <tr key={l.id} className={cn("border-t", l.aksi === "login_gagal" && "bg-red-500/5")}>
                                                <td className="px-3 py-1.5 whitespace-nowrap font-mono text-xs">{l.waktu}</td>
                                                <td className="px-3 py-1.5 font-medium">{l.nama}</td>
                                                <td className="px-3 py-1.5 whitespace-nowrap">{JENIS[l.kanal] ?? l.kanal}</td>
                                                <td className="px-3 py-1.5 whitespace-nowrap">{AKSI[l.aksi] ?? l.aksi}</td>
                                                <td className="px-3 py-1.5">{l.modul ?? "-"}</td>
                                                <td className="px-3 py-1.5">{l.ket ?? ""}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </HalamanLaporan>
    )
}
