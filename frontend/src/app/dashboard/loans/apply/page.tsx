import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { PengajuanList } from "@/components/transaksi/PengajuanList"
import { daftarPengajuan, jenisKreditPengajuan } from "@/lib/queries/keanggotaan"
import { bolehHalaman } from "@/config/akses"
import { wajibIzin } from "@/lib/operator"

// Filter status terakhir yang dipilih operator (disimpan PengajuanList di cookie ini). Tanpa parameter status di alamat
// (mis. kembali lewat menu setelah pencairan), halaman memakai pilihan itu, bukan Menunggu.
const COOKIE_STATUS_PENGAJUAN = "pengajuan_status"
const STATUS_INGAT = ["Y", "C", "N", "semua"]

export default async function PengajuanPage(props: PageProps<"/dashboard/loans/apply">) {
    const o = await wajibIzin("/dashboard/loans/apply") // layout tidak dijalankan ulang pada navigasi antarhalaman
    const sp = await props.searchParams
    if (sp.status === undefined) {
        const ingat = (await cookies()).get(COOKIE_STATUS_PENGAJUAN)?.value
        if (ingat && STATUS_INGAT.includes(ingat)) {
            const q = new URLSearchParams()
            for (const [k, v] of Object.entries(sp)) for (const x of [v].flat()) if (x !== undefined) q.append(k, x)
            q.set("status", ingat === "semua" ? "" : ingat)
            redirect(`/dashboard/loans/apply?${q.toString()}`)
        }
    }
    const [data, jenis] = await Promise.all([daftarPengajuan(sp), jenisKreditPengajuan()])
    return <PengajuanList data={data} jenis={jenis} bolehCair={bolehHalaman("/dashboard/loans/create-cash", o.izin)} />
}
