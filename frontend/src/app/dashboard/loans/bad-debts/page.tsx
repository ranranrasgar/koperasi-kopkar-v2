import Link from "next/link"
import { ArrowUpDown } from "lucide-react"
import { selectClass } from "@/components/transaksi/common"
import { HalamanLaporan } from "@/components/laporan/HalamanLaporan"
import { FormPeriode, KopLaporan } from "@/components/laporan/Periode"
import { Input } from "@/components/ui/input"
import { PaginasiUrl } from "@/components/ui/PaginasiUrl"
import { daftarTunggakan, jenisMacet, jumlahTanpaJadwal, type Tunggakan } from "@/lib/queries/pinjaman-lap"
import { formatAngka, formatTanggal, hariIni } from "@/lib/format"
import { ukuranHalaman } from "@/lib/halaman"
import { isTanggal, sp } from "@/lib/list"
import { MENU } from "@/config/akses"
import { wajibIzin } from "@/lib/operator"

/** Kolom yang bisa diurutkan (parameter URL sortBy) -> nilai pembanding. "hari" sama dengan "sejak" terbalik. */
const URUT: Record<string, (t: Tunggakan) => string | number> = {
    no_pinjaman: (t) => t.no_pinjaman, nama: (t) => t.nama, jenis: (t) => t.nama_kredit ?? t.grup, tunggak: (t) => t.tunggak,
    sejak: (t) => t.jatuh_tempo_pertama, hari: (t) => -Date.parse(t.jatuh_tempo_pertama), rp_tunggak: (t) => t.rp_tunggak,
}

export default async function KreditMacetPage(props: PageProps<"/dashboard/loans/bad-debts">) {
    const o = await wajibIzin("/dashboard/loans/bad-debts") // layout tidak dijalankan ulang pada navigasi antarhalaman
    const s = await props.searchParams
    const per = isTanggal(sp(s, "sampai")) ? sp(s, "sampai") : hariIni()
    // Grup yang boleh dilihat mengikuti menu laporan tunggakan desktop.
    const grupBoleh = [
        o.izin.includes(MENU.lapTunggakanKoperasi) && "KOPERASI",
        o.izin.includes(MENU.lapTunggakanBank) && "BANK / PIHAK LAIN",
        o.izin.includes(MENU.lapTunggakanKpr) && "KPR",
    ].filter(Boolean) as string[]
    const grup = grupBoleh.includes(sp(s, "grup")) ? sp(s, "grup") : ""
    const aktif = sp(s, "aktif") || "Y"
    const cari = sp(s, "search").trim().toLowerCase()
    const [semua, macet, tanpaJadwal] = await Promise.all([daftarTunggakan(per), jenisMacet(), jumlahTanpaJadwal()])
    const data = semua.filter((t) => grupBoleh.includes(t.grup) && (!grup || t.grup === grup)
        && (aktif === "" || t.aktif === (aktif === "Y"))
        && (!cari || [t.no_pinjaman, t.nama, t.kode_agt, t.nik ?? ""].some((v) => v.toLowerCase().includes(cari))))
    const kelas = (t: number) => macet.filter((m) => t >= m.lama).at(-1)?.nama_macet
    // Hari tunggak (DPD) = selisih tanggal laporan dengan jatuh tempo angsuran tertua yang belum dibayar. Bila tabel jenis macet kosong,
    // kolektibilitas memakai tingkatan umum perbankan (OJK): 1-90 hari Dalam Perhatian Khusus, 91-120 Kurang Lancar, 121-180 Diragukan, lebih dari 180 Macet.
    const hariTunggak = (sejak: string) => Math.max(0, Math.round((new Date(`${per}T00:00:00`).getTime() - new Date(`${sejak.slice(0, 10)}T00:00:00`).getTime()) / 86_400_000))
    const kolektibilitas = (hari: number) => hari > 180 ? "Macet" : hari > 120 ? "Diragukan" : hari > 90 ? "Kurang Lancar" : "Dalam Perhatian Khusus"
    const warnaKol = (k: string) => k === "Macet" ? "text-red-600 dark:text-red-400 font-semibold" : k === "Diragukan" ? "text-orange-600 dark:text-orange-400" : k === "Kurang Lancar" ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground"
    const kolOf = (t: Tunggakan) => macet.length > 0 ? (kelas(t.tunggak) ?? "-") : kolektibilitas(hariTunggak(t.jatuh_tempo_pertama))
    const total = data.reduce((x, t) => x + t.rp_tunggak, 0)

    // Urut dan halaman di sini (data tunggakan sudah dihitung seluruhnya untuk total); tanpa sortBy = urutan query.
    const urutKey = URUT[sp(s, "sortBy")] ? sp(s, "sortBy") : "", turun = sp(s, "sortOrder") === "desc"
    const urut = urutKey ? [...data].sort((a, b) => {
        const x = URUT[urutKey](a), y = URUT[urutKey](b)
        return (typeof x === "number" && typeof y === "number" ? x - y : String(x).localeCompare(String(y), "id")) * (turun ? -1 : 1)
    }) : data
    const pageSize = ukuranHalaman(sp(s, "pageSize"), 50)
    const totalPages = Math.max(1, Math.ceil(urut.length / pageSize))
    const page = Math.min(totalPages, Math.max(1, parseInt(sp(s, "page") || "1", 10) || 1))
    const baris = urut.slice((page - 1) * pageSize, page * pageSize)

    /** Tautan judul kolom: klik pertama naik, klik lagi turun; kembali ke halaman 1. */
    const hrefUrut = (key: string) => {
        const p = new URLSearchParams(Object.entries(s).flatMap(([k, v]) => (typeof v === "string" ? [[k, v]] : [])))
        p.set("sortBy", key); p.set("sortOrder", urutKey === key && !turun ? "desc" : "asc"); p.delete("page")
        return `?${p.toString()}`
    }
    const Judul = ({ k, label, kelas = "text-left" }: { k?: string; label: string; kelas?: string }) => (
        <th className={`px-3 py-2 ${kelas}`} aria-sort={k && urutKey === k ? (turun ? "descending" : "ascending") : undefined}>
            {k ? <Link href={hrefUrut(k)} className="inline-flex items-center gap-1 font-semibold hover:text-foreground">
                {label}<ArrowUpDown className={`h-3 w-3 ${urutKey === k ? "text-foreground" : "opacity-40"}`} /></Link> : label}
        </th>
    )

    return (
        <HalamanLaporan title="Kredit Macet / Tunggakan" description="Angsuran yang terlambat menurut jadwal tagih (bulan jatuh temponya sudah berakhir) dan belum dibayar, per pinjaman."
            berhalaman ekspor={{ nama: `kredit-macet_${per}`, baris: [["No.", "No. Pinjaman", "Kode Anggota", "KPK", "Nama", "Jenis", "Dibayar", "Jatuh Tempo", "Lama", "Tunggak", "Sejak", "Hari", "Nilai Tunggakan", "Kolektibilitas"],
                ...urut.map((t, i) => [String(i + 1), t.no_pinjaman, t.kode_agt, t.nik ?? "", t.nama, t.nama_kredit ?? t.grup, String(t.jml_cicilan), String(t.jatuh_tempo), String(t.lama_angsuran),
                    String(t.tunggak), t.jatuh_tempo_pertama.slice(0, 10), String(hariTunggak(t.jatuh_tempo_pertama)), String(t.rp_tunggak), kolOf(t)]),
                ["", "", "", "", "Total", "", "", "", "", "", "", "", String(total), ""]] }}
            filter={
                <FormPeriode sampai={per} satuTanggal tanpaCetak>
                    <Input type="search" name="search" defaultValue={sp(s, "search")} placeholder="No. pinjaman, nama, kode, atau KPK" aria-label="Cari" className="h-9 w-[16rem]" />
                    <select name="grup" defaultValue={grup} aria-label="Grup" className={`${selectClass} h-9 w-48`}>
                        <option value="">Semua grup</option>
                        {grupBoleh.map((g) => <option key={g} value={g}>{g}</option>)}
                    </select>
                    <select name="aktif" defaultValue={aktif} aria-label="Status anggota" className={`${selectClass} h-9 w-36`}>
                        <option value="Y">Anggota aktif</option><option value="T">Non-aktif</option><option value="">Semua anggota</option>
                    </select>
                    <input type="hidden" name="pageSize" value={sp(s, "pageSize") || String(pageSize)} />
                    {urutKey && <><input type="hidden" name="sortBy" value={urutKey} /><input type="hidden" name="sortOrder" value={turun ? "desc" : "asc"} /></>}
                </FormPeriode>}>
            <div>
                <KopLaporan judul="Kredit Macet / Tunggakan" periode={`Per ${formatTanggal(per, "long")}${grup ? ` · Grup ${grup}` : ""}`} />
                <p className="mb-3 text-xs text-muted-foreground print:hidden">
                    Aturan: angsuran dianggap menunggak setelah bulan jatuh temponya berakhir, karena potongan gaji dibukukan sekitar akhir bulan. Hari tunggak dihitung dari
                    jatuh tempo angsuran tertua yang belum dibayar. Pinjaman yang saldo bukunya sudah habis (dilunasi sekaligus atau di-top-up) tidak dihitung.
                    {tanpaJadwal > 0 && ` ${tanpaJadwal} pinjaman belum punya jadwal tagih (data pencairan belum lengkap) sehingga tidak bisa dinilai.`}
                </p>
                {grupBoleh.length === 0 && <p className="mb-3 text-sm text-muted-foreground">Grup Anda tidak punya akses ke laporan tunggakan.</p>}
                <div className="mb-3 text-sm">
                    <b>{formatAngka(data.length)}</b> pinjaman menunggak, total <b className="tabular-nums">Rp {formatAngka(total)}</b> per {formatTanggal(per, "long")}.
                    {macet.length === 0 && <span className="text-muted-foreground"> Kolektibilitas memakai tingkatan umum perbankan (hari tunggak), karena tabel jenis macet kosong.</span>}
                </div>
                <div className="rounded-md border">
                    {/* Paginasi di atas dan di bawah tabel, seperti halaman daftar lain. */}
                    <PaginasiUrl className="border-b" page={page} totalPages={totalPages} pageSize={pageSize} total={urut.length} />
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-muted text-muted-foreground text-xs">
                                <tr>
                                    <th className="w-10 px-3 py-2 text-center">No.</th>
                                    <Judul k="no_pinjaman" label="No. Pinjaman" />
                                    <Judul k="nama" label="Anggota" />
                                    <Judul k="jenis" label="Jenis" />
                                    <Judul label="Dibayar / Jatuh Tempo" kelas="text-center" />
                                    <Judul k="tunggak" label="Tunggak" kelas="text-center" />
                                    <Judul k="sejak" label="Sejak" />
                                    <Judul k="hari" label="Hari" kelas="text-center" />
                                    <Judul k="rp_tunggak" label="Nilai Tunggakan" kelas="text-right" />
                                    <Judul label="Kolektibilitas" />
                                </tr>
                            </thead>
                            <tbody>
                                {baris.length === 0 && <tr><td colSpan={10} className="p-8 text-center text-muted-foreground">Tidak ada tunggakan{cari ? " yang cocok dengan pencarian" : ""}.</td></tr>}
                                {baris.map((t, i) => {
                                    const k = kolOf(t)
                                    return (
                                        <tr key={`${t.jenis}-${t.no_pinjaman}`} className="border-t hover:bg-muted/20">
                                            <td className="px-3 py-2 text-center text-xs text-muted-foreground tabular-nums">{(page - 1) * pageSize + i + 1}</td>
                                            <td className="px-3 py-2 font-mono text-xs">{t.jenis === "tunai"
                                                ? <Link href={`/dashboard/loans/${encodeURIComponent(t.no_pinjaman)}`} className="text-primary hover:underline" title="Lihat jadwal angsuran dan riwayat pembayaran">{t.no_pinjaman}</Link>
                                                : t.no_pinjaman}</td>
                                            <td className="px-3 py-2">
                                                <div className="font-medium">{t.nama}{!t.aktif && <span className="ml-1 text-xs text-muted-foreground">(non-aktif)</span>}</div>
                                                <div className="text-[11px] text-muted-foreground font-mono">{t.kode_agt} | KPK {t.nik ?? "-"}</div>
                                            </td>
                                            <td className="px-3 py-2">{t.nama_kredit ?? t.grup}</td>
                                            <td className="px-3 py-2 text-center">{t.jml_cicilan} / {t.jatuh_tempo} <span className="text-muted-foreground">dari {t.lama_angsuran}</span></td>
                                            <td className="px-3 py-2 text-center font-bold text-error">{t.tunggak}x</td>
                                            <td className="px-3 py-2 whitespace-nowrap">{formatTanggal(t.jatuh_tempo_pertama)}</td>
                                            <td className="px-3 py-2 text-center tabular-nums">{hariTunggak(t.jatuh_tempo_pertama)}</td>
                                            <td className="px-3 py-2 text-right tabular-nums">{formatAngka(t.rp_tunggak)}</td>
                                            <td className={`px-3 py-2 whitespace-nowrap ${macet.length > 0 ? "" : warnaKol(k)}`}>{k}</td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                            {data.length > 0 && (
                                <tfoot className="border-t-2 font-semibold bg-muted/40">
                                    <tr>
                                        <td colSpan={8} className="px-3 py-2 text-right">Total {formatAngka(data.length)} pinjaman</td>
                                        <td className="px-3 py-2 text-right tabular-nums">{formatAngka(total)}</td>
                                        <td />
                                    </tr>
                                </tfoot>
                            )}
                        </table>
                    </div>
                    <PaginasiUrl className="sticky bottom-0 z-10 border-t border-outline-variant bg-background/95 backdrop-blur" page={page} totalPages={totalPages} pageSize={pageSize} total={urut.length} />
                </div>
                {o.izin.includes(MENU.angsurKoperasi) && (
                    <p className="mt-3 text-xs text-muted-foreground print:hidden">Pembayaran tunggakan dicatat di <Link href="/dashboard/loans/payment" className="text-primary hover:underline">Setoran Angsuran</Link>.</p>
                )}
            </div>
        </HalamanLaporan>
    )
}
