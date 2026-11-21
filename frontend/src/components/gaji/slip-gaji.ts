import { esc } from "@/lib/cetak-klien"
import type { BarisGaji } from "@kopkar/backend/src/gaji/penggajian.ts"

// Slip gaji per karyawan, tata letak seperti sheet "Slip S" Excel lama: data karyawan, pendapatan, potongan, perhitungan PPh 21, upah bersih.
const rp = (v: number) => `Rp ${Math.round(v).toLocaleString("id-ID")}`
const tgl = (t: string | null) => t ? new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(`${t}T00:00:00Z`)) : "-"
const baris = (label: string, nilai: string, tebal = false) =>
    `<tr${tebal ? ' class="tebal"' : ""}><td>${esc(label)}</td><td class="kanan">${esc(nilai)}</td></tr>`

function satuSlip(b: BarisGaji, periode: { dari: string; sampai: string }, kota: string, koperasi: string) {
    const g = b.gaji
    const tidakHadir = (b.hadir.ABS ?? 0) + (b.hadir.UNP ?? 0)
    const data = [
        baris("Nama", b.nama), baris("No. karyawan", b.kode), baris("Tgl. masuk", tgl(b.tglMasuk)), baris("Bidang", b.bidang ?? "-"),
        baris("Jabatan", b.jabatan ?? "-"), baris("Atasan", b.atasan ?? "-"), baris("No. rekening", [b.bank, b.noRek].filter(Boolean).join(" ") || "-"),
        baris("Status PTKP", b.statusPtkp), baris("NPWP", b.npwp ?? "-"), baris("Hari kerja dibayar", `${g.hk} hari`),
        baris("Tidak hadir / izin tanpa upah", `${tidakHadir} hari`), baris("Cuti / sakit / melahirkan", `${(b.hadir.ANN ?? 0) + (b.hadir.MED ?? 0) + (b.hadir.MAT ?? 0)} hari`),
        baris("Jam lembur (berbobot)", `${b.jamLembur} (${b.jamBobot})`),
    ].join("")
    const pendapatan = [
        baris("Upah minimum", rp(b.umk)), baris("Tunj. jabatan", rp(b.tunjJabatan)),
        ...(g.potUmk + g.potTunjJabatan ? [baris(`Potongan tidak hadir (${tidakHadir} hari)`, `- ${rp(g.potUmk + g.potTunjJabatan)}`)] : []),
        baris("Gaji", rp(g.gaji), true), baris("Tunj. transport", rp(g.transport)), baris("Tunj. makan", rp(g.makan)), baris("Upah lembur", rp(g.uangLembur)),
        baris("Cadangan risiko", rp(g.cadResiko)), baris("THR", rp(g.thr)), baris("Tunjangan lain", rp(g.tunjLain)), baris("Jumlah pendapatan", rp(g.gajiKotor), true),
    ].join("")
    const potongan = [
        baris("JHT", rp(g.jht)), ...(g.jp ? [baris("Jaminan Pensiun", rp(g.jp))] : []), baris("BPJS Kesehatan", rp(g.kes)), baris("PPh pasal 21", rp(g.pph21)),
        baris("Potongan koperasi", rp(g.potKoperasi)), baris(`Lain-lain${b.ketPotLain ? ` (${b.ketPotLain})` : ""}`, rp(g.potLain)), baris("Jumlah potongan", rp(g.totalPotongan), true),
    ].join("")
    const pajak = [
        baris("Jumlah pendapatan", rp(g.gajiKotor)), baris("Premi BPJS dibayar koperasi", rp(g.premiPerusahaan + g.kesPerusahaan)),
        baris("Penghasilan bruto", rp(g.bruto), true), baris(`Tarif TER kategori ${g.kategoriTer}`, `${g.tarifTer.toLocaleString("id-ID")}%`), baris("PPh 21 bulan ini", rp(g.pph21), true),
    ].join("")
    const hari = new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Jakarta" }).format(new Date())
    return `<section class="slip">
<p class="periode">Periode ${esc(tgl(periode.dari))} s/d ${esc(tgl(periode.sampai))}</p>
<div class="kolom"><div><h3>Data karyawan</h3><table>${data}</table></div>
<div><h3>Pendapatan</h3><table>${pendapatan}</table></div>
<div><h3>Potongan</h3><table>${potongan}</table><h3>Perhitungan PPh 21</h3><table>${pajak}</table></div></div>
<p class="bersih">UPAH BERSIH: ${esc(rp(g.gajiKotor))} - ${esc(rp(g.totalPotongan))} = <b>${esc(rp(g.gajiBersih))}</b></p>
<div class="ttd"><div>${esc(kota ? `${kota}, ${hari}` : hari)}<br>Disiapkan oleh<div class="ruang"></div>Bendahara</div>
<div><br>Disetujui oleh<div class="ruang"></div>Ketua Umum</div><div><br>Diterima oleh<div class="ruang"></div>${esc(b.nama)}</div></div>
<p class="catatan">${esc(koperasi)} · Rincian waktu kerja lihat Absensi Karyawan.</p>
</section>`
}

/** HTML untuk bukaCetak: satu slip per halaman. */
export function slipHtml(daftar: BarisGaji[], periode: { dari: string; sampai: string }, kota: string, koperasi: string) {
    return `<style>
.isi .slip{font-size:10.5px;break-after:page}.isi .slip:last-child{break-after:auto}
.isi .slip .periode{text-align:center;margin:0 0 8px;font-weight:600}
.isi .slip .kolom{display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px}
.isi .slip h3{font-size:11px;margin:4px 0;border-bottom:1px solid #111}
.isi .slip table{width:100%;border-collapse:collapse}.isi .slip td{padding:1.5px 2px;border:0}
.isi .slip .kanan{text-align:right;white-space:nowrap}.isi .slip tr.tebal td{font-weight:700;border-top:1px solid #999}
.isi .slip .bersih{margin:10px 0;padding:6px;border:1px solid #111;font-size:12px}
.isi .slip .ttd{display:grid;grid-template-columns:1fr 1fr 1fr;text-align:center;margin-top:12px}.isi .slip .ruang{height:48px}
.isi .slip .catatan{color:#555;font-size:9px;margin-top:8px}
</style>${daftar.map((b) => satuSlip(b, periode, kota, koperasi)).join("")}`
}
