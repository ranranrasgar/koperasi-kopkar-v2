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

    // Jadwal angsuran bernomor: "Jadwal angsuran:\n  1. 10 November 2026 angsuran Rp 500.000..."
    if (baris[0].trim().toLowerCase().startsWith('jadwal angsuran') && baris.slice(1).some((l) => /^\s*\d+\.\s+/.test(l))) {
        const judul = baris[0].replace(/:$/, '').trim();
        const barisJadwal: { ke: string; tgl: string; total: string }[] = [];
        let catatan = '';
        for (const l of baris.slice(1)) {
            const m = l.match(/^\s*(\d+)\.\s+(.+?)\s+angsuran\s+(Rp\s*[\d\.,]+)$/i);
            if (m) {
                barisJadwal.push({ ke: m[1], tgl: m[2].trim(), total: m[3].trim() });
            } else if (l.trim().startsWith('... dan')) {
                catatan = l.trim();
            }
        }
        if (barisJadwal.length > 0) {
            const h2 = `<h2 style="margin:22px 0 10px;font-size:15px;color:#0f6b46;font-weight:700">${esc(judul)}</h2>`;
            const tabel = `<table style="width:100%;border-collapse:collapse;margin:0 0 12px;font-size:13px"><thead><tr>`
                + `<th style="padding:8px 10px;border:1px solid #d1dbd6;background:#eaf2ed;color:#0f6b46;font-weight:700;font-size:12px;text-align:center;width:40px">Ke</th>`
                + `<th style="padding:8px 10px;border:1px solid #d1dbd6;background:#eaf2ed;color:#0f6b46;font-weight:700;font-size:12px;text-align:left">Jatuh Tempo</th>`
                + `<th style="padding:8px 10px;border:1px solid #d1dbd6;background:#eaf2ed;color:#0f6b46;font-weight:700;font-size:12px;text-align:right">Angsuran</th>`
                + `</tr></thead><tbody>`
                + barisJadwal.map((r, i) => `<tr style="background:${i % 2 === 0 ? '#ffffff' : '#f9fbf9'}"><td style="padding:7px 10px;border:1px solid #e1e7e4;color:#1c2420;text-align:center">${esc(r.ke)}</td><td style="padding:7px 10px;border:1px solid #e1e7e4;color:#1c2420;text-align:left">${esc(r.tgl)}</td><td style="padding:7px 10px;border:1px solid #e1e7e4;color:#1c2420;text-align:right;font-weight:600">${esc(r.total)}</td></tr>`).join('')
                + `</tbody></table>`;
            const note = catatan ? `<p style="margin:0 0 14px;font-size:12px;color:#6b756f;font-style:italic">${esc(catatan)}</p>` : '';
            return `${h2}${tabel}${note}`;
        }
    }

    if (baris.every((l) => l.includes(' | '))) {
        const sel = baris.map((l) => l.split(' | ').map((c) => c.trim()));
        const banyakKolom = Math.max(...sel.map((r) => r.length));
        if (banyakKolom >= 3) {
            const [kepala, ...isi] = sel;
            return `<table style="width:100%;border-collapse:collapse;margin:0 0 16px;font-size:13px"><thead><tr>${kepala.map((h, n) => `<th style="padding:8px 10px;border:1px solid #d1dbd6;background:#eaf2ed;color:#0f6b46;font-weight:700;font-size:12px;text-align:${n === 0 ? 'center' : n === 1 ? 'left' : 'right'}">${esc(h)}</th>`).join('')}</tr></thead><tbody>${isi.map((r, i) => `<tr style="background:${i % 2 === 0 ? '#ffffff' : '#f9fbf9'}">${r.map((c, n) => `<td style="padding:7px 10px;border:1px solid #e1e7e4;color:#1c2420;text-align:${n === 0 ? 'center' : n === 1 ? 'left' : 'right'};font-weight:${n === r.length - 1 ? '600' : 'normal'}">${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
        }
        return `<table style="width:100%;border-collapse:collapse;margin:0 0 16px;font-size:13.5px">${sel.map((cols) => `<tr><td style="padding:8px 12px;border:1px solid #d9dfdb;background:#f3f6f4;width:40%;color:#4b5651">${esc(cols[0])}</td><td style="padding:8px 12px;border:1px solid #d9dfdb;font-weight:600;color:#1c2420">${esc(cols.slice(1).join(' | '))}</td></tr>`).join('')}</table>`;
    }

    // Blok rincian key: value ("No. pinjaman: CR-...", "Jenis kredit: ...")
    if (baris.length > 1 && baris.every((l) => /^[^:\n]+:\s*.+$/.test(l))) {
        return `<table style="width:100%;border-collapse:collapse;margin:0 0 16px;font-size:13.5px">${baris.map((l) => {
            const idx = l.indexOf(':');
            const k = l.slice(0, idx).trim();
            const v = l.slice(idx + 1).trim();
            return `<tr><td style="padding:8px 12px;border:1px solid #d9dfdb;background:#f3f6f4;width:40%;color:#4b5651">${esc(k)}</td><td style="padding:8px 12px;border:1px solid #d9dfdb;font-weight:600;color:#1c2420">${esc(v)}</td></tr>`;
        }).join('')}</table>`;
    }

    return `<p style="margin:0 0 14px;line-height:1.55">${esc(p).replace(/\n/g, '<br>')}</p>`;
}

/** Versi HTML: kop koperasi resmi dengan logo, blok isi dari baris kosong, tombol bila ada tautan, kaki resmi. */
export function htmlEmail(e: IsiEmail) {
    const paragraf = e.teks.trim().split(/\n{2,}/).map(blokHtml).join('');
    const logoUrl = (process.env.ANGGOTA_URL ?? 'https://anggota.kopkarmjsmattel.com').replace(/\/+$/, '') + '/logo.png';
    const namaKop = e.kop?.nama ? e.kop.nama.toUpperCase() : 'KOPKAR MJS';
    const alamatKop = e.kop?.alamat ?? 'Kawasan Industri Jababeka V, Cikarang, Bekasi';
    const kop = `<table cellpadding="0" cellspacing="0" border="0" style="width:100%;border-bottom:2px solid #0f6b46;padding-bottom:12px;margin-bottom:20px"><tr><td style="width:48px;vertical-align:middle;padding-right:12px"><img src="${esc(logoUrl)}" alt="Logo" width="44" height="44" style="display:block;border-radius:6px;max-width:44px;height:auto" /></td><td style="vertical-align:middle"><div style="font-size:15px;font-weight:700;color:#0f6b46;letter-spacing:.02em;line-height:1.2">${esc(namaKop)}</div><div style="font-size:11px;color:#6b756f;margin-top:2px;line-height:1.3">${esc(alamatKop)}</div></td></tr></table>`;
    const aman = e.tautan && /^https?:\/\//i.test(e.tautan) ? e.tautan : null;
    const tombol = aman
        ? `<p style="margin:20px 0"><a href="${esc(aman)}" style="background:#0f6b46;color:#fff;text-decoration:none;padding:12px 22px;border-radius:10px;font-weight:600;display:inline-block">Buka aplikasi</a></p>`
        : '';
    return `<!doctype html><html lang="id"><body style="margin:0;background:#f3f4f3;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1c2420">
<div style="max-width:540px;margin:0 auto;padding:24px 16px">
<div style="background:#fff;border-radius:14px;padding:26px 24px;border:1px solid #e2e8e5;box-shadow:0 1px 3px rgba(0,0,0,0.04)">
${kop}
<h1 style="margin:0 0 16px;font-size:19px;line-height:1.3;color:#0f6b46">${esc(e.judul)}</h1>${paragraf}${tombol}</div>
<p style="margin:14px 8px 0;font-size:12px;line-height:1.5;color:#6b756f;text-align:center">${KAKI.map(esc).join('<br>')}</p>
</div></body></html>`;
}
