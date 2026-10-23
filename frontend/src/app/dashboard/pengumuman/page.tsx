import { Megaphone, Tag } from "lucide-react"
import { kunciPublikPush } from "@kopkar/backend/src/anggota/push.ts"
import { pengumumanUntukOperator, tandaiPengumumanDibaca } from "@kopkar/backend/src/anggota/sasaran.ts"
import { AktifkanNotifikasiAdmin } from "@/components/notifikasi/AktifkanNotifikasiAdmin"
import { FormCard } from "@/components/transaksi/common"
import { pool } from "@/lib/db"
import { wajibLogin } from "@/lib/operator"

// Himbauan dan promo yang ditujukan ke grup operator ini (dipilih admin di Himbauan & Promo). Halaman ini bisa dibuka
// semua operator; dibuka = semua yang tampil dianggap terbaca (angka merah di lonceng navbar hilang).
export default async function PengumumanPage() {
    const o = await wajibLogin() // layout tidak dijalankan ulang pada navigasi antarhalaman
    const daftar = await pengumumanUntukOperator(pool, o.id)
    await tandaiPengumumanDibaca(pool, o.id, daftar.filter((d) => d.baru)).catch((e) => console.error("tandai pengumuman dibaca gagal:", e))
    return (
        <div className="max-w-3xl space-y-6">
            <FormCard title="Pengumuman" description="Himbauan dan promo dari pengurus untuk Anda sebagai pengguna aplikasi admin.">
                <div className="space-y-4">
                    <AktifkanNotifikasiAdmin kunciPublik={kunciPublikPush()} />
                    {daftar.length === 0 ? (
                        <p className="text-sm text-muted-foreground">Belum ada pengumuman untuk grup Anda.</p>
                    ) : (
                        <ul className="space-y-3">
                            {daftar.map((d) => {
                                const Ikon = d.jenis === "promo" ? Tag : Megaphone
                                return (
                                    <li key={`${d.jenis}-${d.id}`} className="overflow-hidden rounded-lg border">
                                        {d.gambar && (
                                            // eslint-disable-next-line @next/next/no-img-element
                                            <img src={`/dashboard/gambar/${d.gambar}`} alt="" className="max-h-64 w-full object-cover" />
                                        )}
                                        <div className="flex gap-3 p-4">
                                            <Ikon className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
                                            <div className="min-w-0">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{d.jenis === "promo" ? "Promo" : "Himbauan"}</span>
                                                    {d.baru && <span className="rounded bg-red-600 px-1.5 py-0.5 text-[10px] font-bold leading-none text-white">BARU</span>}
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
