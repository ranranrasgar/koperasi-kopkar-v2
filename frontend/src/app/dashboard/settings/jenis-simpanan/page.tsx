import { DaftarEdit } from "@/components/master/DaftarEdit"
import { simpanJenisSimpananAction } from "@/app/actions/master"
import { query } from "@/lib/db"
import { semuaAkun } from "@/lib/queries/akuntansi"
import { wajibIzin } from "@/lib/operator"

export default async function JenisSimpananPage() {
    await wajibIzin("/dashboard/settings/jenis-simpanan") // layout tidak dijalankan ulang pada navigasi antarhalaman
    const [baris, akun] = await Promise.all([
        query<Record<string, string | number | boolean | null>>(`SELECT j.id, j.kode_simpanan, j.nama_simpanan, j.persen_laba, j.up_persen,
            j.endapan = 1 AS endapan, j.coa_id, p.kode_perkiraan || ' ' || p.nama_perkiraan AS akun
            FROM jenis_simpanan j LEFT JOIN perkiraan p ON p.id = j.coa_id ORDER BY j.kode_simpanan`),
        semuaAkun(),
    ])
    const opsiAkun = akun.map((a) => ({ value: String(a.id), label: `${a.kode_perkiraan} ${a.nama_perkiraan}` }))
    return (
        <DaftarEdit title="Jenis Simpanan" description="Akun COA dipakai mesin posting saat setoran dan pengambilan."
            kolom={[
                { key: "kode_simpanan", label: "Kode" }, { key: "nama_simpanan", label: "Nama" },
                { key: "persen_laba", label: "Laba", align: "right", format: "persen" },
                { key: "up_persen", label: "Kenaikan", align: "right", format: "persen" },
                { key: "endapan", label: "Endapan", align: "center", format: "ya" }, { key: "akun", label: "Akun COA" },
            ]}
            baris={baris}
            fields={[
                { name: "nama_simpanan", label: "Nama Simpanan", required: true },
                { name: "persen_laba", label: "Persen Laba (%)", type: "number" },
                { name: "up_persen", label: "Kenaikan (%)", type: "number" },
                { name: "coa_id", label: "Akun COA", type: "select", options: opsiAkun, required: true, wide: true },
                { name: "endapan", label: "Endapan", type: "checkbox" },
            ]}
            aksi={simpanJenisSimpananAction} />
    )
}
