import Link from "next/link"
import { HalamanLaporan } from "@/components/laporan/HalamanLaporan"
import { KelolaLembur } from "@/components/gaji/KelolaLembur"
import { Input } from "@/components/ui/input"
import { pool, query } from "@/lib/db"
import { hariIni } from "@/lib/format"
import { sp } from "@/lib/list"
import { wajibIzin } from "@/lib/operator"
import { bacaPengaturanGaji } from "@kopkar/backend/src/gaji/pengaturan.ts"
import { bacaPeriode, daftarLembur } from "@kopkar/backend/src/gaji/periode.ts"
import { periodeDariTanggal, rentangPeriode } from "@kopkar/backend/src/gaji/hitung.ts"

export const dynamic = "force-dynamic"

/** Lembur harian karyawan koperasi per periode gaji. Periode dibuka di Absensi Karyawan. */
export default async function LemburPage(props: PageProps<"/dashboard/kepegawaian/lembur">) {
    await wajibIzin("/dashboard/kepegawaian/lembur") // layout tidak dijalankan ulang pada navigasi antarhalaman
    const s = await props.searchParams
    const atur = await bacaPengaturanGaji(pool)
    const periode = /^\d{4}-(0[1-9]|1[0-2])$/.test(sp(s, "periode")) ? sp(s, "periode") : periodeDariTanggal(hariIni(), atur.tanggalAwal)
    const p = await bacaPeriode(pool, periode)
    const rentang = p ?? rentangPeriode(periode, atur.tanggalAwal)
    const [baris, karyawan] = await Promise.all([p ? daftarLembur(pool, p.id) : Promise.resolve([]),
        query<{ id: string; kode: string; nama: string }>("SELECT id::text, kode, nama FROM karyawan WHERE aktif ORDER BY kode")])

    return (
        <HalamanLaporan title="Lembur Karyawan" description="Lembur harian karyawan koperasi per periode gaji, dengan jam berbobot seperti tabel Rate Lembur."
            filter={<form method="get" className="flex flex-wrap items-center gap-2 text-sm">
                <Input type="month" name="periode" aria-label="Periode gaji" defaultValue={periode} className="h-9 w-44" />
                <button type="submit" className="h-9 rounded-md border px-4 font-medium hover:bg-muted">Tampilkan</button>
                <span className="text-muted-foreground">{rentang.dari} s/d {rentang.sampai}{p ? (p.status === "final" ? " · final" : " · draf") : ""}</span>
            </form>}
            ekspor={{ nama: `lembur-karyawan_${periode}`, baris: [["Tanggal", "Kode", "Nama", "Mulai", "Selesai", "Jenis hari", "Jam", "Jam berbobot", "Keterangan"],
                ...baris.map((b) => [b.tanggal, b.kode, b.nama, b.mulai, b.selesai, b.jenis_hari, String(b.jam), String(b.jam_bobot), b.keterangan ?? ""])] }}>
            {p ? <KelolaLembur periodeId={Number(p.id)} dari={p.dari} sampai={p.sampai} final={p.status === "final"} karyawan={karyawan} baris={baris} pembagiLembur={atur.pembagiLembur} />
                : <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
                    Periode gaji {periode} ({rentang.dari} s/d {rentang.sampai}) belum dibuka. Buka di <Link href={`/dashboard/attendance?periode=${periode}`} className="text-blue-600 hover:underline">Absensi Karyawan</Link>.
                </p>}
        </HalamanLaporan>
    )
}
