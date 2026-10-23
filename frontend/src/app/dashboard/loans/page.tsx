import { LoansDashboard } from "@/components/ui/LoansDashboard"
import { jenisKredit, KOLOM_CARI, laporanPinjaman } from "@/lib/queries/pinjaman"
import { sp } from "@/lib/list"
import { wajibIzin } from "@/lib/operator"

export default async function LoansPage(props: PageProps<"/dashboard/loans">) {
    await wajibIzin("/dashboard/loans") // layout tidak dijalankan ulang pada navigasi antarhalaman
    const s = await props.searchParams
    const [data, jenis] = await Promise.all([laporanPinjaman(s), jenisKredit()])
    // Nilai bawaan sama dengan yang dipakai laporanPinjaman: grup KOPERASI, bulan dan tahun berjalan.
    const now = new Date()
    const filter = {
        searchBy: parseInt(sp(s, "searchBy") || "0", 10) || 0,
        keyword: sp(s, "keyword"),
        aktif: sp(s, "aktif") === "T" ? "T" : sp(s, "aktif") === "S" ? "S" : "Y",
        grup: sp(s, "grup") || "KOPERASI",
        kredit: sp(s, "kredit") || "All",
        bulan: sp(s, "bulan") === "" ? now.getMonth() + 1 : parseInt(sp(s, "bulan"), 10) || 0,
        tahun: sp(s, "tahun") || String(now.getFullYear()),
        lunas: parseInt(sp(s, "lunas") || "0", 10) || 0,
    }
    return <LoansDashboard data={data} filter={filter} jenisKredit={jenis} searchByOptions={KOLOM_CARI} />
}
