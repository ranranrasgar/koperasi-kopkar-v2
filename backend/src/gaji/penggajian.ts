import type { Db } from '../db.ts';
import { hitungGaji, type HasilGaji, type KodeHadir, type StatusPtkp } from './hitung.ts';
import { bacaPengaturanGaji, bacaTer } from './pengaturan.ts';
import { GalatGaji, type Periode } from './periode.ts';

// Penggajian satu periode (docs/prd-penggajian.md Tahap 4): rekap seperti sheet Master Karyawan dari kehadiran, lembur, dan isian manual.
// Selama draf selalu dihitung ulang; saat final hasilnya disalin ke gaji_slip.hasil sehingga slip tidak berubah lagi.
type Q = Pick<Db, 'query'>;

/** Satu baris rekap: identitas karyawan, jumlah hari per kode, lembur, dan semua komponen gaji (rupiah sebagai number). */
export interface BarisGaji {
    karyawanId: string; kode: string; nama: string; jabatan: string | null; bidang: string | null; atasan: string | null; tglMasuk: string | null;
    bank: string | null; noRek: string | null; atasNamaRek: string | null; npwp: string | null; statusPtkp: StatusPtkp; umk: number; tunjJabatan: number;
    hadir: Partial<Record<KodeHadir, number>>; hariKosong: number; jamLembur: number; jamBobot: number; ketPotLain: string | null;
    usulanKoperasi: number;
    gaji: { [K in keyof HasilGaji]: HasilGaji[K] extends bigint ? number : HasilGaji[K] };
}
export interface RekapGaji { periode: Periode; jumlahHari: number; baris: BarisGaji[]; final: boolean }

const keAngka = (h: HasilGaji) => Object.fromEntries(Object.entries(h).map(([k, v]) => [k, typeof v === 'bigint' ? Number(v) : v])) as BarisGaji['gaji'];
const rupiah = (v: string | number) => BigInt(Math.round(Number(v)));

async function bacaPeriodeId(db: Q, periodeId: string | number, kunci = false): Promise<Periode> {
    const p = (await db.query<Periode>(`SELECT id, periode, dari::text dari, sampai::text sampai, status FROM gaji_periode WHERE id = $1 ${kunci ? 'FOR UPDATE' : ''}`, [periodeId])).rows[0];
    if (!p) throw new GalatGaji('Periode gaji tidak ditemukan');
    return p;
}

/** Rekap periode. Final: dari salinan gaji_slip.hasil. Draf: dihitung dari data terkini. */
export async function rekapGaji(db: Q, periodeId: string | number): Promise<RekapGaji> {
    const p = await bacaPeriodeId(db, periodeId);
    const jumlahHari = Math.round((Date.parse(p.sampai) - Date.parse(p.dari)) / 86_400_000) + 1;
    if (p.status === 'final') {
        const r = (await db.query<{ hasil: BarisGaji }>('SELECT s.hasil FROM gaji_slip s WHERE s.periode_id = $1 AND s.hasil IS NOT NULL', [p.id])).rows;
        return { periode: p, jumlahHari, baris: r.map((x) => x.hasil).sort((a, b) => a.kode.localeCompare(b.kode)), final: true };
    }
    const [atur, ter] = await Promise.all([bacaPengaturanGaji(db), bacaTer(db)]);
    const kar = (await db.query<{
        id: string; kode: string; nama: string; jabatan: string | null; bidang: string | null; atasan: string | null; tgl_masuk: string | null; bank: string | null;
        no_rek: string | null; atas_nama_rek: string | null; npwp: string | null; status_ptkp: StatusPtkp; umk: string; tunj_jabatan: string; anggota_id: string | null;
    }>(`SELECT k.id, k.kode, k.nama, k.jabatan, k.bidang, k.atasan, k.tgl_masuk::text tgl_masuk, k.bank, k.no_rek, k.atas_nama_rek, k.npwp, k.status_ptkp,
               k.umk, k.tunj_jabatan, k.anggota_id
          FROM karyawan k
         WHERE k.aktif OR EXISTS (SELECT 1 FROM gaji_hadir h WHERE h.karyawan_id = k.id AND h.periode_id = $1)
            OR EXISTS (SELECT 1 FROM gaji_lembur l WHERE l.karyawan_id = k.id AND l.periode_id = $1)
         ORDER BY k.kode`, [p.id])).rows;
    const hadir = (await db.query<{ karyawan_id: string; kode: KodeHadir; n: number }>(
        'SELECT karyawan_id, kode, count(*)::int n FROM gaji_hadir WHERE periode_id = $1 GROUP BY 1, 2', [p.id])).rows;
    const lembur = (await db.query<{ karyawan_id: string; jam: string; bobot: string }>(
        'SELECT karyawan_id, sum(jam) jam, sum(jam_bobot) bobot FROM gaji_lembur WHERE periode_id = $1 GROUP BY 1', [p.id])).rows;
    const isian = (await db.query<{ karyawan_id: string; cad_resiko: string; thr: string; tunj_lain: string; pot_koperasi: string; pot_lain: string; ket_pot_lain: string | null }>(
        'SELECT karyawan_id, cad_resiko, thr, tunj_lain, pot_koperasi, pot_lain, ket_pot_lain FROM gaji_slip WHERE periode_id = $1', [p.id])).rows;
    // Usulan potongan koperasi: jadwal tagih pinjaman tunai anggota tertaut yang jatuh dalam periode dan belum terbayar.
    const usulan = (await db.query<{ anggota_id: string; n: string }>(
        `SELECT pt.anggota_id, sum(t.debit_pokok + t.debit_bunga + t.rp_adm + t.rp_provisi) n
           FROM pinjaman_tunai_rincian_tagih t JOIN pinjaman_tunai pt ON pt.id = t.pinjaman_tunai_id
          WHERE pt.anggota_id IN (SELECT anggota_id FROM karyawan WHERE anggota_id IS NOT NULL)
            AND t.tanggal_angsuran BETWEEN $1 AND $2 AND t.angsuran_ke > pt.jml_cicilan
          GROUP BY 1`, [p.dari, p.sampai])).rows;

    const baris = kar.map((k): BarisGaji => {
        const h: Partial<Record<KodeHadir, number>> = {};
        for (const x of hadir) if (x.karyawan_id === k.id) h[x.kode] = x.n;
        const l = lembur.find((x) => x.karyawan_id === k.id);
        const s = isian.find((x) => x.karyawan_id === k.id);
        const g = hitungGaji({
            umk: rupiah(k.umk), tunjJabatan: rupiah(k.tunj_jabatan), statusPtkp: k.status_ptkp, hadir: h, jamBobot: Number(l?.bobot ?? 0),
            cadResiko: rupiah(s?.cad_resiko ?? 0), thr: rupiah(s?.thr ?? 0), tunjLain: rupiah(s?.tunj_lain ?? 0),
            potKoperasi: rupiah(s?.pot_koperasi ?? 0), potLain: rupiah(s?.pot_lain ?? 0),
        }, atur, ter);
        const terisi = Object.values(h).reduce((a, b) => a + (b ?? 0), 0);
        return {
            karyawanId: k.id, kode: k.kode, nama: k.nama, jabatan: k.jabatan, bidang: k.bidang, atasan: k.atasan, tglMasuk: k.tgl_masuk, bank: k.bank, noRek: k.no_rek,
            atasNamaRek: k.atas_nama_rek, npwp: k.npwp, statusPtkp: k.status_ptkp, umk: Number(k.umk), tunjJabatan: Number(k.tunj_jabatan),
            hadir: h, hariKosong: jumlahHari - terisi, jamLembur: Number(l?.jam ?? 0), jamBobot: Number(l?.bobot ?? 0), ketPotLain: s?.ket_pot_lain ?? null,
            usulanKoperasi: Math.round(Number(usulan.find((u) => u.anggota_id === k.anggota_id)?.n ?? 0)), gaji: keAngka(g),
        };
    });
    return { periode: p, jumlahHari, baris, final: false };
}

export interface IsianSlip { periodeId: string | number; karyawanId: string | number; cadResiko: number; thr: number; tunjLain: number; potKoperasi: number; potLain: number; ketPotLain?: string | null }

/** Simpan isian manual satu karyawan (periode draf). */
export async function simpanIsianSlip(db: Q, i: IsianSlip): Promise<string> {
    const p = await bacaPeriodeId(db, i.periodeId, true);
    if (p.status !== 'draf') throw new GalatGaji(`Periode ${p.periode} sudah final; buka kembali dulu untuk mengubah`);
    const k = (await db.query<{ kode: string }>('SELECT kode FROM karyawan WHERE id = $1', [i.karyawanId])).rows[0];
    if (!k) throw new GalatGaji('Karyawan tidak ditemukan');
    const n = [i.cadResiko, i.thr, i.tunjLain, i.potKoperasi, i.potLain];
    if (n.some((x) => !Number.isSafeInteger(x) || x < 0 || x > 1_000_000_000)) throw new GalatGaji('Nominal harus rupiah bulat 0 sampai 1 miliar');
    await db.query(`INSERT INTO gaji_slip (periode_id, karyawan_id, cad_resiko, thr, tunj_lain, pot_koperasi, pot_lain, ket_pot_lain) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (periode_id, karyawan_id) DO UPDATE SET cad_resiko = EXCLUDED.cad_resiko, thr = EXCLUDED.thr, tunj_lain = EXCLUDED.tunj_lain,
            pot_koperasi = EXCLUDED.pot_koperasi, pot_lain = EXCLUDED.pot_lain, ket_pot_lain = EXCLUDED.ket_pot_lain`,
    [p.id, i.karyawanId, ...n, i.ketPotLain?.trim().slice(0, 255) || null]);
    return `Isian gaji ${k.kode} periode ${p.periode} disimpan`;
}

/** Finalkan periode: semua hari setiap karyawan harus sudah berkode, lalu hasil hitungan disalin ke gaji_slip.hasil. */
export async function finalkanPeriode(db: Q, periodeId: string | number, opr: string): Promise<string> {
    const p = await bacaPeriodeId(db, periodeId, true);
    if (p.status !== 'draf') throw new GalatGaji(`Periode ${p.periode} sudah final`);
    const r = await rekapGaji(db, p.id);
    if (r.baris.length === 0) throw new GalatGaji('Tidak ada karyawan untuk digaji pada periode ini');
    const kosong = r.baris.filter((b) => b.hariKosong > 0);
    if (kosong.length) throw new GalatGaji(`Kehadiran belum lengkap: ${kosong.map((b) => `${b.kode} (${b.hariKosong} hari kosong)`).join(', ')}. Lengkapi di Absensi Karyawan.`);
    for (const b of r.baris)
        await db.query(`INSERT INTO gaji_slip (periode_id, karyawan_id, hasil) VALUES ($1, $2, $3)
            ON CONFLICT (periode_id, karyawan_id) DO UPDATE SET hasil = EXCLUDED.hasil`, [p.id, b.karyawanId, JSON.stringify(b)]);
    await db.query("UPDATE gaji_periode SET status = 'final', final_oleh = $2, final_pada = now() WHERE id = $1", [p.id, opr.slice(0, 50)]);
    const bersih = r.baris.reduce((t, b) => t + b.gaji.gajiBersih, 0);
    return `Periode ${p.periode} final: ${r.baris.length} karyawan, gaji bersih Rp ${bersih.toLocaleString('id-ID')}`;
}

/** Kembalikan periode final ke draf (mis. ada koreksi); salinan hasil dihapus dan dihitung ulang saat final berikutnya. */
export async function bukaKembaliPeriode(db: Q, periodeId: string | number): Promise<string> {
    const p = await bacaPeriodeId(db, periodeId, true);
    if (p.status !== 'final') throw new GalatGaji(`Periode ${p.periode} masih draf`);
    await db.query('UPDATE gaji_slip SET hasil = NULL WHERE periode_id = $1', [p.id]);
    await db.query("UPDATE gaji_periode SET status = 'draf', final_oleh = NULL, final_pada = NULL WHERE id = $1", [p.id]);
    return `Periode ${p.periode} dibuka kembali (draf)`;
}

