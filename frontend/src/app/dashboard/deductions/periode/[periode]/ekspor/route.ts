import { NextResponse, type NextRequest } from "next/server"
import { MENU, punyaIzin } from "@/config/akses"
import { identitasKoperasi } from "@/lib/koperasi"
import { operatorSesi } from "@/lib/operator"
import { PERIODE, namaPeriode, rekapPotongan } from "@/lib/queries/potongan-gaji"
import { hariIni } from "@/lib/format"
import { buatXlsx, type Sel } from "@/lib/xlsx"

// File potongan gaji untuk perusahaan/bank, sama dengan export desktop (lembar EXPORT): kop KODE DISKET, KODE PERUSAHAAN,
// TANGGAL, lalu satu baris per anggota yang dipotong. GAJI = jumlah potongan. ACCREK disimpan sebagai teks supaya nomor
// rekening tidak berubah menjadi notasi ilmiah (6,0211E+11) dan digitnya tidak hilang.
export async function GET(request: NextRequest, ctx: { params: Promise<{ periode: string }> }) {
    const o = await operatorSesi()
    if (!o || !punyaIzin(o.izin, [MENU.potonganSemua])) return new NextResponse("Tidak berizin", { status: 403 })
    const { periode } = await ctx.params
    if (!PERIODE.test(periode)) return new NextResponse("Periode tidak sah", { status: 400 })
    const staff = request.nextUrl.searchParams.get("staff") ?? ""
    const [rows, k] = await Promise.all([rekapPotongan(periode, staff), identitasKoperasi()])

    const t = hariIni() // YYYY-MM-DD
    const ket = `${namaPeriode(periode).split(" ")[0]} ${periode.slice(2, 4)}` // Oktober 26
    const kpk = (v: string) => (/^[1-9]\d{0,14}$/.test(v) ? Number(v) : v)
    const baris: Sel[][] = [
        ["KODE DISKET: POTONGAN GAJI"],
        [`KODE PERUSAHAAN : ${k.nama}`],
        [`TANGGAL : ${t.slice(8, 10)}-${t.slice(5, 7)}-${t.slice(2, 4)}`],
        [],
        ["NO.", "KPK", "NAMA", "CARA_BYR", "ACCREK", "NAMAREK", "BANK", "KOTA", "GAJI", "KETERANGAN"],
        ...rows.map((r) => [null, kpk(r.nik), r.nama, "P", r.bank_no_rek, r.bank_atas_nama || r.nama, r.bank_nama, r.kota, Math.round(r.total), ket]),
    ]
    const isi = buatXlsx({ nama: "EXPORT", baris, lebarKolom: [6, 10, 36, 10, 16, 36, 18, 14, 12, 14] })
    return new Response(isi as BodyInit, {
        headers: {
            "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "Content-Disposition": `attachment; filename="potongan-gaji-${periode}${staff ? `-${staff.replace(/\s+/g, "")}` : ""}.xlsx"`,
            "Cache-Control": "no-store",
        },
    })
}
