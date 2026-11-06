import "server-only"
import { query } from "@/lib/db"
import { detailPinjaman } from "@/lib/queries/pinjaman-detail"
import type { DataBuku, DataKwitansi, JenisBukti } from "@/lib/kwitansi-tipe"

const rp = (v: unknown) => Number(v ?? 0)
const tgl = (v: string | null | undefined) => String(v ?? "").slice(0, 10)

async function simpanan(no: string): Promise<DataKwitansi | null> {
    const [s] = await query<{ tanggal: string; nama: string; nik: string | null; kode_agt: string; jenis: string | null; setor: number; ambil: number; saldo: number; kas: string | null; deskripsi: string | null }>(
        `SELECT s.tgl_transaksi::text AS tanggal, a.nama, a.nik, a.kode_agt, j.nama_simpanan AS jenis, s.rp_setoran AS setor, s.rp_pengambilan AS ambil, s.deskripsi, p.nama_perkiraan AS kas,
                (SELECT SUM(x.rp_setoran - x.rp_pengambilan) FROM simpanan x WHERE x.anggota_id = s.anggota_id AND x.jenis_simpanan_id = s.jenis_simpanan_id AND (x.tgl_transaksi, x.urut, x.id) <= (s.tgl_transaksi, s.urut, s.id)) AS saldo
           FROM simpanan s JOIN anggota a ON a.id = s.anggota_id LEFT JOIN jenis_simpanan j ON j.id = s.jenis_simpanan_id LEFT JOIN perkiraan p ON p.id = s.kas_perkiraan_id
          WHERE s.no_bukti = $1 ORDER BY s.id LIMIT 1`, [no])
    if (!s) return null
    const setor = rp(s.setor) > 0, jumlah = setor ? rp(s.setor) : rp(s.ambil)
    return {
        judul: setor ? "KWITANSI SETORAN SIMPANAN" : "BUKTI PENGAMBILAN SIMPANAN", no, tanggal: tgl(s.tanggal), arah: setor ? "terima" : "bayar",
        nama: s.nama, kpk: s.nik ?? "-", kode: s.kode_agt, untuk: `${setor ? "Setoran" : "Pengambilan"} ${s.jenis ?? "simpanan"}${s.deskripsi ? ` (${s.deskripsi})` : ""}`,
        baris: [], jumlah, info: [["Saldo setelah transaksi", rp(s.saldo)], ["Kas/Bank", s.kas ?? "-"]],
    }
}

async function angsuran(no: string): Promise<DataKwitansi | null> {
    const [r] = await query<{ tanggal: string; ke: number; lama: number; no_pinjaman: string; nama: string; nik: string | null; kode_agt: string; jenis: string | null; grup: string | null; pokok: number; jasa: number; adm: number; provisi: number; sisa: number; kas: string | null }>(
        `SELECT r.tanggal_angsuran::text AS tanggal, r.angsuran_ke AS ke, x.lama_angsuran AS lama, x.no_pinjaman, a.nama, a.nik, a.kode_agt, jk.nama_kredit AS jenis, jk.group_pinjaman AS grup,
                r.debit_pokok AS pokok, r.debit_bunga AS jasa, r.rp_adm AS adm, r.rp_provisi AS provisi, p.nama_perkiraan AS kas,
                -- Sisa kewajiban anggota setelah angsuran ini, rumus desktop seperti Sisa Pokok di Daftar Pinjaman (backend/src/pinjaman-sisa.ts).
                GREATEST(ROUND(x.rp_pinjaman_pokok - x.rp_uang_muka) - ROUND((x.rp_pinjaman_pokok - x.rp_uang_muka) * LEAST(r.angsuran_ke, x.lama_angsuran)::numeric / NULLIF(x.lama_angsuran, 0)), 0) AS sisa
           FROM pinjaman_tunai_rincian r JOIN pinjaman_tunai x ON x.id = r.pinjaman_tunai_id JOIN anggota a ON a.id = x.anggota_id
           LEFT JOIN jenis_kredit jk ON jk.id = x.jenis_kredit_id LEFT JOIN perkiraan p ON p.id = r.kas_perkiraan_id
          WHERE r.no_bukti = $1 AND r.angsuran_ke > 0 ORDER BY r.urut LIMIT 1`, [no])
    if (!r) return null
    const baris: [string, number][] = [["Pokok", rp(r.pokok)], ["Jasa", rp(r.jasa)]]
    if (rp(r.adm)) baris.push(["Adm", rp(r.adm)])
    if (rp(r.provisi)) baris.push(["Provisi", rp(r.provisi)])
    return {
        judul: "KWITANSI ANGSURAN PINJAMAN", no, tanggal: tgl(r.tanggal), arah: "terima", nama: r.nama, kpk: r.nik ?? "-", kode: r.kode_agt,
        untuk: `Angsuran ke-${r.ke} dari ${r.lama}, ${r.jenis ?? "pinjaman"} ${r.no_pinjaman}`, baris, jumlah: baris.reduce((t, b) => t + b[1], 0),
        info: [["Sisa pokok", rp(r.sisa)], ...(r.kas ? [["Kas/Bank", r.kas] as [string, string]] : [])], grup: r.grup ?? "",
    }
}

async function kpr(no: string): Promise<DataKwitansi | null> {
    const [r] = await query<{ tanggal: string; ke: number; lama: number; no_pinjaman: string; nama: string; nik: string | null; kode_agt: string; jenis: string | null; pokok: number; sisa: number; kas: string | null }>(
        `SELECT r.tanggal_angsuran::text AS tanggal, r.angsuran_ke AS ke, k.lama_angsuran AS lama, k.no_pinjaman, a.nama, a.nik, a.kode_agt, jk.nama_kredit AS jenis, r.debit_pokok AS pokok, p.nama_perkiraan AS kas,
                GREATEST(k.rp_pinjaman_pokok - (SELECT COALESCE(SUM(z.debit_pokok), 0) FROM kpr_rincian z WHERE z.kpr_id = r.kpr_id AND (z.angsuran_ke, z.urut) <= (r.angsuran_ke, r.urut)), 0) AS sisa
           FROM kpr_rincian r JOIN kpr k ON k.id = r.kpr_id JOIN anggota a ON a.id = k.anggota_id
           LEFT JOIN jenis_kredit jk ON jk.id = k.jenis_kredit_id LEFT JOIN perkiraan p ON p.id = r.kas_perkiraan_id
          WHERE r.no_bukti = $1 AND r.angsuran_ke > 0 ORDER BY r.urut LIMIT 1`, [no])
    if (!r) return null
    return {
        judul: "KWITANSI ANGSURAN KPR", no, tanggal: tgl(r.tanggal), arah: "terima", nama: r.nama, kpk: r.nik ?? "-", kode: r.kode_agt,
        untuk: `Angsuran ke-${r.ke} dari ${r.lama}, ${r.jenis ?? "KPR"} ${r.no_pinjaman}`, baris: [], jumlah: rp(r.pokok),
        info: [["Sisa pokok", rp(r.sisa)], ...(r.kas ? [["Kas/Bank", r.kas] as [string, string]] : [])],
    }
}

async function titipan(no: string): Promise<DataKwitansi | null> {
    const id = Number(no)
    if (!Number.isSafeInteger(id)) return null
    const [t] = await query<{ tanggal: string; urut: number; jumlah: number; status: string; no_pinjaman: string; nama: string; nik: string | null; kode_agt: string; jenis: string | null }>(
        `SELECT t.tanggal::text AS tanggal, t.urut, t.rp_jumlah AS jumlah, t.status, t.no_pinjaman, a.nama, a.nik, a.kode_agt, jk.nama_kredit AS jenis
           FROM pinjaman_tunai_titipan t JOIN pinjaman_tunai p ON p.id = t.pinjaman_tunai_id JOIN anggota a ON a.id = p.anggota_id
           LEFT JOIN jenis_kredit jk ON jk.id = p.jenis_kredit_id WHERE t.id = $1`, [id])
    if (!t) return null
    return {
        judul: "KWITANSI TITIPAN ANGSURAN", no: `${t.no_pinjaman}/T${t.urut}`, tanggal: tgl(t.tanggal), arah: "terima", nama: t.nama, kpk: t.nik ?? "-", kode: t.kode_agt,
        untuk: `Titipan angsuran ${t.jenis ?? "pinjaman"} ${t.no_pinjaman}`, baris: [], jumlah: rp(t.jumlah),
        info: [["Status", t.status === "POSTING" ? "Sudah masuk angsuran" : "Belum masuk angsuran"]],
    }
}

async function pencairan(no: string): Promise<DataKwitansi | null> {
    const d = await detailPinjaman(no)
    if (!d) return null
    const { ringkas: r, info } = d
    const [kas] = await query<{ nama: string }>("SELECT p.nama_perkiraan AS nama FROM pinjaman_tunai t JOIN perkiraan p ON p.id = t.kas_perkiraan_id WHERE t.id = $1", [info.id])
    const baris: [string, number][] = [["Pokok pinjaman", rp(r.rp_pinjaman_pokok)]]
    if (rp(r.uang_muka)) baris.push(["Uang muka", -rp(r.uang_muka)])
    return {
        judul: "BUKTI PENCAIRAN PINJAMAN", no, tanggal: tgl(r.tgl_pinjaman), arah: "bayar", nama: r.nama, kpk: r.nik ?? "-", kode: r.kode_agt,
        untuk: `Pencairan ${info.nama_kredit ?? "pinjaman"}, ${r.lama_angsuran} kali angsuran`, baris, jumlah: rp(r.rp_pinjaman_pokok) - rp(r.uang_muka),
        info: [["Angsuran per bulan", rp(r.temp_angs_per_bulan)], ["Total jasa", rp(r.temp_total_jasa)], ["Kas/Bank", kas?.nama ?? "-"]], grup: info.group_pinjaman ?? "",
    }
}

export async function dataKwitansi(jenis: Exclude<JenisBukti, "buku">, no: string) {
    if (jenis === "simpanan") return simpanan(no)
    if (jenis === "angsuran") return angsuran(no)
    if (jenis === "kpr") return kpr(no)
    if (jenis === "titipan") return titipan(no)
    return pencairan(no)
}

/** Buku pinjaman: seluruh jadwal angsuran beserta yang sudah dibayar, untuk diparaf. */
export async function dataBuku(no: string): Promise<DataBuku | null> {
    const d = await detailPinjaman(no)
    if (!d) return null
    const { ringkas: r, info, jadwal, bayar } = d
    const plafond = rp(r.rp_pinjaman_pokok) - rp(r.uang_muka)
    let terpakai = 0
    return {
        no, tanggal: tgl(r.tgl_pinjaman), nama: r.nama, kpk: r.nik ?? "-", kode: r.kode_agt, jenis: info.nama_kredit ?? "-", grup: info.group_pinjaman ?? "", pokok: plafond, jasa: rp(r.temp_total_jasa),
        lama: r.lama_angsuran, angsuran: rp(r.temp_angs_per_bulan),
        baris: jadwal.map((j) => {
            terpakai += rp(j.debit_pokok)
            const b = bayar.filter((x) => x.angsuran_ke === j.angsuran_ke)
            return { ke: j.angsuran_ke, jatuhTempo: tgl(j.tanggal_angsuran), pokok: rp(j.debit_pokok), jasa: rp(j.debit_bunga), angsuran: rp(j.debit_pokok) + rp(j.debit_bunga) + rp(j.rp_adm) + rp(j.rp_provisi), sisa: Math.max(plafond - terpakai, 0),
                tglBayar: b.length ? tgl(b[b.length - 1].tanggal_angsuran) : "", dibayar: b.reduce((t, x) => t + rp(x.debit_pokok) + rp(x.debit_bunga) + rp(x.rp_adm) + rp(x.rp_provisi), 0) }
        }),
    }
}
