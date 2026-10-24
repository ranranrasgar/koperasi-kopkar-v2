import { dataVoucherAction } from "@/app/actions/transaksi"
import { bukaCetak, esc } from "@/lib/cetak-klien"
import { formatAngka, formatTanggal } from "@/lib/format"

/** Cetak voucher satu bukti jurnal: kop surat, identitas bukti, rincian akun debit/kredit, total, dan kolom tanda tangan. */
export async function cetakVoucher(nomorBukti: string): Promise<string | null> {
    const r = await dataVoucherAction(nomorBukti)
    if ("error" in r) return r.error
    const b = r.bukti
    const totalD = b.baris.reduce((t, x) => t + Number(x.debit), 0), totalK = b.baris.reduce((t, x) => t + Number(x.kredit), 0)
    const baris = b.baris.map((x) => `<tr><td class="mono">${esc(x.kodePerkiraan)}</td><td>${esc(x.namaPerkiraan)}</td><td>${esc(x.deskripsi)}</td>
        <td class="kanan">${Number(x.debit) ? formatAngka(Number(x.debit)) : ""}</td><td class="kanan">${Number(x.kredit) ? formatAngka(Number(x.kredit)) : ""}</td></tr>`).join("")
    const ttd = ["Dibuat oleh", "Diperiksa oleh", "Disetujui oleh"].map((l) =>
        `<td style="width:33%;height:80px;vertical-align:top;text-align:center;border:1px solid #9ca3af">${l}<div style="height:48px"></div><div style="border-top:1px solid #9ca3af;margin:0 18px;padding-top:2px">(&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;)</div></td>`).join("")
    const isi = `<table style="margin-bottom:8px"><tbody>
        <tr><td style="width:18%"><b>No. Bukti</b></td><td class="mono" style="width:32%">${esc(b.nomorBukti)}</td><td style="width:18%"><b>Tanggal</b></td><td>${esc(formatTanggal(b.tanggal, "long"))}</td></tr>
        <tr><td><b>Keterangan</b></td><td colspan="3">${esc(b.deskripsi)}</td></tr></tbody></table>
        <table><thead><tr><th>Kode Akun</th><th>Nama Akun</th><th>Keterangan</th><th class="kanan">Debit</th><th class="kanan">Kredit</th></tr></thead>
        <tbody>${baris}</tbody><tfoot><tr><td colspan="3" class="kanan"><b>Total</b></td><td class="kanan"><b>${formatAngka(totalD)}</b></td><td class="kanan"><b>${formatAngka(totalK)}</b></td></tr></tfoot></table>
        <table style="margin-top:14px"><tbody><tr>${ttd}</tr></tbody></table>`
    return bukaCetak({ judul: b.nomorBukti.startsWith("BB/") ? "Voucher Kas / Bank" : "Voucher Jurnal", subjudul: b.nomorBukti, orientasi: "potret", isi })
}
