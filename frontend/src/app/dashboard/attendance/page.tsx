import { HalamanLaporan } from "@/components/laporan/HalamanLaporan"
import { BukaPeriode } from "@/components/gaji/BukaPeriode"
import { GridHadir } from "@/components/gaji/GridHadir"
import { AksiAbsen } from "@/components/transaksi/AksiAbsen"
import { ScanAbsen } from "@/components/transaksi/ScanAbsen"
import { FormCard } from "@/components/transaksi/common"
import { Input } from "@/components/ui/input"
import { pool } from "@/lib/db"
import { hariIni } from "@/lib/format"
import { sp } from "@/lib/list"
import { wajibIzin } from "@/lib/operator"
import { daftarAbsensi } from "@/lib/queries/absensi"
import { bacaPengaturanGaji } from "@kopkar/backend/src/gaji/pengaturan.ts"
import { bacaPeriode, gridHadir } from "@kopkar/backend/src/gaji/periode.ts"
import { KODE_HADIR, rentangPeriode, type KodeHadir } from "@kopkar/backend/src/gaji/hitung.ts"

export const dynamic = "force-dynamic"

/** Periode yang memuat tanggal `hari`: mulai tanggal awal, periode milik bulan berikutnya. */
function periodeHari(hari: string, tanggalAwal: number) {
    const [y, m, d] = hari.split("-").map(Number)
    const naik = tanggalAwal > 1 && d >= tanggalAwal
    const t = new Date(Date.UTC(y, m - 1 + (naik ? 1 : 0), 1))
    return t.toISOString().slice(0, 7)
}

/** Absensi karyawan koperasi: grid kode kehadiran per periode gaji, dan pindai QR (jam masuk/pulang) untuk karyawan yang tertaut anggota. */
export default async function AbsensiPage(props: PageProps<"/dashboard/attendance">) {
    await wajibIzin("/dashboard/attendance") // layout tidak dijalankan ulang pada navigasi antarhalaman
    const s = await props.searchParams
    const atur = await bacaPengaturanGaji(pool)
    const periode = /^\d{4}-(0[1-9]|1[0-2])$/.test(sp(s, "periode")) ? sp(s, "periode") : periodeHari(hariIni(), atur.tanggalAwal)
    const p = await bacaPeriode(pool, periode)
    const rentang = p ?? rentangPeriode(periode, atur.tanggalAwal)
    const [grid, log] = await Promise.all([p ? gridHadir(pool, p.id) : Promise.resolve([]), daftarAbsensi(rentang.dari, rentang.sampai)])
    const tanggal: string[] = []
    for (let t = new Date(`${rentang.dari}T00:00:00Z`); t.toISOString().slice(0, 10) <= rentang.sampai; t.setUTCDate(t.getUTCDate() + 1)) tanggal.push(t.toISOString().slice(0, 10))
    const kode = Object.keys(KODE_HADIR) as KodeHadir[]
    const isian = grid.reduce((n, b) => n + Object.keys(b.hari).length, 0)
    const th = "px-3 py-2 text-left whitespace-nowrap"

    return (
        <HalamanLaporan title="Absensi Karyawan" description="Kehadiran karyawan koperasi per periode gaji. Kode harian menentukan hari kerja dibayar (ATN) dan potongan tidak hadir (ABS, UNP) di penggajian."
            filter={<form method="get" className="flex flex-wrap items-center gap-2 text-sm">
                <Input type="month" name="periode" aria-label="Periode gaji" defaultValue={periode} className="h-9 w-44" />
                <button type="submit" className="h-9 rounded-md border px-4 font-medium hover:bg-muted">Tampilkan</button>
                <span className="text-muted-foreground">{rentang.dari} s/d {rentang.sampai}{p ? (p.status === "final" ? " · final" : " · draf") : ""}</span>
            </form>}
            ekspor={{ nama: `absensi-karyawan_${periode}`, baris: [["Kode", "Nama", ...tanggal, ...kode],
                ...grid.map((b) => [b.kode, b.nama, ...tanggal.map((t) => b.hari[t] ?? ""), ...kode.map((k) => String(b.jumlah[k] ?? 0))])] }}>
            <div className="space-y-6">
                {p ? <GridHadir key={`${p.id}:${isian}`} periodeId={Number(p.id)} tanggal={tanggal} baris={grid} final={p.status === "final"} />
                    : <BukaPeriode periode={periode} dari={rentang.dari} sampai={rentang.sampai} />}
                <FormCard title="Pindai QR (jam masuk dan pulang)" description="Untuk karyawan yang tertaut anggota dan anggota berstatus Staff. Pindai pertama hari itu tercatat masuk, berikutnya pulang. Hari yang punya catatan pindai terisi ATN saat Isi hari kosong.">
                    <div className="space-y-3">
                        <div className="flex flex-wrap items-center gap-3 print:hidden"><ScanAbsen /></div>
                        <div className="overflow-x-auto rounded-md border">
                            <table className="w-full text-sm">
                                <thead className="bg-muted text-xs text-muted-foreground">
                                    <tr><th className={th}>Tanggal</th><th className={th}>Kode Anggota</th><th className={th}>KPK</th><th className={th}>Nama</th><th className={th}>Masuk</th><th className={th}>Pulang</th><th className={`${th} print:hidden`}>Aksi</th></tr>
                                </thead>
                                <tbody>
                                    {log.length === 0 && <tr><td colSpan={7} className="p-6 text-center text-muted-foreground">Belum ada pindai QR pada periode ini.</td></tr>}
                                    {log.map((b) => (
                                        <tr key={b.id} className="border-t">
                                            <td className="px-3 py-1.5 whitespace-nowrap font-mono text-xs">{b.tanggal}</td>
                                            <td className="px-3 py-1.5 whitespace-nowrap font-mono text-xs">{b.kode_agt}</td>
                                            <td className="px-3 py-1.5 whitespace-nowrap">{b.nik ?? "-"}</td>
                                            <td className="px-3 py-1.5 font-medium">{b.nama}</td>
                                            <td className="px-3 py-1.5 whitespace-nowrap tabular-nums">{b.masuk}</td>
                                            <td className="px-3 py-1.5 whitespace-nowrap tabular-nums">{b.pulang ?? "-"}</td>
                                            <td className="px-3 py-1 whitespace-nowrap print:hidden"><AksiAbsen item={b} /></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </FormCard>
            </div>
        </HalamanLaporan>
    )
}
