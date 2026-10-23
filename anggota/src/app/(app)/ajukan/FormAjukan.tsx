"use client"

import { useActionState, useMemo, useState } from "react"
import { ChevronDown, CircleCheckBig, LoaderCircle, TriangleAlert } from "lucide-react"
import { estimasiAngsuran } from "@kopkar/backend/src/anggota/pengajuan-hitung.ts"
import { ajukanAction } from "@/app/actions/pengajuan"
import { rupiah, tanggal } from "@/lib/format"

export interface Produk {
    kode: string; nama: string; persenBunga: string; perAngsuran: boolean; maksCicilan: number
    persenAdm: string; persenProvisi: string; kunciGrade: boolean
}

const kolom = "h-13 w-full rounded-xl border border-garis bg-permukaan px-4 text-base outline-none transition " +
    "focus:border-utama focus:ring-4 focus:ring-utama/15"
const label = "text-sm font-medium"
const persen = (p: string) => `${Number(p).toLocaleString("id-ID")}%`

/**
 * Form pengajuan kredit. Validasi di sini hanya membantu anggota; semua aturan dicek ulang di server
 * (backend/src/anggota/pengajuan.ts). Estimasi memakai jadwal mesin posting yang sama.
 */
export function FormAjukan({ produk, plafon, hariIni, batasTanggal }: { produk: Produk[]; plafon: number; hariIni: string; batasTanggal: string }) {
    const [hasil, kirim, proses] = useActionState(ajukanAction, null)
    const [kode, setKode] = useState(produk[0]?.kode ?? "")
    const [besarTeks, setBesarTeks] = useState("")
    const [lama, setLama] = useState(Math.min(12, produk[0]?.maksCicilan ?? 12))
    const [tgl, setTgl] = useState(hariIni)
    const [ket, setKet] = useState("")
    const [periksa, setPeriksa] = useState(false)
    const [selesaiDilihat, setSelesaiDilihat] = useState(false)

    const p = produk.find((x) => x.kode === kode)
    const besar = Number(besarTeks.replace(/\D/g, "") || "0")
    const est = useMemo(() => (p ? estimasiAngsuran(p, besar, lama) : null), [p, besar, lama])
    const lewatGrade = !!p?.kunciGrade && besar > plafon
    const bisaPeriksa = !!p && besar > 0 && lama >= 1 && lama <= p.maksCicilan && !lewatGrade && tgl >= hariIni && tgl <= batasTanggal

    // Hasil berhasil tampil sampai "Selesai" diketuk; mengirim lagi menampilkan hasil yang baru.
    if (hasil?.ok && !selesaiDilihat) {
        return (
            <div className="rounded-[var(--radius-kartu)] border border-garis bg-permukaan p-6 text-center">
                <CircleCheckBig size={40} strokeWidth={1.5} className="mx-auto text-masuk" />
                <p className="mt-3 text-lg font-bold">{hasil.uji ? "Pengajuan diperiksa" : "Pengajuan terkirim"}</p>
                <p className="mt-1 text-sm leading-relaxed text-redup">{hasil.pesan}</p>
                <button type="button" onClick={() => { setSelesaiDilihat(true); setPeriksa(false); setBesarTeks(""); setKet(""); setTgl(hariIni); window.scrollTo({ top: 0 }) }}
                    className="mt-5 inline-flex h-11 items-center rounded-xl border border-garis px-5 text-sm font-semibold hover:bg-latar">
                    Selesai
                </button>
            </div>
        )
    }

    const ubahJenis = (k: string) => {
        setKode(k)
        const baru = produk.find((x) => x.kode === k)
        if (baru && lama > baru.maksCicilan) setLama(baru.maksCicilan)
    }

    return (
        <form action={(f) => { setSelesaiDilihat(false); kirim(f) }} className="space-y-5">
            {/* Nilai yang dikirim; tampilan di bawah bisa beralih ke ringkasan tanpa kehilangan isian. */}
            <input type="hidden" name="jenis" value={kode} />
            <input type="hidden" name="besar" value={besar} />
            <input type="hidden" name="lama" value={lama} />
            <input type="hidden" name="tanggal" value={tgl} />
            <input type="hidden" name="keterangan" value={ket} />

            {!periksa ? (
                <>
                    <div className="space-y-2">
                        <label htmlFor="jenis" className={label}>Jenis pinjaman</label>
                        <Pilihan>
                            <select id="jenis" value={kode} onChange={(e) => ubahJenis(e.target.value)} className={`${kolom} appearance-none pr-11`}>
                                {produk.map((x) => <option key={x.kode} value={x.kode}>{x.nama}</option>)}
                            </select>
                        </Pilihan>
                        {p && (
                            <p className="text-xs text-redup">
                                Jasa {persen(p.persenBunga)} {p.perAngsuran ? "per bulan" : "sekali"} · maks. {p.maksCicilan} bulan
                                {Number(p.persenAdm) > 0 && ` · adm ${persen(p.persenAdm)}`}
                                {Number(p.persenProvisi) > 0 && ` · provisi ${persen(p.persenProvisi)}`}
                            </p>
                        )}
                    </div>

                    <div className="space-y-2">
                        <label htmlFor="besar" className={label}>Besar pinjaman</label>
                        <div className="relative">
                            <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-redup">Rp</span>
                            <input id="besar" inputMode="numeric" autoComplete="off" placeholder="0" className={`${kolom} angka pl-11 text-lg font-semibold`}
                                value={besarTeks}
                                onChange={(e) => {
                                    const n = e.target.value.replace(/\D/g, "").replace(/^0+/, "").slice(0, 10)
                                    setBesarTeks(n ? Number(n).toLocaleString("id-ID") : "")
                                }} />
                        </div>
                        {p?.kunciGrade && (
                            <p className={`text-xs ${lewatGrade ? "font-medium text-keluar" : "text-redup"}`}>
                                {lewatGrade ? "Melebihi plafon Anda" : "Maksimal sesuai plafon"}: {rupiah(plafon)}
                            </p>
                        )}
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                            <label htmlFor="lama" className={label}>Lama</label>
                            <Pilihan>
                                <select id="lama" value={lama} onChange={(e) => setLama(Number(e.target.value))} className={`${kolom} appearance-none pr-11`}>
                                    {Array.from({ length: p?.maksCicilan ?? 1 }, (_, i) => i + 1).map((n) => <option key={n} value={n}>{n} bulan</option>)}
                                </select>
                            </Pilihan>
                        </div>
                        <div className="space-y-2">
                            <label htmlFor="tanggal" className={label}>Tanggal realisasi</label>
                            <input id="tanggal" type="date" min={hariIni} max={batasTanggal} value={tgl} onChange={(e) => setTgl(e.target.value)}
                                className={`${kolom} px-3`} />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label htmlFor="ket" className={label}>Keperluan <span className="font-normal text-redup">(opsional)</span></label>
                        <textarea id="ket" rows={2} maxLength={100} value={ket} onChange={(e) => setKet(e.target.value)}
                            placeholder="Mis. biaya sekolah, renovasi rumah"
                            className="w-full resize-none rounded-xl border border-garis bg-permukaan px-4 py-3 text-base outline-none focus:border-utama focus:ring-4 focus:ring-utama/15" />
                    </div>

                    <Estimasi est={est} lama={lama} />

                    {hasil && !hasil.ok && <Galat pesan={hasil.error} />}

                    <button type="button" disabled={!bisaPeriksa} onClick={() => { setPeriksa(true); window.scrollTo({ top: 0 }) }}
                        className="h-13 w-full rounded-xl bg-utama text-base font-semibold text-pada-utama transition hover:bg-utama-tekan disabled:opacity-45">
                        Periksa pengajuan
                    </button>
                </>
            ) : (
                <>
                    <div className="-mx-5 border-y border-garis px-5">
                        <dl className="divide-y divide-garis">
                            {[
                                ["Jenis pinjaman", p?.nama],
                                ["Besar pinjaman", rupiah(besar)],
                                ["Lama", `${lama} bulan`],
                                ["Tanggal realisasi", tanggal(tgl, true)],
                                ["Jasa", p ? `${persen(p.persenBunga)} ${p.perAngsuran ? "per bulan" : "sekali"}` : "-"],
                                ...(ket.trim() ? [["Keperluan", ket.trim()]] : []),
                            ].map(([l, v]) => (
                                <div key={l} className="flex items-baseline justify-between gap-4 py-3">
                                    <dt className="text-sm text-redup">{l}</dt>
                                    <dd className="angka text-right text-[0.9375rem] font-medium">{v}</dd>
                                </div>
                            ))}
                        </dl>
                    </div>
                    <Estimasi est={est} lama={lama} />
                    <p className="px-1 text-xs leading-relaxed text-redup">
                        Pastikan data sudah benar. Pengajuan akan diperiksa pengurus koperasi; angka akhir mengikuti jadwal saat pinjaman dicairkan.
                    </p>
                    {hasil && !hasil.ok && <Galat pesan={hasil.error} />}
                    <div className="grid grid-cols-2 gap-3">
                        <button type="button" onClick={() => setPeriksa(false)} disabled={proses}
                            className="h-13 rounded-xl border border-garis bg-permukaan font-semibold hover:bg-latar">
                            Ubah
                        </button>
                        <button type="submit" disabled={proses}
                            className="flex h-13 items-center justify-center gap-2 rounded-xl bg-utama font-semibold text-pada-utama hover:bg-utama-tekan disabled:opacity-70">
                            {proses && <LoaderCircle size={18} className="animate-spin" />}
                            {proses ? "Mengirim…" : "Kirim pengajuan"}
                        </button>
                    </div>
                </>
            )}
        </form>
    )
}

function Estimasi({ est, lama }: { est: ReturnType<typeof estimasiAngsuran>; lama: number }) {
    if (!est) {
        return <div className="rounded-2xl bg-utama-lembut px-4 py-3.5 text-sm text-redup">Isi besar pinjaman untuk melihat perkiraan angsuran.</div>
    }
    return (
        <div className="rounded-2xl bg-utama-lembut p-4">
            <p className="text-sm text-redup">Perkiraan angsuran per bulan</p>
            <p className="angka mt-0.5 text-2xl font-bold tracking-tight">{rupiah(est.berikutnya)}</p>
            <dl className="mt-3 space-y-1.5 text-sm">
                <div className="flex justify-between gap-3"><dt className="text-redup">Pokok + jasa</dt><dd className="angka">{rupiah(est.pokok)} + {rupiah(est.jasa)}</dd></div>
                {est.biaya > 0 && (
                    <div className="flex justify-between gap-3"><dt className="text-redup">Angsuran pertama</dt><dd className="angka">{rupiah(est.pertama)}</dd></div>
                )}
                <div className="flex justify-between gap-3"><dt className="text-redup">Total jasa {lama} bulan</dt><dd className="angka">{rupiah(est.totalJasa)}</dd></div>
            </dl>
        </div>
    )
}

/** Kotak pilihan dengan panah sendiri (panah bawaan dihapus appearance-none supaya tampilan sama di Android dan iOS). */
function Pilihan({ children }: { children: React.ReactNode }) {
    return (
        <div className="relative">
            {children}
            <ChevronDown size={18} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-redup" />
        </div>
    )
}

function Galat({ pesan }: { pesan: string }) {
    return (
        <p role="alert" className="flex gap-2 rounded-xl bg-keluar-lembut px-4 py-3 text-sm font-medium text-keluar">
            <TriangleAlert size={18} strokeWidth={1.75} className="mt-px shrink-0" />{pesan}
        </p>
    )
}
