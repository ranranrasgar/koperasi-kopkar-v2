import Link from "next/link"
import { BookOpen } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { ringkasanBukuSimpanan } from "@/lib/queries/simpanan"
import { formatAngka, formatTanggal } from "@/lib/format"
import type { SearchParams } from "@/lib/list"

/** Alamat halaman ini dengan parameter diganti (null = dihapus); selalu kembali ke halaman 1. */
function alamat(s: SearchParams, ubah: Record<string, string | null>) {
    const p = new URLSearchParams(Object.entries(s).flatMap(([k, v]) => (typeof v === "string" && k !== "page" ? [[k, v]] : [])))
    for (const [k, v] of Object.entries(ubah)) { if (v) p.set(k, v); else p.delete(k) }
    return `?${p.toString()}`
}

/**
 * Di atas tabel Buku Simpanan. Satu anggota: total simpanan dan kartu per jenis; klik kartu menyaring tabel ke buku jenis itu.
 * Beberapa anggota cocok dengan pencarian: daftar untuk memilih satu (pencarian diganti kode anggota).
 */
export function RingkasanBukuSimpanan({ data, s, jenisAktif, bolehKartu, sampai }: {
    data: NonNullable<Awaited<ReturnType<typeof ringkasanBukuSimpanan>>>; s: SearchParams; jenisAktif: string; bolehKartu: boolean; sampai: string
}) {
    if (!data.anggota) {
        return (
            <section className="rounded-lg border bg-background print:hidden" aria-label="Pilih anggota">
                <p className="border-b px-4 py-2 text-sm font-semibold">Pilih anggota untuk melihat total dan buku per jenis simpanan</p>
                <ul className="divide-y">
                    {data.pilihan.map((a) => (
                        <li key={a.kode_agt}>
                            <Link href={alamat(s, { search: a.kode_agt, jenis: null })} className="flex items-center justify-between gap-3 px-4 py-2 text-sm hover:bg-muted/40">
                                <span className="min-w-0">
                                    <span className="font-medium">{a.nama}</span>{!a.aktif && <span className="ml-1 text-xs text-muted-foreground">(non-aktif)</span>}
                                    <span className="block font-mono text-xs text-muted-foreground">{a.kode_agt} | KPK {a.nik ?? "-"}</span>
                                </span>
                                <span className="shrink-0 font-semibold tabular-nums">{formatAngka(a.total)}</span>
                            </Link>
                        </li>
                    ))}
                </ul>
                {data.lebih && <p className="border-t px-4 py-2 text-xs text-muted-foreground">Masih ada anggota lain yang cocok; perjelas pencarian.</p>}
            </section>
        )
    }

    const a = data.anggota
    const kartu = "rounded-lg border p-3 transition-colors"
    return (
        <section className="space-y-3 print:hidden" aria-label={`Ringkasan simpanan ${a.nama}`}>
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                    <h2 className="text-lg font-semibold">{a.nama}{!a.aktif && <span className="ml-2 text-xs font-normal text-muted-foreground">(non-aktif)</span>}</h2>
                    <p className="font-mono text-xs text-muted-foreground">
                        {a.kode_agt} | KPK {a.nik ?? "-"}{a.terakhir ? ` | transaksi terakhir ${formatTanggal(a.terakhir)}` : ""}
                    </p>
                </div>
                {bolehKartu && (
                    <Button asChild size="sm" variant="outline" className="h-9">
                        <Link href={`/dashboard/savings/cards?kode=${encodeURIComponent(a.kode_agt)}`}><BookOpen className="mr-1.5 h-4 w-4" /> Kartu Simpanan</Link>
                    </Button>
                )}
            </div>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
                <Link href={alamat(s, { jenis: null })} aria-current={jenisAktif ? undefined : "true"}
                    className={`${kartu} col-span-2 md:col-span-1 ${jenisAktif ? "bg-background hover:bg-muted/40" : "border-blue-600 bg-blue-600 text-white"}`}>
                    <span className="block text-xs font-medium opacity-80">Total Simpanan{sampai ? ` s/d ${formatTanggal(sampai)}` : ""}</span>
                    <span className="mt-1 block text-xl font-bold tabular-nums">{formatAngka(a.total)}</span>
                    <span className="block text-xs opacity-80">{formatAngka(a.transaksi)} transaksi</span>
                </Link>
                {data.jenis.map((j) => {
                    const aktif = jenisAktif === j.kode_simpanan
                    return (
                        <Link key={j.kode_simpanan} href={alamat(s, { jenis: aktif ? null : j.kode_simpanan })} aria-current={aktif ? "true" : undefined}
                            title={`Lihat buku ${j.nama_simpanan}`}
                            className={`${kartu} ${aktif ? "border-blue-600 bg-blue-600 text-white" : "bg-background hover:bg-muted/40"}`}>
                            <span className="block truncate text-xs font-medium opacity-80">{j.nama_simpanan}</span>
                            <span className="mt-1 block text-xl font-bold tabular-nums">{formatAngka(j.saldo)}</span>
                            <span className="block text-xs opacity-80">Setor {formatAngka(j.setoran)} · Ambil {formatAngka(j.pengambilan)}</span>
                        </Link>
                    )
                })}
            </div>
        </section>
    )
}
