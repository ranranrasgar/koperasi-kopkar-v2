import { PinjamanForm, type AwalPinjaman } from "@/components/transaksi/PinjamanForm"
import { query } from "@/lib/db"
import { jenisKredit } from "@/lib/queries/pinjaman"
import { akunKas } from "@/lib/queries/akuntansi"
import { hariIni } from "@/lib/format"
import { wajibIzin } from "@/lib/operator"
import { MENU_CAIR_GRUP } from "@/config/akses"

export default async function Page(props: PageProps<"/dashboard/loans/create-cash">) {
    const o = await wajibIzin("/dashboard/loans/create-cash") // layout tidak dijalankan ulang pada navigasi antarhalaman
    const [jenis, kas] = await Promise.all([jenisKredit(), akunKas()])
    // KPR punya form sendiri (titipan tanpa bunga); grup lain hanya bila grup operator berizin mencairkannya.
    const boleh = jenis.filter((j) => MENU_CAIR_GRUP[j.group_pinjaman] && o.izin.includes(MENU_CAIR_GRUP[j.group_pinjaman]))
    // Dari Pengajuan Kredit: isi awal form dengan pengajuan yang sudah disetujui.
    const idPengajuan = Number((await props.searchParams).pengajuan)
    const [awal] = idPengajuan ? await query<AwalPinjaman>(`SELECT a.kode_agt, a.nik, a.nama, a.aktif, pp.kd_kredit AS kode_kredit,
        pp.rp_pinjaman_pokok::text AS pokok, pp.lama_angsuran AS lama, pp.persen_bunga::text AS persen_bunga
        FROM pengajuan_pinjaman pp JOIN anggota a ON a.id = pp.anggota_id WHERE pp.id = $1 AND pp.status = 'Y'`, [idPengajuan]) : []
    return <PinjamanForm awal={awal} jenis={boleh} akunKas={kas} hariIni={hariIni()}
        bolehUbahBunga={o.superadmin || o.grup?.trim().toLowerCase() === "admin"} />
}
