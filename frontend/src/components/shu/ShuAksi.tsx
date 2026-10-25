"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Calculator, CheckCheck, HandCoins, Loader2, Lock, PiggyBank, Undo2 } from "lucide-react"
import { batalkanShuAction, cairkanShuAction, hitungShuAction, postingShuAction, postingSukarelaAction, tutupBukuAction } from "@/app/actions/shu"
import type { Hasil } from "@/app/actions/transaksi"
import { Input } from "@/components/ui/input"
import { TombolModal, useTutupSetelahBerhasil } from "@/components/ui/Modal"
import { Field, HasilTransaksi, SubmitButton, selectClass, useAksiForm, type Akun } from "@/components/transaksi/common"

const tombol = "inline-flex items-center justify-center gap-1.5 h-9 px-3 rounded-md border text-sm font-medium shadow-sm hover:bg-muted"
const tombolUtama = "inline-flex items-center justify-center gap-1.5 h-9 px-3 rounded-md text-sm font-semibold shadow-sm bg-blue-600 hover:bg-blue-700 text-white"

/** Pilih tahun buku: berpindah halaman dengan ?tahun=. */
export function PilihTahun({ tahun, daftar, berjalan }: { tahun: number; daftar: number[]; berjalan?: number }) {
    const router = useRouter()
    return (
        <label className="flex items-center gap-1.5">
            <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">Tahun buku</span>
            <select value={tahun} onChange={(e) => router.push(`?tahun=${e.target.value}`)} className={`${selectClass} h-9 w-28`} aria-label="Tahun buku">
                {daftar.map((t) => <option key={t} value={t}>{t}{t === berjalan ? " (berjalan)" : ""}</option>)}
            </select>
        </label>
    )
}

/** Aksi tanpa form: dijalankan dari tombol di modal, hasilnya tampil di modal, lalu modal menutup dan halaman dimuat ulang. */
function KonfirmasiProses({ selesai, jalankan, catatan, tombolLabel, children }: {
    selesai: () => void; jalankan: () => Promise<Hasil>; catatan: React.ReactNode; tombolLabel: string; children?: React.ReactNode
}) {
    const [hasil, setHasil] = useState<Hasil>(null)
    const [pending, mulai] = useTransition()
    useTutupSetelahBerhasil(hasil?.ok, selesai, 2500)
    return (
        <div className="space-y-4">
            <div className="text-sm text-muted-foreground space-y-2">{catatan}</div>
            {children}
            <HasilTransaksi hasil={hasil} />
            <div className="flex justify-end">
                <button type="button" disabled={pending || Boolean(hasil?.ok)} onClick={() => mulai(async () => setHasil(await jalankan()))}
                    className="inline-flex items-center justify-center gap-2 h-9 px-4 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold shadow-sm disabled:opacity-60">
                    {pending && <Loader2 className="h-4 w-4 animate-spin" />}{tombolLabel}
                </button>
            </div>
        </div>
    )
}

export function TombolTutupBuku({ tahun, sudahDitutup, adaPencairan }: { tahun: number; sudahDitutup: boolean; adaPencairan: boolean }) {
    return (
        <TombolModal label={<><Lock className="h-4 w-4" /> {sudahDitutup ? "Proses ulang tutup buku" : "Proses tutup buku"}</>} judul={`Tutup Buku ${tahun}`}
            className={sudahDitutup ? tombol : tombolUtama} lebar="sm:max-w-[34rem]">
            {(selesai) => (
                <KonfirmasiProses selesai={selesai} tombolLabel="Proses sekarang" jalankan={() => tutupBukuAction(tahun)} catatan={<>
                    <p>Menutup pendapatan dan biaya {tahun} pada 31 Desember, membagi laba setelah pajak ke pos-pos SHU, dan memindahkan saldo neraca sebagai saldo awal 1 Januari {tahun + 1}.</p>
                    {sudahDitutup && <p className="font-semibold text-amber-700">Tahun ini sudah ditutup. Memproses ulang mengganti jurnal tutup buku dan hasil hitung SHU {tahun}.</p>}
                    {adaPencairan && <p className="font-semibold text-red-700">Sudah ada SHU {tahun} yang dicairkan; proses ditolak sampai pencairannya dibatalkan.</p>}
                    <p>Hanya superadmin atau admin yang boleh memproses.</p>
                </>} />
            )}
        </TombolModal>
    )
}

function FormHitung({ tahun, selesai }: { tahun: number; selesai: () => void }) {
    const [sukarela, setSukarela] = useState(true)
    return (
        <KonfirmasiProses selesai={selesai} tombolLabel="Hitung sekarang" jalankan={() => hitungShuAction(tahun, sukarela)} catatan={
            <p>Menghitung SHU semua anggota aktif yang masuk sampai {tahun}: jasa pinjaman uang dan barang tahun {tahun}, saldo simpanan sukarela, dan lama keanggotaan. Hasil lama tahun ini diganti.</p>}>
            <label className="flex items-start gap-2 text-sm">
                <input type="checkbox" checked={sukarela} onChange={(e) => setSukarela(e.target.checked)} className="mt-1" />
                <span>Ikutkan saldo simpanan sukarela sebagai komponen pembagian (bawaan desktop).</span>
            </label>
        </KonfirmasiProses>
    )
}

export function TombolHitungShu({ tahun, sudahAda }: { tahun: number; sudahAda: boolean }) {
    return (
        <TombolModal label={<><Calculator className="h-4 w-4" /> {sudahAda ? "Hitung ulang SHU" : "Hitung SHU"}</>} judul={`Hitung SHU ${tahun}`} className={sudahAda ? tombol : tombolUtama}>
            {(selesai) => <FormHitung tahun={tahun} selesai={selesai} />}
        </TombolModal>
    )
}

export function TombolPostingShu({ tahun }: { tahun: number }) {
    return (
        <TombolModal label={<><CheckCheck className="h-4 w-4" /> Posting SHU</>} judul={`Posting SHU ${tahun}`} className={tombolUtama}>
            {(selesai) => (
                <KonfirmasiProses selesai={selesai} tombolLabel="Posting" jalankan={() => postingShuAction(tahun)} catatan={<>
                    <p>Memposting hasil hitung SHU {tahun} supaya bisa dicairkan. Setelah ini hasil tidak bisa dihitung ulang kecuali semua pencairannya dibatalkan.</p>
                    <p>Pastikan nominal setiap anggota sudah benar. Hanya superadmin atau admin yang boleh memproses.</p>
                </>} />
            )}
        </TombolModal>
    )
}

function FormTanggal({ aksi, tahun, selesai, hariIni, tombolLabel, catatan }: {
    aksi: (p: Hasil, f: FormData) => Promise<Hasil>; tahun: number; selesai: () => void; hariIni: string; tombolLabel: string; catatan: React.ReactNode
}) {
    const { hasil, onSubmit, pending } = useAksiForm(aksi)
    useTutupSetelahBerhasil(hasil?.ok, selesai, 2500)
    return (
        <form onSubmit={onSubmit} className="space-y-4">
            <input type="hidden" name="tahun" value={tahun} />
            <div className="text-sm text-muted-foreground space-y-2">{catatan}</div>
            <Field label="Tanggal" htmlFor="tanggal"><Input id="tanggal" name="tanggal" type="date" required defaultValue={hariIni} /></Field>
            <HasilTransaksi hasil={hasil} />
            <div className="flex justify-end"><SubmitButton pending={pending} disabled={Boolean(hasil?.ok)}>{tombolLabel}</SubmitButton></div>
        </form>
    )
}

export function TombolPostingSukarela({ tahun, belum, hariIni }: { tahun: number; belum: number; hariIni: string }) {
    return (
        <TombolModal label={<><PiggyBank className="h-4 w-4" /> Posting ke sukarela ({belum})</>} judul={`Posting SHU ${tahun} ke simpanan sukarela`} className={tombol}>
            {(selesai) => (
                <FormTanggal aksi={postingSukarelaAction} tahun={tahun} selesai={selesai} hariIni={hariIni} tombolLabel="Posting ke sukarela" catatan={<>
                    <p><b>{belum}</b> anggota belum mengambil SHU {tahun}. Semua SHU yang belum diambil dipindahkan ke simpanan sukarela anggota masing-masing (satu jurnal per anggota).</p>
                    <p className="font-semibold text-amber-700">Setelah diposting, anggota tidak bisa lagi mengambil SHU tahun ini. Hanya superadmin atau admin yang boleh memproses.</p>
                </>} />
            )}
        </TombolModal>
    )
}

function FormCairkan({ tahun, kodeAgt, akunKas, hariIni, selesai }: { tahun: number; kodeAgt: string; akunKas: Akun[]; hariIni: string; selesai: () => void }) {
    const { hasil, onSubmit, pending } = useAksiForm(cairkanShuAction)
    useTutupSetelahBerhasil(hasil?.ok, selesai, 1500)
    return (
        <form onSubmit={onSubmit} className="space-y-4">
            <input type="hidden" name="tahun" value={tahun} />
            <input type="hidden" name="kodeAgt" value={kodeAgt} />
            <Field label="Dibayar dari kas / bank" htmlFor="akunKas">
                <select id="akunKas" name="akunKas" required className={selectClass} defaultValue={akunKas.find((a) => a.kode_perkiraan === "1.1.01.41")?.kode_perkiraan ?? akunKas[0]?.kode_perkiraan}>
                    {akunKas.map((a) => <option key={a.id} value={a.kode_perkiraan}>{a.kode_perkiraan} {a.nama_perkiraan}</option>)}
                </select>
            </Field>
            <Field label="Tanggal pencairan" htmlFor="tanggal"><Input id="tanggal" name="tanggal" type="date" required defaultValue={hariIni} /></Field>
            <HasilTransaksi hasil={hasil} />
            <div className="flex justify-end"><SubmitButton pending={pending} disabled={Boolean(hasil?.ok)}>Cairkan SHU</SubmitButton></div>
        </form>
    )
}

/** Cairkan SHU satu anggota tunai: pilih akun kas/bank dan tanggal. */
export function TombolCairkan({ tahun, kodeAgt, nama, jumlah, akunKas, hariIni }: { tahun: number; kodeAgt: string; nama: string; jumlah: string; akunKas: Akun[]; hariIni: string }) {
    return (
        <TombolModal label={<><HandCoins className="h-3.5 w-3.5" /> Cairkan</>} judul={`Cairkan SHU ${tahun}`} keterangan={`${nama} · ${kodeAgt} · Rp ${jumlah}`}
            className="inline-flex items-center gap-1 rounded-md px-2 h-7 text-xs font-semibold text-green-700 hover:bg-green-50">
            {(selesai) => <FormCairkan tahun={tahun} kodeAgt={kodeAgt} akunKas={akunKas} hariIni={hariIni} selesai={selesai} />}
        </TombolModal>
    )
}

export function TombolBatal({ tahun, kodeAgt, nama }: { tahun: number; kodeAgt: string; nama: string }) {
    const router = useRouter()
    const [sibuk, mulai] = useTransition()
    const batal = () => {
        if (!confirm(`Batalkan pencairan SHU ${tahun} untuk ${nama}? Jurnal pencairannya dihapus dan statusnya kembali belum diambil.`)) return
        mulai(async () => {
            const h = await batalkanShuAction(tahun, kodeAgt)
            if (h) alert(h.ok ? h.pesan : h.error)
            router.refresh()
        })
    }
    return (
        <button type="button" onClick={batal} disabled={sibuk} title="Batalkan pencairan" className="inline-flex items-center gap-1 rounded-md px-2 h-7 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50">
            {sibuk ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Undo2 className="h-3.5 w-3.5" />} Batal
        </button>
    )
}
