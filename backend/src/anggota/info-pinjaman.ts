import PDFDocument from 'pdfkit';
import { fromUnits, toUnits } from '../posting/money.ts';
import { jatuhTempo } from '../posting/pinjaman-calc.ts';
import { kirimNotifikasi, type HasilKirim } from './push.ts';

// Informasi pinjaman untuk anggota setelah pencairan: notifikasi (riwayat dan Web Push di PWA) dan email berisi ringkasan kredit, jadwal
// angsuran, dan lampiran PDF jadwal angsuran. Email hanya terkirim ke anggota yang emailnya terverifikasi (lihat push.ts).

interface Db { query: (sql: string, params?: unknown[]) => Promise<{ rows: any[]; rowCount?: number | null }> }

export interface BarisJadwal { ke: number; tanggal: string; pokok: string; jasa: string; biaya: string; total: string; sisaPokok: string }

export interface InfoPinjaman {
    /** tunai: pinjaman uang/barang dengan jasa dan jadwal tagih; kpr: angsuran tetap per bulan (titipan ke bank), jadwal dihitung dari angsuran. */
    jenis: 'tunai' | 'kpr';
    koperasi: { nama: string; alamat: string };
    anggota: { id: number; nama: string; kodeAgt: string; nik: string | null };
    noPinjaman: string; namaKredit: string; kodeKredit: string; tanggal: string;
    pokok: string; lama: number; persenBunga: string; perAngsuran: boolean; persenAdm: string; persenProvisi: string; tanggalTagih: number;
    jasaTotal: string; admTotal: string; provisiTotal: string;
    jadwal: BarisJadwal[];
}

const rupiah = (v: string | number) => 'Rp ' + Math.round(Number(v)).toLocaleString('id-ID');
const persen = (v: string) => Number(v).toLocaleString('id-ID', { maximumFractionDigits: 4 }) + '%';
const BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const tgl = (t: string) => `${Number(t.slice(8, 10))} ${BULAN[Number(t.slice(5, 7)) - 1]} ${t.slice(0, 4)}`;

/**
 * KPR: angsuran tetap per bulan sampai pokok habis (angsuran terakhir sisanya), jatuh tempo mengikuti tanggal di jenis kredit.
 * Tidak ada jasa atau biaya; kolom jasa dan biaya di InfoPinjaman bernilai nol.
 */
async function bacaInfoKpr(db: Db, noPinjaman: string): Promise<InfoPinjaman | null> {
    const h = (await db.query(
        `SELECT k.no_pinjaman, k.tgl_pinjaman::text AS tanggal, k.rp_pinjaman_pokok::text AS pokok, k.lama_angsuran, k.rp_angsuran_per_bulan::text AS angsuran, k.jatuh_tempo,
                jk.nama_kredit, jk.kode_kredit, a.id AS anggota_id, a.nama, a.kode_agt, a.nik
           FROM kpr k JOIN anggota a ON a.id = k.anggota_id LEFT JOIN jenis_kredit jk ON jk.id = k.jenis_kredit_id WHERE k.no_pinjaman = $1`, [noPinjaman])).rows[0];
    if (!h) return null;
    const kop = (await db.query('SELECT nama_perusahaan, alamat_perusahaan1, kota_perusahaan FROM perusahaan ORDER BY id LIMIT 1')).rows[0];
    let sisa = toUnits(h.pokok);
    const per = toUnits(h.angsuran);
    const jadwal: BarisJadwal[] = [];
    for (let ke = 1; ke <= h.lama_angsuran; ke++) {
        const bayar = ke === h.lama_angsuran ? sisa : (per < sisa ? per : sisa); // angsuran terakhir melunasi sisa pokok
        sisa -= bayar;
        jadwal.push({ ke, tanggal: jatuhTempo(h.tanggal, h.jatuh_tempo, ke), pokok: fromUnits(bayar), jasa: '0', biaya: '0', total: fromUnits(bayar), sisaPokok: fromUnits(sisa < 0n ? 0n : sisa) });
    }
    return {
        jenis: 'kpr',
        koperasi: { nama: String(kop?.nama_perusahaan ?? 'Koperasi').trim(), alamat: [kop?.alamat_perusahaan1, kop?.kota_perusahaan].map((x) => String(x ?? '').trim()).filter(Boolean).join(', ') },
        anggota: { id: Number(h.anggota_id), nama: String(h.nama ?? '').trim(), kodeAgt: h.kode_agt, nik: h.nik },
        noPinjaman: h.no_pinjaman, namaKredit: h.nama_kredit ?? 'KPR', kodeKredit: h.kode_kredit ?? '', tanggal: h.tanggal,
        pokok: h.pokok, lama: h.lama_angsuran, persenBunga: '0', perAngsuran: true, persenAdm: '0', persenProvisi: '0', tanggalTagih: h.jatuh_tempo,
        jasaTotal: '0', admTotal: '0', provisiTotal: '0', jadwal,
    };
}

/** Baca pinjaman tunai atau KPR beserta jadwal angsurannya; null bila nomor pinjaman tidak ada. */
export async function bacaInfoPinjaman(db: Db, noPinjaman: string): Promise<InfoPinjaman | null> {
    const hkpr = await bacaInfoKpr(db, noPinjaman);
    if (hkpr) return hkpr;
    const h = (await db.query(
        `SELECT p.id, p.no_pinjaman, p.tgl_pinjaman::text AS tanggal, p.rp_pinjaman_pokok::text AS pokok, p.lama_angsuran, p.persen_bunga::text AS bunga,
                upper(jk.bunga_per) = 'PER ANGSURAN' AS per_angsuran, p.persen_adm::text AS adm, p.persen_provisi::text AS provisi, p.jatuh_tempo,
                jk.nama_kredit, jk.kode_kredit, a.id AS anggota_id, a.nama, a.kode_agt, a.nik
           FROM pinjaman_tunai p JOIN anggota a ON a.id = p.anggota_id LEFT JOIN jenis_kredit jk ON jk.id = p.jenis_kredit_id
          WHERE p.no_pinjaman = $1`, [noPinjaman])).rows[0];
    if (!h) return null;
    const tagih = (await db.query(
        `SELECT angsuran_ke, tanggal_angsuran::text AS tanggal, debit_pokok::text AS pokok, debit_bunga::text AS jasa, rp_adm::text AS adm, rp_provisi::text AS provisi
           FROM pinjaman_tunai_rincian_tagih WHERE pinjaman_tunai_id = $1 AND angsuran_ke > 0 ORDER BY angsuran_ke`, [h.id])).rows;
    const k = (await db.query('SELECT nama_perusahaan, alamat_perusahaan1, kota_perusahaan FROM perusahaan ORDER BY id LIMIT 1')).rows[0];
    let sisa = toUnits(h.pokok), jasa = 0n, adm = 0n, provisi = 0n;
    const jadwal: BarisJadwal[] = tagih.map((t) => {
        const p = toUnits(t.pokok), j = toUnits(t.jasa), a = toUnits(t.adm), v = toUnits(t.provisi);
        sisa -= p; jasa += j; adm += a; provisi += v;
        return { ke: t.angsuran_ke, tanggal: t.tanggal, pokok: fromUnits(p), jasa: fromUnits(j), biaya: fromUnits(a + v), total: fromUnits(p + j + a + v), sisaPokok: fromUnits(sisa < 0n ? 0n : sisa) };
    });
    return {
        jenis: 'tunai' as const,
        koperasi: { nama: String(k?.nama_perusahaan ?? 'Koperasi').trim(), alamat: [k?.alamat_perusahaan1, k?.kota_perusahaan].map((x) => String(x ?? '').trim()).filter(Boolean).join(', ') },
        anggota: { id: Number(h.anggota_id), nama: String(h.nama ?? '').trim(), kodeAgt: h.kode_agt, nik: h.nik },
        noPinjaman: h.no_pinjaman, namaKredit: h.nama_kredit ?? 'Pinjaman', kodeKredit: h.kode_kredit ?? '', tanggal: h.tanggal,
        pokok: h.pokok, lama: h.lama_angsuran, persenBunga: h.bunga, perAngsuran: !!h.per_angsuran, persenAdm: h.adm, persenProvisi: h.provisi, tanggalTagih: h.jatuh_tempo,
        jasaTotal: fromUnits(jasa), admTotal: fromUnits(adm), provisiTotal: fromUnits(provisi), jadwal,
    };
}

/** PDF jadwal angsuran (A4): identitas koperasi dan anggota, ringkasan kredit, tabel angsuran dengan sisa pokok, dan total. */
export function jadwalAngsuranPdf(i: InfoPinjaman): Promise<Buffer> {
    return new Promise((selesai, gagal) => {
        const doc = new PDFDocument({ size: 'A4', margin: 40, info: { Title: `Jadwal Angsuran ${i.noPinjaman}`, Author: i.koperasi.nama } });
        const potongan: Buffer[] = [];
        doc.on('data', (c: Buffer) => potongan.push(c));
        doc.on('end', () => selesai(Buffer.concat(potongan)));
        doc.on('error', gagal);

        const kiri = 40, lebar = doc.page.width - 80;
        doc.font('Helvetica-Bold').fontSize(14).text(i.koperasi.nama.toUpperCase(), kiri, 40, { width: lebar, align: 'center' });
        if (i.koperasi.alamat) doc.font('Helvetica').fontSize(9).text(i.koperasi.alamat, { width: lebar, align: 'center' });
        doc.moveTo(kiri, doc.y + 6).lineTo(kiri + lebar, doc.y + 6).lineWidth(1.5).stroke();
        doc.moveDown(1.2).font('Helvetica-Bold').fontSize(12).text(i.jenis === 'kpr' ? 'JADWAL ANGSURAN KPR' : 'JADWAL ANGSURAN PINJAMAN', kiri, doc.y, { width: lebar, align: 'center' });
        doc.moveDown(0.8);

        const kpr = i.jenis === 'kpr';
        const info: [string, string][] = [
            ['Nama anggota', `${i.anggota.nama} (${i.anggota.kodeAgt})`], [kpr ? 'No. KPR' : 'No. pinjaman', i.noPinjaman],
            ['Jenis kredit', `${i.kodeKredit} ${i.namaKredit}`.trim()], ['Tanggal pencairan', tgl(i.tanggal)],
            [kpr ? 'Pokok KPR' : 'Pokok pinjaman', rupiah(i.pokok)], ['Lama angsuran', `${i.lama} kali (jatuh tempo tanggal ${i.tanggalTagih} tiap bulan)`],
            ...(kpr
                ? [['Angsuran', `${rupiah(i.jadwal[0]?.total ?? 0)} per bulan`] as [string, string]]
                : [
                    ['Jasa', `${persen(i.persenBunga)} ${i.perAngsuran ? 'per bulan' : 'sekali untuk seluruh masa pinjaman'} · total ${rupiah(i.jasaTotal)}`] as [string, string],
                    ['Biaya', `adm ${persen(i.persenAdm)} (${rupiah(i.admTotal)}), provisi ${persen(i.persenProvisi)} (${rupiah(i.provisiTotal)}), ditagih pada angsuran ke-1`] as [string, string],
                ]),
        ];
        const y0 = doc.y;
        info.forEach(([k, v], n) => {
            doc.font('Helvetica').fontSize(9).fillColor('#555555').text(k, kiri, y0 + n * 14, { width: 100 });
            doc.font('Helvetica-Bold').fillColor('#000000').text(v, kiri + 105, y0 + n * 14, { width: lebar - 105 });
        });
        doc.y = y0 + info.length * 14 + 12;

        // Tabel angsuran: judul kolom diulang di tiap halaman. KPR hanya angsuran dan sisa pokok (tanpa jasa dan biaya).
        const kolom: { judul: string; lebar: number; nilai: (b: BarisJadwal) => string; total?: (b: BarisJadwal) => string }[] = kpr ? [
            { judul: 'Ke', lebar: 34, nilai: (b) => String(b.ke) }, { judul: 'Jatuh tempo', lebar: 160, nilai: (b) => tgl(b.tanggal) },
            { judul: 'Angsuran', lebar: 150, nilai: (b) => rupiah(b.total), total: (b) => b.total }, { judul: 'Sisa pokok', lebar: 0, nilai: (b) => rupiah(b.sisaPokok) },
        ] : [
            { judul: 'Ke', lebar: 28, nilai: (b) => String(b.ke) }, { judul: 'Jatuh tempo', lebar: 92, nilai: (b) => tgl(b.tanggal) },
            { judul: 'Pokok', lebar: 74, nilai: (b) => rupiah(b.pokok), total: (b) => b.pokok }, { judul: 'Jasa', lebar: 66, nilai: (b) => rupiah(b.jasa), total: (b) => b.jasa },
            { judul: 'Adm+Prov.', lebar: 62, nilai: (b) => (Number(b.biaya) ? rupiah(b.biaya) : '-'), total: (b) => b.biaya },
            { judul: 'Angsuran', lebar: 74, nilai: (b) => rupiah(b.total), total: (b) => b.total }, { judul: 'Sisa pokok', lebar: 0, nilai: (b) => rupiah(b.sisaPokok) },
        ];
        kolom[kolom.length - 1].lebar = lebar - kolom.slice(0, -1).reduce((t, k) => t + k.lebar, 0);
        const tinggi = 17;
        const kepala = (y: number) => {
            doc.rect(kiri, y, lebar, tinggi).fill('#e8ecef').fillColor('#000000');
            let x = kiri;
            kolom.forEach((k, n) => { doc.font('Helvetica-Bold').fontSize(8.5).text(k.judul, x + 3, y + 5, { width: k.lebar - 6, align: n < 2 ? 'left' : 'right' }); x += k.lebar; });
            return y + tinggi;
        };
        const baris = (b: string[], y: number, tebal = false) => {
            let x = kiri;
            b.forEach((v, n) => { doc.font(tebal ? 'Helvetica-Bold' : 'Helvetica').fontSize(8.5).text(v, x + 3, y + 5, { width: kolom[n].lebar - 6, align: n < 2 ? 'left' : 'right', lineBreak: false }); x += kolom[n].lebar; });
            doc.moveTo(kiri, y + tinggi).lineTo(kiri + lebar, y + tinggi).lineWidth(0.4).strokeColor('#c9cfd4').stroke().strokeColor('#000000');
            return y + tinggi;
        };
        let y = kepala(doc.y);
        for (const b of i.jadwal) {
            if (y + tinggi > doc.page.height - 70) { doc.addPage(); y = kepala(40); }
            y = baris(kolom.map((k) => k.nilai(b)), y);
        }
        if (y + tinggi > doc.page.height - 70) { doc.addPage(); y = 40; }
        y = baris(kolom.map((k, n) => (n === 1 ? 'Total' : k.total ? rupiah(i.jadwal.reduce((t, b) => t + Number(k.total!(b)), 0)) : '')), y, true);

        doc.font('Helvetica').fontSize(8).fillColor('#555555')
            .text('Jadwal ini dibuat otomatis oleh sistem saat pencairan dan mengikuti ketentuan jenis kredit. Angsuran dipotong dari gaji atau dibayar ke koperasi sesuai jatuh tempo. '
                + 'Hubungi pengurus koperasi bila ada pertanyaan.', kiri, y + 12, { width: lebar });
        doc.end();
    });
}

/** Teks email: ringkasan kredit lalu jadwal angsuran (dipotong 36 baris; selengkapnya ada di lampiran PDF). */
export function teksInfoPinjaman(i: InfoPinjaman) {
    const kpr = i.jenis === 'kpr';
    const bar = i.jadwal.slice(0, 36).map((b) => `${String(b.ke).padStart(2)}. ${tgl(b.tanggal).padEnd(17)} angsuran ${rupiah(b.total)}`).join('\n');
    return [
        kpr ? 'KPR Anda telah dicatat. Berikut informasinya:' : 'Pinjaman Anda telah dicairkan. Berikut informasinya:',
        [`${kpr ? 'No. KPR' : 'No. pinjaman'}: ${i.noPinjaman}`, `Jenis kredit: ${i.kodeKredit} ${i.namaKredit}`.trim(), `Tanggal pencairan: ${tgl(i.tanggal)}`, `${kpr ? 'Pokok KPR' : 'Pokok pinjaman'}: ${rupiah(i.pokok)}`,
            `Lama angsuran: ${i.lama} kali, jatuh tempo tanggal ${i.tanggalTagih} tiap bulan`,
            ...(kpr ? [`Angsuran: ${rupiah(i.jadwal[0]?.total ?? 0)} per bulan`] : [
                `Jasa: ${persen(i.persenBunga)} ${i.perAngsuran ? 'per bulan' : 'sekali'} (total ${rupiah(i.jasaTotal)})`,
                `Biaya adm dan provisi: ${rupiah(Number(i.admTotal) + Number(i.provisiTotal))}, ditagih pada angsuran ke-1`])].join('\n'),
        `Jadwal angsuran:\n${bar}${i.jadwal.length > 36 ? `\n... dan ${i.jadwal.length - 36} angsuran lagi (lihat lampiran)` : ''}`,
        'Jadwal angsuran lengkap tersedia di lampiran PDF email ini. Status pinjaman dan angsuran juga bisa dilihat kapan saja di aplikasi anggota.',
    ].join('\n\n');
}

/**
 * Kabari anggota setelah pencairan pinjaman tunai: notifikasi di aplikasi (riwayat dan push) dan email beserta PDF jadwal angsuran.
 * Dipanggil setelah pencairan tersimpan; pemanggil menangkap galatnya supaya pencairan tidak ikut gagal.
 */
export async function kirimInfoPencairan(db: Db, noPinjaman: string): Promise<HasilKirim | null> {
    const i = await bacaInfoPinjaman(db, noPinjaman);
    if (!i) return null;
    const pertama = i.jadwal[0];
    const pdf = await jadwalAngsuranPdf(i);
    return kirimNotifikasi(db as never, i.anggota.id, {
        judul: i.jenis === 'kpr' ? 'KPR Anda sudah dicatat' : 'Pinjaman Anda sudah dicairkan',
        isi: `${i.namaKredit} ${rupiah(i.pokok)} (${i.lama} bulan) ${i.jenis === 'kpr' ? 'dicatat' : 'dicairkan'} ${tgl(i.tanggal)}.${pertama ? ` Angsuran ke-1 ${rupiah(pertama.total)} jatuh tempo ${tgl(pertama.tanggal)}.` : ''} Jadwal lengkap dikirim ke email Anda.`,
        url: '/pinjaman', jenisEmail: 'pencairan_pinjaman',
        teksEmail: teksInfoPinjaman(i), lampiran: { nama: `Jadwal-Angsuran-${i.noPinjaman}.pdf`, isi: pdf },
    });
}
