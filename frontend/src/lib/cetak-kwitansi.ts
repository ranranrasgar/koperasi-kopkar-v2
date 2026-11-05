import type { KopCetak } from "@/app/actions/cetak"
import { esc } from "@/lib/cetak-klien"
import type { DataBuku, DataKwitansi } from "@/lib/kwitansi-tipe"
import { terbilang } from "@/lib/terbilang"

// Dokumen untuk printer dot matrix (LX-300, LX-310, dan sejenisnya) di kertas continuous form: huruf monospace hitam tanpa warna, latar, dan gambar,
// supaya tajam pada resolusi rendah. Kwitansi setengah lembar, buku pinjaman satu lembar penuh dengan judul kolom berulang di tiap halaman.

export const angkaId = (n: number) => Math.round(n).toLocaleString("id-ID")
const tanggalId = (t: string) => (/^\d{4}-\d{2}-\d{2}/.test(t) ? `${t.slice(8, 10)}/${t.slice(5, 7)}/${t.slice(0, 4)}` : t)

const kopHtml = (k: KopCetak | null) => `<div class="kop"><b>${esc(k?.nama ?? "")}</b><br>${esc((k?.alamat ?? []).join(", "))}</div>`
const nilaiTeks = (v: number | string) => (typeof v === "number" ? `Rp ${angkaId(v)}` : esc(v))

export function kwitansiHtml(d: DataKwitansi, k: KopCetak | null) {
    const terima = d.arah === "terima"
    const baris = d.baris.map(([l, v]) => `<tr><td>${esc(l)}</td><td class="r">Rp ${angkaId(v)}</td></tr>`).join("")
    return `${kopHtml(k)}
<div class="judul"><b>${esc(d.judul)}</b></div>
<table class="kepala"><tr><td class="l">No. Bukti</td><td>: ${esc(d.no)}</td><td class="l">Tanggal</td><td>: ${tanggalId(d.tanggal)}</td></tr></table>
<table class="isi">
<tr><td class="l">${terima ? "Terima dari" : "Dibayarkan ke"}</td><td>: ${esc(d.nama)}</td></tr>
<tr><td class="l">KPK / Kode</td><td>: ${esc(d.kpk)} / ${esc(d.kode)}</td></tr>
<tr><td class="l">Untuk</td><td>: ${esc(d.untuk)}</td></tr>
</table>
${baris ? `<table class="uang">${baris}</table>` : ""}
<table class="uang total"><tr><td><b>JUMLAH</b></td><td class="r"><b>Rp ${angkaId(d.jumlah)}</b></td></tr></table>
<div class="sebut">Terbilang: ${esc(terbilang(d.jumlah))}</div>
<table class="kaki"><tr>
<td class="info">${d.info.map(([l, v]) => `${esc(l)}: ${nilaiTeks(v)}`).join("<br>")}</td>
<td class="ttd">${terima ? "Penyetor" : "Penerima"}<br><br><br>(${esc(d.nama)})</td>
<td class="ttd">Petugas<br><br><br>(${esc(k?.petugas ?? "")})</td>
</tr></table>
<div class="cetak">Dicetak ${esc(k?.waktu ?? "")}</div>`
}

export function bukuHtml(d: DataBuku, k: KopCetak | null) {
    const sel = (n: number) => (n ? angkaId(n) : "")
    const baris = d.baris.map((b) => `<tr><td class="c">${b.ke}</td><td>${tanggalId(b.jatuhTempo)}</td><td class="r">${sel(b.pokok)}</td><td class="r">${sel(b.jasa)}</td><td class="r">${sel(b.angsuran)}</td><td class="r">${angkaId(b.sisa)}</td><td>${b.tglBayar ? tanggalId(b.tglBayar) : ""}</td><td class="r">${sel(b.dibayar)}</td><td></td><td></td></tr>`).join("")
    return `${kopHtml(k)}
<div class="judul"><b>BUKU PINJAMAN ANGGOTA</b></div>
<table class="kepala">
<tr><td class="l">Nama</td><td>: ${esc(d.nama)}</td><td class="l">No. Pinjaman</td><td>: ${esc(d.no)}</td></tr>
<tr><td class="l">KPK / Kode</td><td>: ${esc(d.kpk)} / ${esc(d.kode)}</td><td class="l">Tgl Pinjaman</td><td>: ${tanggalId(d.tanggal)}</td></tr>
<tr><td class="l">Jenis</td><td>: ${esc(d.jenis)}</td><td class="l">Pinjaman</td><td>: Rp ${angkaId(d.pokok)}</td></tr>
<tr><td class="l">Lama</td><td>: ${d.lama} kali</td><td class="l">Angsuran/bulan</td><td>: Rp ${angkaId(d.angsuran)}</td></tr>
</table>
<table class="jadwal"><thead><tr><th>Ke</th><th>Jatuh Tempo</th><th class="r">Pokok</th><th class="r">Jasa</th><th class="r">Angsuran</th><th class="r">Sisa Pokok</th><th>Tgl Bayar</th><th class="r">Dibayar</th><th class="p">Paraf Petugas</th><th class="p">Paraf Pengurus</th></tr></thead><tbody>${baris}</tbody></table>
<div class="cetak">Dicetak ${esc(k?.waktu ?? "")}</div>`
}

const CSS = `
*{box-sizing:border-box}
html,body{margin:0;background:#fff;color:#000}
body{font-family:"Courier New",Courier,monospace;font-size:11pt;line-height:1.25}
table{border-collapse:collapse;width:100%}
td,th{padding:0;vertical-align:top;font-weight:normal}
.bar{padding:8px;background:#e5e7eb;font:13px Arial,sans-serif;display:flex;gap:6px;align-items:center;flex-wrap:wrap}
.bar button{padding:6px 10px;border:1px solid #6b7280;background:#fff;border-radius:4px;cursor:pointer}
.bar button.aktif{background:#1d4ed8;color:#fff;border-color:#1d4ed8}
.kop{text-align:center}
.judul{text-align:center;margin:2mm 0;border-top:1px solid #000;border-bottom:1px solid #000;padding:1mm 0}
.l{white-space:nowrap;padding-right:2mm;width:1%}
.r{text-align:right;white-space:nowrap}
.c{text-align:center}
.isi{margin-top:1mm}
.uang{margin-top:1mm}
.total{border-top:1px solid #000;border-bottom:1px solid #000}
.sebut{margin-top:1mm}
.kaki{margin-top:2mm}
.kaki .info{width:44%}
.kaki .ttd{text-align:center;width:28%}
.cetak{font-size:8pt;margin-top:1mm}
.buku{font-size:8.5pt}
.buku .jadwal{margin-top:2mm}
.buku .jadwal th,.buku .jadwal td{border:1px solid #000;padding:.6mm 1mm;height:6.5mm;vertical-align:middle;white-space:nowrap}
.buku .jadwal thead{display:table-header-group}
.buku .jadwal tr{break-inside:avoid}
.buku .jadwal .p{white-space:normal;width:15mm;text-align:center}
@media print{.bar{display:none}}
`

/** Pilihan kertas untuk dot matrix; ukuran yang sama harus dipilih juga di pengaturan printer. */
const KERTAS = {
    kwitansi: [{ nama: "Continuous 9,5 x 5,5 in", ukuran: "241mm 140mm" }, { nama: "A4/2 (21 x 14,8 cm)", ukuran: "210mm 148mm" }],
    buku: [{ nama: "Continuous 9,5 x 11 in", ukuran: "241mm 279mm" }, { nama: "A4", ukuran: "210mm 297mm" }],
}

function dokumen(judul: string, kertas: { nama: string; ukuran: string }[], isi: string, kelas: string) {
    const tombol = kertas.map((k, i) => `<button type="button" data-ukuran="${k.ukuran}"${i === 0 ? ' class="aktif"' : ""}>${esc(k.nama)}</button>`).join("")
    return `<!doctype html><html lang="id"><head><meta charset="utf-8"><title>${esc(judul)}</title><style>${CSS}</style><style id="halaman">@page{size:${kertas[0].ukuran};margin:6mm 8mm}</style></head><body>
<div class="bar"><b>Kertas:</b> ${tombol}<button type="button" id="cetak"><b>Cetak</b></button></div>
<main class="${kelas}">${isi}</main>
<script>
document.querySelectorAll('[data-ukuran]').forEach(function(b){b.onclick=function(){document.getElementById('halaman').textContent='@page{size:'+b.dataset.ukuran+';margin:6mm 8mm}';document.querySelectorAll('[data-ukuran]').forEach(function(x){x.className=x===b?'aktif':''})}});
document.getElementById('cetak').onclick=function(){window.print()};
</script></body></html>`
}

/** Buka dokumen di jendela baru. Mengembalikan galat bila pop-up diblokir. */
function buka(html: string) {
    const w = window.open("", "_blank")
    if (!w) return "Jendela cetak diblokir browser. Izinkan pop-up untuk situs ini."
    w.document.write(html)
    w.document.close()
    return null
}

export const dokumenKwitansi = (d: DataKwitansi, k: KopCetak | null) => dokumen(`${d.judul} ${d.no}`, KERTAS.kwitansi, kwitansiHtml(d, k), "kwitansi")
export const dokumenBuku = (d: DataBuku, k: KopCetak | null) => dokumen(`Buku Pinjaman ${d.no}`, KERTAS.buku, bukuHtml(d, k), "buku")
export const bukaKwitansi = (d: DataKwitansi, k: KopCetak | null) => buka(dokumenKwitansi(d, k))
export const bukaBuku = (d: DataBuku, k: KopCetak | null) => buka(dokumenBuku(d, k))
