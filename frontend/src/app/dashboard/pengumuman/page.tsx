import Link from "next/link"
import { ChevronRight, FileText, Megaphone, Tag } from "lucide-react"
import { notifAdminUntukOperator, tandaiNotifAdminDibaca } from "@kopkar/backend/src/anggota/notif-admin.ts"
import { kunciPublikPush } from "@kopkar/backend/src/anggota/push.ts"
import { pengumumanUntukOperator, tandaiPengumumanDibaca } from "@kopkar/backend/src/anggota/sasaran.ts"
import { AktifkanNotifikasiAdmin } from "@/components/notifikasi/AktifkanNotifikasiAdmin"
import { FormCard } from "@/components/transaksi/common"
import { pool } from "@/lib/db"
import { wajibLogin } from "@/lib/operator"

// Notifikasi untuk operator ini: notifikasi sistem (mis. pengajuan kredit baru, bisa diketuk ke halamannya) dan
// himbauan/promo yang ditujukan ke grupnya. Bisa dibuka semua operator; dibuka = semua yang tampil dianggap terbaca
// (angka merah di lonceng navbar hilang).
export default async function NotifikasiAdminPage() {
    const o = await wajibLogin() // layout tidak dijalankan ulang pada navigasi antarhalaman
    const [sistem, pengumuman] = await Promise.all([notifAdminUntukOperator(pool, o.id), pengumumanUntukOperator(pool, o.id)])
    await Promise.all([
        tandaiNotifAdminDibaca(pool, o.id, sistem.filter((n) => n.baru).map((n) => n.id)),
        tandaiPengumumanDibaca(pool, o.id, pengumuman.filter((d) => d.baru)),
    ]).catch((e) => console.error("tandai notifikasi dibaca gagal:", e))

    const semua: { kunci: string; waktu: string; baru: boolean; sistem?: (typeof sistem)[number]; pengumuman?: (typeof pengumuman)[number] }[] = [
        ...sistem.map((n) => ({ kunci: `s-${n.id}`, waktu: n.waktu, baru: n.baru, sistem: n })),
        ...pengumuman.map((d) => ({ kunci: `p-${d.jenis}-${d.id}`, waktu: d.waktu, baru: d.baru, pengumuman: d })),
    ].sort((a, b) => b.waktu.localeCompare(a.waktu))

    return (
        <div className="max-w-3xl space-y-6">
            <FormCard title="Notifikasi" description="Pengajuan kredit baru dari anggota, serta himbauan dan promo dari pengurus untuk grup Anda. Notifikasi sistem disimpan 30 hari.">
                <div className="space-y-4">
                    <AktifkanNotifikasiAdmin kunciPublik={kunciPublikPush()} />
                    {semua.length === 0 ? (
                        <p className="text-sm text-muted-foreground">Belum ada notifikasi.</p>
                    ) : (
                        <ul className="space-y-3">
                            {semua.map((x) => {
                                const baruTag = x.baru && <span className="rounded bg-red-600 px-1.5 py-0.5 text-[10px] font-bold leading-none text-white">BARU</span>
                                if (x.sistem) {
                                    const n = x.sistem
                                    return (
                                        <li key={x.kunci}>
                                            <Link href={n.url} className="flex gap-3 rounded-lg border p-4 hover:bg-muted/50">
                                                <FileText className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
                                                <div className="min-w-0 flex-1">
                                                    <div className="flex flex-wrap items-center gap-2">{baruTag}<span className="text-xs text-muted-foreground">{n.waktu}</span></div>
                                                    <p className="mt-1 font-semibold">{n.judul}</p>
                                                    <p className="mt-0.5 text-sm text-muted-foreground">{n.isi}</p>
                                                </div>
                                                <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" />
                                            </Link>
                                        </li>
                                    )
                                }
                                const d = x.pengumuman!
                                const Ikon = d.jenis === "promo" ? Tag : Megaphone
                                return (
                                    <li key={x.kunci} className="overflow-hidden rounded-lg border">
                                        {d.gambar && (
                                            // eslint-disable-next-line @next/next/no-img-element
                                            <img src={`/dashboard/gambar/${d.gambar}`} alt="" className="max-h-64 w-full object-cover" />
                                        )}
                                        <div className="flex gap-3 p-4">
                                            <Ikon className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
                                            <div className="min-w-0">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{d.jenis === "promo" ? "Promo" : "Himbauan"}</span>
                                                    {baruTag}
                                                    <span className="text-xs text-muted-foreground">{d.waktu}</span>
                                                </div>
                                                <p className="mt-1 font-semibold">{d.judul}</p>
                                                <p className="mt-1 whitespace-pre-line text-sm text-muted-foreground">{d.isi}</p>
                                            </div>
                                        </div>
                                    </li>
                                )
                            })}
                        </ul>
                    )}
                </div>
            </FormCard>
        </div>
    )
}
