import Link from "next/link"
import { FormCard, selectClass } from "@/components/transaksi/common"
import { FormPeriode } from "@/components/laporan/Periode"
import { daftarTunggakan, jenisMacet, jumlahTanpaJadwal } from "@/lib/queries/pinjaman-lap"
import { formatAngka, formatTanggal, hariIni } from "@/lib/format"
import { isTanggal, sp } from "@/lib/list"
import { MENU } from "@/config/akses"
import { wajibIzin } from "@/lib/operator"

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
    const [semua, macet, tanpaJadwal] = await Promise.all([daftarTunggakan(per), jenisMacet(), jumlahTanpaJadwal()])
    const data = semua.filter((t) => grupBoleh.includes(t.grup) && (!grup || t.grup === grup)
        && (aktif === "" || t.aktif === (aktif === "Y")))
    const kelas = (t: number) => macet.filter((m) => t >= m.lama).at(-1)?.nama_macet
    // Hari tunggak (DPD) = selisih tanggal laporan dengan jatuh tempo angsuran tertua yang belum dibayar. Bila tabel jenis macet kosong,
    // kolektibilitas memakai tingkatan umum perbankan (OJK): 1-90 hari Dalam Perhatian Khusus, 91-120 Kurang Lancar, 121-180 Diragukan, lebih dari 180 Macet.
    const hariTunggak = (sejak: string) => Math.max(0, Math.round((new Date(`${per}T00:00:00`).getTime() - new Date(`${sejak.slice(0, 10)}T00:00:00`).getTime()) / 86_400_000))
    const kolektibilitas = (hari: number) => hari > 180 ? "Macet" : hari > 120 ? "Diragukan" : hari > 90 ? "Kurang Lancar" : "Dalam Perhatian Khusus"
    const warnaKol = (k: string) => k === "Macet" ? "text-red-600 dark:text-red-400 font-semibold" : k === "Diragukan" ? "text-orange-600 dark:text-orange-400" : k === "Kurang Lancar" ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground"
    const total = data.reduce((x, t) => x + t.rp_tunggak, 0)

    return (
        <FormCard title="Kredit Macet / Tunggakan" description="Angsuran yang terlambat menurut jadwal tagih (bulan jatuh temponya sudah berakhir) dan belum dibayar, per pinjaman.">
            <FormPeriode sampai={per} satuTanggal>
                <label className="text-xs text-muted-foreground space-y-1">
                    <span className="block font-semibold">Grup</span>
                    <select name="grup" defaultValue={grup} className={`${selectClass} w-48`}>
                        <option value="">Semua</option>
                        {grupBoleh.map((g) => <option key={g} value={g}>{g}</option>)}
                    </select>
                </label>
                <label className="text-xs text-muted-foreground space-y-1">
                    <span className="block font-semibold">Anggota</span>
                    <select name="aktif" defaultValue={aktif} className={`${selectClass} w-36`}>
                        <option value="Y">Aktif</option><option value="T">Non-aktif</option><option value="">Semua</option>
                    </select>
                </label>
            </FormPeriode>
            <p className="mt-3 text-xs text-muted-foreground print:hidden">
                Aturan: angsuran dianggap menunggak setelah bulan jatuh temponya berakhir, karena potongan gaji dibukukan sekitar akhir bulan. Hari tunggak dihitung dari
                jatuh tempo angsuran tertua yang belum dibayar. Pinjaman yang saldo bukunya sudah habis (dilunasi sekaligus atau di-top-up) tidak dihitung.
                {tanpaJadwal > 0 && ` ${tanpaJadwal} pinjaman belum punya jadwal tagih (data pencairan belum lengkap) sehingga tidak bisa dinilai.`}
            </p>
            {grupBoleh.length === 0 && <p className="mt-4 text-sm text-muted-foreground">Grup Anda tidak punya akses ke laporan tunggakan.</p>}
            <div data-area-cetak data-judul-cetak="Kredit Macet / Tunggakan" data-subjudul-cetak={`Per ${formatTanggal(per, "long")}${grup ? ` · Grup ${grup}` : ""}`}>
            <div className="mt-4 text-sm">
                <b>{data.length}</b> pinjaman menunggak, total <b className="tabular-nums">Rp {formatAngka(total)}</b> per {formatTanggal(per, "long")}.
                {macet.length === 0 && <span className="text-muted-foreground"> Kolektibilitas memakai tingkatan umum perbankan (hari tunggak), karena tabel jenis macet kosong.</span>}
            </div>
            <div className="mt-3 overflow-x-auto rounded-md border">
                <table className="w-full text-sm">
                    <thead className="bg-muted text-muted-foreground text-xs">
                        <tr>
                            <th className="px-3 py-2 text-left">No. Pinjaman</th>
                            <th className="px-3 py-2 text-left">Anggota</th>
                            <th className="px-3 py-2 text-left">Jenis</th>
                            <th className="px-3 py-2 text-center">Dibayar / Jatuh Tempo</th>
                            <th className="px-3 py-2 text-center">Tunggak</th>
                            <th className="px-3 py-2 text-left">Sejak</th>
                            <th className="px-3 py-2 text-center">Hari</th>
                            <th className="px-3 py-2 text-right">Nilai Tunggakan</th>
                            <th className="px-3 py-2 text-left">Kolektibilitas</th>
                        </tr>
                    </thead>
                    <tbody>
                        {data.map((t) => (
                            <tr key={`${t.jenis}-${t.no_pinjaman}`} className="border-t">
                                <td className="px-3 py-2 font-mono text-xs">{t.jenis === "tunai"
                                    ? <Link href={`/dashboard/loans/${encodeURIComponent(t.no_pinjaman)}`} className="text-primary hover:underline" title="Lihat jadwal angsuran dan riwayat pembayaran">{t.no_pinjaman}</Link>
                                    : t.no_pinjaman}</td>
                                <td className="px-3 py-2">
                                    <div className="font-medium">{t.nama}{!t.aktif && <span className="ml-1 text-xs text-muted-foreground">(non-aktif)</span>}</div>
                                    <div className="text-[11px] text-muted-foreground font-mono">{t.kode_agt} | {t.nik ?? "-"}</div>
                                </td>
                                <td className="px-3 py-2">{t.nama_kredit ?? t.grup}</td>
                                <td className="px-3 py-2 text-center">{t.jml_cicilan} / {t.jatuh_tempo} <span className="text-muted-foreground">dari {t.lama_angsuran}</span></td>
                                <td className="px-3 py-2 text-center font-bold text-error">{t.tunggak}x</td>
                                <td className="px-3 py-2 whitespace-nowrap">{formatTanggal(t.jatuh_tempo_pertama)}</td>
                                <td className="px-3 py-2 text-center tabular-nums">{hariTunggak(t.jatuh_tempo_pertama)}</td>
                                <td className="px-3 py-2 text-right tabular-nums">{formatAngka(t.rp_tunggak)}</td>
                                {(() => {
                                    const k = macet.length > 0 ? (kelas(t.tunggak) ?? "-") : kolektibilitas(hariTunggak(t.jatuh_tempo_pertama))
                                    return <td className={`px-3 py-2 whitespace-nowrap ${macet.length > 0 ? "" : warnaKol(k)}`}>{k}</td>
                                })()}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            </div>
            {o.izin.includes(MENU.angsurKoperasi) && (
                <p className="mt-3 text-xs text-muted-foreground print:hidden">Pembayaran tunggakan dicatat di <Link href="/dashboard/loans/payment" className="text-primary hover:underline">Setoran Angsuran</Link>.</p>
            )}
        </FormCard>
    )
}
