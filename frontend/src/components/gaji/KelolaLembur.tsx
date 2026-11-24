"use client"

import { useCallback, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Trash2 } from "lucide-react"
import { hapusLemburAction, simpanLemburAction } from "@/app/actions/gaji"
import { useBolehAksi } from "@/components/layout/SidebarContext"
import { FormEdit, type FieldSpec } from "@/components/master/FormEdit"
import { MENU } from "@/config/akses"
import { formatAngka } from "@/lib/format"
import type { BarisLembur } from "@kopkar/backend/src/gaji/periode.ts"
import { beriTahu, tanyaYa } from "@/components/ui/Tanya"

/** Form lembur harian (simpan ulang tanggal yang sama memperbarui) dan daftar lembur satu periode. */
export function KelolaLembur({ periodeId, dari, sampai, final, karyawan, baris, pembagiLembur }: {
    periodeId: number; dari: string; sampai: string; final: boolean; karyawan: { id: string; kode: string; nama: string }[]
    baris: BarisLembur[]; pembagiLembur: number
}) {
    const boleh = useBolehAksi()
    const router = useRouter()
    const [ulang, setUlang] = useState(0)
    const [sibuk, mulai] = useTransition()
    const selesai = useCallback(() => { router.refresh(); setTimeout(() => setUlang((n) => n + 1), 1500) }, [router])
    const fields: FieldSpec[] = [
        { name: "periode_id", label: "", hidden: true },
        { name: "karyawan_id", label: "Karyawan", type: "select", required: true, options: karyawan.map((k) => ({ value: k.id, label: `${k.kode} ${k.nama}` })) },
        { name: "tanggal", label: "Tanggal", type: "date", required: true, hint: `Dalam periode ${dari} s/d ${sampai}. Tanggal yang sudah ada lemburnya diperbarui.` },
        { name: "mulai", label: "Jam mulai", type: "time", required: true },
        { name: "selesai", label: "Jam selesai", type: "time", required: true, hint: "Lebih kecil dari jam mulai = lewat tengah malam." },
        { name: "jenis_hari", label: "Jenis hari", type: "select", hint: "Otomatis: RD di Absensi = hari istirahat, selain itu hari kerja.",
            options: [{ value: "kerja", label: "Hari kerja" }, { value: "istirahat", label: "Hari istirahat / libur" }] },
        { name: "keterangan", label: "Keterangan", wide: true },
    ]
    const uang = (b: BarisLembur) => Math.round(b.jam_bobot * Number(b.jml_upah) / pembagiLembur)
    const rekap = new Map<string, { kode: string; nama: string; hari: number; jam: number; bobot: number; uang: number }>()
    for (const b of baris) {
        const r = rekap.get(b.karyawan_id) ?? { kode: b.kode, nama: b.nama, hari: 0, jam: 0, bobot: 0, uang: 0 }
        r.hari++; r.jam += b.jam; r.bobot += b.jam_bobot
        // Sama dengan mesin hitung gaji: total bobot periode dikali upah per jam, dibulatkan sekali.
        r.uang = Math.round(r.bobot * Number(b.jml_upah) / pembagiLembur)
        rekap.set(b.karyawan_id, r)
    }
    const hapus = async (b: BarisLembur) => {
        if (!(await tanyaYa(`Hapus lembur ${b.kode} ${b.nama} tanggal ${b.tanggal}?`))) return
        mulai(async () => {
            const r = await hapusLemburAction(Number(b.id))
            if (r && !r.ok) void beriTahu(r.error, { ok: false })
            router.refresh()
        })
    }
    const th = "px-3 py-2 whitespace-nowrap"
    return (
        <div className="space-y-6">
            {!final && boleh([MENU.lemburKaryawan], "tambah") && (
                <div className="rounded-md border p-4">
                    <FormEdit key={ulang} fields={fields} nilai={{ periode_id: periodeId, jenis_hari: "" }} aksi={simpanLemburAction} onSelesai={selesai} tombol="Simpan lembur" kolom={3} />
                </div>
            )}
            {final && <p className="text-sm text-amber-700">Periode ini sudah final; lembur tidak bisa diubah.</p>}
            <div className="overflow-x-auto rounded-md border">
                <table className="w-full text-sm">
                    <thead className="bg-muted text-xs text-muted-foreground">
                        <tr><th className={`${th} text-left`}>Kode</th><th className={`${th} text-left`}>Nama</th><th className={`${th} text-right`}>Hari</th>
                            <th className={`${th} text-right`}>Jam lembur</th><th className={`${th} text-right`}>Jam berbobot</th><th className={`${th} text-right`}>Perkiraan uang lembur</th></tr>
                    </thead>
                    <tbody>
                        {rekap.size === 0 && <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">Belum ada lembur pada periode ini.</td></tr>}
                        {[...rekap.values()].map((r) => (
                            <tr key={r.kode} className="border-t">
                                <td className="px-3 py-1.5 font-mono text-xs">{r.kode}</td><td className="px-3 py-1.5 font-medium">{r.nama}</td>
                                <td className="px-3 py-1.5 text-right tabular-nums">{r.hari}</td><td className="px-3 py-1.5 text-right tabular-nums">{r.jam}</td>
                                <td className="px-3 py-1.5 text-right tabular-nums">{r.bobot}</td><td className="px-3 py-1.5 text-right tabular-nums font-semibold">Rp {formatAngka(r.uang)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <div className="overflow-x-auto rounded-md border">
                <table className="w-full text-sm">
                    <thead className="bg-muted text-xs text-muted-foreground">
                        <tr><th className={`${th} text-left`}>Tanggal</th><th className={`${th} text-left`}>Karyawan</th><th className={`${th} text-left`}>Jam</th><th className={`${th} text-left`}>Jenis hari</th>
                            <th className={`${th} text-right`}>Jam</th><th className={`${th} text-right`}>Bobot</th><th className={`${th} text-right`}>Uang</th><th className={`${th} text-left`}>Keterangan</th><th className={`${th} print:hidden`} /></tr>
                    </thead>
                    <tbody>
                        {baris.map((b) => (
                            <tr key={b.id} className="border-t">
                                <td className="px-3 py-1.5 font-mono text-xs whitespace-nowrap">{b.tanggal}</td>
                                <td className="px-3 py-1.5 whitespace-nowrap"><span className="font-mono text-xs">{b.kode}</span> {b.nama}</td>
                                <td className="px-3 py-1.5 tabular-nums whitespace-nowrap">{b.mulai} - {b.selesai}</td>
                                <td className="px-3 py-1.5">{b.jenis_hari === "kerja" ? "Hari kerja" : "Hari istirahat"}</td>
                                <td className="px-3 py-1.5 text-right tabular-nums">{b.jam}</td><td className="px-3 py-1.5 text-right tabular-nums">{b.jam_bobot}</td>
                                <td className="px-3 py-1.5 text-right tabular-nums">Rp {formatAngka(uang(b))}</td>
                                <td className="px-3 py-1.5 text-muted-foreground">{b.keterangan ?? "-"}</td>
                                <td className="px-2 py-1 print:hidden">{!final && boleh([MENU.lemburKaryawan], "hapus") && (
                                    <button type="button" title="Hapus lembur" onClick={() => hapus(b)} disabled={sibuk} className="rounded p-1 text-red-600 hover:bg-muted"><Trash2 className="h-4 w-4" /></button>)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <p className="text-xs text-muted-foreground">Jam lembur dibulatkan ke bawah per jam penuh; di hari kerja lebih dari 3 jam dikurangi 1 jam istirahat. Bobot: hari kerja jam ke-1 x1,5, berikutnya x2; hari istirahat sesuai Pengaturan Gaji (6 hari kerja: jam 1-7 x2, jam 8 x3, jam 9 dst x4). Uang = bobot x jml. upah / {pembagiLembur}; nilai final dihitung di Penggajian.</p>
        </div>
    )
}
