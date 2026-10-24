import { PilihTahun, TombolHitungShu, TombolPostingShu, TombolPostingSukarela } from "@/components/shu/ShuAksi"
import { TabelShu } from "@/components/shu/TabelShu"
import { anggotaShu, akunKasShu, rencanaShu, tahunShu, tahunTutupBuku } from "@/lib/queries/shu"
import { formatAngka, formatAngka2, formatTanggal, hariIni } from "@/lib/format"
import { sp } from "@/lib/list"
import { MENU, punyaIzin } from "@/config/akses"
import { wajibIzin } from "@/lib/operator"

export const dynamic = "force-dynamic"

const kartu = "rounded-md border p-3"

export default async function ShuPage(props: PageProps<"/dashboard/shu">) {
    const o = await wajibIzin("/dashboard/shu") // layout tidak dijalankan ulang pada navigasi antarhalaman
    const s = await props.searchParams
    const hari = hariIni()
    const [daftar, tutup] = await Promise.all([tahunShu(), tahunTutupBuku(Number(hari.slice(0, 4)))])
    const tahunTersedia = [...new Set([...daftar.map((d) => d.tahun), ...tutup.filter((t) => t.ditutup).map((t) => t.tahun)])].sort((a, b) => b - a)
    const pilih = Number(sp(s, "tahun"))
    const tahun = tahunTersedia.includes(pilih) ? pilih : tahunTersedia[0] ?? Number(hari.slice(0, 4)) - 1
    const ringkas = daftar.find((d) => d.tahun === tahun)
    const [rencana, data, akunKas] = await Promise.all([rencanaShu(tahun), ringkas ? anggotaShu(tahun, s) : Promise.resolve(null), akunKasShu()])

    const bolehHitung = punyaIzin(o.izin, [MENU.hitungShu]), bolehCair = punyaIzin(o.izin, [MENU.shu])
    const admin = o.superadmin || o.grup?.trim().toLowerCase() === "admin"
    const sudahPosting = ringkas?.status === "posting"
    const kolam = Number(rencana.shuAnggota)
    const belum = ringkas?.belum ?? 0

    const langkah = [
        { no: 1, judul: "Tutup buku", ok: rencana.sudahDitutup, ket: rencana.sudahDitutup ? `Ditutup 31 Des ${tahun}` : "Belum ditutup (menu Tutup Buku)" },
        { no: 2, judul: "Hitung SHU", ok: Boolean(ringkas && ringkas.anggota > 0), ket: ringkas && ringkas.anggota > 0 ? `${formatAngka(ringkas.anggota)} anggota dihitung` : "Belum dihitung" },
        { no: 3, judul: "Posting", ok: sudahPosting, ket: sudahPosting ? "Siap dicairkan" : "Belum diposting" },
        { no: 4, judul: "Pencairan", ok: Boolean(ringkas && ringkas.anggota > 0 && ringkas.belum === 0), ket: ringkas ? `${formatAngka(ringkas.dicairkan)} dicairkan, ${formatAngka(ringkas.belum)} belum` : "-" },
    ]

    return (
        <div className="space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex flex-col gap-1">
                    <h1 className="text-2xl font-semibold tracking-tight text-foreground">Sisa Hasil Usaha (SHU)</h1>
                    <p className="text-sm text-muted-foreground">Pembagian SHU per tahun buku: tutup buku, hitung SHU anggota, posting, dan pencairan. Data tiap tahun tersimpan dan bisa dilihat ulang.</p>
                </div>
                <PilihTahun tahun={tahun} daftar={tahunTersedia.length ? tahunTersedia : [tahun]} />
            </div>

            <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 text-sm" aria-label={`Ringkasan SHU ${tahun}`}>
                <div className={kartu}><div className="text-xs text-muted-foreground">SHU sebelum pajak</div><div className="text-lg font-bold tabular-nums">Rp {formatAngka2(Number(rencana.pendapatan))}</div></div>
                <div className={kartu}><div className="text-xs text-muted-foreground">Pajak pendapatan ({rencana.persenPajak.replace(/\.?0+$/, "").replace(".", ",")}%)</div><div className="text-lg font-bold tabular-nums">Rp {formatAngka2(Number(rencana.pajak))}</div></div>
                <div className={kartu}><div className="text-xs text-muted-foreground">SHU setelah pajak (dibagi ke pos)</div><div className="text-lg font-bold tabular-nums">Rp {formatAngka2(Number(rencana.labaDitahan))}</div></div>
                <div className={kartu}><div className="text-xs text-muted-foreground">SHU anggota (kolam pembagian)</div><div className="text-lg font-bold tabular-nums">Rp {formatAngka2(kolam)}</div></div>
            </section>

            <section className="rounded-lg border bg-background p-4 space-y-3" aria-label="Langkah proses SHU">
                <ol className="grid gap-3 md:grid-cols-4">
                    {langkah.map((l) => (
                        <li key={l.no} className="flex items-start gap-2.5">
                            <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs font-bold ${l.ok ? "bg-green-600 text-white" : "bg-muted text-muted-foreground"}`}>{l.ok ? "✓" : l.no}</span>
                            <div className="leading-tight"><div className="text-sm font-semibold">{l.judul}</div><div className="text-xs text-muted-foreground">{l.ket}</div></div>
                        </li>
                    ))}
                </ol>
                <div className="flex flex-wrap items-center gap-2 border-t pt-3 print:hidden">
                    {bolehHitung && rencana.sudahDitutup && ringkas && !ringkas.dicairkan && (
                        <TombolHitungShu tahun={tahun} sudahAda={ringkas.anggota > 0} />
                    )}
                    {bolehHitung && admin && ringkas && ringkas.anggota > 0 && !sudahPosting && <TombolPostingShu tahun={tahun} />}
                    {bolehCair && admin && sudahPosting && belum > 0 && <TombolPostingSukarela tahun={tahun} belum={belum} hariIni={hari} />}
                    {!rencana.sudahDitutup && <span className="text-sm text-muted-foreground">Tahun {tahun} belum ditutup buku. Proses di menu Akuntansi &rarr; Tutup Buku.</span>}
                    {rencana.sudahDitutup && !ringkas && (
                        <span className="text-sm text-muted-foreground">SHU anggota {tahun} belum ada di web (tutup buku {tahun} dikerjakan di desktop, hasilnya tidak tersimpan per tahun). Proses ulang tutup buku {tahun} dari web hanya bila tahun sesudahnya belum ditutup.</span>
                    )}
                    {ringkas && ringkas.anggota > 0 && (
                        <span className="ml-auto text-sm text-muted-foreground">Total bagian anggota Rp {formatAngka2(Number(ringkas.totalBagian))} · belum diambil Rp {formatAngka2(Number(ringkas.totalBelum))}</span>
                    )}
                </div>
            </section>

            <section className="rounded-lg border bg-background" aria-label="Pembagian SHU per pos">
                <div className="border-b px-4 py-3"><h2 className="font-semibold">Pembagian SHU per pos</h2>
                    <p className="text-xs text-muted-foreground">Persen dari Pengaturan pos SHU, dibagi dari SHU <b>setelah pajak</b>. Pos &ldquo;SHU yang dibagikan anggota&rdquo; adalah kolam pembagian ke anggota.</p></div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-muted text-muted-foreground text-xs">
                            <tr><th className="px-4 py-2 text-left">Pos SHU</th><th className="px-4 py-2 text-left">Akun</th><th className="px-4 py-2 text-right">Persen</th><th className="px-4 py-2 text-right">Nominal</th></tr>
                        </thead>
                        <tbody>
                            {rencana.pos.map((p) => (
                                <tr key={p.urut} className={`border-t ${p.urut === 2 ? "bg-blue-50/60 dark:bg-blue-500/10 font-medium" : ""}`}>
                                    <td className="px-4 py-1.5">{p.nama}</td>
                                    <td className="px-4 py-1.5"><span className="font-mono text-xs">{p.kode}</span></td>
                                    <td className="px-4 py-1.5 text-right tabular-nums">{formatAngka2(Number(p.persen))}%</td>
                                    <td className="px-4 py-1.5 text-right tabular-nums">{formatAngka2(Number(p.nominal))}</td>
                                </tr>
                            ))}
                            <tr className="border-t-2 font-semibold bg-muted/40">
                                <td colSpan={2} className="px-4 py-2">Jumlah</td>
                                <td className="px-4 py-2 text-right tabular-nums">{formatAngka2(rencana.pos.reduce((t, p) => t + Number(p.persen), 0))}%</td>
                                <td className="px-4 py-2 text-right tabular-nums">{formatAngka2(rencana.pos.reduce((t, p) => t + Number(p.nominal), 0))}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </section>

            {data && ringkas && ringkas.anggota > 0 && (
                <section aria-label={`SHU anggota ${tahun}`} className="space-y-2">
                    <h2 className="font-semibold">SHU per anggota {tahun}
                        <span className="ml-2 text-xs font-normal text-muted-foreground">Rumus: kolam ÷ 4 × (saldo sukarela + jasa uang + jasa barang + lama anggota, masing-masing dibanding totalnya)</span></h2>
                    <TabelShu data={data} tahun={tahun} statusTahun={ringkas.status} akunKas={akunKas} hariIni={hari} bolehCair={bolehCair} admin={admin} />
                    <p className="text-xs text-muted-foreground">Tanggal tutup buku {formatTanggal(ringkas.tglTutupBuku)}. Komponen sukarela {ringkas.hitungSukarela ? "ikut" : "tidak ikut"} dihitung.</p>
                </section>
            )}
        </div>
    )
}
