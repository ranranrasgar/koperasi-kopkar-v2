"use client"

import { useEffect, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { FileSearch, Loader2, Trash2 } from "lucide-react"
import type { InfoAsal } from "@kopkar/backend/src/posting/hapus-transaksi.ts"
import { hapusJurnalAction } from "@/app/actions/transaksi"
import { hapusTransaksiAsalAction, infoAsalAction } from "@/app/actions/transaksi-asal"
import { useBolehAksi } from "@/components/layout/SidebarContext"
import { TombolModal, useTutupSetelahBerhasil } from "@/components/ui/Modal"
import { TombolJurnalUbah } from "@/components/transaksi/JurnalForm"
import { MENU } from "@/config/akses"
import { formatAngka, hariIni } from "@/lib/format"

const tombol = "grid h-7 w-7 place-items-center rounded-md hover:bg-muted disabled:opacity-50"
const MIN_ALASAN = 10

/** Isi modal info: data transaksi asal sebuah bukti, dan pilihan menghapus transaksi itu beserta jurnalnya. */
function PanelAsal({ nomorBukti, selesai }: { nomorBukti: string; selesai: () => void }) {
    const boleh = useBolehAksi()
    const [data, setData] = useState<Awaited<ReturnType<typeof infoAsalAction>> | null>(null)
    const [alasan, setAlasan] = useState("")
    const [sibuk, mulai] = useTransition()
    const [hasil, setHasil] = useState<{ ok: true; pesan: string } | { ok: false; error: string } | null>(null)
    useEffect(() => { void infoAsalAction(nomorBukti).then(setData) }, [nomorBukti])
    useTutupSetelahBerhasil(hasil?.ok, selesai, 1800)

    if (!data) return <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" />
    if ("error" in data) return <p role="alert" className="text-sm text-red-700">{data.error}</p>
    const info: InfoAsal | null = data.info
    if (!info) return <p className="text-sm text-muted-foreground">Bukti {nomorBukti} tidak punya transaksi asal di simpanan atau pinjaman.</p>

    const bolehHapus = boleh([MENU.batalTransaksi], "hapus")
    const hapus = () => {
        if (!confirm(`Hapus ${info.judul.toLowerCase()} ${nomorBukti} beserta ${info.jurnal} baris jurnalnya? Tidak bisa dibatalkan.`)) return
        mulai(async () => setHasil(await hapusTransaksiAsalAction(nomorBukti, alasan)))
    }
    return (
        <div className="space-y-4 text-sm">
            <p className="text-xs text-muted-foreground">Data di bawah dibaca dari master transaksi sebagai info.</p>
            <dl className="grid grid-cols-[9rem_1fr] gap-x-3 gap-y-1.5">
                <dt className="text-muted-foreground">Jenis transaksi</dt><dd className="font-semibold">{info.judul}</dd>
                {info.baris.map((b) => (
                    <div key={b.label} className="contents">
                        <dt className="text-muted-foreground">{b.label}</dt>
                        <dd className={b.uang ? "tabular-nums" : undefined}>{b.uang ? formatAngka(Number(b.nilai)) : b.nilai}</dd>
                    </div>
                ))}
                <dt className="text-muted-foreground">Jurnal</dt><dd>{info.jurnal} baris</dd>
            </dl>
            {info.alasanTolak && <p role="note" className="rounded-md bg-amber-50 p-2 text-amber-800 dark:bg-amber-500/10 dark:text-amber-300">Tidak bisa dihapus dari sini: {info.alasanTolak}</p>}
            {!info.alasanTolak && bolehHapus && (
                <div className="space-y-2 rounded-md border border-red-200 p-3 dark:border-red-500/30">
                    <p>Hapus <b>transaksi ini sekaligus {info.jurnal} baris jurnalnya</b>. Hanya yang terakhir bisa dihapus, dan datanya tidak bisa dikembalikan lewat web; salinannya tercatat di riwayat koreksi Audit Data.</p>
                    <label className="block">
                        <span className="text-xs text-muted-foreground">Alasan (minimal {MIN_ALASAN} karakter)</span>
                        <input value={alasan} onChange={(e) => setAlasan(e.target.value)} maxLength={255} className="mt-1 h-9 w-full rounded-md border bg-background px-2" />
                    </label>
                    {hasil && <p role="alert" className={hasil.ok ? "text-green-700" : "text-red-700"}>{hasil.ok ? hasil.pesan : hasil.error}</p>}
                    <button type="button" onClick={hapus} disabled={sibuk || alasan.trim().length < MIN_ALASAN || hasil?.ok === true}
                        className="inline-flex h-9 items-center gap-1.5 rounded-md bg-red-600 px-3 font-medium text-white hover:bg-red-700 disabled:opacity-50">
                        {sibuk ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />} Hapus transaksi dan jurnalnya
                    </button>
                </div>
            )}
            {info.alasanTolak && hasil && !hasil.ok && <p role="alert" className="text-red-700">{hasil.error}</p>}
        </div>
    )
}

/**
 * Aksi per bukti di Jurnal Bermasalah: info transaksi asal (hanya bukti dari simpanan/pinjaman), ubah jurnal, dan hapus seluruh bukti jurnal.
 * Izin ditegakkan lagi di server action; di sini hanya menyembunyikan tombol.
 */
export function AksiBermasalah({ nomorBukti }: { nomorBukti: string }) {
    const boleh = useBolehAksi()
    const router = useRouter()
    const [sibuk, mulai] = useTransition()
    const bb = nomorBukti.startsWith("BB/")
    const asalLain = !/^(JU|JP|BB|TBT)\//.test(nomorBukti) // dibuat oleh transaksi simpanan/pinjaman, bukan jurnal manual
    const tutupBuku = nomorBukti.startsWith("TBT/") // terkunci di server; tombolnya disembunyikan
    const catatan = "Bukti ini dibuat oleh transaksi lain. Hanya jurnalnya yang berubah; data simpanan/pinjaman asalnya tidak ikut berubah."
    const hapus = () => {
        if (!confirm(`Hapus seluruh bukti jurnal ${nomorBukti}? Tidak bisa dibatalkan.${asalLain ? `\n\n${catatan}` : ""}`)) return
        mulai(async () => {
            const h = await hapusJurnalAction(nomorBukti)
            if (h && !h.ok) alert(h.error)
            router.refresh()
        })
    }
    if (tutupBuku) return <span className="text-[10px] text-muted-foreground" title="Jurnal tutup buku diubah lewat menu Tutup Buku & SHU">tutup buku</span>
    return (
        <span className="inline-flex items-center">
            {asalLain && (
                <TombolModal label={<FileSearch className="h-4 w-4" />} judul={`Transaksi asal ${nomorBukti}`} lebar="sm:max-w-[36rem]" className={`${tombol} text-gray-600`}>
                    {(selesai) => <PanelAsal nomorBukti={nomorBukti} selesai={selesai} />}
                </TombolModal>
            )}
            {boleh([MENU.jurnalUmum, MENU.jurnalPenyesuaian], "ubah") && <TombolJurnalUbah nomorBukti={nomorBukti} hariIni={hariIni()} catatan={asalLain ? catatan : undefined} />}
            {boleh(bb ? [MENU.bankBook] : [MENU.jurnalUmum, MENU.jurnalPenyesuaian], "hapus") && (
                <button type="button" title="Hapus bukti jurnal ini" aria-label={`Hapus bukti jurnal ${nomorBukti}`} onClick={hapus} disabled={sibuk} className={`${tombol} text-red-600`}>
                    {sibuk ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                </button>
            )}
        </span>
    )
}
