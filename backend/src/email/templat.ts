// Isi email: teks polos dan HTML sederhana (tanpa gambar atau skrip), dengan kaki yang sama untuk semua email.

export interface IsiEmail { judul: string; teks: string; tautan?: string | null }

const KAKI = ['Kopkar MJS · Aplikasi Anggota', 'Email ini dikirim otomatis, mohon tidak membalasnya.'];

export const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string);

/** Versi teks polos: isi, tautan (bila ada), lalu kaki. */
export function teksEmail(e: IsiEmail) {
    return `${e.teks.trim()}${e.tautan ? `\n\nBuka: ${e.tautan}` : ''}\n\n--\n${KAKI.join('\n')}\n`;
}

/** Versi HTML: paragraf dari baris kosong, tombol bila ada tautan (hanya http/https), kaki kecil. */
export function htmlEmail(e: IsiEmail) {
    const paragraf = e.teks.trim().split(/\n{2,}/).map((p) => `<p style="margin:0 0 14px;line-height:1.55">${esc(p).replace(/\n/g, '<br>')}</p>`).join('');
    const aman = e.tautan && /^https?:\/\//i.test(e.tautan) ? e.tautan : null;
    const tombol = aman
        ? `<p style="margin:20px 0"><a href="${esc(aman)}" style="background:#0f6b46;color:#fff;text-decoration:none;padding:12px 22px;border-radius:10px;font-weight:600;display:inline-block">Buka aplikasi</a></p>`
        : '';
    return `<!doctype html><html lang="id"><body style="margin:0;background:#f3f4f3;font-family:Arial,Helvetica,sans-serif;color:#1c2420">
<div style="max-width:520px;margin:0 auto;padding:24px 16px">
<div style="background:#fff;border-radius:14px;padding:26px 24px">
<p style="margin:0 0 18px;font-size:13px;font-weight:700;letter-spacing:.04em;color:#0f6b46">KOPKAR MJS</p>
<h1 style="margin:0 0 16px;font-size:19px;line-height:1.3">${esc(e.judul)}</h1>${paragraf}${tombol}</div>
<p style="margin:14px 8px 0;font-size:12px;line-height:1.5;color:#6b756f">${KAKI.map(esc).join('<br>')}</p>
</div></body></html>`;
}
