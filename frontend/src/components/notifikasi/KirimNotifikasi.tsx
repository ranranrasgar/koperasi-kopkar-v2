"use client"

import { useMemo, useState } from "react"
import { Send } from "lucide-react"
import { kirimNotifikasiAction, type TemplatNotifikasi } from "@/app/actions/notifikasi"
import { TombolModal, useTutupSetelahBerhasil } from "@/components/ui/Modal"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import type { AnggotaRingkas } from "@/lib/queries/anggota"
import { PilihGambar } from "./PilihGambar"
import { AnggotaPicker, Field, HasilTransaksi, SubmitButton, selectClass, useAksiForm } from "@/components/transaksi/common"
import { beriTahu, tanyaYa } from "@/components/ui/Tanya"

type Batas = { anggotaAktif: number; maksJudul: number; maksIsi: number; templat: TemplatNotifikasi[] }

/** Tombol Kirim notifikasi yang membuka form di modal; terkirim: daftar Pesan terakhir dimuat ulang dan modal ditutup. */
export function ModalKirimNotifikasi(b: Batas) {
    return (
        <TombolModal label={<><Send className="h-4 w-4" /> Kirim notifikasi</>} judul="Kirim Notifikasi" lebar="sm:max-w-2xl"
            keterangan="Pengumuman, promo, atau kabar pribadi ke HP anggota. Muncul di layar HP walau aplikasi ditutup, dan bila diketuk membuka isi pesan.">
            {(selesai) => <KirimNotifikasi {...b} selesai={selesai} />}
        </TombolModal>
    )
}

/** Isian {..} di teks templat, berurutan dan tanpa ganda. */
export const isianTemplat = (teks: string) => [...new Set([...teks.matchAll(/\{([^{}]+)\}/g)].map((m) => m[1].trim()))]

/** Jenis kotak isian menurut namanya: tanggal, jam, bulan, atau teks. */
function jenisIsian(nama: string): "date" | "time" | "month" | "text" {
    const n = nama.toLowerCase()
    if (n.includes("tanggal")) return "date"
    if (n.includes("jam")) return "time"
    if (n === "bulan" || n.startsWith("bulan ")) return "month"
    return "text"
}

const BULAN = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"]
/** Nilai kotak isian menjadi teks Indonesia: "Senin, 1 Desember 2026", "22.00", "Desember 2026". */
function teksIsian(jenis: ReturnType<typeof jenisIsian>, v: string) {
    if (!v) return ""
    if (jenis === "date") {
        const d = new Date(`${v}T00:00:00`)
        return Number.isNaN(d.getTime()) ? v : d.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" })
    }
    if (jenis === "time") return v.replace(":", ".")
    if (jenis === "month") { const [y, m] = v.split("-").map(Number); return m ? `${BULAN[m - 1]} ${y}` : v }
    return v
}
const ganti = (teks: string, nilai: Record<string, string>) => teks.replace(/\{([^{}]+)\}/g, (m, k: string) => nilai[k.trim()] || m)

export function KirimNotifikasi({ anggotaAktif, maksJudul, maksIsi, templat, selesai }: Batas & { selesai: () => void }) {
    const { hasil, kirim, pending } = useAksiForm(kirimNotifikasiAction)
    // Jeda lebih lama: hasil kiriman (jumlah penerima dan perangkat) perlu sempat dibaca.
    useTutupSetelahBerhasil(hasil?.ok, selesai, 2500)
    const [sasaran, setSasaran] = useState<"semua" | "satu">("semua")
    const [anggota, setAnggota] = useState<AnggotaRingkas | null>(null)
    const [judul, setJudul] = useState("")
    const [isi, setIsi] = useState("")
    const [pakai, setPakai] = useState<TemplatNotifikasi | null>(null)
    const [nilai, setNilai] = useState<Record<string, string>>({})
    const isian = useMemo(() => (pakai ? isianTemplat(`${pakai.judul} ${pakai.isi}`) : []), [pakai])
    const belum = useMemo(() => isianTemplat(`${judul} ${isi}`), [judul, isi])

    const pilihTemplat = (id: string) => {
        const t = templat.find((x) => String(x.id) === id) ?? null
        setPakai(t); setNilai({})
        setJudul(t?.judul ?? ""); setIsi(t?.isi ?? "")
    }
    // Mengubah satu isian menyusun ulang judul dan isi dari templat (suntingan langsung di judul/isi ditimpa).
    const isiNilai = (nama: string, v: string) => {
        const baru = { ...nilai, [nama]: v }
        setNilai(baru)
        if (!pakai) return
        const teks = Object.fromEntries(Object.entries(baru).map(([k, x]) => [k, teksIsian(jenisIsian(k), x)]))
        setJudul(ganti(pakai.judul, teks)); setIsi(ganti(pakai.isi, teks))
    }

    return (
        <form onSubmit={async (e) => {
            e.preventDefault() // harus sebelum await: konfirmasi di bawah menunggu dialog
            const form = e.currentTarget
            if (belum.length) { void beriTahu(`Isi dulu: ${belum.map((x) => `{${x}}`).join(", ")}`, { ok: false }); return }
            if (sasaran === "semua" && !(await tanyaYa(`Kirim pesan ini ke ${anggotaAktif} anggota aktif? Pesan yang sudah terkirim tidak bisa ditarik.`, { tombol: "Kirim" }))) return
            kirim(form)
        }} className="space-y-4">
            {templat.length > 0 && (
                <Field label="Pakai templat (opsional)" hint="Pilih pesan yang sering dikirim, lalu lengkapi isiannya. Judul dan isi tetap bisa disunting sebelum dikirim.">
                    <select className={selectClass} value={pakai ? String(pakai.id) : ""} onChange={(e) => pilihTemplat(e.target.value)}>
                        <option value="">Tulis sendiri</option>
                        {templat.map((t) => <option key={t.id} value={t.id}>{t.nama}</option>)}
                    </select>
                </Field>
            )}
            {isian.length > 0 && (
                <div className="grid gap-3 rounded-md border bg-muted/30 p-3 sm:grid-cols-2">
                    {isian.map((n) => {
                        const j = jenisIsian(n)
                        return (
                            <Field key={n} label={n.charAt(0).toUpperCase() + n.slice(1)}>
                                {j === "text" && n.toLowerCase() === "keterangan"
                                    ? <Textarea rows={2} value={nilai[n] ?? ""} onChange={(e) => isiNilai(n, e.target.value)} />
                                    : <Input type={j} value={nilai[n] ?? ""} onChange={(e) => isiNilai(n, e.target.value)} />}
                            </Field>
                        )
                    })}
                </div>
            )}
            <Field label="Penerima">
                <div className="flex gap-4 text-sm">
                    <label className="flex items-center gap-2"><input type="radio" name="sasaran" value="semua" checked={sasaran === "semua"} onChange={() => setSasaran("semua")} /> Semua anggota aktif ({anggotaAktif})</label>
                    <label className="flex items-center gap-2"><input type="radio" name="sasaran" value="satu" checked={sasaran === "satu"} onChange={() => setSasaran("satu")} /> Satu anggota</label>
                </div>
            </Field>
            {sasaran === "satu" && <Field label="Anggota"><AnggotaPicker value={anggota} onChange={setAnggota} /></Field>}
            <Field label="Judul" htmlFor="judul" hint={`${judul.length}/${maksJudul}. Tampil sebagai judul notifikasi di HP.`}>
                <Input id="judul" name="judul" maxLength={maksJudul} required placeholder="Contoh: Pengumuman RAT 2026" value={judul} onChange={(e) => setJudul(e.target.value)} />
            </Field>
            <Field label="Isi pesan" htmlFor="isi" hint={`${isi.length}/${maksIsi}. Anggota yang mengetuk notifikasi akan membuka pesan lengkap ini di aplikasi.`}>
                <Textarea id="isi" name="isi" rows={5} maxLength={maksIsi} required value={isi} onChange={(e) => setIsi(e.target.value)} />
            </Field>
            {belum.length > 0 && <p className="text-xs text-amber-700">Belum diisi: {belum.map((x) => `{${x}}`).join(", ")}</p>}
            <Field label="Gambar (opsional)" hint="Dikecilkan otomatis. Tampil di isi pesan dan sebagai gambar besar di notifikasi HP.">
                <PilihGambar />
            </Field>
            <HasilTransaksi hasil={hasil} />
            <SubmitButton pending={pending} disabled={(sasaran === "satu" && !anggota) || !!hasil?.ok}>Kirim notifikasi</SubmitButton>
        </form>
    )
}
