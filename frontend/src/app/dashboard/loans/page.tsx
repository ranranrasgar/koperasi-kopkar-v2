import { LoansDashboard } from "@/components/ui/LoansDashboard"
import { jenisKredit, laporanPinjaman, tahunPinjaman } from "@/lib/queries/pinjaman"
import { sp } from "@/lib/list"
import { wajibIzin } from "@/lib/operator"

export default async function LoansPage(props: PageProps<"/dashboard/loans">) {
    await wajibIzin("/dashboard/loans") // layout tidak dijalankan ulang pada navigasi antarhalaman
    const s = await props.searchParams
    const [data, jenis, tahun] = await Promise.all([laporanPinjaman(s), jenisKredit(), tahunPinjaman()])
    // Nilai bawaan sama dengan yang dipakai laporanPinjaman: grup KOPERASI, anggota aktif, semua status.
    const filter = {
        keyword: sp(s, "keyword"),
        aktif: sp(s, "aktif") === "T" ? "T" : sp(s, "aktif") === "S" ? "S" : "Y",
        grup: sp(s, "grup") || "KOPERASI",
        kredit: sp(s, "kredit") || "All",
        lunas: parseInt(sp(s, "lunas") || "0", 10) || 0,
        bulan: sp(s, "bulan"),
        tahun: sp(s, "tahun"),
    }
    return <LoansDashboard data={data} filter={filter} jenisKredit={jenis} daftarTahun={tahun.map((t) => t.tahun)} />
}
