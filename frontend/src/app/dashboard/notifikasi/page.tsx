import { MAKS_ISI, MAKS_JUDUL, ringkasanPush } from "@kopkar/backend/src/anggota/push.ts"
import { KirimNotifikasi } from "@/components/notifikasi/KirimNotifikasi"
import { FormCard } from "@/components/transaksi/common"
import { pool, query } from "@/lib/db"
import { wajibIzin } from "@/lib/operator"

export default async function KirimNotifikasiPage() {
    await wajibIzin("/dashboard/notifikasi") // layout tidak dijalankan ulang pada navigasi antarhalaman
    const r = await ringkasanPush(pool)
    // Pesan yang sama ke banyak anggota dihitung satu baris.
    const riwayat = await query<{ title: string | null; pesan: string | null; waktu: string; penerima: number }>(
        `SELECT title, pesan, to_char(max(datetimes), 'YYYY-MM-DD HH24:MI') waktu, count(*)::int penerima
           FROM log_notifikasi WHERE datetimes > now() - interval '90 days'
          GROUP BY title, pesan, date_trunc('minute', datetimes) ORDER BY max(datetimes) DESC LIMIT 15`)
    return (
        <div className="max-w-3xl space-y-6">
            <FormCard title="Kirim Notifikasi" description="Pengumuman, promo, atau kabar pribadi ke HP anggota. Muncul di layar HP walau aplikasi ditutup, dan bila diketuk membuka isi pesan.">
                <p className="mb-4 rounded-md bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
                    {r.perangkat} perangkat dari {r.anggotaBerPerangkat} anggota sudah mengaktifkan notifikasi (dari {r.anggotaAktif} anggota aktif).
                    Anggota lain tetap menerima pesan ini di menu Notifikasi aplikasi mereka. Persetujuan dan penolakan pengajuan kredit dikirim otomatis.
                </p>
                <KirimNotifikasi anggotaAktif={r.anggotaAktif} maksJudul={MAKS_JUDUL} maksIsi={MAKS_ISI} />
            </FormCard>
            <FormCard title="Pesan terakhir" description="15 kiriman terbaru dalam 90 hari.">
                {riwayat.length === 0 ? <p className="text-sm text-muted-foreground">Belum ada.</p> : (
                    <ul className="divide-y text-sm">
                        {riwayat.map((n, i) => (
                            <li key={i} className="py-2.5">
                                <div className="flex items-baseline justify-between gap-3">
                                    <span className="font-semibold">{n.title}</span>
                                    <span className="shrink-0 text-xs text-muted-foreground">{n.waktu} · {n.penerima} anggota</span>
                                </div>
                                <p className="mt-0.5 line-clamp-2 whitespace-pre-line text-muted-foreground">{n.pesan}</p>
                            </li>
                        ))}
                    </ul>
                )}
            </FormCard>
        </div>
    )
}
