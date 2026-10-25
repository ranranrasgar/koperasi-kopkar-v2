import { DaftarJenisPinjaman, type GradeAnggota, type JenisPinjaman } from "@/components/master/DaftarJenisPinjaman"
import { query } from "@/lib/db"
import { semuaAkun } from "@/lib/queries/akuntansi"
import { wajibIzin } from "@/lib/operator"

export const dynamic = "force-dynamic"

export default async function JenisPinjamanPage() {
    await wajibIzin("/dashboard/settings/jenis-pinjaman") // layout tidak dijalankan ulang pada navigasi antarhalaman
    const [baris, akun, grade] = await Promise.all([
        query<JenisPinjaman>(`SELECT jk.id, jk.kode_kredit, jk.nama_kredit, jk.group_pinjaman, jk.jenis_pinjaman, jk.bunga_kredit, jk.bunga_per, jk.persen_adm,
                jk.persen_provisi, jk.persen_denda, jk.mak_cicilan, jk.jatuh_tempo, jk.hide, jk.pakai_adm, jk.pakai_denda, jk.pakai_um, jk.kunci_jika_melebihi_grade,
                jk.kunci_hanya_untuk_staff, jk.kunci_jika_sisa, jk.hitung_shu, jk.maks_plafond,
                p1.kode_perkiraan AS coa_kredit, p2.kode_perkiraan AS coa_jasa, p3.kode_perkiraan AS coa_adm, p4.kode_perkiraan AS coa_provisi
            FROM jenis_kredit jk
            LEFT JOIN perkiraan p1 ON p1.id = jk.coa_kredit_id LEFT JOIN perkiraan p2 ON p2.id = jk.coa_jasa_id
            LEFT JOIN perkiraan p3 ON p3.id = jk.coa_adm_id LEFT JOIN perkiraan p4 ON p4.id = jk.coa_provisi_id
            ORDER BY jk.kode_kredit`),
        semuaAkun(),
        // Nominal grade yang ada di data anggota aktif: dasar tabel "batas pinjaman" di form.
        query<GradeAnggota>("SELECT COALESCE(rp_grade, 0) AS rp_grade, COUNT(*) AS n FROM anggota WHERE aktif = 'Y' GROUP BY 1 ORDER BY 1"),
    ])
    return <DaftarJenisPinjaman baris={baris} akun={akun} grade={grade} />
}
