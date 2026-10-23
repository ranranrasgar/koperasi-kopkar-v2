"use client"

import { useActionState, useMemo, useState } from "react"
import { ArrowRight, Check, ChevronDown, CircleCheckBig, Info, LoaderCircle, Minus, Plus, ShieldCheck, TriangleAlert } from "lucide-react"
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

const BATAS_GESER = 100_000_000 // batas atas slider bila jenis tidak dibatasi plafon (isian angka tetap bebas sampai batas server)
const LANGKAH_GESER = 500_000
const NOMINAL_CEPAT = [5, 10, 15, 25, 50, 100].map((j) => j * 1_000_000)
const TENOR_UMUM = [3, 6, 12, 18, 24, 36, 48, 60]
const KEPERLUAN = ["Renovasi rumah", "Biaya pendidikan", "Keperluan medis", "Modal usaha", "Kendaraan", "Kebutuhan keluarga"]

/**
 * Form pengajuan kredit. Validasi di sini hanya membantu anggota; semua aturan dicek ulang di server
 * (backend/src/anggota/pengajuan.ts). Estimasi memakai jadwal mesin posting yang sama.
 */
export function FormAjukan({ produk, plafon, hariIni, batasTanggal, namaMenunggu }: {
    produk: Produk[]; plafon: number; hariIni: string; batasTanggal: string; namaMenunggu: string[]
}) {
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
    const sudahMenunggu = !!p && namaMenunggu.includes(p.nama)
    const tglSah = tgl >= hariIni && tgl <= batasTanggal
    const lamaSah = !!p && lama >= 1 && lama <= p.maksCicilan
    const bisaPeriksa = !!p && besar > 0 && lamaSah && !lewatGrade && tglSah && !sudahMenunggu

    // Daftar kelayakan: hanya aturan yang benar-benar dicek sistem (null = belum bisa dinilai).
    const syarat: { ok: boolean | null; judul: string; ket: string }[] = [
        { ok: true, judul: "Jenis pinjaman sesuai status keanggotaan", ket: "Hanya jenis yang boleh Anda ajukan yang ditampilkan." },
        {
            ok: !p?.kunciGrade ? true : besar === 0 ? null : !lewatGrade,
            judul: p?.kunciGrade ? "Besar pinjaman dalam plafon" : "Tidak dibatasi plafon grade",
            ket: p?.kunciGrade ? `Maksimal ${rupiah(plafon)} untuk jenis ini.` : "Jenis ini tidak memakai batas plafon.",
        },
        { ok: lamaSah, judul: "Lama pinjaman dalam batas", ket: `Maksimal ${p?.maksCicilan ?? "-"} bulan untuk jenis ini.` },
        { ok: tglSah, judul: "Tanggal realisasi sah", ket: "Mulai hari ini sampai paling lambat satu tahun ke depan." },
        { ok: !sudahMenunggu, judul: "Belum ada pengajuan sejenis yang menunggu", ket: sudahMenunggu ? "Tunggu keputusan pengurus untuk pengajuan sebelumnya." : "Satu pengajuan per jenis dalam satu waktu." },
    ]
    const siap = syarat.filter((s) => s.ok === true).length

    const maksGeser = p?.kunciGrade ? Math.max(plafon, LANGKAH_GESER * 2) : BATAS_GESER
    const tenorPilihan = useMemo(() => {
        const maks = p?.maksCicilan ?? 1
        return [...new Set([...TENOR_UMUM.filter((n) => n <= maks), ...(maks <= 60 ? [maks] : [])])].sort((a, b) => a - b).slice(0, 8)
    }, [p])
    const isiBesar = (n: number) => setBesarTeks(n > 0 ? n.toLocaleString("id-ID") : "")

    if (hasil?.ok && !selesaiDilihat) {
        return (
            <div>
                <Langkah n={3} judul="Pengajuan terkirim" />
                <div className="mt-8 text-center">
                    <span className="hero mx-auto grid size-20 place-items-center rounded-full"><CircleCheckBig size={38} strokeWidth={1.5} /></span>
                    <p className="mt-5 text-xl font-bold">{hasil.uji ? "Pengajuan diperiksa" : "Pengajuan terkirim"}</p>
                    <p className="mx-auto mt-1.5 max-w-xs text-sm leading-relaxed text-redup">{hasil.pesan}</p>
                    {!hasil.uji && <p className="mx-auto mt-3 max-w-xs text-xs leading-relaxed text-redup">Keputusan pengurus dikabari lewat notifikasi, dan statusnya bisa dilihat di daftar pengajuan di bawah.</p>}
                    <button type="button" onClick={() => { setSelesaiDilihat(true); setPeriksa(false); setBesarTeks(""); setKet(""); setTgl(hariIni); window.scrollTo({ top: 0 }) }}
                        className="mt-6 inline-flex h-12 items-center rounded-xl bg-utama px-8 font-semibold text-pada-utama hover:bg-utama-tekan">
                        Selesai
                    </button>
                </div>
            </div>
        )
    }

    const ubahJenis = (k: string) => {
        setKode(k)
        const baru = produk.find((x) => x.kode === k)
        if (baru && lama > baru.maksCicilan) setLama(baru.maksCicilan)
    }
    const kepala = (t: string) => <h2 className="text-[0.9375rem] font-semibold">{t}</h2>

    return (
        <form action={(f) => { setSelesaiDilihat(false); kirim(f) }} className="space-y-7">
            {/* Nilai yang dikirim; tampilan di bawah bisa beralih ke ringkasan tanpa kehilangan isian. */}
            <input type="hidden" name="jenis" value={kode} />
            <input type="hidden" name="besar" value={besar} />
            <input type="hidden" name="lama" value={lama} />
            <input type="hidden" name="tanggal" value={tgl} />
            <input type="hidden" name="keterangan" value={ket} />

            {!periksa ? (
                <>
                    <Langkah n={1} judul="Simulasi dan kebutuhan dana" />

                    <div className="hero relative overflow-hidden rounded-[var(--radius-kartu)] p-5">
                        <ShieldCheck size={84} strokeWidth={1} className="absolute -right-3 -top-2 opacity-15" aria-hidden="true" />
                        <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.1em] opacity-80"><ShieldCheck size={14} />Plafon kredit anggota</p>
                        {p?.kunciGrade ? (
                            <>
                                <p className="angka mt-2 text-[1.75rem] font-bold leading-tight tracking-tight"><span className="text-base font-medium opacity-80">Maks. </span>{rupiah(plafon)}</p>
                                <p className="mt-1.5 text-sm leading-relaxed opacity-80">Sesuai grade Anda untuk jenis pinjaman ini.</p>
                            </>
                        ) : (
                            <>
                                <p className="mt-2 text-xl font-bold leading-tight">Tanpa batas plafon grade</p>
                                <p className="mt-1.5 text-sm leading-relaxed opacity-80">Maksimal lama pinjaman {p?.maksCicilan ?? "-"} bulan untuk jenis ini.</p>
                            </>
                        )}
                    </div>

                    <section className="space-y-2.5">
                        <label htmlFor="jenis" className="text-[0.9375rem] font-semibold">Jenis pinjaman</label>
                        <Pilihan>
                            <select id="jenis" value={kode} onChange={(e) => ubahJenis(e.target.value)} className={`${kolom} appearance-none pr-11`}>
                                {produk.map((x) => <option key={x.kode} value={x.kode}>{x.nama}</option>)}
                            </select>
                        </Pilihan>
                        {p && (
                            <p className="text-xs leading-relaxed text-redup">
                                Jasa {persen(p.persenBunga)} {p.perAngsuran ? "per bulan" : "sekali"} · maks. {p.maksCicilan} bulan
                                {Number(p.persenAdm) > 0 && ` · adm ${persen(p.persenAdm)}`}
                                {Number(p.persenProvisi) > 0 && ` · provisi ${persen(p.persenProvisi)}`}
                            </p>
                        )}
                    </section>

                    <section className="space-y-3">
                        <div className="flex items-center justify-between gap-3">
                            <label htmlFor="besar" className="text-[0.9375rem] font-semibold">Jumlah pengajuan</label>
                            {p && <span className="rounded-full bg-masuk/15 px-2.5 py-1 text-[0.6875rem] font-semibold text-masuk">Jasa {persen(p.persenBunga)} {p.perAngsuran ? "/ bln" : "flat"}</span>}
                        </div>
                        <div className="relative">
                            <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-lg text-redup">Rp</span>
                            <input id="besar" inputMode="numeric" autoComplete="off" placeholder="0"
                                className={`${kolom} angka h-16 bg-utama-lembut pl-12 text-right text-[1.75rem] font-bold ${lewatGrade ? "border-keluar" : ""}`}
                                value={besarTeks}
                                onChange={(e) => {
                                    const n = e.target.value.replace(/\D/g, "").replace(/^0+/, "").slice(0, 10)
                                    setBesarTeks(n ? Number(n).toLocaleString("id-ID") : "")
                                }} />
                        </div>
                        <input type="range" aria-label="Geser jumlah pengajuan" min={LANGKAH_GESER} max={maksGeser} step={LANGKAH_GESER} className="h-6 w-full accent-utama"
                            value={Math.min(Math.max(besar, LANGKAH_GESER), maksGeser)} onChange={(e) => isiBesar(Number(e.target.value))} />
                        <div className="flex justify-between text-[0.6875rem] text-redup">
                            <span>{rupiah(LANGKAH_GESER)}</span><span>kelipatan {rupiah(LANGKAH_GESER)}</span><span>{rupiah(maksGeser)}</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {NOMINAL_CEPAT.filter((n) => n <= maksGeser).map((n) => (
                                <button key={n} type="button" onClick={() => isiBesar(n)}
                                    className={`h-10 rounded-xl border px-3.5 text-sm font-semibold transition-colors ${besar === n ? "border-utama bg-utama text-pada-utama" : "border-garis bg-permukaan"}`}>
                                    {n / 1_000_000} Juta
                                </button>
                            ))}
                        </div>
                        {p?.kunciGrade && lewatGrade && <p className="text-xs font-medium text-keluar">Melebihi plafon Anda: {rupiah(plafon)}</p>}
                    </section>

                    <section className="space-y-3">
                        <div className="flex items-baseline justify-between gap-3">
                            {kepala("Jangka waktu (tenor)")}
                            <span className="text-xs text-redup">Maks. {p?.maksCicilan ?? "-"} bulan</span>
                        </div>
                        <div className="grid grid-cols-4 gap-2">
                            {tenorPilihan.map((n) => (
                                <button key={n} type="button" onClick={() => setLama(n)} aria-pressed={lama === n}
                                    className={`flex h-16 flex-col items-center justify-center rounded-2xl border text-lg font-bold leading-none transition-colors ${lama === n ? "border-utama bg-utama text-pada-utama" : "border-garis bg-utama-lembut"}`}>
                                    {n}<span className="mt-1 text-[0.6875rem] font-medium opacity-80">bulan</span>
                                </button>
                            ))}
                        </div>
                        <div className="flex items-center justify-between gap-3 text-sm">
                            <span className="text-redup">Atur manual</span>
                            <div className="flex items-center gap-1">
                                <button type="button" aria-label="Kurangi satu bulan" disabled={lama <= 1} onClick={() => setLama(Math.max(1, lama - 1))}
                                    className="grid size-10 place-items-center rounded-full border border-garis disabled:opacity-40"><Minus size={16} /></button>
                                <span className="angka w-20 text-center font-semibold">{lama} bulan</span>
                                <button type="button" aria-label="Tambah satu bulan" disabled={lama >= (p?.maksCicilan ?? 1)} onClick={() => setLama(Math.min(p?.maksCicilan ?? 1, lama + 1))}
                                    className="grid size-10 place-items-center rounded-full border border-garis disabled:opacity-40"><Plus size={16} /></button>
                            </div>
                        </div>
                    </section>

                    <section className="space-y-2.5">
                        <label htmlFor="tanggal" className="text-[0.9375rem] font-semibold">Tanggal realisasi</label>
                        <input id="tanggal" type="date" min={hariIni} max={batasTanggal} value={tgl} onChange={(e) => setTgl(e.target.value)} className={`${kolom} px-3`} />
                    </section>

                    <section className="space-y-3">
                        <div className="flex items-baseline justify-between gap-3">
                            {kepala("Keperluan pengajuan")}
                            <span className="text-xs text-redup">opsional</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {KEPERLUAN.map((k) => (
                                <button key={k} type="button" onClick={() => setKet(ket === k ? "" : k)} aria-pressed={ket === k}
                                    className={`h-10 rounded-xl border px-3.5 text-sm font-medium transition-colors ${ket === k ? "border-utama bg-utama-lembut font-semibold text-utama" : "border-garis"}`}>
                                    {k}
                                </button>
                            ))}
                        </div>
                        <textarea id="ket" rows={2} maxLength={100} value={ket} onChange={(e) => setKet(e.target.value)} aria-label="Keperluan, tulis sendiri"
                            placeholder="Atau tulis sendiri (maks. 100 karakter)"
                            className="w-full resize-none rounded-xl border border-garis bg-permukaan px-4 py-3 text-base outline-none focus:border-utama focus:ring-4 focus:ring-utama/15" />
                    </section>

                    <Estimasi est={est} lama={lama} />

                    <section>
                        <div className="flex items-baseline justify-between gap-3">
                            {kepala("Kelayakan dan persyaratan")}
                            <span className={`rounded-full px-2.5 py-1 text-[0.6875rem] font-semibold ${siap === syarat.length ? "bg-masuk/15 text-masuk" : "bg-tunggu/15 text-tunggu"}`}>{siap}/{syarat.length} siap</span>
                        </div>
                        <ul className="mt-3 space-y-2">
                            {syarat.map((s) => (
                                <li key={s.judul} className="flex gap-3 rounded-2xl bg-utama-lembut p-3.5">
                                    <span className={`mt-0.5 grid size-6 shrink-0 place-items-center rounded-full ${s.ok === true ? "bg-utama text-pada-utama" : s.ok === false ? "bg-keluar text-white" : "border border-redup/50 text-transparent"}`}>
                                        {s.ok === false ? <TriangleAlert size={13} strokeWidth={2.4} /> : <Check size={14} strokeWidth={2.6} />}
                                    </span>
                                    <div className="min-w-0">
                                        <p className="text-sm font-semibold">{s.judul}</p>
                                        <p className="text-xs leading-relaxed text-redup">{s.ket}</p>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </section>

                    {hasil && !hasil.ok && <Galat pesan={hasil.error} />}

                    <div>
                        <button type="button" disabled={!bisaPeriksa} onClick={() => { setPeriksa(true); window.scrollTo({ top: 0 }) }}
                            className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-utama text-base font-semibold text-pada-utama transition hover:bg-utama-tekan disabled:opacity-45">
                            Lanjutkan pengajuan <ArrowRight size={19} />
                        </button>
                        <p className="mt-3 text-center text-xs leading-relaxed text-redup">Diperiksa pengurus koperasi. Keputusannya dikabari lewat notifikasi.</p>
                    </div>
                </>
            ) : (
                <>
                    <Langkah n={2} judul="Periksa pengajuan" />
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
                            className="h-14 rounded-2xl border border-garis bg-permukaan font-semibold hover:bg-garis/30">
                            Ubah
                        </button>
                        <button type="submit" disabled={proses}
                            className="flex h-14 items-center justify-center gap-2 rounded-2xl bg-utama font-semibold text-pada-utama hover:bg-utama-tekan disabled:opacity-70">
                            {proses && <LoaderCircle size={18} className="animate-spin" />}
                            {proses ? "Mengirim…" : "Kirim pengajuan"}
                        </button>
                    </div>
                </>
            )}
        </form>
    )
}

/** Penanda langkah: Langkah n dari 3 (isi, periksa, terkirim) dengan bilah tiga segmen. */
function Langkah({ n, judul }: { n: 1 | 2 | 3; judul: string }) {
    const nama = ["Nominal dan tenor", "Periksa", "Terkirim"]
    return (
        <div className="rounded-[var(--radius-kartu)] bg-utama-lembut p-4">
            <div className="flex items-center justify-between text-[0.6875rem] font-semibold uppercase tracking-[0.1em] text-redup">
                <span>Langkah {n} dari 3</span><span>{Math.round((n / 3) * 100)}% selesai</span>
            </div>
            <p className="mt-1 text-lg font-bold leading-snug">{judul}</p>
            <div className="mt-3 grid grid-cols-3 gap-1.5" aria-hidden="true">
                {nama.map((_, i) => <span key={i} className={`h-1.5 rounded-full ${i < n ? "bg-utama" : "bg-garis"}`} />)}
            </div>
            <div className="mt-2 grid grid-cols-3 gap-1.5 text-[0.6875rem] text-redup" aria-hidden="true">
                {nama.map((t, i) => <span key={t} className={i + 1 === n ? "font-semibold text-teks" : ""}>{i + 1}. {t}</span>)}
            </div>
        </div>
    )
}

function Estimasi({ est, lama }: { est: ReturnType<typeof estimasiAngsuran>; lama: number }) {
    if (!est) {
        return <div className="rounded-2xl bg-utama-lembut px-4 py-3.5 text-sm text-redup">Isi besar pinjaman untuk melihat perkiraan angsuran.</div>
    }
    const baris: [string, string, string][] = [
        ["Angsuran pokok", rupiah(est.pokok), "bg-utama"],
        ["Jasa koperasi", rupiah(est.jasa), "bg-masuk"],
    ]
    return (
        <div className="rounded-[var(--radius-kartu)] bg-utama-lembut p-5">
            <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.1em] text-redup">Estimasi angsuran bulanan</p>
            <p className="angka mt-1 text-[1.875rem] font-bold leading-tight tracking-tight">{rupiah(est.berikutnya)}<span className="ml-1.5 text-sm font-medium text-redup">/ bulan</span></p>
            <dl className="mt-4 space-y-2.5 rounded-2xl bg-permukaan p-4 text-sm">
                {baris.map(([l, v, w]) => (
                    <div key={l} className="flex items-center justify-between gap-3">
                        <dt className="flex items-center gap-2 text-redup"><span className={`size-2 rounded-full ${w}`} />{l}</dt>
                        <dd className="angka font-medium">{v}</dd>
                    </div>
                ))}
                {est.biaya > 0 && (
                    <div className="flex items-center justify-between gap-3">
                        <dt className="flex items-center gap-2 text-redup"><span className="size-2 rounded-full bg-tunggu" />Biaya adm dan provisi (1x)</dt>
                        <dd className="angka font-medium">{rupiah(est.biaya)}</dd>
                    </div>
                )}
                <div className="border-t border-garis pt-2.5">
                    {est.biaya > 0 && (
                        <div className="flex items-baseline justify-between gap-3 pb-1.5"><dt className="text-xs font-semibold uppercase tracking-wide text-redup">Angsuran pertama</dt><dd className="angka font-bold">{rupiah(est.pertama)}</dd></div>
                    )}
                    <div className="flex items-baseline justify-between gap-3"><dt className="text-xs font-semibold uppercase tracking-wide text-redup">Total jasa {lama} bulan</dt><dd className="angka font-bold">{rupiah(est.totalJasa)}</dd></div>
                </div>
            </dl>
            <p className="mt-3 flex gap-2 text-xs leading-relaxed text-redup"><Info size={14} className="mt-px shrink-0" />Perkiraan memakai jadwal yang sama dengan saat pinjaman dicairkan; angka akhir mengikuti keputusan pengurus.</p>
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
