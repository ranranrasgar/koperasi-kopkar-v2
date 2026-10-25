// Isi email: teks polos dan HTML sederhana (tanpa gambar atau skrip), dengan kaki yang sama untuk semua email.

/** Kop koperasi (nama dan alamat) untuk email resmi; diambil dari tabel perusahaan saat pengiriman. */
export interface KopEmail { nama: string; alamat?: string }
export interface IsiEmail { judul: string; teks: string; tautan?: string | null; kop?: KopEmail | null }

const KAKI = ['Kopkar MJS · Aplikasi Anggota', 'Email ini dikirim otomatis, mohon tidak membalasnya.'];

export const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string);

/** Versi teks polos: isi, tautan (bila ada), lalu kaki. */
export function teksEmail(e: IsiEmail) {
    const isi = e.teks.trim().replace(/^## (.*)$/gm, '$1\n').replace(/ \| /g, ': ');
    return `${isi}${e.tautan ? `\n\nBuka: ${e.tautan}` : ''}\n\n--\n${KAKI.join('\n')}\n`;
}

/**
 * Satu blok teks (dipisah baris kosong) menjadi HTML: "## judul" subjudul; semua baris "- ..." daftar poin; semua baris "Label | nilai" tabel rincian;
 * selain itu paragraf biasa.
 */
function blokHtml(p: string) {
    const baris = p.split('\n');
    if (baris.length === 1 && baris[0].startsWith('## ')) return `<h2 style="margin:22px 0 8px;font-size:15px;color:#0f6b46">${esc(baris[0].slice(3))}</h2>`;
    if (baris.every((l) => l.startsWith('- '))) return `<ul style="margin:0 0 14px;padding-left:20px;line-height:1.55">${baris.map((l) => `<li style="margin:0 0 4px">${esc(l.slice(2))}</li>`).join('')}</ul>`;
    if (baris.every((l) => l.includes(' | '))) {
        return `<table style="width:100%;border-collapse:collapse;margin:0 0 14px;font-size:14px">${baris.map((l) => { const [k, ...v] = l.split(' | '); return `<tr><td style="padding:7px 10px;border:1px solid #d9dfdb;background:#f3f6f4;width:38%;color:#4b5651">${esc(k)}</td><td style="padding:7px 10px;border:1px solid #d9dfdb;font-weight:600">${esc(v.join(' | '))}</td></tr>`; }).join('')}</table>`;
    }
    return `<p style="margin:0 0 14px;line-height:1.55">${esc(p).replace(/\n/g, '<br>')}</p>`;
}

/** Versi HTML: kop koperasi (bila ada), blok isi dari baris kosong, tombol bila ada tautan (hanya http/https), kaki kecil. */
export function htmlEmail(e: IsiEmail) {
    const paragraf = e.teks.trim().split(/\n{2,}/).map(blokHtml).join('');
    const kop = e.kop
        ? `<div style="border-bottom:3px solid #0f6b46;padding:0 0 12px;margin:0 0 20px"><div style="font-size:16px;font-weight:700;color:#0f6b46;letter-spacing:.02em">${esc(e.kop.nama.toUpperCase())}</div>${e.kop.alamat ? `<div style="font-size:12px;color:#6b756f;margin-top:2px">${esc(e.kop.alamat)}</div>` : ''}</div>`
        : '<p style="margin:0 0 18px;font-size:13px;font-weight:700;letter-spacing:.04em;color:#0f6b46">KOPKAR MJS</p>';
    const aman = e.tautan && /^https?:\/\//i.test(e.tautan) ? e.tautan : null;
    const tombol = aman
        ? `<p style="margin:20px 0"><a href="${esc(aman)}" style="background:#0f6b46;color:#fff;text-decoration:none;padding:12px 22px;border-radius:10px;font-weight:600;display:inline-block">Buka aplikasi</a></p>`
        : '';
    return `<!doctype html><html lang="id"><body style="margin:0;background:#f3f4f3;font-family:Arial,Helvetica,sans-serif;color:#1c2420">
<div style="max-width:520px;margin:0 auto;padding:24px 16px">
<div style="background:#fff;border-radius:14px;padding:26px 24px">
${kop}
<h1 style="margin:0 0 16px;font-size:19px;line-height:1.3">${esc(e.judul)}</h1>${paragraf}${tombol}</div>
<p style="margin:14px 8px 0;font-size:12px;line-height:1.5;color:#6b756f">${KAKI.map(esc).join('<br>')}</p>
</div></body></html>`;
}
