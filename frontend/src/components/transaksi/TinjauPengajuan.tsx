"use client"

import { useEffect, useState } from "react"
import { AlertTriangle, Check, Loader2, MessageCircle, Printer, X } from "lucide-react"
import { pesanPlafon } from "@kopkar/backend/src/posting/plafon.ts"
import { tinjauPengajuanAction, type TinjauanPengajuan } from "@/app/actions/pengajuan"
import { ModalForm } from "@/components/ui/Modal"
import { InputUang } from "@/components/ui/InputUang"
import { bukaCetak, esc } from "@/lib/cetak-klien"
import type { Pengajuan } from "@/lib/queries/keanggotaan"
import { formatAngka2, formatRupiah, formatTanggal } from "@/lib/format"
import { EmailAnggotaPengajuan } from "./EmailAnggotaPengajuan"
import { RiwayatAnggotaPanel, RingkasRisiko } from "./RiwayatAnggota"

/** Nomor HP Indonesia ke format wa.me (628...); null bila tidak berupa nomor HP. */
function nomorWa(hp: string | null | undefined) {
    let n = (hp ?? "").replace(/\D/g, "")
    if (n.startsWith("0")) n = "62" + n.slice(1)
    else if (n.startsWith("8")) n = "62" + n
    return /^628\d{7,12}$/.test(n) ? n : null
}

type Tinjauan = Extract<TinjauanPengajuan, { ok: true }>

/** Angka potongan setelah pengajuan ini; `gaji` 0 = belum diisi. Angsuran pengajuan memakai angsuran ke-2 dst., biaya adm dan provisi hanya sekali. */
function hitungThp(t: Tinjauan, gaji: number) {
    const baru = t.estimasi?.berikutnya ?? 0, total = t.potongan.total + baru
    return { baru, total, thp: gaji - total, rasio: gaji > 0 ? Math.round((total / gaji) * 100) : null }
}

/** Dokumen cetak satu lembar: ringkasan untuk keputusan, tanpa identitas lengkap dan riwayat pinjaman yang sudah lunas. */
function htmlTinjauan(t: Tinjauan, gaji: number) {
    const p = t.pengajuan, r = t.riwayat.ringkas, h = hitungThp(t, gaji)
    const baris = (l: string, v: string, tebal = false) => `<tr><td style="padding:2px 6px">${esc(l)}</td><td style="padding:2px 6px;text-align:right;${tebal ? "font-weight:700" : ""}">${esc(v)}</td></tr>`
    const berjalan = t.riwayat.daftar.filter((x) => x.status !== "Lunas").slice(0, 6)
    return `<div style="font-size:12px;line-height:1.4">
<table style="width:100%;margin-bottom:8px"><tbody>
${baris("Jenis", `${p.kd_kredit} ${p.nama_kredit ?? ""}`)}${baris("Pokok diajukan", formatRupiah(p.rp_pinjaman_pokok), true)}
${baris("Lama / jasa", `${p.lama_angsuran}x · ${formatAngka2(p.persen_bunga)}%`)}${baris("Keperluan", p.keterangan ?? "-")}
${baris("KPK / bank", `${p.nik || "-"} · ${[p.bank_nama, p.bank_no_rek].filter(Boolean).join(" ") || "-"}`)}${baris("Grade (plafon)", formatRupiah(t.riwayat.anggota.rp_grade))}
${baris("Simpanan", formatRupiah(t.riwayat.anggota.simpanan))}
${baris("Sisa utang berjalan", `${formatRupiah(r.sisa_pokok)} (${r.berjalan} pinjaman)`)}
${baris("Tunggakan", r.tunggak_kali > 0 ? `${formatRupiah(r.rp_tunggak)} (${r.tunggak_kali} angsuran, ${r.kolektibilitas})` : "Tidak ada")}
${baris("Riwayat macet", r.pernah_macet > 0 ? `Ya (${r.pernah_macet} pinjaman)` : "Tidak")}
</tbody></table>
<b>Potongan bulanan</b>
<table style="width:100%;margin-bottom:8px"><tbody>
${baris("Simpanan wajib + sukarela", formatRupiah(t.potongan.wajib + t.potongan.sukarela))}
${baris("Angsuran berjalan", formatRupiah(t.potongan.angsuran.reduce((x, a) => x + a.jumlah, 0)))}${baris("Adm bank", formatRupiah(t.potongan.admBank))}
${baris("Angsuran pengajuan ini", formatRupiah(h.baru))}${baris("Total potongan", formatRupiah(h.total), true)}
${gaji > 0 ? baris("Gaji", formatRupiah(gaji)) + baris(`Perkiraan take home pay (potongan ${h.rasio}% dari gaji)`, formatRupiah(h.thp), true) : ""}
</tbody></table>
${berjalan.length ? `<b>Pinjaman berjalan</b><table style="width:100%"><tbody>${berjalan.map((x) => baris(`${x.no_pinjaman} ${x.nama_kredit ?? ""} (${x.dibayar}/${x.lama})`, `sisa ${formatRupiah(x.sisa_pokok)}`)).join("")}</tbody></table>` : ""}
</div>`
}

/** Potongan bulanan anggota setelah pengajuan ini, dan perkiraan take home pay dari gaji yang diisi pengurus (gaji tidak disimpan). */
function PotonganGaji({ t, gaji, setGaji }: { t: Tinjauan; gaji: string; setGaji: (v: string) => void }) {
    const nilai = Number(gaji) || 0, h = hitungThp(t, nilai), b = t.potongan
    const Rincian = ({ label, rp, tebal }: { label: string; rp: number; tebal?: boolean }) => (
        <tr className={tebal ? "border-t font-semibold" : ""}><td className="py-0.5 pr-3">{label}</td><td className="py-0.5 text-right tabular-nums">{formatRupiah(rp)}</td></tr>
    )
    return (
        <section className="grid gap-4 rounded-md border p-3 text-sm sm:grid-cols-2" aria-label="Potongan bulanan">
            <div>
                <h3 className="mb-1 font-semibold">Potongan bulanan</h3>
                <table className="w-full"><tbody>
                    <Rincian label="Simpanan wajib" rp={b.wajib} />
                    <Rincian label="Simpanan sukarela" rp={b.sukarela} />
                    {b.angsuran.map((a) => <Rincian key={a.no_pinjaman} label={`Angsuran ${a.no_pinjaman}`} rp={a.jumlah} />)}
                    <Rincian label="Adm bank" rp={b.admBank} />
                    <Rincian label="Potongan saat ini" rp={b.total} tebal />
                    <Rincian label="Angsuran pengajuan ini" rp={h.baru} />
                    <Rincian label="Total setelah disetujui" rp={h.total} tebal />
                </tbody></table>
                {t.estimasi && t.estimasi.pertama !== t.estimasi.berikutnya && <p className="mt-1 text-xs text-muted-foreground">Angsuran pertama {formatRupiah(t.estimasi.pertama)}, termasuk adm dan provisi.</p>}
            </div>
            <div>
                <h3 className="mb-1 font-semibold">Perkiraan take home pay</h3>
                <label className="block"><span className="mb-1 block text-xs text-muted-foreground">Gaji per bulan (perubahan di sini tidak disimpan)</span>
                    <InputUang aria-label="Gaji per bulan" className="text-right" value={gaji} onChange={setGaji} /></label>
                {nilai > 0 ? (
                    <div className="mt-2">
                        <div className={`text-xl font-bold tabular-nums ${h.thp < 0 ? "text-red-600" : "text-green-600"}`}>{formatRupiah(h.thp)}</div>
                        <p className="text-xs text-muted-foreground">Total potongan {h.rasio}% dari gaji. Belum termasuk potongan perusahaan lain, seperti pajak dan BPJS.</p>
                    </div>
                ) : <p className="mt-2 text-xs text-muted-foreground">Gaji belum diisi di data anggota. Isi di sini, atau di Daftar Anggota tab Pekerjaan & Gaji.</p>}
            </div>
        </section>
    )
}

/**
 * Modal tinjauan pengajuan: rincian pengajuan, cek plafon, ringkasan risiko (tunggakan/macet), identitas anggota, dan riwayat pinjaman,
 * supaya pengurus bisa menilai kondisi keuangan anggota sebelum menyetujui. Tombol Setujui/Tolak memakai keputusan yang sama dengan daftar.
 */
export function TinjauPengajuan({ p, onTutup, onPutuskan, sibuk }: {
    p: Pengajuan | null; onTutup: () => void; onPutuskan: (p: Pengajuan, setuju: boolean) => void; sibuk: boolean
}) {
    const [data, setData] = useState<TinjauanPengajuan | null>(null)
    const [gaji, setGaji] = useState("")
    useEffect(() => {
        if (!p) return
        let batal = false
        setData(null)
        tinjauPengajuanAction(p.id).then((r) => { if (!batal) setData(r) })
        return () => { batal = true }
    }, [p])

    // Gaji dari data anggota; boleh diganti di sini untuk simulasi.
    useEffect(() => { setGaji(data?.ok && data.pengajuan.rp_gaji_pokok ? String(data.pengajuan.rp_gaji_pokok) : "") }, [data])
    const t = data?.ok ? data : null
    const i = t?.pengajuan
    const lebihPlafon = t ? pesanPlafon(t.pengajuan.rp_pinjaman_pokok, t.batas, "anggota") : null
    const wa = nomorWa(i?.hp)

    /** Dokumen cetak berkop (A4); dari jendela cetak bisa disimpan sebagai PDF untuk dikirim ke anggota. */
    const cetak = async () => {
        if (!p || !t || !i) return
        const galat = await bukaCetak({ judul: "Tinjauan Pengajuan Kredit", subjudul: `${p.nama} (${p.kd_anggota}) · realisasi ${formatTanggal(p.tgl_realisasi)}`, orientasi: "potret",
            isi: htmlTinjauan(t, Number(gaji) || 0) })
        if (galat) alert(galat)
    }
    /** Buka WhatsApp ke HP anggota dengan ringkasan pengajuan; PDF dilampirkan manual (wa.me tidak bisa membawa berkas). */
    const kirimWa = () => {
        if (!p || !t || !i || !wa) return
        const r = t.riwayat.ringkas
        const teks = [
            `Yth. ${p.nama} (${p.kd_anggota}),`,
            `Berikut informasi pengajuan kredit Anda di koperasi:`,
            `- Jenis: ${i.kd_kredit} ${i.nama_kredit ?? ""}`.trim(),
            `- Pokok diajukan: ${formatRupiah(i.rp_pinjaman_pokok)}, ${i.lama_angsuran}x angsuran, jasa ${formatAngka2(i.persen_bunga)}%`,
            `- Sisa utang berjalan: ${formatRupiah(r.sisa_pokok)} (${r.berjalan} pinjaman), angsuran per bulan ${formatRupiah(r.angsuran_bulan)}`,
            `- Tunggakan: ${r.tunggak_kali > 0 ? `${formatRupiah(r.rp_tunggak)} (${r.tunggak_kali} angsuran)` : "tidak ada"}`,
            `Rincian lengkap terlampir (PDF). Terima kasih.`,
            `Pengurus Koperasi`,
        ].join("\n")
        window.open(`https://wa.me/${wa}?text=${encodeURIComponent(teks)}`, "_blank", "noopener")
    }
    return (
        <ModalForm open={p !== null} onOpenChange={(b) => { if (!b) onTutup() }} kunci={false} lebar="sm:max-w-[64rem]"
            judul={p ? `Tinjau pengajuan: ${p.nama}` : ""} keterangan="Identitas dan riwayat pinjaman anggota sebelum pengajuan diputuskan.">
            {p && !data && <p className="flex items-center gap-2 py-6 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Memuat data anggota…</p>}
            {data && !data.ok && <div role="alert" className="rounded-md border border-red-300 bg-red-50 p-2.5 text-sm text-red-700">{data.error}</div>}
            {p && t && i && (
                <div className="space-y-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                        <EmailAnggotaPengajuan key={p.id} akunId={i.akun_id} email={i.email_akun} status={i.status_email} />
                        <div className="flex flex-wrap justify-end gap-2">
                        <button type="button" onClick={cetak} title="Dokumen berkop; pilih Simpan sebagai PDF di jendela cetak"
                            className="inline-flex h-9 items-center gap-1.5 rounded-md border px-3 text-sm font-medium hover:bg-muted"><Printer className="h-4 w-4" />Cetak / PDF</button>
                        <button type="button" onClick={kirimWa} disabled={!wa} title={wa ? `Buka WhatsApp ke ${i.hp}; lampirkan PDF hasil cetak` : "Nomor HP anggota kosong atau tidak valid"}
                            className="inline-flex h-9 items-center gap-1.5 rounded-md border border-green-300 px-3 text-sm font-medium text-green-700 hover:bg-green-50 disabled:opacity-50"><MessageCircle className="h-4 w-4" />Kirim ke WA</button>
                        </div>
                    </div>
                    <div className="space-y-4">
                    <section className="grid gap-3 rounded-md border p-3 text-sm sm:grid-cols-4" aria-label="Rincian pengajuan">
                        <div><div className="text-xs text-muted-foreground">Jenis</div><div className="font-medium">{i.kd_kredit} {i.nama_kredit}</div></div>
                        <div><div className="text-xs text-muted-foreground">Pokok diajukan</div><div className="font-bold tabular-nums">{formatRupiah(i.rp_pinjaman_pokok)}</div></div>
                        <div><div className="text-xs text-muted-foreground">Lama / bunga</div><div>{i.lama_angsuran}x · {formatAngka2(i.persen_bunga)}%</div></div>
                        <div><div className="text-xs text-muted-foreground">Keperluan</div><div className="break-words">{i.keterangan || "-"}</div></div>
                    </section>
                    {lebihPlafon && (
                        <div role="alert" className="flex items-start gap-2 rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800">
                            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />{lebihPlafon}
                        </div>
                    )}
                    <RingkasRisiko data={t.riwayat} memuat={false} />
                    <section className="rounded-md border p-3" aria-label="Identitas anggota">
                        <h3 className="mb-2 text-sm font-semibold">Identitas anggota</h3>
                        <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-3">
                            {([["Kode / KPK", `${t.riwayat.anggota.kode_agt} / ${i.nik || "-"}`],
                                ["HP", i.hp || i.telp_rmh], ["Bank", [i.bank_nama, i.bank_no_rek].filter(Boolean).join(" · ")],
                                ["Bagian", [i.plant, i.deptname, i.sectname].filter(Boolean).join(" · ")], ["Jabatan / grade", [i.jabatan, i.grade].filter(Boolean).join(" · ")],
                                ["Mulai bekerja", i.joindate ? formatTanggal(i.joindate) : ""], ["Alamat", [i.alamat, i.kota].filter(Boolean).join(", ")]] as const)
                                .filter(([, v]) => v).map(([k, v]) => (
                                    <div key={k} className={k === "Alamat" ? "min-w-0 sm:col-span-2" : "min-w-0"}><dt className="text-xs text-muted-foreground">{k}</dt><dd className="break-words">{v}</dd></div>
                                ))}
                        </dl>
                    </section>
                    <PotonganGaji t={t} gaji={gaji} setGaji={setGaji} />
                    <RiwayatAnggotaPanel data={t.riwayat} batas={t.batas} />
                    </div>
                    {p.status === "P" && (
                        <div className="flex justify-end gap-2 border-t pt-3">
                            {sibuk && <Loader2 className="h-4 w-4 animate-spin self-center text-muted-foreground" />}
                            <button type="button" disabled={sibuk} onClick={() => onPutuskan(p, false)}
                                className="inline-flex h-9 items-center gap-1.5 rounded-md border border-red-300 px-4 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"><X className="h-4 w-4" />Tolak</button>
                            <button type="button" disabled={sibuk} onClick={() => onPutuskan(p, true)}
                                className="inline-flex h-9 items-center gap-1.5 rounded-md bg-green-600 px-4 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50"><Check className="h-4 w-4" />Setujui</button>
                        </div>
                    )}
                </div>
            )}
        </ModalForm>
    )
}
