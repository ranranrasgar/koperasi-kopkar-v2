import type { Db } from '../db.ts';
import { postJournal, type JournalLine } from './journal.ts';
import { fromUnits, round2, toUnits } from './money.ts';
import { batasPlafon, pesanPlafon } from './plafon.ts';
import { cicilan, jadwal, jasaTotal, jatuhTempo, persenToMicro, rpAdm, rpProvisi, type Cicilan, type Terms } from './pinjaman-calc.ts';
import { SISA_LUNAS } from '../pinjaman-sisa.ts';

export interface PencairanInput {
    kodeAgt: string;
    kodeKredit: string;          // jenis_kredit.kode_kredit, mis. 'C01'
    tglPinjaman: string;         // YYYY-MM-DD
    pokok: string | number;
    lama: number;                // jumlah angsuran
    kasPerkiraanId: number | string;
    opr: string;
    persenBunga?: string | number; // bawaan: jenis_kredit.bunga_kredit
    jatuhTempoHari?: number;       // bawaan: jenis_kredit.jatuh_tempo
    keterangan?: string;           // keterangan bebas pencairan (pinjaman_tunai.keterangan, maks 255 karakter)
}

export interface PencairanResult {
    id: number;
    noPinjaman: string;
    jasaTotal: string;
    jadwal: { ke: number; tanggal: string; pokok: string; jasa: string }[];
}

const mmyy = (d: string) => d.slice(5, 7) + d.slice(2, 4);

interface JenisKredit {
    id: string; nama_kredit: string; bunga_kredit: string; bunga_per: string; jatuh_tempo: number; mak_cicilan: number;
    persen_adm: string; persen_provisi: string; kunci_grade: boolean; maks_plafond: string; group_pinjaman: string;
    akun_kredit: string; akun_jasa: string; akun_adm: string; akun_provisi: string;
}

async function jenisKredit(db: Db, by: { kode?: string; id?: string }): Promise<JenisKredit> {
    const r = await db.query<JenisKredit>(
        `SELECT jk.id, jk.nama_kredit, jk.bunga_kredit, jk.bunga_per, jk.jatuh_tempo, jk.mak_cicilan, jk.persen_adm, jk.persen_provisi,
                jk.kunci_jika_melebihi_grade = 1 AS kunci_grade, COALESCE(jk.maks_plafond, 0)::text AS maks_plafond, jk.group_pinjaman,
                p1.kode_perkiraan akun_kredit, p2.kode_perkiraan akun_jasa, p3.kode_perkiraan akun_adm, p4.kode_perkiraan akun_provisi
           FROM jenis_kredit jk
           LEFT JOIN perkiraan p1 ON p1.id = jk.coa_kredit_id LEFT JOIN perkiraan p2 ON p2.id = jk.coa_jasa_id
           LEFT JOIN perkiraan p3 ON p3.id = jk.coa_adm_id    LEFT JOIN perkiraan p4 ON p4.id = jk.coa_provisi_id
          WHERE ${by.kode ? 'jk.kode_kredit = $1' : 'jk.id = $1'}`, [by.kode ?? by.id]);
    if (!r.rows[0]) throw new Error(`Jenis kredit ${by.kode ?? by.id} tidak ada`);
    return r.rows[0];
}

/** Pencairan pinjaman tunai: header, baris pencairan di rincian, jadwal tagih, dan jurnal dalam satu transaksi. */
export async function cairkanPinjaman(db: Db, i: PencairanInput): Promise<PencairanResult> {
    const a = await db.query<{ id: string; nama: string; nik: string; rp_grade: string | null }>('SELECT id, nama, nik, rp_grade::text FROM anggota WHERE kode_agt = $1 FOR UPDATE', [i.kodeAgt]);
    if (!a.rows[0]) throw new Error(`Anggota ${i.kodeAgt} tidak ditemukan`);
    const jk = await jenisKredit(db, { kode: i.kodeKredit });
    if (!Number.isInteger(i.lama) || i.lama < 1) throw new Error('Lama angsuran harus bilangan bulat >= 1');
    if (jk.mak_cicilan > 0 && i.lama > jk.mak_cicilan) throw new Error(`Lama ${i.lama} melebihi maksimum ${jk.mak_cicilan} untuk ${jk.nama_kredit}`);
    const kas = await db.query<{ kode_perkiraan: string }>('SELECT kode_perkiraan FROM perkiraan WHERE id = $1', [i.kasPerkiraanId]);
    if (!kas.rows[0]) throw new Error(`Akun kas ${i.kasPerkiraanId} tidak ada`);
    const pokok = toUnits(i.pokok);
    if (pokok <= 0n) throw new Error('Pokok harus lebih dari nol');
    const salahPlafon = pesanPlafon(Number(fromUnits(pokok)), batasPlafon({ kunciGrade: jk.kunci_grade, maksPlafond: jk.maks_plafond }, a.rows[0].rp_grade), 'anggota');
    if (salahPlafon) throw new Error(salahPlafon);

    const perAngsuran = jk.bunga_per.toUpperCase() === 'PER ANGSURAN';
    const persenBunga = i.persenBunga ?? jk.bunga_kredit;
    const t: Terms = { pokok, persenBunga: persenToMicro(persenBunga), perAngsuran, lama: i.lama,
        persenAdm: persenToMicro(jk.persen_adm), persenProvisi: persenToMicro(jk.persen_provisi) };
    const jasa = jasaTotal(t);
    const hari = i.jatuhTempoHari ?? jk.jatuh_tempo;

    const urutNo = Number((await db.query("SELECT nextval('seq_pinjaman_no') v")).rows[0].v);
    const noPinjaman = `CR-${mmyy(i.tglPinjaman)}-${urutNo}`;
    const h = await db.query<{ id: string }>(
        `INSERT INTO pinjaman_tunai (kode_agt, kode_kredit, no_pinjaman, no_pinjaman_urut, tgl_pinjaman, jatuh_tempo, persen_bunga, bunga_per,
            rp_pinjaman_pokok, lama_angsuran, jml_cicilan, sisa_cicilan, persen_adm, rp_adm, persen_provisi, rp_provisi, opr,
            anggota_id, jenis_kredit_id, kas_perkiraan_id, keterangan)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,0,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19) RETURNING id`,
        [i.kodeAgt, i.kodeKredit, noPinjaman, urutNo, i.tglPinjaman, hari, persenBunga, perAngsuran ? 1 : i.lama,
         fromUnits(pokok), i.lama, jk.persen_adm, fromUnits(rpAdm(t)), jk.persen_provisi, fromUnits(rpProvisi(t)), i.opr,
         a.rows[0].id, jk.id, i.kasPerkiraanId, i.keterangan?.trim().slice(0, 255) || null]);
    const pinjamanId = h.rows[0].id;
    // Pengajuan jenis ini yang disetujui untuk anggota ini sudah terpenuhi oleh pencairan ini (lewat tombol Cairkan atau form biasa).
    await db.query('UPDATE pengajuan_pinjaman SET menunggu_cair = false WHERE anggota_id = $1 AND jenis_kredit_id = $2 AND menunggu_cair', [a.rows[0].id, jk.id]);

    const urutR = Number((await db.query("SELECT nextval('seq_pinjaman_rincian_urut') v")).rows[0].v);
    await db.query(
        `INSERT INTO pinjaman_tunai_rincian (no_bukti, urut, no_pinjaman, deskripsi, kredit_pokok, saldo_pokok, kredit_bunga, saldo_bunga,
            angsuran_ke, tanggal_angsuran, pinjaman_tunai_id)
         VALUES ($1,$2,$1,'PENCAIRAN PINJAMAN',$3,$3,$4,$4,0,$5,$6)`,
        [noPinjaman, urutR, fromUnits(pokok), fromUnits(jasa), i.tglPinjaman, pinjamanId]);

    const rows = jadwal(t).map((c) => ({ ke: c.ke, tanggal: jatuhTempo(i.tglPinjaman, hari, c.ke), pokok: fromUnits(c.pokok), jasa: fromUnits(c.jasa),
        adm: fromUnits(c.adm), provisi: fromUnits(c.provisi) }));
    for (const r of rows) {
        const urutT = Number((await db.query("SELECT nextval('seq_pinjaman_tagih_urut') v")).rows[0].v);
        await db.query(
            `INSERT INTO pinjaman_tunai_rincian_tagih (no_pinjaman, urut, debit_pokok, debit_bunga, rp_adm, rp_provisi, angsuran_ke, tanggal_angsuran, pinjaman_tunai_id)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
            [noPinjaman, urutT, r.pokok, r.jasa, r.adm, r.provisi, r.ke, r.tanggal, pinjamanId]);
    }

    await postJournal(db, {
        nomorBukti: noPinjaman, tanggal: i.tglPinjaman, opr: i.opr, sumberTipe: 'pinjaman_tunai', sumberId: pinjamanId,
        deskripsi: `Pencairan ${jk.nama_kredit} a/n: ${a.rows[0].nama}/${a.rows[0].nik}`,
        lines: [{ kodePerkiraan: jk.akun_kredit, debit: fromUnits(pokok) }, { kodePerkiraan: kas.rows[0].kode_perkiraan, kredit: fromUnits(pokok) }],
    });
    return { id: Number(pinjamanId), noPinjaman, jasaTotal: fromUnits(jasa),
        jadwal: rows.map((r) => ({ ke: r.ke, tanggal: r.tanggal, pokok: r.pokok, jasa: r.jasa })) };
}

export interface AngsuranInput {
    noPinjaman: string;
    tanggal: string;
    kasPerkiraanId: number | string;
    opr: string;
    /** Penyesuaian manual kasir (mis. adm dibebaskan), atau nominal jadwal tagih untuk potongan gaji. Bawaan: dihitung dari ketentuan pinjaman. */
    override?: { pokok?: string | number; jasa?: string | number; adm?: string | number; provisi?: string | number };
    /** Pokok diisi kasir: harus 0 sampai sisa pokok, dan barisnya diberi tanda. Tidak dipakai potongan gaji, yang mengikuti jadwal tagih. */
    pokokManual?: boolean;
    /** Bila diisi, galat bila angsuran berikutnya bukan angsuran ke ini (mis. sudah dibayar setelah potongan digenerate). */
    angsuranKe?: number;
    /**
     * Dari form Setoran Angsuran (kasir), bukan Potongan Gaji. Hanya pinjaman BANK / PIHAK LAIN: jasa di bawah jadwal wajib disertai alasan
     * (minimal MIN_ALASAN_JASA karakter), yang ikut tercatat di keterangan angsuran. Pinjaman KOPERASI tidak butuh alasan: jasa yang kurang tetap tertagih.
     */
    dariKasir?: boolean;
    alasanJasa?: string;
}

export const MIN_ALASAN_JASA = 10;
/** Selisih di bawah Rp 1 dianggap pembulatan isian, bukan jasa yang dikurangi. */
const TOLERANSI_JASA = 10000n;
/** Sisa tagihan sampai nilai ini dianggap lunas (pembulatan jadwal), sama dengan SISA_LUNAS di pinjaman-sisa.ts. */
const TOLERANSI_LUNAS = toUnits(SISA_LUNAS);
const rupiah = (u: bigint) => Number(fromUnits(round2(u))).toLocaleString('id-ID');
const nol = (u: bigint) => (u > 0n ? u : 0n);

export interface AngsuranResult {
    noBukti: string;
    ke: number;
    pokok: string; jasa: string; adm: string; provisi: string;
    sisaPokok: string;
    /** Pinjaman KOPERASI: jasa kontrak yang belum dibayar setelah angsuran ini. Grup lain: saldo jasa buku. */
    sisaJasa: string;
    lunas: boolean;
}

/**
 * Angsuran berikutnya menurut aturan lunas (keputusan pengguna 16 November 2026), dipakai posting dan form Setoran Angsuran.
 * Pinjaman KOPERASI (`kontrak`): total pokok + jasa yang dibayar harus sama dengan pokok + jasa kontrak pencairan. Pokok/jasa per setoran boleh
 * berbeda dari jadwal, tetapi jasa yang kurang tetap tertagih; angsuran terakhir (ke-lama) wajib melunasi seluruh sisa, dan pinjaman yang
 * cicilannya sudah penuh tetapi masih bersisa menerima satu setoran pelunasan sisa (ke-lama+1 dst). Grup lain mengikuti aturan lama.
 * Mengembalikan null bila pinjaman sudah lunas.
 */
async function rencanaDari(db: Pick<Db, 'query'>, p: PinjamanBaris, grup: string) {
    const t: Terms = { pokok: toUnits(p.rp_pinjaman_pokok), persenBunga: persenToMicro(p.persen_bunga), perAngsuran: Number(p.bunga_per) === 1,
        lama: p.lama_angsuran, persenAdm: persenToMicro(p.persen_adm), persenProvisi: persenToMicro(p.persen_provisi) };
    const s = (await db.query<{ p: string; b: string; jb: string; kp: string }>(
        `SELECT COALESCE(SUM(kredit_pokok - debit_pokok),0)::text p, COALESCE(SUM(kredit_bunga - debit_bunga),0)::text b,
                COALESCE(SUM(debit_bunga),0)::text jb, COALESCE(SUM(kredit_pokok),0)::text kp
           FROM pinjaman_tunai_rincian WHERE pinjaman_tunai_id = $1`, [p.id])).rows[0];
    const kontrak = grup === 'KOPERASI';
    const sisaPokok = toUnits(s.p), saldoBunga = toUnits(s.b);
    // Pencairan yang dibatalkan (kredit pokok dibalik sampai nol) tidak punya jasa kontrak lagi.
    const jasaKontrak = toUnits(s.kp) > 0n ? jasaTotal(t) : 0n;
    const sisaJasa = kontrak ? jasaKontrak - toUnits(s.jb) : saldoBunga;
    const ke = p.jml_cicilan + 1;
    if (kontrak ? sisaPokok + sisaJasa <= TOLERANSI_LUNAS : ke > p.lama_angsuran) return null;

    let c: Cicilan;
    if (ke > p.lama_angsuran) c = { ke, pokok: nol(sisaPokok), jasa: nol(sisaJasa), adm: 0n, provisi: 0n };
    else {
        c = cicilan(t, ke);
        const bagian = await pembagianBank(db, p.no_pinjaman, c.pokok, c.jasa);
        if (bagian) { c.pokok = bagian.pokok; c.jasa = bagian.jasa; }
        if (kontrak && ke === p.lama_angsuran) { c.pokok = nol(sisaPokok); c.jasa = nol(sisaJasa); }
    }
    return { c, kontrak, akhir: kontrak && ke >= p.lama_angsuran, sisaPokok, sisaJasa, saldoBunga };
}

interface PinjamanBaris {
    id: string; no_pinjaman: string; rp_pinjaman_pokok: string; persen_bunga: string; bunga_per: number | string; lama_angsuran: number;
    jml_cicilan: number; persen_adm: string; persen_provisi: string; jenis_kredit_id: string;
}

/** Angsuran berikutnya untuk form Setoran Angsuran (nilai rupiah sebagai teks), atau null bila pinjaman sudah lunas / tidak ada. */
export async function rencanaAngsuran(db: Pick<Db, 'query'>, noPinjaman: string) {
    const p = (await db.query<PinjamanBaris & { grup: string }>(
        `SELECT p.*, jk.group_pinjaman grup FROM pinjaman_tunai p JOIN jenis_kredit jk ON jk.id = p.jenis_kredit_id WHERE p.no_pinjaman = $1`,
        [noPinjaman])).rows[0];
    if (!p) return null;
    const r = await rencanaDari(db, p, p.grup);
    if (!r) return null;
    return { ke: r.c.ke, lama: p.lama_angsuran, pokok: fromUnits(r.c.pokok), jasa: fromUnits(r.c.jasa), adm: fromUnits(r.c.adm), provisi: fromUnits(r.c.provisi),
        sisaPokok: fromUnits(r.sisaPokok), sisaJasa: fromUnits(r.sisaJasa), kontrak: r.kontrak, akhir: r.akhir };
}

/** Jurnal angsuran: debit kas sebesar jumlah baris-baris kredit yang sudah dibulatkan 2 desimal. */
export function barisJurnalAngsuran(c: { pokok: bigint; jasa: bigint; adm: bigint; provisi: bigint },
    akun: { kas: string; kredit: string; jasa: string; adm: string; provisi: string }): JournalLine[] {
    const k = [
        { kodePerkiraan: akun.kredit, kredit: round2(c.pokok) },
        { kodePerkiraan: akun.jasa, kredit: round2(c.jasa) },
        { kodePerkiraan: akun.adm, kredit: round2(c.adm) },
        { kodePerkiraan: akun.provisi, kredit: round2(c.provisi) },
    ];
    const total = k.reduce((s, l) => s + l.kredit, 0n);
    return [{ kodePerkiraan: akun.kas, debit: fromUnits(total) },
        ...k.map((l) => ({ kodePerkiraan: l.kodePerkiraan, kredit: fromUnits(l.kredit) }))];
}

/**
 * Pinjaman bank (mis. BRI): operator desktop membagi angsuran berbeda dari jadwal, sebagian masuk jasa pengelolaan koperasi, totalnya tetap sama.
 * Pembagian itu tidak tersimpan di mana pun selain buku pinjaman, jadi diambil dari angsuran terakhir yang berbeda dengan jadwal dan totalnya sama.
 * Kondisi `rincian` dipakai juga SQL_ANGSURAN_POTONGAN supaya Potongan Gaji dan Setoran Angsuran selalu sama.
 */
export const sqlPembagianBank = (pinjamanId: string, pokok: string, jasa: string) => `
    SELECT r.debit_pokok AS pokok, r.debit_bunga AS jasa FROM pinjaman_tunai_rincian r
     WHERE r.pinjaman_tunai_id = ${pinjamanId} AND r.angsuran_ke > 0 AND ABS(r.debit_pokok - ${pokok}) > 1
       AND ABS(r.debit_pokok + r.debit_bunga - ${pokok} - ${jasa}) <= 1
     ORDER BY r.tanggal_angsuran DESC, r.urut DESC LIMIT 1`;

export async function pembagianBank(db: Pick<Db, 'query'>, noPinjaman: string, pokok: bigint, jasa: bigint) {
    const r = (await db.query<{ pokok: string; jasa: string }>(
        `SELECT b.pokok, b.jasa FROM pinjaman_tunai p JOIN jenis_kredit jk ON jk.id = p.jenis_kredit_id AND jk.group_pinjaman = 'BANK / PIHAK LAIN'
           CROSS JOIN LATERAL (${sqlPembagianBank('p.id', '$2::numeric', '$3::numeric')}) b WHERE p.no_pinjaman = $1`,
        [noPinjaman, fromUnits(pokok), fromUnits(jasa)])).rows[0];
    return r ? { pokok: toUnits(r.pokok), jasa: toUnits(r.jasa) } : null;
}

/** Satu angsuran: rincian, penanda jadwal, kenaikan jml_cicilan, dan jurnal dalam satu transaksi. */
export async function bayarAngsuran(db: Db, i: AngsuranInput): Promise<AngsuranResult> {
    const p = (await db.query(`SELECT p.*, a.nama, a.nik FROM pinjaman_tunai p JOIN anggota a ON a.id = p.anggota_id
        WHERE p.no_pinjaman = $1 FOR UPDATE OF p`, [i.noPinjaman])).rows[0];
    if (!p) throw new Error(`Pinjaman ${i.noPinjaman} tidak ditemukan`);
    const kas = await db.query<{ kode_perkiraan: string }>('SELECT kode_perkiraan FROM perkiraan WHERE id = $1', [i.kasPerkiraanId]);
    if (!kas.rows[0]) throw new Error(`Akun kas ${i.kasPerkiraanId} tidak ada`);
    const jk = await jenisKredit(db, { id: p.jenis_kredit_id });

    const r = await rencanaDari(db, p, jk.group_pinjaman);
    if (!r) throw new Error(`Pinjaman ${i.noPinjaman} sudah lunas`);
    const { c } = r, ke = c.ke;
    if (i.angsuranKe !== undefined && i.angsuranKe !== ke)
        throw new Error(`Pinjaman ${i.noPinjaman}: angsuran berikutnya ke-${ke}, bukan ke-${i.angsuranKe}`);
    const pokokJadwal = c.pokok, jasaJadwal = c.jasa;
    if (i.override?.pokok !== undefined) c.pokok = toUnits(i.override.pokok);
    if (i.override?.jasa !== undefined) c.jasa = toUnits(i.override.jasa);
    if (i.override?.adm !== undefined) c.adm = toUnits(i.override.adm);
    if (i.override?.provisi !== undefined) c.provisi = toUnits(i.override.provisi);

    if (c.jasa < 0n) throw new Error('Jasa tidak boleh negatif');
    if (i.pokokManual) {
        if (c.pokok < 0n) throw new Error('Pokok tidak boleh negatif');
        if (c.pokok > r.sisaPokok) throw new Error(`Pokok ${fromUnits(c.pokok)} melebihi sisa pokok ${fromUnits(r.sisaPokok)}`);
        if (c.pokok + c.jasa + c.adm + c.provisi <= 0n) throw new Error('Jumlah angsuran harus lebih dari nol');
    }
    // Angsuran terakhir pinjaman KOPERASI: pokok + jasa harus pas melunasi sisa tagihan kontrak.
    // Jasa yang terlanjur lebih bayar (sisa jasa negatif) mengurangi kewajiban minimum, tetapi tidak membuat pokok wajib dibayar lebih.
    const sisaTagihan = nol(r.sisaPokok) + nol(r.sisaJasa);
    if (r.akhir && (c.pokok + c.jasa < r.sisaPokok + r.sisaJasa - TOLERANSI_LUNAS || c.pokok + c.jasa > sisaTagihan + TOLERANSI_LUNAS))
        throw new Error(`Angsuran ke-${ke} adalah angsuran terakhir: pokok + jasa harus melunasi sisa tagihan Rp ${rupiah(sisaTagihan)} `
            + `(pokok Rp ${rupiah(nol(r.sisaPokok))} + jasa Rp ${rupiah(nol(r.sisaJasa))}), bukan Rp ${rupiah(c.pokok + c.jasa)}`);
    const sisaPokok = r.sisaPokok - c.pokok, sisaBunga = r.saldoBunga - c.jasa;
    const jasaKurang = !r.kontrak && i.dariKasir && c.jasa < jasaJadwal - TOLERANSI_JASA;
    const alasanJasa = (i.alasanJasa ?? '').replace(/\s+/g, ' ').trim();
    if (jasaKurang && alasanJasa.length < MIN_ALASAN_JASA)
        throw new Error(`Jasa Rp ${rupiah(c.jasa)} di bawah jadwal Rp ${rupiah(jasaJadwal)}: isi alasan jasa tidak ditagih (minimal ${MIN_ALASAN_JASA} karakter)`);
    const jasaDitunda = r.kontrak && !r.akhir && c.jasa < jasaJadwal - TOLERANSI_JASA;
    const deskripsi = [ke > p.lama_angsuran ? `Pelunasan sisa ke ${ke}` : `Setoran ke ${ke}`, i.pokokManual && c.pokok !== pokokJadwal ? ' (pokok diubah)' : '',
        jasaKurang ? ` (jasa tidak ditagih: ${alasanJasa})` : '', jasaDitunda ? ' (jasa kurang, tetap tertagih)' : '']
        .join('').slice(0, 100);

    const urut = Number((await db.query("SELECT nextval('seq_pinjaman_rincian_urut') v")).rows[0].v);
    const noBukti = `ANGS-CR-${mmyy(i.tanggal)}-${urut}`;
    await db.query(
        `INSERT INTO pinjaman_tunai_rincian (no_bukti, urut, no_pinjaman, deskripsi, debit_pokok, saldo_pokok, debit_bunga, saldo_bunga,
            rp_adm, rp_provisi, angsuran_ke, tanggal_angsuran, kas_perkiraan_id, pinjaman_tunai_id)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
        [noBukti, urut, i.noPinjaman, deskripsi, fromUnits(c.pokok), fromUnits(sisaPokok), fromUnits(c.jasa), fromUnits(sisaBunga),
         fromUnits(c.adm), fromUnits(c.provisi), ke, i.tanggal, i.kasPerkiraanId, p.id]);

    // Tandai baris jadwal angsuran ini sebagai terbayar.
    await db.query(
        `UPDATE pinjaman_tunai_rincian_tagih SET no_bukti = $1, tgl_bayar = $2, bayar_pokok = $3, bayar_bunga = $4
          WHERE pinjaman_tunai_id = $5 AND angsuran_ke = $6`,
        [noBukti, i.tanggal, fromUnits(c.pokok), fromUnits(c.jasa), p.id, ke]);
    await db.query('UPDATE pinjaman_tunai SET jml_cicilan = $1, sisa_cicilan = $2, tgl_akhir_bayar = $3 WHERE id = $4',
        [ke, Math.max(p.lama_angsuran - ke, 0), i.tanggal, p.id]);

    await postJournal(db, {
        nomorBukti: noBukti, tanggal: i.tanggal, opr: i.opr, sumberTipe: 'pinjaman_tunai_rincian', sumberId: p.id, noBuktiTransaksi: i.noPinjaman,
        deskripsi: `Setoran ${jk.nama_kredit} a/n: ${p.nama}/${p.nik}`,
        lines: barisJurnalAngsuran(c, { kas: kas.rows[0].kode_perkiraan, kredit: jk.akun_kredit, jasa: jk.akun_jasa, adm: jk.akun_adm, provisi: jk.akun_provisi }),
    });
    return { noBukti, ke, pokok: fromUnits(c.pokok), jasa: fromUnits(c.jasa), adm: fromUnits(c.adm), provisi: fromUnits(c.provisi),
        sisaPokok: fromUnits(sisaPokok), sisaJasa: fromUnits(r.sisaJasa - c.jasa),
        lunas: r.kontrak ? sisaPokok + r.sisaJasa - c.jasa <= TOLERANSI_LUNAS : ke >= p.lama_angsuran };
}
