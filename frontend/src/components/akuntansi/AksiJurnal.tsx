"use client"

import { useBolehAksi } from "@/components/layout/SidebarContext"
import { MENU } from "@/config/akses"
import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Loader2, Printer, Scale, Trash2 } from "lucide-react"
import { hapusBarisJurnalAction, hapusJurnalAction, tandaiPenyesuaianAction } from "@/app/actions/transaksi"
import { TombolJurnalUbah } from "@/components/transaksi/JurnalForm"
import { cetakVoucher } from "@/lib/cetak-voucher"
import { hariIni } from "@/lib/format"

const tombol = "grid h-8 w-8 place-items-center rounded-md hover:bg-muted/50 disabled:opacity-50"

/** Cetak voucher satu bukti; dipakai di daftar jurnal dan di modal Bank Book. */
export function TombolVoucher({ nomorBukti }: { nomorBukti: string }) {
    const [sibuk, setSibuk] = useState(false)
    return (
        <button type="button" title="Cetak voucher" disabled={sibuk} className={`${tombol} text-gray-600`} onClick={async () => {
            setSibuk(true)
            const galat = await cetakVoucher(nomorBukti)
            setSibuk(false)
            if (galat) alert(galat)
        }}>
            {sibuk ? <Loader2 className="h-4 w-4 animate-spin" /> : <Printer className="h-4 w-4" />}
        </button>
    )
}

/**
 * Aksi per baris daftar Jurnal Umum: cetak voucher, ubah, dan hapus untuk semua jenis bukti.
 * Bukti dari transaksi lain (simpanan, pinjaman, SHU) hanya berubah jurnalnya, dengan peringatan. Periode tertutup ditolak server.
 */
export function AksiJurnal({ item }: { item: Record<string, unknown> }) {
    const boleh = useBolehAksi()
    const router = useRouter()
    const [sibuk, mulai] = useTransition()
    const nomor = String(item.nomor_bukti ?? "")
    const jp = nomor.startsWith("JP/"), bb = nomor.startsWith("BB/")
    if (nomor.startsWith("TBT/")) return <TombolVoucher nomorBukti={nomor} /> // jurnal tutup buku terkunci di server; hanya cetak
    const asalLain = !/^(JU|JP|BB)\//.test(nomor) // bukti dari transaksi simpanan/pinjaman/SHU dsb.
    const catatanAsal = asalLain ? `\n\nBukti ini dibuat oleh transaksi lain. Hanya jurnalnya yang berubah; data simpanan/pinjaman asalnya tidak ikut berubah.` : ""
    const penyesuaian = jp || item.jenis === "penyesuaian"
    const tandai = () => {
        if (!confirm(penyesuaian ? `Kembalikan ${nomor} menjadi jurnal umum biasa?` : `Tandai ${nomor} sebagai jurnal penyesuaian? Nomor tetap; jurnal ini akan dipisahkan di kolom penyesuaian neraca lajur.`)) return
        mulai(async () => {
            const h = await tandaiPenyesuaianAction(nomor, !penyesuaian)
            if (h) alert(h.ok ? h.pesan : h.error)
            router.refresh()
        })
    }
    const hapus = () => {
        if (!confirm(`Hapus baris ini dari bukti ${nomor}? Tidak bisa dibatalkan.${catatanAsal}`)) return
        mulai(async () => {
            const h = await hapusBarisJurnalAction(nomor, Number(item.urutan))
            if (h && !h.ok && h.error.includes("tidak seimbang")) {
                // Baris bernilai tidak bisa dihapus sendiri; tawarkan menghapus seluruh bukti seperti sebelumnya.
                if (confirm(`${h.error}. Hapus seluruh bukti ${nomor}? Semua barisnya ikut terhapus dan tidak bisa dibatalkan.`)) {
                    const r = await hapusJurnalAction(nomor)
                    if (r) alert(r.ok ? r.pesan : r.error)
                }
            } else if (h) alert(h.ok ? h.pesan : h.error)
            router.refresh()
        })
    }
    return (
        <>
            <TombolVoucher nomorBukti={nomor} />
            {boleh([MENU.jurnalUmum, MENU.jurnalPenyesuaian], "ubah") && <TombolJurnalUbah nomorBukti={nomor} hariIni={hariIni()} catatan={asalLain ? catatanAsal.trim() : undefined} />}
            {nomor.startsWith("JU/") && (
                <button type="button" title={penyesuaian ? "Kembalikan ke jurnal umum biasa" : "Tandai sebagai jurnal penyesuaian"} onClick={tandai} disabled={sibuk}
                    className={`${tombol} ${penyesuaian ? "text-indigo-600" : "text-gray-500"}`}><Scale className="h-4 w-4" /></button>
            )}
            {boleh(bb ? [MENU.bankBook] : [MENU.jurnalUmum, MENU.jurnalPenyesuaian], "hapus") && (
                <button type="button" title="Hapus baris ini" onClick={hapus} disabled={sibuk} className={`${tombol} text-red-600`}>
                    {sibuk ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                </button>
            )}
        </>
    )
}
