"use client"

import { useEffect, useState } from "react"
import { AlertTriangle, Check, Loader2, X } from "lucide-react"
import { pesanPlafon } from "@kopkar/backend/src/posting/plafon.ts"
import { tinjauPengajuanAction, type TinjauanPengajuan } from "@/app/actions/pengajuan"
import { ModalForm } from "@/components/ui/Modal"
import type { Pengajuan } from "@/lib/queries/keanggotaan"
import { formatAngka2, formatRupiah, formatTanggal } from "@/lib/format"
import { RiwayatAnggotaPanel, RingkasRisiko } from "./RiwayatAnggota"

const Baris = ({ label, nilai }: { label: string; nilai: React.ReactNode }) => (
    <div className="flex gap-2 py-0.5"><dt className="w-32 shrink-0 text-muted-foreground">{label}</dt><dd className="min-w-0 break-words">{nilai || "-"}</dd></div>
)

/**
 * Modal tinjauan pengajuan: rincian pengajuan, cek plafon, ringkasan risiko (tunggakan/macet), identitas anggota, dan riwayat pinjaman,
 * supaya pengurus bisa menilai kondisi keuangan anggota sebelum menyetujui. Tombol Setujui/Tolak memakai keputusan yang sama dengan daftar.
 */
export function TinjauPengajuan({ p, onTutup, onPutuskan, sibuk }: {
    p: Pengajuan | null; onTutup: () => void; onPutuskan: (p: Pengajuan, setuju: boolean) => void; sibuk: boolean
}) {
    const [data, setData] = useState<TinjauanPengajuan | null>(null)
    useEffect(() => {
        if (!p) return
        let batal = false
        setData(null)
        tinjauPengajuanAction(p.id).then((r) => { if (!batal) setData(r) })
        return () => { batal = true }
    }, [p])

    const t = data?.ok ? data : null
    const i = t?.pengajuan
    const lebihPlafon = t ? pesanPlafon(t.pengajuan.rp_pinjaman_pokok, t.batas, "anggota") : null
    return (
        <ModalForm open={p !== null} onOpenChange={(b) => { if (!b) onTutup() }} kunci={false} lebar="sm:max-w-[64rem]"
            judul={p ? `Tinjau pengajuan: ${p.nama}` : ""} keterangan="Identitas dan riwayat pinjaman anggota sebelum pengajuan diputuskan.">
            {p && !data && <p className="flex items-center gap-2 py-6 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Memuat data anggota…</p>}
            {data && !data.ok && <div role="alert" className="rounded-md border border-red-300 bg-red-50 p-2.5 text-sm text-red-700">{data.error}</div>}
            {p && t && i && (
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
                        <dl className="grid gap-x-6 text-sm sm:grid-cols-2">
                            <Baris label="Kode / KPK" nilai={`${t.riwayat.anggota.kode_agt} / ${i.nik || "-"}`} />
                            <Baris label="No. KTP/SIM" nilai={i.no_ktp} />
                            <Baris label="Jenis kelamin" nilai={i.jns_kelamin === "L" ? "Laki-laki" : i.jns_kelamin === "P" ? "Perempuan" : i.jns_kelamin} />
                            <Baris label="Status" nilai={i.status} />
                            <Baris label="Tanggal lahir" nilai={i.tgl_lahir ? formatTanggal(i.tgl_lahir) : null} />
                            <Baris label="HP / telepon" nilai={[i.hp, i.telp_rmh].filter(Boolean).join(" / ")} />
                            <Baris label="Alamat" nilai={[i.alamat, i.kota].filter(Boolean).join(", ")} />
                            <Baris label="Bank" nilai={[i.bank_nama, i.bank_no_rek, i.bank_atas_nama].filter(Boolean).join(" · ")} />
                            <Baris label="Plant / bagian" nilai={[i.plant, i.deptname, i.sectname].filter(Boolean).join(" · ")} />
                            <Baris label="Jabatan / grade" nilai={[i.jabatan, i.grade].filter(Boolean).join(" · ")} />
                            <Baris label="Mulai bekerja" nilai={i.joindate ? formatTanggal(i.joindate) : null} />
                            <Baris label="Gaji pokok" nilai={i.rp_gaji_pokok ? formatRupiah(i.rp_gaji_pokok) : null} />
                        </dl>
                    </section>
                    <RiwayatAnggotaPanel data={t.riwayat} batas={t.batas} />
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
