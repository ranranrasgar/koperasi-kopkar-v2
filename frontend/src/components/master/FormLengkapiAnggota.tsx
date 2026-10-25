"use client"

import { useState, useTransition } from "react"
import { AlertCircle, Loader2 } from "lucide-react"
import type { LengkapAnggota } from "@kopkar/backend/src/anggota/akun.ts"
import { Input } from "@/components/ui/input"
import { InputUang } from "@/components/ui/InputUang"
import { ModalForm } from "@/components/ui/Modal"
import { Field, selectClass } from "@/components/transaksi/common"
import type { HasilPendaftaran } from "@/app/actions/pendaftaran"

export interface BahanLengkapi {
    username: string
    nik: string
    form: LengkapAnggota
    dariPengaturan: { pokok: boolean; wajib: boolean; sukarela: boolean }
    /** Grade yang tersedia (tabel grade) dan grade di data karyawan Mattel (bisa belum ada di tabel). */
    daftarGrade: { id: string; nama: string; nominal: string }[]
    gradeKaryawan: string
}

/**
 * Form kelengkapan anggota baru saat admin menyetujui pendaftaran (atau menjadikan akun sebagai anggota): isian awal dari data karyawan Mattel,
 * nilai awal simpanan dari Pengaturan Perusahaan; semuanya bisa diubah sebelum disimpan.
 */
export function FormLengkapiAnggota({ bahan, tombol, onTutup, onSimpan }: {
    bahan: BahanLengkapi | null
    tombol: string
    onTutup: () => void
    onSimpan: (data: LengkapAnggota) => Promise<HasilPendaftaran>
}) {
    return (
        <ModalForm open={!!bahan} onOpenChange={(b) => { if (!b) onTutup() }} judul="Kelengkapan data anggota baru" lebar="sm:max-w-[44rem]"
            keterangan="Periksa dan lengkapi data anggota sebelum disetujui. Nilai simpanan awal mengikuti Pengaturan Perusahaan dan bisa diubah di sini.">
            {bahan && <Isi bahan={bahan} tombol={tombol} onTutup={onTutup} onSimpan={onSimpan} />}
        </ModalForm>
    )
}

function Isi({ bahan, tombol, onTutup, onSimpan }: { bahan: BahanLengkapi; tombol: string; onTutup: () => void; onSimpan: (d: LengkapAnggota) => Promise<HasilPendaftaran> }) {
    const [v, setV] = useState<LengkapAnggota>(bahan.form)
    const [galat, setGalat] = useState("")
    const [sibuk, mulai] = useTransition()
    const ubah = (k: keyof LengkapAnggota) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setV((x) => ({ ...x, [k]: e.target.value }))
    const uang = (k: "pokok" | "wajib" | "sukarela") => (m: string) => setV((x) => ({ ...x, [k]: m }))
    const kirim = (e: React.FormEvent) => {
        e.preventDefault()
        setGalat("")
        mulai(async () => {
            const h = await onSimpan(v)
            if (!h.ok) { setGalat(h.error); return }
            onTutup()
        })
    }
    const grade = bahan.daftarGrade.find((g) => g.nama === v.grade)
    const hint = (dari: boolean) => (dari ? "Dari Pengaturan Perusahaan" : "Tebakan dari anggota baru; atur di Pengaturan Perusahaan")
    return (
        <form onSubmit={kirim} className="space-y-4">
            <p className="rounded-md bg-muted/50 px-3 py-2 text-sm">Akun <b>{bahan.username}</b> · NIK <span className="font-mono">{bahan.nik}</span> (dari data karyawan Mattel)</p>
            <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Nama lengkap" htmlFor="l-nama"><Input id="l-nama" value={v.nama} onChange={ubah("nama")} maxLength={50} required /></Field>
                <Field label="Jenis kelamin" htmlFor="l-jk">
                    <select id="l-jk" className={selectClass} value={v.jnsKelamin} onChange={ubah("jnsKelamin")}>
                        <option value="">-</option><option value="L">Laki-laki</option><option value="P">Perempuan</option>
                    </select>
                </Field>
                <Field label="Alamat" htmlFor="l-alamat" className="sm:col-span-2"><Input id="l-alamat" value={v.alamat} onChange={ubah("alamat")} maxLength={100} /></Field>
                <Field label="Kota" htmlFor="l-kota"><Input id="l-kota" value={v.kota} onChange={ubah("kota")} maxLength={50} /></Field>
                <Field label="Kode pos" htmlFor="l-pos"><Input id="l-pos" inputMode="numeric" value={v.kodepos} onChange={ubah("kodepos")} maxLength={6} /></Field>
                <Field label="No. HP" htmlFor="l-hp"><Input id="l-hp" value={v.hp} onChange={ubah("hp")} maxLength={20} /></Field>
                <Field label="Telepon rumah" htmlFor="l-tel"><Input id="l-tel" value={v.telpRmh} onChange={ubah("telpRmh")} maxLength={20} /></Field>
                <Field label="Bank" htmlFor="l-bank"><Input id="l-bank" value={v.bankNama} onChange={ubah("bankNama")} maxLength={15} /></Field>
                <Field label="No. rekening" htmlFor="l-rek"><Input id="l-rek" value={v.bankNoRek} onChange={ubah("bankNoRek")} maxLength={15} /></Field>
                <Field label="Atas nama rekening" htmlFor="l-an" className="sm:col-span-2"><Input id="l-an" value={v.bankAtasNama} onChange={ubah("bankAtasNama")} maxLength={50} /></Field>
                <Field label="Grade" htmlFor="l-grade"
                    hint={!bahan.daftarGrade.length ? "Tabel grade kosong; tambahkan di Data Master, Grade" : !bahan.daftarGrade.some((g) => g.nama === bahan.gradeKaryawan) && bahan.gradeKaryawan ? `Grade di data karyawan (${bahan.gradeKaryawan}) belum ada di tabel grade` : undefined}>
                    <select id="l-grade" className={selectClass} value={v.grade} onChange={ubah("grade")}>
                        <option value="">-</option>
                        {bahan.daftarGrade.map((g) => <option key={g.id} value={g.nama}>{g.nama}</option>)}
                    </select>
                </Field>
                <Field label="Status staff" htmlFor="l-staff">
                    <select id="l-staff" className={selectClass} value={v.statusStaff} onChange={ubah("statusStaff")}>
                        <option value="">-</option><option value="Staff">Staff</option><option value="No Staff">No Staff</option>
                        {v.statusStaff && !["Staff", "No Staff"].includes(v.statusStaff) && <option value={v.statusStaff}>{v.statusStaff}</option>}
                    </select>
                </Field>
            </div>

            <div className="rounded-lg border p-3">
                <div className="mb-2 text-sm font-semibold">Simpanan awal (dipotong tiap bulan)</div>
                <div className="grid gap-3 sm:grid-cols-3">
                    <Field label="Simpanan pokok" htmlFor="l-pokok" hint={hint(bahan.dariPengaturan.pokok)}><InputUang id="l-pokok" value={v.pokok} onChange={uang("pokok")} className="text-right" /></Field>
                    <Field label="Simpanan wajib" htmlFor="l-wajib" hint={hint(bahan.dariPengaturan.wajib)}><InputUang id="l-wajib" value={v.wajib} onChange={uang("wajib")} className="text-right" /></Field>
                    <Field label="Simpanan sukarela" htmlFor="l-sukarela" hint={hint(bahan.dariPengaturan.sukarela)}><InputUang id="l-sukarela" value={v.sukarela} onChange={uang("sukarela")} className="text-right" /></Field>
                </div>
                <p className="mt-3 text-sm text-muted-foreground">
                    Nominal grade (dasar plafon pinjaman): <b className="text-foreground">{grade ? `Rp ${Number(grade.nominal).toLocaleString("id-ID")}` : "belum ada grade"}</b>, mengikuti tabel Grade.
                </p>
            </div>

            {galat && (
                <div role="alert" className="flex items-start gap-2 rounded-md border border-red-300 bg-red-50 p-2.5 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-400">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {galat}
                </div>
            )}
            <div className="flex justify-end gap-2">
                <button type="button" onClick={onTutup} disabled={sibuk} className="h-9 rounded-md border px-4 text-sm font-medium hover:bg-muted disabled:opacity-60">Batal</button>
                <button type="submit" disabled={sibuk} className="inline-flex h-9 items-center gap-2 rounded-md bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60">
                    {sibuk && <Loader2 className="h-4 w-4 animate-spin" />} {tombol}
                </button>
            </div>
        </form>
    )
}
