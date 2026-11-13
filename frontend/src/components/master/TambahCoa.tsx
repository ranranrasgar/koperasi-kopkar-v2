"use client"

import { useActionState, useState } from "react"
import { AlertCircle, CheckCircle2, Loader2, Plus } from "lucide-react"
import { tambahCoaAction } from "@/app/actions/master-aksi"
import { useBolehAksi } from "@/components/layout/SidebarContext"
import { Field, selectClass } from "@/components/transaksi/common"
import { Input } from "@/components/ui/input"
import { TombolModal, useTutupSetelahBerhasil } from "@/components/ui/Modal"
import { MENU } from "@/config/akses"
import { FLAG_COA } from "@/config/coa"
import type { IndukCoa, KlasifikasiCoa } from "@/lib/queries/akuntansi"

/** Isian sama dengan form desktop: Acct Number, Acct Name, Parent, Debit/Credit, Group, Flag. D/K dan Group mengikuti induk yang dipilih. */
function FormTambahCoa({ induk, klasifikasi, selesai }: { induk: IndukCoa[]; klasifikasi: KlasifikasiCoa[]; selesai: () => void }) {
    const [hasil, kirim, proses] = useActionState(tambahCoaAction, null)
    const [dk, setDk] = useState("D")
    const [kelas, setKelas] = useState(String(klasifikasi[0]?.kode_klasifikasi ?? ""))
    useTutupSetelahBerhasil(hasil?.ok, selesai)

    const pilihInduk = (id: string) => {
        const p = induk.find((x) => String(x.id) === id)
        if (!p) return
        if (p.d_k === "D" || p.d_k === "C") setDk(p.d_k)
        if (klasifikasi.some((k) => k.kode_klasifikasi === p.kode_klasifikasi)) setKelas(String(p.kode_klasifikasi))
    }

    return (
        <form action={kirim} className="grid gap-4 sm:grid-cols-2">
            <Field label="Nomor Akun (Acct Number)" htmlFor="kode_perkiraan">
                <Input id="kode_perkiraan" name="kode_perkiraan" required maxLength={100} pattern="[0-9A-Za-z.\-]+" placeholder="mis. 1.1.01.47" className="font-mono" />
            </Field>
            <Field label="Nama Akun (Acct Name)" htmlFor="nama_perkiraan">
                <Input id="nama_perkiraan" name="nama_perkiraan" required maxLength={100} />
            </Field>
            <Field label="Induk (Parent)" htmlFor="parent_id" className="sm:col-span-2"
                hint="Akun yang sudah punya jurnal tidak bisa menjadi induk.">
                <select id="parent_id" name="parent_id" required defaultValue="" className={selectClass} onChange={(e) => pilihInduk(e.target.value)}>
                    <option value="" disabled>Pilih akun induk</option>
                    {induk.map((p) => (
                        <option key={p.id} value={p.id} disabled={p.punya_jurnal}>
                            {p.kode_perkiraan} {p.nama_perkiraan}{p.punya_jurnal ? " (berjurnal)" : ""}
                        </option>
                    ))}
                </select>
            </Field>
            <Field label="Debit / Kredit" htmlFor="d_k">
                <select id="d_k" name="d_k" value={dk} onChange={(e) => setDk(e.target.value)} className={selectClass}>
                    <option value="D">D (Debit)</option>
                    <option value="C">C (Kredit)</option>
                </select>
            </Field>
            <Field label="Group" htmlFor="kode_klasifikasi">
                <select id="kode_klasifikasi" name="kode_klasifikasi" value={kelas} onChange={(e) => setKelas(e.target.value)} className={selectClass}>
                    {klasifikasi.map((k) => <option key={k.kode_klasifikasi} value={k.kode_klasifikasi}>{k.nama_klasifikasi}</option>)}
                </select>
            </Field>
            <Field label="Flag" htmlFor="keterangan" className="sm:col-span-2">
                <select id="keterangan" name="keterangan" defaultValue="-" className={selectClass}>
                    {FLAG_COA.map((x) => <option key={x.value} value={x.value}>{x.label}</option>)}
                </select>
            </Field>
            <p className="sm:col-span-2 text-xs text-muted-foreground">
                Saldo awal tidak diisi di sini: saldo akun dihitung dari jurnal. Untuk saldo pembuka, buat Jurnal Umum.
            </p>
            {hasil && (hasil.ok ? (
                <div role="status" className="sm:col-span-2 flex items-center gap-2 rounded-md border border-green-300 bg-green-50 p-2.5 text-sm text-green-700 dark:bg-green-500/10 dark:text-green-400">
                    <CheckCircle2 className="h-4 w-4" /> {hasil.pesan}
                </div>
            ) : (
                <div role="alert" className="sm:col-span-2 flex items-start gap-2 rounded-md border border-red-300 bg-red-50 p-2.5 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-400">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {hasil.error}
                </div>
            ))}
            <div className="sm:col-span-2">
                <button type="submit" disabled={proses || hasil?.ok === true}
                    className="inline-flex h-9 items-center justify-center gap-2 rounded-md bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60">
                    {proses && <Loader2 className="h-4 w-4 animate-spin" />} Simpan akun
                </button>
            </div>
        </form>
    )
}

/** Tombol Tambah Akun di halaman COA; hanya tampil bila operator punya izin tambah (server action memeriksa ulang). */
export function TambahCoa({ induk, klasifikasi }: { induk: IndukCoa[]; klasifikasi: KlasifikasiCoa[] }) {
    const boleh = useBolehAksi()
    if (!boleh([MENU.coa], "tambah")) return null
    return (
        <TombolModal label={<><Plus className="h-4 w-4" /> Tambah Akun</>} judul="Tambah Akun COA" lebar="sm:max-w-[42rem]"
            keterangan="Nomor akun tidak bisa diubah setelah disimpan.">
            {(selesai) => <FormTambahCoa induk={induk} klasifikasi={klasifikasi} selesai={selesai} />}
        </TombolModal>
    )
}
