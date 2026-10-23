import { kirimKeOperator, kirimNotifikasi } from './push.ts';

// Pesan anggota ke koperasi (percakapan dua arah, teks saja): tabel pesan_percakapan dan pesan_isi (anggota-web.sql).
// Sengaja tanpa gambar: alamat gambar pengumuman terbuka untuk umum, tidak cocok untuk berkas pribadi anggota.
// Fungsi tulis dijalankan di dalam transaksi pemanggil; pengiriman push memakai fungsi terpisah setelah commit.

interface Db { query: (sql: string, params?: unknown[]) => Promise<{ rows: any[]; rowCount?: number | null }> }

/** Nama menu hak akses web; harus sama dengan MENU.pesanAnggota di frontend/src/config/akses.ts. */
export const MENU_PESAN = 'Pesan Anggota (web)';
export const MAKS_PESAN = 1000;
export const MAKS_SUBJEK = 100;
export const MAKS_PER_HARI = 20;
export const JEDA_DETIK = 10;

export class PesanSalah extends Error {}

export interface BarisPercakapan {
    id: number; subjek: string; status: 'buka' | 'selesai'; pesan_terakhir_pada: string
    belum_dibaca: boolean; cuplikan: string; pengirim_terakhir: 'anggota' | 'admin'
    anggota_id: number; nama: string; kode_agt: string
}
export interface IsiPesan { id: number; pengirim: 'anggota' | 'admin'; opr_nama: string | null; isi: string; dibuat_pada: string }

const ubahId = (r: Record<string, unknown>) => ({ ...r, id: Number(r.id), anggota_id: Number(r.anggota_id) });

function bersihkanIsi(isi: string) {
    const t = isi.trim();
    if (!t) throw new PesanSalah('Isi pesan wajib diisi');
    if (t.length > MAKS_PESAN) throw new PesanSalah(`Isi pesan maksimal ${MAKS_PESAN.toLocaleString('id-ID')} karakter`);
    return t;
}

/** Pesan baru (tanpa percakapanId, dengan subjek) atau lanjutan percakapan milik anggota ini. */
export async function kirimPesanAnggota(db: Db, a: { anggotaId: number; appUserId: number; percakapanId?: number | null; subjek?: string; isi: string }) {
    const isi = bersihkanIsi(a.isi);
    const r = await db.query(
        `SELECT count(*)::int n, EXTRACT(EPOCH FROM now() - max(i.dibuat_pada)) detik
           FROM pesan_isi i JOIN pesan_percakapan p ON p.id = i.percakapan_id
          WHERE p.anggota_id = $1 AND i.pengirim = 'anggota' AND i.dibuat_pada > now() - interval '1 day'`, [a.anggotaId]);
    if (r.rows[0].n >= MAKS_PER_HARI) throw new PesanSalah(`Batas ${MAKS_PER_HARI} pesan per hari tercapai. Coba lagi besok.`);
    if (r.rows[0].detik !== null && Number(r.rows[0].detik) < JEDA_DETIK) throw new PesanSalah('Tunggu beberapa detik sebelum mengirim pesan berikutnya');

    let id: number, subjek: string;
    if (a.percakapanId) {
        const p = await db.query('SELECT id, subjek FROM pesan_percakapan WHERE id = $1 AND anggota_id = $2 FOR UPDATE', [a.percakapanId, a.anggotaId]);
        if (!p.rows[0]) throw new PesanSalah('Percakapan tidak ditemukan');
        id = Number(p.rows[0].id); subjek = p.rows[0].subjek;
        await db.query(`UPDATE pesan_percakapan SET status = 'buka', belum_dibaca_admin = true, pesan_terakhir_pada = now() WHERE id = $1`, [id]);
    } else {
        subjek = (a.subjek ?? '').trim();
        if (!subjek) throw new PesanSalah('Subjek wajib diisi');
        if (subjek.length > MAKS_SUBJEK) throw new PesanSalah(`Subjek maksimal ${MAKS_SUBJEK} karakter`);
        const p = await db.query('INSERT INTO pesan_percakapan (anggota_id, app_user_id, subjek) VALUES ($1, $2, $3) RETURNING id', [a.anggotaId, a.appUserId, subjek]);
        id = Number(p.rows[0].id);
    }
    await db.query(`INSERT INTO pesan_isi (percakapan_id, pengirim, isi) VALUES ($1, 'anggota', $2)`, [id, isi]);
    return { percakapanId: id, subjek, isi };
}

/** Push ke operator berizin bahwa ada pesan masuk (panggil setelah transaksi tersimpan). */
export async function kabariOperatorPesanBaru(db: Db, p: { percakapanId: number; nama: string; subjek: string; isi: string }) {
    return kirimKeOperator(db, MENU_PESAN, {
        judul: `Pesan dari ${p.nama}`.slice(0, 60),
        isi: `${p.subjek}: ${p.isi}`.slice(0, 140),
        url: `/dashboard/pesan/${p.percakapanId}`,
    });
}

/** Balasan operator. Mengembalikan data untuk memberi tahu anggota (kabariAnggotaBalasan, setelah commit). */
export async function balasPesanAdmin(db: Db, b: { percakapanId: number; oprNama: string; isi: string }) {
    const isi = bersihkanIsi(b.isi);
    const p = await db.query('SELECT id, anggota_id, subjek FROM pesan_percakapan WHERE id = $1 FOR UPDATE', [b.percakapanId]);
    if (!p.rows[0]) throw new PesanSalah('Percakapan tidak ditemukan');
    await db.query(`INSERT INTO pesan_isi (percakapan_id, pengirim, opr_nama, isi) VALUES ($1, 'admin', $2, $3)`, [b.percakapanId, b.oprNama.slice(0, 50), isi]);
    await db.query(
        `UPDATE pesan_percakapan SET status = 'buka', belum_dibaca_anggota = true, belum_dibaca_admin = false, pesan_terakhir_pada = now() WHERE id = $1`, [b.percakapanId]);
    return { percakapanId: b.percakapanId, anggotaId: Number(p.rows[0].anggota_id), subjek: p.rows[0].subjek as string, isi };
}

/** Riwayat notifikasi anggota + push ke HP-nya; ketukan membuka percakapan. */
export async function kabariAnggotaBalasan(db: Db, r: { percakapanId: number; anggotaId: number; subjek: string; isi: string }) {
    return kirimNotifikasi(db, r.anggotaId, { judul: 'Balasan dari koperasi', isi: `${r.subjek}: ${r.isi}`.slice(0, 500), url: `/pesan/${r.percakapanId}`, email: false });
}

export async function aturSelesai(db: Db, percakapanId: number, selesai: boolean) {
    const r = await db.query('UPDATE pesan_percakapan SET status = $1 WHERE id = $2', [selesai ? 'selesai' : 'buka', percakapanId]);
    if (!r.rowCount) throw new PesanSalah('Percakapan tidak ditemukan');
}

export async function tandaiDibaca(db: Db, percakapanId: number, sisi: 'admin' | 'anggota') {
    await db.query(`UPDATE pesan_percakapan SET ${sisi === 'admin' ? 'belum_dibaca_admin' : 'belum_dibaca_anggota'} = false WHERE id = $1`, [percakapanId]);
}

const KOLOM = `p.id, p.subjek, p.status, to_char(p.pesan_terakhir_pada, 'YYYY-MM-DD HH24:MI') pesan_terakhir_pada, p.anggota_id, a.nama, a.kode_agt,
    (SELECT left(i.isi, 120) FROM pesan_isi i WHERE i.percakapan_id = p.id ORDER BY i.id DESC LIMIT 1) cuplikan,
    (SELECT i.pengirim FROM pesan_isi i WHERE i.percakapan_id = p.id ORDER BY i.id DESC LIMIT 1) pengirim_terakhir`;

export async function percakapanAnggota(db: Db, anggotaId: number): Promise<BarisPercakapan[]> {
    const r = await db.query(
        `SELECT ${KOLOM}, p.belum_dibaca_anggota belum_dibaca FROM pesan_percakapan p JOIN anggota a ON a.id = p.anggota_id
          WHERE p.anggota_id = $1 ORDER BY p.pesan_terakhir_pada DESC LIMIT 100`, [anggotaId]);
    return r.rows.map(ubahId) as unknown as BarisPercakapan[];
}

export async function percakapanAdmin(db: Db, status: 'buka' | 'selesai'): Promise<BarisPercakapan[]> {
    const r = await db.query(
        `SELECT ${KOLOM}, p.belum_dibaca_admin belum_dibaca FROM pesan_percakapan p JOIN anggota a ON a.id = p.anggota_id
          WHERE p.status = $1 ORDER BY p.belum_dibaca_admin DESC, p.pesan_terakhir_pada DESC LIMIT 200`, [status]);
    return r.rows.map(ubahId) as unknown as BarisPercakapan[];
}

/** Satu percakapan beserta isinya; anggotaId membatasi ke milik anggota itu (null = untuk operator). */
export async function detailPercakapan(db: Db, id: number, anggotaId: number | null) {
    const p = await db.query(
        `SELECT p.id, p.subjek, p.status, p.anggota_id, a.nama, a.kode_agt FROM pesan_percakapan p JOIN anggota a ON a.id = p.anggota_id
          WHERE p.id = $1 AND ($2::bigint IS NULL OR p.anggota_id = $2)`, [id, anggotaId]);
    if (!p.rows[0]) return null;
    const i = await db.query(
        `SELECT id, pengirim, opr_nama, isi, to_char(dibuat_pada, 'YYYY-MM-DD HH24:MI') dibuat_pada FROM pesan_isi WHERE percakapan_id = $1 ORDER BY id`, [id]);
    return {
        ...(ubahId(p.rows[0]) as { id: number; subjek: string; status: 'buka' | 'selesai'; anggota_id: number; nama: string; kode_agt: string }),
        isi: i.rows.map((x) => ({ ...x, id: Number(x.id) })) as IsiPesan[],
    };
}

/**
 * Pesan baru di satu percakapan setelah id tertentu (untuk pembaruan langsung di halaman percakapan). Pemanggil sedang
 * membuka percakapan, jadi pesan dari pihak lawan langsung ditandai terbaca. null bila bukan percakapan miliknya.
 */
export async function pesanSetelah(db: Db, id: number, anggotaId: number | null, setelahId: number, sisi: 'admin' | 'anggota') {
    const p = await db.query('SELECT 1 FROM pesan_percakapan WHERE id = $1 AND ($2::bigint IS NULL OR anggota_id = $2)', [id, anggotaId]);
    if (!p.rows[0]) return null;
    const i = await db.query(
        `SELECT id, pengirim, opr_nama, isi, to_char(dibuat_pada, 'YYYY-MM-DD HH24:MI') dibuat_pada
           FROM pesan_isi WHERE percakapan_id = $1 AND id > $2 ORDER BY id LIMIT 100`, [id, setelahId]);
    const isi = i.rows.map((x) => ({ ...x, id: Number(x.id) })) as IsiPesan[];
    if (isi.some((m) => m.pengirim !== (sisi === 'admin' ? 'admin' : 'anggota'))) await tandaiDibaca(db, id, sisi);
    return isi;
}

/** Jumlah percakapan yang menunggu operator, dan yang belum dibaca anggota. */
export async function hitungBelumDibaca(db: Db, sisi: 'admin' | 'anggota', anggotaId?: number) {
    try {
        const r = sisi === 'admin'
            ? await db.query(`SELECT count(*)::int n FROM pesan_percakapan WHERE belum_dibaca_admin AND status = 'buka'`)
            : await db.query('SELECT count(*)::int n FROM pesan_percakapan WHERE belum_dibaca_anggota AND anggota_id = $1', [anggotaId]);
        return r.rows[0].n as number;
    } catch (e) {
        if ((e as { code?: string }).code === '42P01') return 0;
        throw e;
    }
}
