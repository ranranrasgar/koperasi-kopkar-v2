import { FormCard } from "@/components/transaksi/common"
import { query } from "@/lib/db"
import { formatAngka, formatTanggal } from "@/lib/format"
import { wajibIzin } from "@/lib/operator"

export default async function TitipanPage() {
    await wajibIzin("/dashboard/loans/escrow") // layout tidak dijalankan ulang pada navigasi antarhalaman
    const data = await query<{ no_pinjaman: string; tanggal: string; rp_jumlah: number; status: string | null; nama: string | null }>(
        `SELECT t.no_pinjaman, t.tanggal, t.rp_jumlah, t.status, a.nama FROM pinjaman_tunai_titipan t
           LEFT JOIN pinjaman_tunai p ON p.id = t.pinjaman_tunai_id LEFT JOIN anggota a ON a.id = p.anggota_id
          ORDER BY t.tanggal DESC LIMIT 500`)
    return (
        <FormCard title="Setoran Titipan Angsuran" description="Titipan angsuran pinjaman tunai (pinjaman_tunai_titipan).">
            <div role="note" className="mb-3 rounded-md border border-amber-400 bg-amber-50 dark:bg-amber-500/10 px-3 py-2 text-sm text-amber-800 dark:text-amber-300">
                Data titipan di aplikasi desktop kosong, sehingga aturan postingnya tidak bisa dicocokkan. Input titipan dari web belum diaktifkan.
                Angsuran KPR (titipan ke bank) dicatat di Setoran Angsuran, tab KPR.
            </div>
            <div className="overflow-x-auto rounded-md border">
                <table className="w-full text-sm">
                    <thead className="bg-muted text-muted-foreground text-xs">
                        <tr><th className="px-3 py-2 text-left">Tanggal</th><th className="px-3 py-2 text-left">No. Pinjaman</th>
                            <th className="px-3 py-2 text-left">Anggota</th><th className="px-3 py-2 text-right">Jumlah</th><th className="px-3 py-2 text-left">Status</th></tr>
                    </thead>
                    <tbody>
                        {data.length === 0 && <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">Belum ada titipan.</td></tr>}
                        {data.map((t, i) => (
                            <tr key={i} className="border-t">
                                <td className="px-3 py-1.5">{formatTanggal(t.tanggal)}</td>
                                <td className="px-3 py-1.5 font-mono text-xs">{t.no_pinjaman}</td>
                                <td className="px-3 py-1.5">{t.nama}</td>
                                <td className="px-3 py-1.5 text-right tabular-nums">{formatAngka(t.rp_jumlah)}</td>
                                <td className="px-3 py-1.5">{t.status}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </FormCard>
    )
}
