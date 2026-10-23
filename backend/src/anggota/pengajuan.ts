import type pg from 'pg';
import type { Db } from '../db.ts';

// Pengajuan kredit oleh anggota (PWA). Aplikasi lama hanya memvalidasi di HP dan server menerima persen bunga/biaya
// dari HP (docs/analisis-aplikasi-mobile-lama.md bagian 4). Di sini semua aturan dicek di server dengan urutan yang
// sama, dan persen selalu diambil dari jenis_kredit.

/** Sisa pinjaman (pokok + jasa) sampai nilai ini dianggap lunas: receh pembulatan tidak mengunci pengajuan (keputusan pengguna 23 Oktober 2026). */
export const SISA_LUNAS = 100;
/** Tanggal realisasi paling jauh dari hari ini. */
const MAKS_HARI_REALISASI = 365;

export interface JenisKreditAnggota {
    id: string; kode: string; nama: string; persenBunga: string; perAngsuran: boolean; maksCicilan: number;
    persenAdm: string; persenProvisi: string; persenDenda: string; kunciStaff: boolean; kunciGrade: boolean; kunciSisa: boolean;
}

const KOLOM_JENIS = `id::text, kode_kredit kode, nama_kredit nama, bunga_kredit::text "persenBunga",
    upper(bunga_per) = 'PER ANGSURAN' "perAngsuran", mak_cicilan "maksCicilan", COALESCE(persen_adm, 0)::text "persenAdm",
    COALESCE(persen_provisi, 0)::text "persenProvisi", COALESCE(persen_denda, 0)::text "persenDenda",
    kunci_hanya_untuk_staff = 1 "kunciStaff", kunci_jika_melebihi_grade = 1 "kunciGrade", kunci_jika_sisa = 1 "kunciSisa"`;

const isStaff = (statusStaff: string | null) => (statusStaff ?? '').trim() === 'Staff';

/** Jenis kredit yang boleh dipilih anggota: sama dengan getJenisKreditV1 (staff hanya produk staff, sebaliknya), tidak disembunyikan. */
export async function jenisKreditUntuk(db: pg.Pool | Db, anggotaId: number) {
    const r = await db.query<JenisKreditAnggota>(
        `SELECT ${KOLOM_JENIS} FROM jenis_kredit
          WHERE hide = false AND kunci_hanya_untuk_staff = (SELECT CASE WHEN trim(status_staff) = 'Staff' THEN 1 ELSE 0 END FROM anggota WHERE id = $1)
          ORDER BY nama_kredit`, [anggotaId]);
    return r.rows;
}

export interface IsianPengajuan {
    kodeKredit: string;
    lama: number;
    besar: number;          // rupiah bulat
    tglRealisasi: string;   // YYYY-MM-DD
    keterangan: string;
}

export type HasilPengajuan = { ok: true; id: number } | { ok: false; error: string };

const tanggalSah = (t: string) => /^\d{4}-\d{2}-\d{2}$/.test(t) && !Number.isNaN(Date.parse(`${t}T00:00:00Z`))
    && new Date(`${t}T00:00:00Z`).toISOString().slice(0, 10) === t;
const tambahHari = (t: string, n: number) => new Date(Date.parse(`${t}T00:00:00Z`) + n * 86400000).toISOString().slice(0, 10);

/**
 * Cek aturan lalu simpan pengajuan berstatus P. Jalankan di dalam transaksi (tx()), supaya mode uji berlaku.
 * hariIni dari pemanggil (zona Asia/Jakarta).
 */
export async function ajukanPinjaman(db: Db, anggotaId: number, i: IsianPengajuan, hariIni: string): Promise<HasilPengajuan> {
    const gagal = (error: string): HasilPengajuan => ({ ok: false, error });

    // Kunci baris anggota: dua pengajuan bersamaan dari anggota yang sama dicek satu per satu.
    const a = (await db.query<{ kode_agt: string; status_staff: string | null; rp_grade: string | null; aktif: boolean }>(
        'SELECT kode_agt, status_staff, rp_grade::text, aktif FROM anggota WHERE id = $1 FOR UPDATE', [anggotaId])).rows[0];
    if (!a || !a.aktif) return gagal('Data anggota tidak aktif. Hubungi pengurus koperasi.');

    const j = (await db.query<JenisKreditAnggota>(
        `SELECT ${KOLOM_JENIS} FROM jenis_kredit WHERE kode_kredit = $1 AND hide = false`, [i.kodeKredit])).rows[0];
    if (!j) return gagal('Pilih jenis pinjaman.');

    // Urutan dan makna pesan sama dengan aplikasi lama (PengajuanKreditActivity).
    const staff = isStaff(a.status_staff);
    if (j.kunciStaff && !staff) return gagal('Pinjaman ini hanya untuk staff.');
    if (!j.kunciStaff && staff) return gagal('Pinjaman ini bukan untuk staff.');
    if (j.kunciGrade && i.besar > Number(a.rp_grade ?? 0)) return gagal('Pinjaman ini tidak boleh melebihi grade (plafon) Anda.');
    if (j.kunciSisa) {
        const sisa = (await db.query(
            `SELECT 1 FROM pinjaman_tunai pt JOIN pinjaman_tunai_rincian r ON r.pinjaman_tunai_id = pt.id
              WHERE pt.anggota_id = $1 AND pt.jenis_kredit_id = $2
              GROUP BY pt.id HAVING SUM(r.kredit_pokok + r.kredit_bunga) - SUM(r.debit_pokok + r.debit_bunga) > $3 LIMIT 1`,
            [anggotaId, j.id, SISA_LUNAS])).rowCount;
        if (sisa) return gagal('Selesaikan dulu tagihan pinjaman jenis ini yang masih berjalan.');
    }
    if (!Number.isInteger(i.lama) || i.lama < 1) return gagal('Lama pinjaman harus diisi.');
    if (i.lama > j.maksCicilan) return gagal(`Lama pinjaman tidak boleh lebih dari ${j.maksCicilan} bulan.`);
    if (!Number.isSafeInteger(i.besar) || i.besar <= 0) return gagal('Besar pinjaman harus diisi.');
    if (i.besar > 1_000_000_000) return gagal('Besar pinjaman terlalu besar.');

    // Tambahan dibanding aplikasi lama: tanggal realisasi harus masuk akal dan keterangan dibatasi panjang kolom.
    if (!tanggalSah(i.tglRealisasi)) return gagal('Tanggal realisasi tidak sah.');
    if (i.tglRealisasi < hariIni) return gagal('Tanggal realisasi tidak boleh sebelum hari ini.');
    if (i.tglRealisasi > tambahHari(hariIni, MAKS_HARI_REALISASI)) return gagal('Tanggal realisasi paling lambat satu tahun dari hari ini.');
    const keterangan = i.keterangan.trim().replace(/\s+/g, ' ');
    if (keterangan.length > 100) return gagal('Keterangan paling banyak 100 karakter.');

    // Tambahan: satu pengajuan menunggu per jenis, supaya pengajuan tidak terkirim ganda.
    const menunggu = (await db.query(
        "SELECT 1 FROM pengajuan_pinjaman WHERE anggota_id = $1 AND jenis_kredit_id = $2 AND status = 'P' LIMIT 1", [anggotaId, j.id])).rowCount;
    if (menunggu) return gagal(`Pengajuan ${j.nama} Anda masih menunggu keputusan pengurus.`);

    const r = await db.query<{ id: string }>(
        `INSERT INTO pengajuan_pinjaman (tgl_realisasi, kd_anggota, kd_kredit, persen_bunga, lama_angsuran, rp_pinjaman_pokok, keterangan,
                status, persen_adm, persen_provisi, persen_denda, anggota_id, jenis_kredit_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'P', $8, $9, $10, $11, $12) RETURNING id`,
        [i.tglRealisasi, a.kode_agt, j.kode, j.persenBunga, i.lama, i.besar, keterangan || null,
            j.persenAdm, j.persenProvisi, j.persenDenda, anggotaId, j.id]);
    return { ok: true, id: Number(r.rows[0].id) };
}

export interface PengajuanSaya {
    id: string; tgl_realisasi: string; nama_kredit: string | null; lama_angsuran: number; rp_pinjaman_pokok: string;
    persen_bunga: string; keterangan: string | null; status: string;
}

/** Pengajuan milik anggota, terbaru dulu. */
export async function pengajuanSaya(db: pg.Pool | Db, anggotaId: number, batas = 50) {
    const r = await db.query<PengajuanSaya>(
        `SELECT pp.id::text, pp.tgl_realisasi, jk.nama_kredit, pp.lama_angsuran, pp.rp_pinjaman_pokok::text, pp.persen_bunga::text,
                pp.keterangan, pp.status
           FROM pengajuan_pinjaman pp LEFT JOIN jenis_kredit jk ON jk.id = pp.jenis_kredit_id
          WHERE pp.anggota_id = $1 ORDER BY pp.id DESC LIMIT $2`, [anggotaId, batas]);
    return r.rows;
}
