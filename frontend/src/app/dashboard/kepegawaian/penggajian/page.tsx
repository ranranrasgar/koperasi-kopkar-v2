import Link from "next/link"
import { HalamanLaporan } from "@/components/laporan/HalamanLaporan"
import { TabelGaji } from "@/components/gaji/TabelGaji"
import { Input } from "@/components/ui/input"
import { pool } from "@/lib/db"
import { hariIni } from "@/lib/format"
import { sp } from "@/lib/list"
import { wajibIzin } from "@/lib/operator"
import { bacaPengaturanGaji } from "@kopkar/backend/src/gaji/pengaturan.ts"
import { bacaPeriode } from "@kopkar/backend/src/gaji/periode.ts"
import { rekapGaji } from "@kopkar/backend/src/gaji/penggajian.ts"
import { periodeDariTanggal, rentangPeriode } from "@kopkar/backend/src/gaji/hitung.ts"

export const dynamic = "force-dynamic"

/** Penggajian satu periode: rekap seperti sheet Master Karyawan, isian manual, final, slip, ekspor. */
export default async function PenggajianPage(props: PageProps<"/dashboard/kepegawaian/penggajian">) {
    await wajibIzin("/dashboard/kepegawaian/penggajian") // layout tidak dijalankan ulang pada navigasi antarhalaman
    const s = await props.searchParams
    const atur = await bacaPengaturanGaji(pool)
    const periode = /^\d{4}-(0[1-9]|1[0-2])$/.test(sp(s, "periode")) ? sp(s, "periode") : periodeDariTanggal(hariIni(), atur.tanggalAwal)
    const p = await bacaPeriode(pool, periode)
    const rentang = p ?? rentangPeriode(periode, atur.tanggalAwal)
    const rekap = p ? await rekapGaji(pool, p.id) : null
    const jml = (k: keyof NonNullable<typeof rekap>["baris"][number]["gaji"]) => String((rekap?.baris ?? []).reduce((a, b) => a + Number(b.gaji[k]), 0))

    return (
        <HalamanLaporan title="Penggajian" description="Rekap gaji karyawan koperasi per periode, dari Absensi, Lembur, dan isian manual. Finalkan untuk mengunci dan mencetak slip."
            filter={<form method="get" className="flex flex-wrap items-center gap-2 text-sm">
                <Input type="month" name="periode" aria-label="Periode gaji" defaultValue={periode} className="h-9 w-44" />
                <button type="submit" className="h-9 rounded-md border px-4 font-medium hover:bg-muted">Tampilkan</button>
                <span className="text-muted-foreground">{rentang.dari} s/d {rentang.sampai}{p ? (p.status === "final" ? " · final" : " · draf") : ""}</span>
            </form>}
            ekspor={rekap ? {
                nama: `penggajian_${periode}`,
                baris: [["Kode", "Nama", "Jabatan", "Bank", "No. Rekening", "PTKP", "UMK", "T. Jabatan", "Jml. Upah", "Hari Potong", "Pot. UMK", "Pot. T. Jabatan", "Gaji", "HK",
                    "Transport", "Makan", "Jam Lembur", "Jam Berbobot", "Uang Lembur", "Cad. Risiko", "THR", "Tunj. Lain", "Gaji Kotor", "JHT", "JP", "BPJS Kes", "Bruto PPh",
                    "Tarif TER %", "PPh 21", "Pot. Koperasi", "Pot. Lain", "Ket. Pot. Lain", "Total Potongan", "Gaji Bersih"],
                ...rekap.baris.map((b) => [b.kode, b.nama, b.jabatan ?? "", b.bank ?? "", b.noRek ?? "", b.statusPtkp, b.umk, b.tunjJabatan, b.gaji.jmlUpah, b.gaji.hariPotong,
                    b.gaji.potUmk, b.gaji.potTunjJabatan, b.gaji.gaji, b.gaji.hk, b.gaji.transport, b.gaji.makan, b.jamLembur, b.jamBobot, b.gaji.uangLembur, b.gaji.cadResiko,
                    b.gaji.thr, b.gaji.tunjLain, b.gaji.gajiKotor, b.gaji.jht, b.gaji.jp, b.gaji.kes, b.gaji.bruto, b.gaji.tarifTer, b.gaji.pph21, b.gaji.potKoperasi,
                    b.gaji.potLain, b.ketPotLain ?? "", b.gaji.totalPotongan, b.gaji.gajiBersih].map(String)),
                ["", "JUMLAH", "", "", "", "", "", "", "", "", "", "", jml("gaji"), "", "", "", "", "", "", "", "", "",
                    jml("gajiKotor"), "", "", "", "", "", jml("pph21"), "", "", "", "",
                    jml("gajiBersih")],
            ]} : { nama: `penggajian_${periode}`, baris: [] }}>
            {rekap ? <TabelGaji rekap={rekap} />
                : <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
                    Periode gaji {periode} ({rentang.dari} s/d {rentang.sampai}) belum dibuka. Buka dan isi kehadirannya di <Link href={`/dashboard/attendance?periode=${periode}`} className="text-blue-600 hover:underline">Absensi Karyawan</Link>.
                </p>}
        </HalamanLaporan>
    )
}
