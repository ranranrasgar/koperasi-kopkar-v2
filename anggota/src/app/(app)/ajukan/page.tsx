import type { Metadata } from "next"
import { jenisKreditUntuk, pengajuanSaya } from "@kopkar/backend/src/anggota/pengajuan.ts"
import { Kartu, Kepala, Kosong } from "@/components/ui"
import { wajibAnggota } from "@/lib/anggota"
import { poolAngka } from "@/lib/db"
import { profil } from "@/lib/data"
import { hariIni, rupiah, tanggal } from "@/lib/format"
import { FormAjukan } from "./FormAjukan"

export const metadata: Metadata = { title: "Ajukan Pinjaman" }

const STATUS: Record<string, { teks: string; kelas: string }> = {
    P: { teks: "Menunggu", kelas: "bg-tunggu/15 text-tunggu" },
    Y: { teks: "Disetujui", kelas: "bg-masuk/15 text-masuk" },
    N: { teks: "Ditolak", kelas: "bg-keluar/15 text-keluar" },
}

export default async function AjukanPage() {
    const a = await wajibAnggota()
    const [jenis, daftar, data] = await Promise.all([
        jenisKreditUntuk(poolAngka, a.anggotaId), pengajuanSaya(poolAngka, a.anggotaId, 20), profil(a.anggotaId),
    ])
    const hari = hariIni()
    const batas = new Date(Date.parse(`${hari}T00:00:00Z`) + 365 * 86400000).toISOString().slice(0, 10)

    return (
        <main>
            <Kepala judul="Ajukan pinjaman" sub="Diproses oleh pengurus koperasi" />
            <div className="px-5">
                {jenis.length === 0
                    ? <Kartu><Kosong judul="Belum ada jenis pinjaman" isi="Saat ini belum ada jenis pinjaman yang bisa diajukan lewat aplikasi." /></Kartu>
                    : <FormAjukan hariIni={hari} batasTanggal={batas} plafon={data?.rp_grade ?? 0}
                        produk={jenis.map((j) => ({ kode: j.kode, nama: j.nama, persenBunga: j.persenBunga, perAngsuran: j.perAngsuran,
                            maksCicilan: j.maksCicilan, persenAdm: j.persenAdm, persenProvisi: j.persenProvisi, kunciGrade: j.kunciGrade }))} />}

                <h2 className="mb-2.5 mt-9 px-1 text-[0.9375rem] font-semibold">Pengajuan saya</h2>
                {daftar.length === 0 ? <Kartu><Kosong judul="Belum ada pengajuan" /></Kartu> : (
                    <Kartu className="divide-y divide-garis">
                        {daftar.map((p) => {
                            const s = STATUS[p.status] ?? { teks: p.status, kelas: "bg-garis text-redup" }
                            return (
                                <div key={p.id} className="flex items-start justify-between gap-3 px-4 py-3">
                                    <div className="min-w-0">
                                        <p className="truncate text-[0.9375rem] font-medium">{p.nama_kredit ?? "Pinjaman"}</p>
                                        <p className="truncate text-xs text-redup">
                                            {tanggal(p.tgl_realisasi)} · {p.lama_angsuran} bulan{p.keterangan ? ` · ${p.keterangan}` : ""}
                                        </p>
                                    </div>
                                    <div className="shrink-0 text-right">
                                        <p className="angka text-[0.9375rem] font-semibold">{rupiah(Number(p.rp_pinjaman_pokok))}</p>
                                        <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[0.6875rem] font-semibold ${s.kelas}`}>{s.teks}</span>
                                    </div>
                                </div>
                            )
                        })}
                    </Kartu>
                )}
            </div>
        </main>
    )
}
