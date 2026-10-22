// Pasang tabel Pusat Panduan dan isi awalnya dari database/panduan/**.md.
//
//   npm run panduan:pasang              buat tabel bila belum ada, tambahkan kategori/artikel yang belum ada (cocok lewat slug)
//   npm run panduan:pasang -- --timpa   kembalikan SEMUA panduan ke isi bawaan (suntingan dan artikel buatan admin dihapus)
//   PG_URL=...                          database tujuan (bawaan: PG_URL di frontend/.env.local)
//
// Struktur isi awal: database/panduan/NN-<slug-kategori>/_kategori.md dan NN-<slug-artikel>.md, dengan frontmatter
// sederhana (kunci: nilai) di antara dua baris '---'. Urutan diambil dari awalan angka nama folder/file.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const here = path.dirname(fileURLToPath(import.meta.url));
const AKAR = path.join(here, '..', 'panduan');
const TIMPA = process.argv.includes('--timpa');

function pgUrl() {
    if (process.env.PG_URL) return process.env.PG_URL;
    try {
        return fs.readFileSync(path.join(here, '../../frontend/.env.local'), 'utf8').match(/^PG_URL=(.*)$/m)?.[1]?.trim();
    } catch {
        return undefined;
    }
}

/** Pisahkan frontmatter (kunci: nilai) dari isi Markdown. */
export function bacaBerkas(file) {
    const teks = fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
    const m = teks.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
    if (!m) throw new Error(`${file}: frontmatter tidak ada`);
    const meta = Object.fromEntries(m[1].split('\n').filter((l) => l.includes(':'))
        .map((l) => [l.slice(0, l.indexOf(':')).trim(), l.slice(l.indexOf(':') + 1).trim()]));
    return { meta, isi: m[2].trim() + '\n' };
}

const urutDari = (nama) => Number(nama.match(/^(\d+)-/)?.[1] ?? 0);
const slugDari = (nama) => nama.replace(/^\d+-/, '').replace(/\.md$/, '');

export function bacaIsiAwal() {
    return fs.readdirSync(AKAR, { withFileTypes: true }).filter((d) => d.isDirectory()).sort((a, b) => a.name.localeCompare(b.name))
        .map((d) => {
            const folder = path.join(AKAR, d.name);
            const k = bacaBerkas(path.join(folder, '_kategori.md'));
            const artikel = fs.readdirSync(folder).filter((f) => f.endsWith('.md') && f !== '_kategori.md').sort().map((f) => {
                const a = bacaBerkas(path.join(folder, f));
                if (!a.meta.judul) throw new Error(`${d.name}/${f}: judul wajib`);
                return { slug: slugDari(f), urutan: urutDari(f), judul: a.meta.judul, ringkasan: a.meta.ringkasan || null,
                    href_menu: a.meta.menu || null, isi: a.isi };
            });
            if (!k.meta.nama) throw new Error(`${d.name}/_kategori.md: nama wajib`);
            return { slug: slugDari(d.name), urutan: urutDari(d.name), nama: k.meta.nama, ikon: k.meta.ikon || null,
                keterangan: k.meta.keterangan || null, artikel };
        });
}

async function main() {
    const url = pgUrl();
    if (!url) throw new Error('PG_URL tidak diset dan tidak ada di frontend/.env.local');
    const kategori = bacaIsiAwal();
    const slugs = kategori.flatMap((k) => k.artikel.map((a) => a.slug));
    const ganda = slugs.filter((s, i) => slugs.indexOf(s) !== i);
    if (ganda.length) throw new Error(`slug artikel ganda: ${ganda.join(', ')}`);

    const c = new pg.Client({ connectionString: url });
    await c.connect();
    const db = decodeURIComponent(new URL(url).pathname.slice(1));
    try {
        await c.query('BEGIN');
        await c.query(fs.readFileSync(path.join(here, 'panduan.sql'), 'utf8'));
        if (TIMPA) await c.query('DELETE FROM panduan; DELETE FROM panduan_kategori;');
        let kBaru = 0, aBaru = 0;
        for (const k of kategori) {
            const r = await c.query(
                `INSERT INTO panduan_kategori (slug, nama, keterangan, ikon, urutan) VALUES ($1,$2,$3,$4,$5)
                 ON CONFLICT (slug) DO NOTHING RETURNING id`, [k.slug, k.nama, k.keterangan, k.ikon, k.urutan]);
            if (r.rows[0]) kBaru++;
            const id = r.rows[0]?.id ?? (await c.query('SELECT id FROM panduan_kategori WHERE slug = $1', [k.slug])).rows[0].id;
            for (const a of k.artikel) {
                const ra = await c.query(
                    `INSERT INTO panduan (kategori_id, slug, judul, ringkasan, isi, href_menu, urutan, diubah_oleh)
                     VALUES ($1,$2,$3,$4,$5,$6,$7,'isi awal') ON CONFLICT (slug) DO NOTHING RETURNING id`,
                    [id, a.slug, a.judul, a.ringkasan, a.isi, a.href_menu, a.urutan]);
                if (ra.rows[0]) aBaru++;
            }
        }
        await c.query('COMMIT');
        const total = (await c.query('SELECT (SELECT COUNT(*) FROM panduan_kategori) k, (SELECT COUNT(*) FROM panduan) a')).rows[0];
        console.log(`${db}: ${TIMPA ? 'dikembalikan ke isi bawaan, ' : ''}${kBaru} kategori dan ${aBaru} artikel baru; total ${total.k} kategori, ${total.a} artikel.`);
    } catch (e) {
        await c.query('ROLLBACK');
        throw e;
    } finally {
        await c.end();
    }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url))
    main().catch((e) => { console.error(`Gagal: ${e.message}`); process.exit(1); });
