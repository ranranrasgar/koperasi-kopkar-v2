import { DaftarEdit } from "@/components/master/DaftarEdit"
import { simpanJenisPinjamanAction } from "@/app/actions/master"
import { query } from "@/lib/db"
import { semuaAkun } from "@/lib/queries/akuntansi"
import { GRUP_PINJAMAN } from "@/lib/queries/pinjaman"
import { wajibIzin } from "@/lib/operator"

export default async function JenisPinjamanPage() {
    await wajibIzin("/dashboard/settings/jenis-pinjaman") // layout tidak dijalankan ulang pada navigasi antarhalaman
    const [baris, akun] = await Promise.all([
        query<Record<string, string | number | boolean | null>>(`SELECT jk.id, jk.kode_kredit, jk.nama_kredit, jk.group_pinjaman, jk.jenis_pinjaman,
            jk.bunga_kredit, jk.bunga_per, jk.persen_adm, jk.persen_provisi, jk.mak_cicilan, jk.jatuh_tempo, jk.hide,
            jk.coa_kredit_id, jk.coa_jasa_id, jk.coa_adm_id, jk.coa_provisi_id, p.kode_perkiraan AS akun_kredit
            FROM jenis_kredit jk LEFT JOIN perkiraan p ON p.id = jk.coa_kredit_id ORDER BY jk.kode_kredit`),
        semuaAkun(),
    ])
    const opsiAkun = akun.map((a) => ({ value: String(a.id), label: `${a.kode_perkiraan} ${a.nama_perkiraan}` }))
    const pilih = (xs: string[]) => xs.map((x) => ({ value: x, label: x }))
    return (
        <DaftarEdit title="Jenis Pinjaman" description="Bunga, biaya, dan akun yang dipakai mesin posting saat pencairan dan angsuran."
            kolom={[
                { key: "kode_kredit", label: "Kode" }, { key: "nama_kredit", label: "Nama" }, { key: "group_pinjaman", label: "Grup" },
                { key: "bunga_kredit", label: "Bunga", align: "right", format: "persen" }, { key: "bunga_per", label: "Per" },
                { key: "persen_adm", label: "Adm", align: "right", format: "persen" },
                { key: "persen_provisi", label: "Provisi", align: "right", format: "persen" },
                { key: "mak_cicilan", label: "Maks", align: "right" }, { key: "akun_kredit", label: "Akun" },
                { key: "hide", label: "Hide", align: "center", format: "ya" },
            ]}
            baris={baris}
            fieldsBaru={[{ name: "kode_kredit", label: "Kode (mis. C37)", required: true }]}
            fields={[
                { name: "nama_kredit", label: "Nama", required: true },
                { name: "group_pinjaman", label: "Grup", type: "select", options: pilih(GRUP_PINJAMAN), required: true },
                { name: "jenis_pinjaman", label: "Jenis", type: "select", options: pilih(["Pinjaman Uang", "Pinjaman Barang"]), required: true },
                { name: "bunga_kredit", label: "Bunga (%)", type: "number" },
                { name: "bunga_per", label: "Bunga Per", type: "select", options: pilih(["PER ANGSURAN", "PER LAMA ANGSURAN"]), required: true },
                { name: "mak_cicilan", label: "Maks. Cicilan (0 = bebas)", type: "number", step: "1" },
                { name: "persen_adm", label: "Adm (%)", type: "number" },
                { name: "persen_provisi", label: "Provisi (%)", type: "number" },
                { name: "jatuh_tempo", label: "Tanggal Jatuh Tempo (1-31)", type: "number", step: "1" },
                { name: "coa_kredit_id", label: "Akun Piutang / Titipan", type: "select", options: opsiAkun, required: true },
                { name: "coa_jasa_id", label: "Akun Jasa", type: "select", options: opsiAkun, required: true },
                { name: "coa_adm_id", label: "Akun Adm", type: "select", options: opsiAkun, required: true },
                { name: "coa_provisi_id", label: "Akun Provisi", type: "select", options: opsiAkun, required: true },
                { name: "hide", label: "Hide (disembunyikan)", type: "checkbox" },
            ]}
            aksi={simpanJenisPinjamanAction} />
    )
}
