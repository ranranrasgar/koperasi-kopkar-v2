"use client"

import { useState } from "react"
import { AlertTriangle, CheckCircle2, Loader2, ShieldAlert } from "lucide-react"
import type { RiwayatAnggota } from "@/lib/queries/pinjaman-riwayat"
import { formatAngka, formatRupiah, formatTanggal } from "@/lib/format"
import { cn } from "@/lib/utils"

const WARNA_STATUS: Record<string, string> = {
    Lunas: "bg-green-100 text-green-700", Berjalan: "bg-blue-100 text-blue-700", Menunggak: "bg-red-100 text-red-700",
}

/** Tingkat peringatan dari riwayat: macet sekarang, menunggak, pernah terlambat/macet dulu, atau bersih. */
export function tingkatRisiko(r: RiwayatAnggota["ringkas"]) {
    if (r.macet_sekarang > 0) return "macet" as const
    if (r.tunggak_kali > 0) return "tunggak" as const
    if (r.pernah_macet > 0 || r.kali_telat > 0) return "pernah" as const
    return "bersih" as const
}

/** Satu baris ringkasan di bawah pilihan anggota: tunggakan, sisa utang, dan riwayat macet, dengan warna menurut tingkat risiko. */
export function RingkasRisiko({ data, memuat }: { data: RiwayatAnggota | null; memuat: boolean }) {
    if (memuat) return <p className="flex items-center gap-2 text-xs text-muted-foreground"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Memuat riwayat pinjaman anggota…</p>
    if (!data) return null
    const r = data.ringkas, t = tingkatRisiko(r)
    const gaya = { macet: "border-red-300 bg-red-50 text-red-800", tunggak: "border-amber-300 bg-amber-50 text-amber-900", pernah: "border-yellow-300 bg-yellow-50 text-yellow-900", bersih: "border-green-300 bg-green-50 text-green-800" }[t]
    const Ikon = t === "bersih" ? CheckCircle2 : t === "macet" ? ShieldAlert : AlertTriangle
    const teks = {
        macet: `Ada pinjaman macet sekarang (${r.macet_sekarang} pinjaman, terlambat ${formatAngka(r.hari_tunggak)} hari).`,
        tunggak: `Menunggak ${r.tunggak_kali} angsuran (${formatRupiah(r.rp_tunggak)}), terlambat ${formatAngka(r.hari_tunggak)} hari: ${r.kolektibilitas}.`,
        pernah: r.pernah_macet > 0 ? `Tidak menunggak sekarang, tetapi pernah macet (${r.pernah_macet} pinjaman, terlama terlambat ${formatAngka(r.maks_telat)} hari).`
            : `Tidak menunggak sekarang; pernah terlambat bayar lebih dari 30 hari ${r.kali_telat} kali (terlama ${formatAngka(r.maks_telat)} hari).`,
        bersih: "Tidak ada tunggakan dan tidak pernah terlambat bayar lebih dari 30 hari.",
    }[t]
    return (
        <div role="status" className={cn("flex items-start gap-2 rounded-md border px-3 py-2 text-sm", gaya)}>
            <Ikon className="mt-0.5 h-4 w-4 shrink-0" />
            <div><div className="font-semibold">{teks}</div>
                <div className="text-xs opacity-80">Sisa utang berjalan {formatRupiah(r.sisa_pokok)} ({r.berjalan} pinjaman) · angsuran per bulan {formatRupiah(r.angsuran_bulan)}</div></div>
        </div>
    )
}

const Kartu = ({ judul, nilai, ket, gaya }: { judul: string; nilai: React.ReactNode; ket?: React.ReactNode; gaya?: string }) => (
    <div className="rounded-md border p-3"><div className="text-xs text-muted-foreground">{judul}</div>
        <div className={cn("text-base font-bold tabular-nums", gaya)}>{nilai}</div>{ket && <div className="text-xs text-muted-foreground">{ket}</div>}</div>
)

/** Profil dan riwayat pinjaman anggota: ringkasan risiko dan daftar semua pinjaman yang pernah ada. */
export function RiwayatAnggotaPanel({ data, batas }: { data: RiwayatAnggota; batas: { batas: number; sumber: "grade" | "maksimal" } | null }) {
    const [semua, setSemua] = useState(false)
    const r = data.ringkas, a = data.anggota
    const tampil = semua ? data.daftar : data.daftar.slice(0, 8)
    const lamaBulan = a.tgl_masuk ? Math.max(0, Math.round((Date.now() - Date.parse(a.tgl_masuk)) / (30 * 86400000))) : null
    return (
        <section className="rounded-lg border bg-background shadow-sm" aria-label="Riwayat pinjaman anggota">
            <div className="border-b px-4 py-3">
                <h2 className="font-semibold">Riwayat pinjaman: {a.nama} <span className="font-mono text-xs font-normal text-muted-foreground">{a.kode_agt}</span></h2>
                <p className="text-xs text-muted-foreground">{a.status_staff?.trim() || "-"}{a.aktif ? "" : " · NON-AKTIF"}{lamaBulan !== null ? ` · anggota ${lamaBulan} bulan (sejak ${formatTanggal(a.tgl_masuk)})` : ""}</p>
            </div>
            <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
                <Kartu judul="Sisa utang berjalan" nilai={formatRupiah(r.sisa_pokok)} ket={`${r.berjalan} pinjaman · ${formatRupiah(r.angsuran_bulan)} per bulan`} />
                <Kartu judul="Tunggakan sekarang" nilai={r.tunggak_kali > 0 ? formatRupiah(r.rp_tunggak) : "Tidak ada"} gaya={r.tunggak_kali > 0 ? "text-red-600" : "text-green-600"}
                    ket={r.tunggak_kali > 0 ? `${r.tunggak_kali} angsuran · ${formatAngka(r.hari_tunggak)} hari · ${r.kolektibilitas}` : "Semua angsuran jatuh tempo sudah dibayar"} />
                <Kartu judul="Pernah macet" nilai={r.pernah_macet > 0 ? `Ya (${r.pernah_macet} pinjaman)` : "Tidak"} gaya={r.pernah_macet > 0 ? "text-red-600" : "text-green-600"}
                    ket={`Terlambat bayar terlama ${formatAngka(r.maks_telat)} hari · ${r.kali_telat}× lebih dari 30 hari`} />
                <Kartu judul="Pinjaman tercatat" nilai={`${r.total} (${r.lunas} lunas)`} ket={`Simpanan ${formatRupiah(a.simpanan)}`} />
                <Kartu judul="Grade (plafon) anggota" nilai={a.rp_grade > 0 ? formatRupiah(a.rp_grade) : "Belum diisi"} gaya={a.rp_grade > 0 ? undefined : "text-amber-600"}
                    ket={batas === null ? "Jenis terpilih tidak dibatasi plafon" : `Batas jenis terpilih ${formatRupiah(batas.batas)} (${batas.sumber === "grade" ? "grade" : "maksimal plafond"})`} />
            </div>
            <div className="overflow-x-auto border-t">
                <table className="w-full text-sm">
                    <thead className="bg-muted text-muted-foreground text-xs">
                        <tr><th className="px-3 py-2 text-left">No. Pinjaman</th><th className="px-3 py-2 text-left">Tanggal</th><th className="px-3 py-2 text-left">Jenis</th>
                            <th className="px-3 py-2 text-right">Pokok</th><th className="px-3 py-2 text-right">Dibayar</th><th className="px-3 py-2 text-right">Sisa pokok</th>
                            <th className="px-3 py-2 text-right">Telat terlama</th><th className="px-3 py-2 text-left">Status</th></tr>
                    </thead>
                    <tbody>
                        {tampil.length === 0 && <tr><td colSpan={8} className="p-6 text-center text-muted-foreground">Belum pernah meminjam.</td></tr>}
                        {tampil.map((p) => (
                            <tr key={p.no_pinjaman} className="border-t">
                                <td className="px-3 py-1.5 font-mono text-xs">{p.no_pinjaman}</td>
                                <td className="px-3 py-1.5 whitespace-nowrap">{formatTanggal(p.tgl_pinjaman)}</td>
                                <td className="px-3 py-1.5">{p.kode_kredit} {p.nama_kredit}{p.jenis === "kpr" ? " (KPR)" : ""}</td>
                                <td className="px-3 py-1.5 text-right tabular-nums">{formatAngka(p.pokok)}</td>
                                <td className="px-3 py-1.5 text-right tabular-nums">{p.dibayar}/{p.lama}</td>
                                <td className="px-3 py-1.5 text-right tabular-nums">{formatAngka(p.sisa_pokok)}</td>
                                <td className={cn("px-3 py-1.5 text-right tabular-nums", p.maks_telat > 180 ? "font-semibold text-red-600" : p.maks_telat > 30 ? "text-amber-600" : "")}>
                                    {p.jenis === "kpr" ? "-" : p.maks_telat > 0 ? `${formatAngka(p.maks_telat)} hari` : "-"}</td>
                                <td className="px-3 py-1.5"><span className={cn("rounded-full px-2 py-0.5 text-[10px] font-bold uppercase", WARNA_STATUS[p.status])}>{p.status}</span>
                                    {p.hari_tunggak > 0 && <span className="ml-1 text-[11px] text-red-600">{formatAngka(p.hari_tunggak)} hari</span>}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {data.daftar.length > 8 && (
                <div className="border-t p-2 text-center">
                    <button type="button" onClick={() => setSemua((v) => !v)} className="text-sm text-blue-600 hover:underline">
                        {semua ? "Tampilkan 8 terbaru saja" : `Tampilkan semua ${data.daftar.length} pinjaman`}
                    </button>
                </div>
            )}
        </section>
    )
}
