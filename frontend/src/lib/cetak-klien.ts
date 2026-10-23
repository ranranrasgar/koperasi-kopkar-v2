import { kopCetakAction, type KopCetak } from "@/app/actions/cetak"

// Dokumen cetak: jendela baru berisi kop surat (nama, alamat, logo dari Pengaturan Perusahaan), judul, isi laporan, dan keterangan
// pencetak. Isi diambil dari halaman (disalin dan dibersihkan dari form, tombol, dan elemen layar saja) atau dibangun dari data.
// Orientasi kertas (potret/lanskap) dipilih otomatis dari lebar tabel; bila masih lebih lebar dari kertas, isi diperkecil supaya
// tidak ada kolom yang terpotong. Pratinjau di jendela itu sama dengan hasil cetak; ada tombol Potret/Lanskap/Cetak.

export type Orientasi = "auto" | "potret" | "lanskap"

export interface OpsiCetak {
    judul: string
    subjudul?: string
    orientasi?: Orientasi
    /** Elemen halaman yang dicetak (disalin), atau HTML jadi. */
    isi: HTMLElement | string
}

export const esc = (s: unknown) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!)

/** Salin elemen halaman untuk dicetak, tanpa form, tombol, tautan, dan apa pun yang bertanda print:hidden. */
export function bersihkanUntukCetak(area: HTMLElement): string {
    const el = area.cloneNode(true) as HTMLElement
    el.querySelectorAll('[class*="print:hidden"], [data-tanpa-cetak], script, style, dialog, nav, [role="tablist"], input, select, textarea').forEach((n) => n.remove())
    el.querySelectorAll("form").forEach((f) => { if (!f.querySelector("table")) f.remove() })
    el.querySelectorAll("button").forEach((b) => (b.closest("td,th") ? b.replaceWith(document.createTextNode(b.textContent ?? "")) : b.remove()))
    el.querySelectorAll("a").forEach((a) => a.replaceWith(...Array.from(a.childNodes)))
    return el.innerHTML
}

export interface KolomTabel { label: string; kanan?: boolean; tengah?: boolean; mono?: boolean }

/** Tabel dari data: kolom dan baris yang sudah berupa teks. */
export function tabelHtml(kolom: KolomTabel[], baris: string[][], jumlahBarisTotal?: number, opsi: { kelompok?: { label: string; lebar: number }[]; total?: string[] } = {}): string {
    const kelas = (k: KolomTabel) => (k.kanan ? "kanan" : k.tengah ? "tengah" : "") + (k.mono ? " mono" : "")
    // Kepala berkelompok: baris pertama berisi judul kelompok (lebar = jumlah kolom), baris kedua nama kolom.
    const kepala2 = `<tr><th class="no">No.</th>${kolom.map((k) => `<th class="${kelas(k)}">${esc(k.label)}</th>`).join("")}</tr>`
    const head = opsi.kelompok
        ? `<tr><th class="no" rowspan="2">No.</th>${opsi.kelompok.map((g) => `<th class="tengah" colspan="${g.lebar}">${esc(g.label)}</th>`).join("")}</tr><tr>${kolom.map((k) => `<th class="${kelas(k)}">${esc(k.label)}</th>`).join("")}</tr>`
        : kepala2
    const foot = opsi.total ? `<tfoot><tr><td></td>${opsi.total.map((v, j) => `<td class="${kelas(kolom[j])}"><b>${esc(v)}</b></td>`).join("")}</tr></tfoot>` : ''
    const body = baris.map((r, i) => `<tr><td class="no">${i + 1}</td>${r.map((v, j) => `<td class="${kelas(kolom[j])}">${esc(v)}</td>`).join("")}</tr>`).join("")
    const catatan = jumlahBarisTotal !== undefined && jumlahBarisTotal > baris.length
        ? `<p class="catatan">Ditampilkan ${baris.length.toLocaleString("id-ID")} dari ${jumlahBarisTotal.toLocaleString("id-ID")} baris. Persempit filter untuk mencetak sisanya.</p>` : ""
    return `<table><thead>${head}</thead><tbody>${body}</tbody>${foot}</table>${catatan}<p class="jumlah">Jumlah data: ${(jumlahBarisTotal ?? baris.length).toLocaleString("id-ID")}</p>`
}

const CSS = `
html,body{background:#e5e7eb;color:#111;margin:0}
body,.kertas,.kertas *{font-family:Arial,Helvetica,sans-serif!important}
.bar{position:sticky;top:0;z-index:5;display:flex;gap:8px;align-items:center;justify-content:center;background:#1f2937;color:#fff;padding:8px;font-size:13px}
.bar button{border:1px solid #6b7280;background:#374151;color:#fff;border-radius:6px;padding:6px 12px;cursor:pointer;font-size:13px}
.bar button.aktif{background:#2563eb;border-color:#2563eb}
.bar .cetak{background:#16a34a;border-color:#16a34a;font-weight:600}
.kertas{background:#fff;margin:16px auto;padding:0 0 12px;box-shadow:0 1px 6px rgba(0,0,0,.25)}
.kop{display:flex;align-items:center;gap:14px;border-bottom:3px double #111;padding:0 0 8px;margin-bottom:10px}
.kop img{width:64px;height:64px;object-fit:contain}
.kop .teks{flex:1;text-align:center;line-height:1.35}
.kop .nama{font-size:17px;font-weight:700;text-transform:uppercase;letter-spacing:.3px}
.kop .baris{font-size:11px}
.judul{text-align:center;margin:6px 0 10px}
.judul h1{font-size:15px;margin:0;text-transform:uppercase}
.judul p{font-size:11.5px;margin:3px 0 0;color:#333}
.isi{font-size:11px;line-height:1.35}
.isi *{overflow:visible!important;max-width:none!important;box-shadow:none!important;position:static!important;animation:none!important}
.isi table{width:100%;border-collapse:collapse;font-size:11px}
.isi th,.isi td{border:1px solid #9ca3af;padding:3px 5px;vertical-align:top;color:#111!important;background:transparent}
.isi th{background:#eef0f3!important;font-weight:700;text-align:left}
.isi thead{display:table-header-group}.isi tfoot{display:table-row-group}
.isi tr{break-inside:avoid}
.isi td.kanan,.isi th.kanan,.isi .text-right,.isi .tabular-nums,.isi .whitespace-nowrap,.isi td.no,.isi .mono{white-space:nowrap}
.isi.ukur{width:max-content}
.isi.ukur table{width:auto!important}
.isi.ukur td,.isi.ukur th{white-space:nowrap!important}
.isi .kanan,.isi th.kanan,.isi td.kanan,.isi .text-right{text-align:right}
.isi .tengah,.isi .text-center{text-align:center}
.isi td.no,.isi th.no{width:1px;text-align:center;white-space:nowrap}
.isi .mono{font-family:"Courier New",monospace!important}
.isi .tabular-nums{font-variant-numeric:tabular-nums}
.isi h1,.isi h2,.isi h3{color:#111!important}
.isi .catatan{font-size:10.5px;color:#92400e;margin:6px 0 0}
.isi .jumlah{font-size:10.5px;margin:6px 0 0}
.ttd{margin-top:14px;font-size:10.5px;color:#374151;display:flex;justify-content:space-between;border-top:1px solid #9ca3af;padding-top:5px}
@media print{
  html,body{background:#fff}
  .bar{display:none}
  .kertas{margin:0!important;box-shadow:none;width:auto!important}
  @page{margin:12mm;@bottom-right{content:"Halaman " counter(page) " dari " counter(pages);font-size:9px;color:#555}}
}
`

// Berjalan di jendela cetak: ukur lebar alami isi, pilih orientasi, perkecil bila perlu, lalu cetak.
const SKRIP = `
(function(){
  var LEBAR={potret:700,lanskap:1030}, awal=__AWAL__, otomatis=__AUTO__, sekarang=null, alami=0;
  var isi=document.querySelector('.isi'), kertas=document.querySelector('.kertas'), gaya=document.getElementById('halaman');
  function ukur(){ isi.classList.add('ukur'); isi.style.zoom=''; var w=isi.getBoundingClientRect().width; isi.classList.remove('ukur'); return w; }
  // Skala terkecil yang masih nyaman dibaca; di bawah itu teks panjang dibiarkan turun baris, lalu diperkecil lagi hanya bila masih terpotong.
  var MIN=0.62;
  function lebihLebar(){ var t=isi.querySelectorAll('table'), a=isi.clientWidth; if(isi.scrollWidth>a+1) return true; for(var i=0;i<t.length;i++){ if(t[i].getBoundingClientRect().width>isi.getBoundingClientRect().width+1) return true; } return false; }
  function pasang(z){ isi.style.zoom=z<1?String(z):''; isi.style.width=z<1?(100/z)+'%':''; }
  function atur(o){
    sekarang=o; var maks=LEBAR[o], z=Math.min(1, Math.max(MIN, maks/Math.max(alami,1)));
    gaya.textContent='@page{size:A4 '+(o==='lanskap'?'landscape':'portrait')+';margin:12mm}';
    kertas.style.width=maks+'px';
    pasang(z);
    for(var i=0;i<6 && lebihLebar() && z>0.2;i++){ z=z*0.92; pasang(z); }
    document.getElementById('b-potret').className=o==='potret'?'aktif':'';
    document.getElementById('b-lanskap').className=o==='lanskap'?'aktif':'';
    document.getElementById('info').textContent=(z<1?'Diperkecil '+Math.round(z*100)+'% agar muat. ':'Ukuran 100%. ')+'Kertas A4 '+(o==='lanskap'?'lanskap':'potret');
  }
  function mulai(){
    alami=ukur();
    atur(awal==='auto'?(alami<=LEBAR.potret?'potret':'lanskap'):awal);
    document.getElementById('b-potret').onclick=function(){atur('potret')};
    document.getElementById('b-lanskap').onclick=function(){atur('lanskap')};
    document.getElementById('b-cetak').onclick=function(){window.print()};
    document.getElementById('b-tutup').onclick=function(){window.close()};
    if(otomatis) setTimeout(function(){window.print()},350);
  }
  if(document.readyState==='complete') mulai(); else window.addEventListener('load',mulai);
})();
`

/** Buka dokumen cetak di jendela baru. Mengembalikan galat teks bila jendela diblokir atau kop tidak bisa dimuat. */
export async function bukaCetak(o: OpsiCetak, kop?: KopCetak | null): Promise<string | null> {
    const win = window.open("", "_blank")
    if (!win) return "Jendela cetak diblokir browser. Izinkan pop-up untuk situs ini."
    win.document.write("<p style='font-family:sans-serif;padding:24px'>Menyiapkan dokumen cetak…</p>")
    try {
        const k = kop === undefined ? await kopCetakAction() : kop
        const html = typeof o.isi === "string" ? o.isi : bersihkanUntukCetak(o.isi)
        const gaya = Array.from(document.querySelectorAll('link[rel="stylesheet"], style')).map((n) => n.outerHTML).join("")
        const logo = k?.logo ? `<img src="${esc(k.logo)}" alt="">` : ""
        const baris = [...(k?.alamat ?? []), ...(k?.kontak ?? [])].map((b) => `<div class="baris">${esc(b)}</div>`).join("")
        const skrip = SKRIP.replace("__AWAL__", JSON.stringify(o.orientasi ?? "auto")).replace("__AUTO__", "false")
        const dok = `<!doctype html><html lang="id"><head><meta charset="utf-8"><title>${esc(o.judul)}</title><base href="${esc(location.origin)}/">${gaya}<style>${CSS}</style><style id="halaman"></style></head><body>
<div class="bar"><span id="info"></span><button id="b-potret">Potret</button><button id="b-lanskap">Lanskap</button><button id="b-cetak" class="cetak">Cetak</button><button id="b-tutup">Tutup</button></div>
<div class="kertas">
<header class="kop">${logo}<div class="teks"><div class="nama">${esc(k?.nama ?? "")}</div>${baris}</div></header>
<div class="judul"><h1>${esc(o.judul)}</h1>${o.subjudul ? `<p>${esc(o.subjudul)}</p>` : ""}</div>
<main class="isi">${html}</main>
<footer class="ttd"><span>Dicetak oleh ${esc(k?.petugas ?? "-")}</span><span>${esc(k?.waktu ?? "")}</span></footer>
</div><script>${skrip}</script></body></html>`
        win.document.open()
        win.document.write(dok)
        win.document.close()
        return null
    } catch (e) {
        win.close()
        return e instanceof Error ? e.message : "Gagal menyiapkan dokumen cetak"
    }
}
