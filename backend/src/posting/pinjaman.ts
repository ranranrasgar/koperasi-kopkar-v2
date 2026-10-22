import type { Db } from '../db.ts';
import { postJournal, type JournalLine } from './journal.ts';
import { fromUnits, round2, toUnits } from './money.ts';
import { cicilan, jadwal, jasaTotal, jatuhTempo, persenToMicro, rpAdm, rpProvisi, type Terms } from './pinjaman-calc.ts';

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
    persen_adm: string; persen_provisi: string;
    akun_kredit: string; akun_jasa: string; akun_adm: string; akun_provisi: string;
}

async function jenisKredit(db: Db, by: { kode?: string; id?: string }): Promise<JenisKredit> {
    const r = await db.query<JenisKredit>(
        `SELECT jk.id, jk.nama_kredit, jk.bunga_kredit, jk.bunga_per, jk.jatuh_tempo, jk.mak_cicilan, jk.persen_adm, jk.persen_provisi,
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
    const a = await db.query<{ id: string; nama: string; nik: string }>('SELECT id, nama, nik FROM anggota WHERE kode_agt = $1 FOR UPDATE', [i.kodeAgt]);
    if (!a.rows[0]) throw new Error(`Anggota ${i.kodeAgt} tidak ditemukan`);
    const jk = await jenisKredit(db, { kode: i.kodeKredit });
    if (!Number.isInteger(i.lama) || i.lama < 1) throw new Error('Lama angsuran harus bilangan bulat >= 1');
    if (jk.mak_cicilan > 0 && i.lama > jk.mak_cicilan) throw new Error(`Lama ${i.lama} melebihi maksimum ${jk.mak_cicilan} untuk ${jk.nama_kredit}`);
    const kas = await db.query<{ kode_perkiraan: string }>('SELECT kode_perkiraan FROM perkiraan WHERE id = $1', [i.kasPerkiraanId]);
    if (!kas.rows[0]) throw new Error(`Akun kas ${i.kasPerkiraanId} tidak ada`);
    const pokok = toUnits(i.pokok);
    if (pokok <= 0n) throw new Error('Pokok harus lebih dari nol');

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
            anggota_id, jenis_kredit_id, kas_perkiraan_id)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,0,$10,$11,$12,$13,$14,$15,$16,$17,$18) RETURNING id`,
        [i.kodeAgt, i.kodeKredit, noPinjaman, urutNo, i.tglPinjaman, hari, persenBunga, perAngsuran ? 1 : i.lama,
         fromUnits(pokok), i.lama, jk.persen_adm, fromUnits(rpAdm(t)), jk.persen_provisi, fromUnits(rpProvisi(t)), i.opr,
         a.rows[0].id, jk.id, i.kasPerkiraanId]);
    const pinjamanId = h.rows[0].id;

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
    /** Penyesuaian manual kasir (mis. adm dibebaskan). Bawaan: dihitung dari ketentuan pinjaman. */
    override?: { jasa?: string | number; adm?: string | number; provisi?: string | number };
}

export interface AngsuranResult {
    noBukti: string;
    ke: number;
    pokok: string; jasa: string; adm: string; provisi: string;
    sisaPokok: string;
    lunas: boolean;
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

/** Satu angsuran: rincian, penanda jadwal, kenaikan jml_cicilan, dan jurnal dalam satu transaksi. */
export async function bayarAngsuran(db: Db, i: AngsuranInput): Promise<AngsuranResult> {
    const p = (await db.query(`SELECT p.*, a.nama, a.nik FROM pinjaman_tunai p JOIN anggota a ON a.id = p.anggota_id
        WHERE p.no_pinjaman = $1 FOR UPDATE OF p`, [i.noPinjaman])).rows[0];
    if (!p) throw new Error(`Pinjaman ${i.noPinjaman} tidak ditemukan`);
    const ke = p.jml_cicilan + 1;
    if (ke > p.lama_angsuran) throw new Error(`Pinjaman ${i.noPinjaman} sudah lunas`);
    const kas = await db.query<{ kode_perkiraan: string }>('SELECT kode_perkiraan FROM perkiraan WHERE id = $1', [i.kasPerkiraanId]);
    if (!kas.rows[0]) throw new Error(`Akun kas ${i.kasPerkiraanId} tidak ada`);
    const jk = await jenisKredit(db, { id: p.jenis_kredit_id });

    const t: Terms = { pokok: toUnits(p.rp_pinjaman_pokok), persenBunga: persenToMicro(p.persen_bunga), perAngsuran: p.bunga_per === 1,
        lama: p.lama_angsuran, persenAdm: persenToMicro(p.persen_adm), persenProvisi: persenToMicro(p.persen_provisi) };
    const c = cicilan(t, ke);
    if (i.override?.jasa !== undefined) c.jasa = toUnits(i.override.jasa);
    if (i.override?.adm !== undefined) c.adm = toUnits(i.override.adm);
    if (i.override?.provisi !== undefined) c.provisi = toUnits(i.override.provisi);

    const sisa = (await db.query<{ p: string; b: string }>(
        `SELECT COALESCE(SUM(kredit_pokok - debit_pokok),0) p, COALESCE(SUM(kredit_bunga - debit_bunga),0) b
           FROM pinjaman_tunai_rincian WHERE pinjaman_tunai_id = $1`, [p.id])).rows[0];
    const sisaPokok = toUnits(sisa.p) - c.pokok, sisaBunga = toUnits(sisa.b) - c.jasa;

    const urut = Number((await db.query("SELECT nextval('seq_pinjaman_rincian_urut') v")).rows[0].v);
    const noBukti = `ANGS-CR-${mmyy(i.tanggal)}-${urut}`;
    await db.query(
        `INSERT INTO pinjaman_tunai_rincian (no_bukti, urut, no_pinjaman, deskripsi, debit_pokok, saldo_pokok, debit_bunga, saldo_bunga,
            rp_adm, rp_provisi, angsuran_ke, tanggal_angsuran, kas_perkiraan_id, pinjaman_tunai_id)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
        [noBukti, urut, i.noPinjaman, `Setoran ke ${ke}`, fromUnits(c.pokok), fromUnits(sisaPokok), fromUnits(c.jasa), fromUnits(sisaBunga),
         fromUnits(c.adm), fromUnits(c.provisi), ke, i.tanggal, i.kasPerkiraanId, p.id]);

    // Tandai baris jadwal angsuran ini sebagai terbayar.
    await db.query(
        `UPDATE pinjaman_tunai_rincian_tagih SET no_bukti = $1, tgl_bayar = $2, bayar_pokok = $3, bayar_bunga = $4
          WHERE pinjaman_tunai_id = $5 AND angsuran_ke = $6`,
        [noBukti, i.tanggal, fromUnits(c.pokok), fromUnits(c.jasa), p.id, ke]);
    await db.query('UPDATE pinjaman_tunai SET jml_cicilan = $1, sisa_cicilan = $2, tgl_akhir_bayar = $3 WHERE id = $4',
        [ke, p.lama_angsuran - ke, i.tanggal, p.id]);

    await postJournal(db, {
        nomorBukti: noBukti, tanggal: i.tanggal, opr: i.opr, sumberTipe: 'pinjaman_tunai_rincian', sumberId: p.id,
        deskripsi: `Setoran ${jk.nama_kredit} a/n: ${p.nama}/${p.nik}`,
        lines: barisJurnalAngsuran(c, { kas: kas.rows[0].kode_perkiraan, kredit: jk.akun_kredit, jasa: jk.akun_jasa, adm: jk.akun_adm, provisi: jk.akun_provisi }),
    });
    return { noBukti, ke, pokok: fromUnits(c.pokok), jasa: fromUnits(c.jasa), adm: fromUnits(c.adm), provisi: fromUnits(c.provisi),
        sisaPokok: fromUnits(sisaPokok), lunas: ke === p.lama_angsuran };
}
