/**
 * Tema tampilan admin yang bisa diubah operator: enam warna, preset profesional, validasi, dan pembuat CSS.
 * Murni (tanpa akses database) supaya dipakai server (layout) dan klien (pratinjau) dan bisa diuji.
 *
 * Warna latar (kanvas, kartu, header, sidebar) berlaku di mode terang; mode gelap memakai palet gelap bawaan, sedangkan aksen berlaku di
 * keduanya. Nilai selalu #rrggbb yang divalidasi ketat karena disisipkan ke <style>.
 */

export interface Tema {
    /** Warna utama: tombol, tautan, penanda menu aktif, fokus. */
    aksen: string;
    /** Latar halaman (di belakang kartu dan tabel). */
    kanvas: string;
    /** Latar kartu, tabel, dan isian. */
    kartu: string;
    /** Latar bilah atas (header). */
    header: string;
    /** Latar menu samping. */
    sidebar: string;
    /** Warna tulisan dan ikon menu samping. */
    sidebarTeks: string;
}

export const KUNCI_TEMA = ['aksen', 'kanvas', 'kartu', 'header', 'sidebar', 'sidebarTeks'] as const;

export const LABEL_TEMA: Record<keyof Tema, string> = {
    aksen: 'Warna aksen', kanvas: 'Latar halaman', kartu: 'Latar kartu dan tabel', header: 'Latar header', sidebar: 'Latar menu samping', sidebarTeks: 'Tulisan menu samping',
};

/** Tampilan awal aplikasi: semua putih dengan aksen biru. Tombol "Reset" menghapus tema tersimpan sehingga kembali ke sini. */
export const TEMA_BAWAAN: Tema = { aksen: '#2563eb', kanvas: '#ffffff', kartu: '#ffffff', header: '#ffffff', sidebar: '#ffffff', sidebarTeks: '#57606a' };

export interface Preset { id: string; nama: string; keterangan: string; tema: Tema }

export const PRESET: Preset[] = [
    { id: 'standar', nama: 'Standar', keterangan: 'Tampilan awal: putih bersih dengan aksen biru.', tema: TEMA_BAWAAN },
    { id: 'abu-profesional', nama: 'Abu Profesional', keterangan: 'Latar abu muda, kartu putih; paling umum untuk aplikasi akuntansi.',
        tema: { aksen: '#2563eb', kanvas: '#f3f4f6', kartu: '#ffffff', header: '#ffffff', sidebar: '#ffffff', sidebarTeks: '#4b5563' } },
    { id: 'navy-korporat', nama: 'Navy Korporat', keterangan: 'Menu samping navy gelap, konten terang; kesan ERP klasik.',
        tema: { aksen: '#1d4ed8', kanvas: '#f1f5f9', kartu: '#ffffff', header: '#ffffff', sidebar: '#0f2a4a', sidebarTeks: '#cbd5e1' } },
    { id: 'hijau-koperasi', nama: 'Hijau Koperasi', keterangan: 'Hijau tua yang tenang, cocok untuk identitas koperasi.',
        tema: { aksen: '#047857', kanvas: '#f1f7f4', kartu: '#ffffff', header: '#ffffff', sidebar: '#0b3b2e', sidebarTeks: '#d1fae5' } },
    { id: 'slate-modern', nama: 'Slate Modern', keterangan: 'Abu kebiruan dengan aksen indigo; modern dan netral.',
        tema: { aksen: '#4f46e5', kanvas: '#f8fafc', kartu: '#ffffff', header: '#ffffff', sidebar: '#1e293b', sidebarTeks: '#cbd5e1' } },
    { id: 'teal-bersih', nama: 'Teal Bersih', keterangan: 'Biru kehijauan segar dengan menu samping terang.',
        tema: { aksen: '#0e7490', kanvas: '#f0f7f8', kartu: '#ffffff', header: '#ffffff', sidebar: '#ffffff', sidebarTeks: '#475569' } },
    { id: 'krem-hangat', nama: 'Krem Hangat', keterangan: 'Latar krem lembut, nyaman untuk dipakai lama.',
        tema: { aksen: '#b45309', kanvas: '#faf6ef', kartu: '#fffdf8', header: '#fffdf8', sidebar: '#fffdf8', sidebarTeks: '#57534e' } },
    { id: 'kontras-tinggi', nama: 'Kontras Tinggi', keterangan: 'Tulisan dan batas lebih tegas, untuk keterbacaan maksimal.',
        tema: { aksen: '#1e40af', kanvas: '#ffffff', kartu: '#ffffff', header: '#ffffff', sidebar: '#111827', sidebarTeks: '#f9fafb' } },
];

const HEX = /^#[0-9a-fA-F]{6}$/;

/** Tema yang sah (semua enam warna #rrggbb, dinormalkan ke huruf kecil), atau null. */
export function temaSah(x: unknown): Tema | null {
    if (!x || typeof x !== 'object') return null;
    const t: Partial<Record<keyof Tema, string>> = {};
    for (const k of KUNCI_TEMA) {
        const v = (x as Record<string, unknown>)[k];
        if (typeof v !== 'string' || !HEX.test(v)) return null;
        t[k] = v.toLowerCase();
    }
    return t as Tema;
}

export const temaSama = (a: Tema, b: Tema) => KUNCI_TEMA.every((k) => a[k].toLowerCase() === b[k].toLowerCase());

const rgb = (hex: string): [number, number, number] => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)) as [number, number, number];

/** Luminans relatif WCAG. */
function luminans(hex: string) {
    const [r, g, b] = rgb(hex).map((c) => { const s = c / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Rasio kontras WCAG antara dua warna (1 sampai 21). Teks biasa butuh minimal 4,5. */
export function kontras(a: string, b: string) {
    const [x, y] = [luminans(a), luminans(b)].sort((p, q) => q - p);
    return (x + 0.05) / (y + 0.05);
}

/** Warna tulisan (putih atau hampir hitam) yang terbaca di atas latar tertentu. */
export const teksDiAtas = (latar: string) => (kontras('#ffffff', latar) >= kontras('#111827', latar) ? '#ffffff' : '#111827');

/** Peringatan keterbacaan (rasio kontras di bawah 4,5) untuk pasangan warna yang menentukan; kosong bila aman. */
export function peringatanKontras(t: Tema): string[] {
    const w: string[] = [];
    if (kontras(t.sidebarTeks, t.sidebar) < 4.5) w.push('Tulisan menu samping sulit dibaca di atas latar menu samping.');
    if (kontras('#ffffff', t.aksen) < 4.5) w.push('Tulisan putih pada tombol berwarna aksen kurang terbaca; pilih aksen yang lebih gelap.');
    if (kontras('#24292f', t.kartu) < 4.5) w.push('Tulisan di kartu dan tabel kurang terbaca di atas latar kartu; pilih latar yang lebih terang.');
    return w;
}

const triplet = (hex: string) => rgb(hex).join(' ');

/**
 * CSS tema: variabel warna, serta penggantian kelas biru bawaan Tailwind (bg-blue-600 dan sejenisnya, dipakai di banyak tombol dan tautan)
 * ke warna aksen. Dikembalikan sebagai satu string untuk <style>; nilainya sudah divalidasi lewat temaSah.
 */
export function cssTema(t: Tema): string {
    const hitam = '#111827';
    return [
        `:root{--aksen:${t.aksen};--aksen-tua:color-mix(in srgb,${t.aksen} 82%,#000);--aksen-muda:color-mix(in srgb,${t.aksen} 9%,#fff);--aksen-muda2:color-mix(in srgb,${t.aksen} 17%,#fff);`
        + `--primary:${t.aksen};--ring:${t.aksen};--sidebar-primary:${t.aksen};--primary-foreground:${teksDiAtas(t.aksen) === '#ffffff' ? '#ffffff' : hitam}}`,
        // Latar berlaku di mode terang saja; mode gelap memakai palet gelap bawaan.
        `:root:not(.dark){--tema-kanvas:${t.kanvas};--tema-header:${t.header};--tema-sidebar:${t.sidebar};--tema-sidebar-teks:${t.sidebarTeks};`
        + `--tema-sidebar-kuat:${teksDiAtas(t.sidebar)};--tema-item-hover:color-mix(in srgb,${t.sidebarTeks} 10%,transparent);--tema-item-aktif:color-mix(in srgb,${t.sidebarTeks} 18%,transparent);`
        + `--tema-logout:${luminans(t.sidebar) < 0.3 ? '#fca5a5' : '#ba1a1a'};`
        + `--background:${t.kartu};--card:${t.kartu};--popover:${t.kartu};--theme-surface:${triplet(t.header)};--theme-surface-lowest:${triplet(t.kartu)}}`,
        `:root:not(.dark) body{background-color:${t.kanvas}}`,
        ':root .bg-blue-600,:root .bg-blue-500{background-color:var(--aksen)}',
        ':root .hover\\:bg-blue-700:hover{background-color:var(--aksen-tua)}',
        ':root .bg-blue-50{background-color:var(--aksen-muda)}',
        ':root .bg-blue-100{background-color:var(--aksen-muda2)}',
        ':root .text-blue-600,:root .text-blue-700,:root .text-blue-500{color:var(--aksen)}',
        ':root .hover\\:text-blue-700:hover,:root .hover\\:text-blue-600:hover{color:var(--aksen-tua)}',
        ':root .border-blue-500,:root .border-blue-300{border-color:var(--aksen)}',
        ':root .focus\\:ring-blue-500:focus{--tw-ring-color:var(--aksen)}',
    ].join('\n');
}
