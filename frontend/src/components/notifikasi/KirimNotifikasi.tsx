"use client"

import { useState } from "react"
import { Send } from "lucide-react"
import { kirimNotifikasiAction } from "@/app/actions/notifikasi"
import { TombolModal, useTutupSetelahBerhasil } from "@/components/ui/Modal"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import type { AnggotaRingkas } from "@/lib/queries/anggota"
import { PilihGambar } from "./PilihGambar"
import { AnggotaPicker, Field, HasilTransaksi, SubmitButton, useAksiForm } from "@/components/transaksi/common"

type Batas = { anggotaAktif: number; maksJudul: number; maksIsi: number }

/** Tombol Kirim notifikasi yang membuka form di modal; terkirim: daftar Pesan terakhir dimuat ulang dan modal ditutup. */
export function ModalKirimNotifikasi(b: Batas) {
    return (
        <TombolModal label={<><Send className="h-4 w-4" /> Kirim notifikasi</>} judul="Kirim Notifikasi" lebar="sm:max-w-2xl"
            keterangan="Pengumuman, promo, atau kabar pribadi ke HP anggota. Muncul di layar HP walau aplikasi ditutup, dan bila diketuk membuka isi pesan.">
            {(selesai) => <KirimNotifikasi {...b} selesai={selesai} />}
        </TombolModal>
    )
}

export function KirimNotifikasi({ anggotaAktif, maksJudul, maksIsi, selesai }: Batas & { selesai: () => void }) {
    const { hasil, onSubmit, pending } = useAksiForm(kirimNotifikasiAction)
    // Jeda lebih lama: hasil kiriman (jumlah penerima dan perangkat) perlu sempat dibaca.
    useTutupSetelahBerhasil(hasil?.ok, selesai, 2500)
    const [sasaran, setSasaran] = useState<"semua" | "satu">("semua")
    const [anggota, setAnggota] = useState<AnggotaRingkas | null>(null)
    const [isi, setIsi] = useState("")

    return (
        <form onSubmit={(e) => {
            if (sasaran === "semua" && !window.confirm(`Kirim pesan ini ke ${anggotaAktif} anggota aktif? Pesan yang sudah terkirim tidak bisa ditarik.`)) { e.preventDefault(); return }
            onSubmit(e)
        }} className="space-y-4">
            <Field label="Penerima">
                <div className="flex gap-4 text-sm">
                    <label className="flex items-center gap-2"><input type="radio" name="sasaran" value="semua" checked={sasaran === "semua"} onChange={() => setSasaran("semua")} /> Semua anggota aktif ({anggotaAktif})</label>
                    <label className="flex items-center gap-2"><input type="radio" name="sasaran" value="satu" checked={sasaran === "satu"} onChange={() => setSasaran("satu")} /> Satu anggota</label>
                </div>
            </Field>
            {sasaran === "satu" && <Field label="Anggota"><AnggotaPicker value={anggota} onChange={setAnggota} /></Field>}
            <Field label="Judul" htmlFor="judul" hint={`Tampil sebagai judul notifikasi di HP. Maksimal ${maksJudul} karakter.`}>
                <Input id="judul" name="judul" maxLength={maksJudul} required placeholder="Contoh: Pengumuman RAT 2026" />
            </Field>
            <Field label="Isi pesan" htmlFor="isi" hint={`${isi.length}/${maksIsi}. Anggota yang mengetuk notifikasi akan membuka pesan lengkap ini di aplikasi.`}>
                <Textarea id="isi" name="isi" rows={5} maxLength={maksIsi} required value={isi} onChange={(e) => setIsi(e.target.value)} />
            </Field>
            <Field label="Gambar (opsional)" hint="Dikecilkan otomatis. Tampil di isi pesan dan sebagai gambar besar di notifikasi HP.">
                <PilihGambar />
            </Field>
            <HasilTransaksi hasil={hasil} />
            <SubmitButton pending={pending} disabled={(sasaran === "satu" && !anggota) || !!hasil?.ok}>Kirim notifikasi</SubmitButton>
        </form>
    )
}
