import { FormCard } from "@/components/transaksi/common"
import { FormEdit, type FieldSpec } from "@/components/master/FormEdit"
import { simpanPengaturanGajiAction } from "@/app/actions/gaji"
import { pool } from "@/lib/db"
import { formatAngka } from "@/lib/format"
import { ringkasTer } from "@/lib/queries/gaji"
import { wajibIzin } from "@/lib/operator"
import { bacaPengaturanGaji, LABEL_PENGATURAN } from "@kopkar/backend/src/gaji/pengaturan.ts"
import type { PengaturanGaji } from "@kopkar/backend/src/gaji/hitung.ts"

export const dynamic = "force-dynamic"

const PETUNJUK: Partial<Record<keyof PengaturanGaji, string>> = {
    tanggalAwal: "Periode Oktober = tanggal ini September s/d sehari sebelumnya Oktober (Excel: 23).",
    pembagiHarian: "Potongan tidak hadir = hari / pembagi x upah (Excel: 30).",
    pembagiLembur: "Upah lembur per jam = jml. upah / pembagi (Excel: 173).",
    hariKerjaSeminggu: "6 atau 5: menentukan bobot lembur di hari istirahat.",
    jhtPersen: "Dasar jml. upah. Excel 2015: 2%.",
    jpPersen: "Dasar jml. upah. 0 bila tidak ikut JP. Excel 2015: tidak ada.",
    kesPersen: "Dasar jml. upah. Excel 2015: 0,5%.",
    premiPerusahaanPersen: "Dasar gaji. Tidak memotong gaji, tetapi masuk bruto PPh 21.",
    kesPerusahaanPersen: "Dasar jml. upah. Tidak memotong gaji, tetapi masuk bruto PPh 21.",
}
const NAMA_KATEGORI: Record<string, string> = { A: "TK/0, TK/1, K/0", B: "TK/2, TK/3, K/1, K/2", C: "K/3" }

export default async function PengaturanGajiPage() {
    await wajibIzin("/dashboard/kepegawaian/pengaturan") // layout tidak dijalankan ulang pada navigasi antarhalaman
    const [p, ter] = await Promise.all([bacaPengaturanGaji(pool), ringkasTer()])
    const fields: FieldSpec[] = (Object.keys(LABEL_PENGATURAN) as (keyof PengaturanGaji)[]).map((k) => (
        k === "hariKerjaSeminggu"
            ? { name: k, label: LABEL_PENGATURAN[k], type: "select", required: true, hint: PETUNJUK[k], options: [{ value: "6", label: "6 hari" }, { value: "5", label: "5 hari" }] }
            : { name: k, label: LABEL_PENGATURAN[k], type: "number", required: true, hint: PETUNJUK[k], step: k.endsWith("Persen") ? "0.01" : "1" }))
    return (
        <div className="space-y-6">
            <FormCard title="Pengaturan Gaji" description="Dasar hitung penggajian karyawan koperasi. Periksa persen BPJS dengan bendahara; perubahan berlaku untuk hitungan berikutnya, slip yang sudah final tidak berubah.">
                <FormEdit fields={fields} nilai={Object.fromEntries(Object.entries(p).map(([k, v]) => [k, String(v)]))} aksi={simpanPengaturanGajiAction} kolom={3} />
            </FormCard>
            <FormCard title="Tarif PPh 21 (TER)" description="Tarif efektif rata-rata bulanan PMK 168/2023, berlaku Januari s/d November. PPh = tarif x bruto bulanan (gaji kotor + premi BPJS yang dibayar koperasi), dibulatkan ke bawah.">
                <table className="w-full text-sm">
                    <thead className="bg-muted text-xs text-muted-foreground">
                        <tr><th className="px-3 py-2 text-left">Kategori</th><th className="px-3 py-2 text-left">Status PTKP</th><th className="px-3 py-2 text-right">Baris tarif</th><th className="px-3 py-2 text-right">Mulai kena pajak (bruto/bulan)</th></tr>
                    </thead>
                    <tbody>
                        {ter.length === 0 && <tr><td colSpan={4} className="p-4 text-center text-muted-foreground">Tabel TER kosong; jalankan npm run anggota:pasang.</td></tr>}
                        {ter.map((t) => (
                            <tr key={t.kategori} className="border-t">
                                <td className="px-3 py-1.5 font-semibold">{t.kategori}</td>
                                <td className="px-3 py-1.5">{NAMA_KATEGORI[t.kategori]}</td>
                                <td className="px-3 py-1.5 text-right tabular-nums">{t.baris}</td>
                                <td className="px-3 py-1.5 text-right tabular-nums">Rp {formatAngka(Number(t.batas_kena))}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </FormCard>
        </div>
    )
}
