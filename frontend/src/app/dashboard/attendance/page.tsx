import { HalamanLaporan } from "@/components/laporan/HalamanLaporan"
import { AksiAbsen } from "@/components/transaksi/AksiAbsen"
import { ScanAbsen } from "@/components/transaksi/ScanAbsen"
import { Input } from "@/components/ui/input"
import { hariIni } from "@/lib/format"
import { isTanggal, sp } from "@/lib/list"
import { wajibIzin } from "@/lib/operator"
import { daftarAbsensi } from "@/lib/queries/absensi"

export const dynamic = "force-dynamic"

export default async function AbsensiPage(props: PageProps<"/dashboard/attendance">) {
    await wajibIzin("/dashboard/attendance") // layout tidak dijalankan ulang pada navigasi antarhalaman
    const s = await props.searchParams
    const hari = hariIni()
    const dari = isTanggal(sp(s, "dari")) ? sp(s, "dari") : `${hari.slice(0, 8)}01`
    const sampai = isTanggal(sp(s, "sampai")) ? sp(s, "sampai") : hari
    const baris = await daftarAbsensi(dari, sampai)
    const th = "px-3 py-2 text-left whitespace-nowrap"

    return (
        <HalamanLaporan title="Absensi Staff" description="Kehadiran anggota berstatus Staff dari QR saya. Pindai pertama hari itu tercatat masuk, pindai berikutnya tercatat pulang. Setelah itu pindai hanya memberi tahu jam yang sudah tercatat."
            filter={<form method="get" className="flex flex-wrap items-center gap-2 text-sm">
                <Input type="date" name="dari" aria-label="Dari" defaultValue={dari} className="h-9 w-40" />
                <Input type="date" name="sampai" aria-label="Sampai" defaultValue={sampai} className="h-9 w-40" />
                <button type="submit" className="h-9 rounded-md border px-4 font-medium hover:bg-muted">Terapkan</button>
            </form>}
            ekspor={{ nama: `absensi-staff_${dari}_${sampai}`, baris: [["Tanggal", "Kode Anggota", "KPK", "Nama", "Masuk", "Pulang"],
                ...baris.map((b) => [b.tanggal, b.kode_agt, b.nik ?? "", b.nama, b.masuk, b.pulang ?? ""])] }}>
            <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-3 print:hidden"><ScanAbsen /></div>
                <div className="overflow-x-auto rounded-md border">
                    <table className="w-full text-sm">
                        <thead className="bg-muted text-xs text-muted-foreground">
                            <tr><th className={th}>Tanggal</th><th className={th}>Kode Anggota</th><th className={th}>KPK</th><th className={th}>Nama</th><th className={th}>Masuk</th><th className={th}>Pulang</th><th className={`${th} print:hidden`}>Aksi</th></tr>
                        </thead>
                        <tbody>
                            {baris.length === 0 && <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">Belum ada absensi pada rentang tanggal ini.</td></tr>}
                            {baris.map((b) => (
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
        </HalamanLaporan>
    )
}
