import Link from "next/link"
import { HalamanLaporan } from "@/components/laporan/HalamanLaporan"
import { BatalLewatNomor } from "@/components/transaksi/BatalBukti"
import { FormPeriode, KopLaporan } from "@/components/laporan/Periode"
import { AKSES_HALAMAN, MENU, punyaIzin } from "@/config/akses"
import { formatAngka, formatTanggal, hariIni } from "@/lib/format"
import { isTanggal, sp } from "@/lib/list"
import { wajibIzin } from "@/lib/operator"
import { barisAudit, ringkasanAudit, ringkasJurnalBermasalah, riwayatKoreksi, saldoBukuVsBesar, type BarisAudit } from "@/lib/queries/audit"
import { CEK_AUDIT, type ModulAudit } from "@/lib/queries/audit-sql"

export const dynamic = "force-dynamic"

const TAMPIL = 500 // baris temuan di layar; Ekspor sampai BATAS_EKSPOR
const BATAS_EKSPOR = 5000
const MODUL: ModulAudit[] = ["Simpanan", "Pinjaman Tunai", "KPR"]
const JENIS_KOREKSI: Record<string, string> = { simpanan: "Simpanan", angsuran: "Angsuran", pencairan: "Pencairan", kpr_angsuran: "Angsuran KPR", kpr_pencairan: "Pencairan KPR" }
const KOLOM_TEMUAN = ["Tanggal", "Bukti", "Anggota", "Kode", "Keterangan", "Nilai"]

/** Pemeriksaan kesesuaian data. Hanya membaca: temuan tidak mengubah apa pun, koreksinya dikerjakan lewat transaksi atau jurnal. */
export default async function AuditDataPage(props: PageProps<"/dashboard/settings/audit">) {
    const o = await wajibIzin("/dashboard/settings/audit") // layout tidak dijalankan ulang pada navigasi antarhalaman
    const s = await props.searchParams
    const hari = hariIni()
    const sampai = isTanggal(sp(s, "sampai")) ? sp(s, "sampai") : hari
    const dari = isTanggal(sp(s, "dari")) ? sp(s, "dari") : `${sampai.slice(0, 4)}-01-01`
    const cek = CEK_AUDIT.find((c) => c.id === sp(s, "cek"))
    const [ringkas, saldo, jurnal, koreksi, baris] = await Promise.all([
        ringkasanAudit(dari, sampai), saldoBukuVsBesar(hari), ringkasJurnalBermasalah(sampai), riwayatKoreksi(100),
        cek ? barisAudit(cek.id, dari, sampai, BATAS_EKSPOR) : Promise.resolve([] as BarisAudit[]),
    ])
    const alamat = (ubah: Record<string, string>) => `?${new URLSearchParams({ dari, sampai, ...ubah }).toString()}`
    const bolehBuku = o.izin.includes(MENU.lapBukuSimpanan), bolehPinjaman = punyaIzin(o.izin, AKSES_HALAMAN["/dashboard/loans/[no]"]), bolehJurnal = o.izin.includes(MENU.jurnalUmum)
    // Tautan bukti ke halaman asalnya, hanya bila operator boleh membukanya.
    const tautan = (b: BarisAudit) => {
        if (cek?.modul === "Simpanan") {
            if (cek.id === "jurnal-simpanan-yatim") return bolehJurnal ? `/dashboard/accounting/journal?search=${encodeURIComponent(b.bukti)}` : null
            return bolehBuku ? `/dashboard/savings/ledger?search=${encodeURIComponent(b.bukti)}` : null
        }
        const no = cek?.modul === "Pinjaman Tunai" ? `${b.bukti} ${b.keterangan ?? ""}`.match(/\bCR-\d+-\d+/)?.[0] : null
        return no && bolehPinjaman ? `/dashboard/loans/${encodeURIComponent(no)}` : null
    }
    const adaSelisih = saldo.filter((x) => Math.abs(x.selisih) >= 1)
    const ekspor = cek
        ? { nama: `audit-${cek.id}_${dari}_${sampai}`, baris: [KOLOM_TEMUAN, ...baris.map((b) => [b.tanggal, b.bukti, b.anggota ?? "", b.kode_agt ?? "", b.keterangan ?? "", String(b.nilai)])] }
        : { nama: `audit-data_${dari}_${sampai}`, baris: [["Modul", "Pemeriksaan", "Temuan", "Nilai"], ...ringkas.map((r) => [r.modul, r.judul, String(r.jumlah), String(r.total)])] }

    return (
        <HalamanLaporan title="Audit Data" description="Pemeriksaan kesesuaian simpanan, pinjaman tunai, KPR, dan Buku Besar. Halaman ini hanya membaca dan tidak mengubah data."
            ekspor={ekspor}
            filter={
                <FormPeriode dari={dari} sampai={sampai} tanpaCetak>
                    {cek && <input type="hidden" name="cek" value={cek.id} />}
                    <Link href={`?dari=2018-01-01&sampai=${sampai}${cek ? `&cek=${cek.id}` : ""}`} className="text-sm text-primary hover:underline">Sejak 2018</Link>
                </FormPeriode>
            }>
            <div className="space-y-6">
                <KopLaporan judul={cek ? `Audit Data: ${cek.judul}` : "Audit Data"} periode={`${formatTanggal(dari, "long")} s/d ${formatTanggal(sampai, "long")}`} />

                {cek ? (
                    <section className="space-y-3">
                        <Link href={alamat({})} className="text-sm text-primary hover:underline print:hidden">Kembali ke semua pemeriksaan</Link>
                        <div>
                            <h2 className="font-semibold">{cek.modul}: {cek.judul}</h2>
                            <p className="mt-1 text-sm text-muted-foreground">{cek.arti}</p>
                        </div>
                        {baris.length === 0 ? <p className="text-sm text-muted-foreground">Tidak ada temuan pada periode ini.</p> : (
                            <div className="overflow-x-auto rounded-md border">
                                <table className="w-full text-sm">
                                    <thead className="bg-muted text-xs text-muted-foreground">
                                        <tr><th className="w-10 px-3 py-2 text-center">No.</th><th className="px-3 py-2 text-left">Tanggal</th><th className="px-3 py-2 text-left">Bukti</th>
                                            <th className="px-3 py-2 text-left">Anggota</th><th className="px-3 py-2 text-left">Keterangan</th><th className="px-3 py-2 text-right">Nilai</th></tr>
                                    </thead>
                                    <tbody>
                                        {baris.slice(0, TAMPIL).map((b, i) => {
                                            const href = tautan(b)
                                            return (
                                                <tr key={`${b.bukti}-${i}`} className="border-t hover:bg-muted/20">
                                                    <td className="px-3 py-1.5 text-center text-xs text-muted-foreground tabular-nums">{i + 1}</td>
                                                    <td className="px-3 py-1.5 whitespace-nowrap">{formatTanggal(b.tanggal)}</td>
                                                    <td className="px-3 py-1.5 font-mono text-xs">{href ? <Link href={href} className="text-primary hover:underline">{b.bukti}</Link> : b.bukti}</td>
                                                    <td className="px-3 py-1.5">{b.anggota ?? "-"}{b.kode_agt && <span className="ml-1 font-mono text-[11px] text-muted-foreground">{b.kode_agt}</span>}</td>
                                                    <td className="px-3 py-1.5">{b.keterangan ?? "-"}</td>
                                                    <td className="px-3 py-1.5 text-right tabular-nums">{formatAngka(b.nilai)}</td>
                                                </tr>
                                            )
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                        {baris.length > TAMPIL && <p className="text-xs text-muted-foreground">Menampilkan {formatAngka(TAMPIL)} baris terbaru. Ekspor memuat sampai {formatAngka(BATAS_EKSPOR)} baris.</p>}
                    </section>
                ) : (
                    <>
                        <section className="space-y-4" aria-label="Pemeriksaan per modul">
                            {MODUL.map((m) => (
                                <div key={m} className="overflow-x-auto rounded-md border">
                                    <table className="w-full text-sm">
                                        <thead className="bg-muted text-xs text-muted-foreground">
                                            <tr><th className="px-3 py-2 text-left">{m}</th><th className="w-28 px-3 py-2 text-right">Temuan</th><th className="w-40 px-3 py-2 text-right">Nilai</th></tr>
                                        </thead>
                                        <tbody>
                                            {ringkas.filter((r) => r.modul === m).map((r) => (
                                                <tr key={r.id} className="border-t hover:bg-muted/20">
                                                    <td className="px-3 py-2"><Link href={alamat({ cek: r.id })} className="text-primary hover:underline">{r.judul}</Link></td>
                                                    <td className={`px-3 py-2 text-right tabular-nums ${r.jumlah ? "font-semibold text-amber-700 dark:text-amber-400" : "text-green-700 dark:text-green-400"}`}>{r.jumlah ? formatAngka(r.jumlah) : "Bersih"}</td>
                                                    <td className="px-3 py-2 text-right tabular-nums">{r.jumlah ? formatAngka(r.total) : ""}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ))}
                        </section>

                        <section className="rounded-md border p-3 text-sm">
                            <h2 className="font-semibold">Buku Besar</h2>
                            <p className="mt-1">
                                <b className="tabular-nums">{formatAngka(jurnal.tidakSeimbang)}</b> bukti tidak seimbang (selisih {formatAngka(jurnal.selisih)}) dan{" "}
                                <b className="tabular-nums">{formatAngka(jurnal.tanpaAkun)}</b> baris ke akun yang tidak ada di COA{jurnal.sejak ? `, sejak saldo pembuka ${formatTanggal(jurnal.sejak)}` : ""}.
                                {o.izin.includes(MENU.jurnalBermasalah) && <> <Link href="/dashboard/accounting/journal/tidak-seimbang" className="text-primary hover:underline">Lihat Jurnal Bermasalah</Link></>}
                            </p>
                        </section>

                        <section>
                            <h2 className="font-semibold">Saldo buku dibandingkan Buku Besar</h2>
                            <p className="mb-2 mt-1 text-sm text-muted-foreground">
                                Posisi hari ini, tidak mengikuti periode di atas. {adaSelisih.length} dari {saldo.length} akun berselisih.
                                Sisa pinjaman memakai aturan Daftar Pinjaman. Selisih dapat berasal dari saldo awal pindah data, jurnal manual, atau transaksi tanpa jurnal; penyebab tiap akun perlu ditelusuri akuntan.
                            </p>
                            <div className="overflow-x-auto rounded-md border">
                                <table className="w-full text-sm">
                                    <thead className="bg-muted text-xs text-muted-foreground">
                                        <tr><th className="px-3 py-2 text-left">Akun</th><th className="px-3 py-2 text-left">Sumber</th><th className="px-3 py-2 text-right">Saldo buku</th>
                                            <th className="px-3 py-2 text-right">Buku Besar</th><th className="px-3 py-2 text-right">Selisih</th></tr>
                                    </thead>
                                    <tbody>
                                        {saldo.map((a) => (
                                            <tr key={a.kode_perkiraan} className="border-t">
                                                <td className="px-3 py-1.5"><span className="font-mono text-xs">{a.kode_perkiraan}</span> {a.nama_perkiraan}</td>
                                                <td className="px-3 py-1.5 whitespace-nowrap">{a.modul}</td>
                                                <td className="px-3 py-1.5 text-right tabular-nums">{formatAngka(a.saldo)}</td>
                                                <td className="px-3 py-1.5 text-right tabular-nums">{formatAngka(a.saldoBesar)}</td>
                                                <td className={`px-3 py-1.5 text-right tabular-nums ${Math.abs(a.selisih) >= 1 ? "font-semibold text-amber-700 dark:text-amber-400" : "text-muted-foreground"}`}>{formatAngka(a.selisih)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </section>

                        {o.izin.includes(MENU.batalTransaksi) && <BatalLewatNomor />}

                        <section>
                            <h2 className="mb-2 font-semibold">Riwayat koreksi</h2>
                            {koreksi.length === 0 ? <p className="text-sm text-muted-foreground">Belum ada koreksi.</p> : (
                                <div className="overflow-x-auto rounded-md border">
                                    <table className="w-full text-sm">
                                        <thead className="bg-muted text-xs text-muted-foreground">
                                            <tr><th className="px-3 py-2 text-left">Waktu</th><th className="px-3 py-2 text-left">Jenis</th><th className="px-3 py-2 text-left">Bukti</th><th className="px-3 py-2 text-left">Pembalik</th>
                                                <th className="px-3 py-2 text-left">Alasan</th><th className="px-3 py-2 text-left">Operator</th></tr>
                                        </thead>
                                        <tbody>
                                            {koreksi.map((k) => (
                                                <tr key={`${k.jenis}-${k.no_bukti}`} className="border-t">
                                                    <td className="px-3 py-1.5 whitespace-nowrap">{k.waktu}</td>
                                                    <td className="px-3 py-1.5 whitespace-nowrap">{JENIS_KOREKSI[k.jenis] ?? k.jenis}</td>
                                                    <td className="px-3 py-1.5 font-mono text-xs">{k.no_bukti}</td>
                                                    <td className="px-3 py-1.5 font-mono text-xs">{k.no_bukti_pembalik ?? "-"}</td>
                                                    <td className="px-3 py-1.5">{k.alasan}</td>
                                                    <td className="px-3 py-1.5">{k.opr}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                            {koreksi.length === 100 && <p className="mt-1 text-xs text-muted-foreground">Menampilkan 100 koreksi terakhir.</p>}
                        </section>
                    </>
                )}
            </div>
        </HalamanLaporan>
    )
}
