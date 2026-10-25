"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Check, Loader2, Trash2, UserPlus, X } from "lucide-react"
import { dataLengkapiAnggotaAction, hapusUserMobileAction, jadikanAnggotaAction, putuskanPendaftaranAction, type HasilPendaftaran } from "@/app/actions/pendaftaran"
import { Button } from "@/components/ui/button"
import { FormLengkapiAnggota, type BahanLengkapi } from "@/components/master/FormLengkapiAnggota"

/** Aksi per baris User Mobile: setujui/tolak pendaftaran baru, dan hapus akun (aturan hak di server). */
export function AksiUserMobile({ item }: { item: Record<string, unknown> }) {
    const router = useRouter()
    const [pesan, setPesan] = useState<HasilPendaftaran | null>(null)
    const [sibuk, mulai] = useTransition()
    const [bahan, setBahan] = useState<{ setuju: boolean; data: BahanLengkapi } | null>(null)
    const id = Number(item.id)
    const nama = String(item.nama ?? item.username ?? "")
    const menunggu = item.menunggu_admin === true
    const verif = Boolean(item.email) // keputusan akhir ada di server (email harus terverifikasi)

    /** Hapus akun; untuk akun beranggota, kode anggota yang diketik (verifikasi) juga menghapus keanggotaan dan mengembalikan status karyawan. */
    const hapus = () => {
        const punya = item.punya_anggota === true
        if (!confirm(punya
            ? `Hapus akun ${nama} beserta semua data aplikasinya (foto, notifikasi, pesan)? Akun ini terhubung ke anggota, hanya superadmin/admin yang boleh. Tidak bisa dibatalkan.`
            : `Hapus akun ${nama}? Tidak bisa dibatalkan.`)) return
        let kode: string | undefined
        if (punya) {
            const kodeAgt = String(item.kode_agt ?? "")
            const k = prompt(`Hapus juga KEANGGOTAAN ${nama} (${kodeAgt}) beserta pengajuan dan notifikasinya, sehingga data karyawan kembali bukan anggota?\n\nKetik kode anggota ${kodeAgt} untuk menghapusnya juga. Kosongkan bila anggota harus tetap ada. Ditolak otomatis bila anggota sudah punya transaksi (simpanan, pinjaman, dll).`)
            if (k === null) return
            kode = k.trim() || undefined
        }
        mulai(async () => {
            const h = await hapusUserMobileAction(id, kode)
            setPesan(h); alert(h.ok ? h.pesan : h.error); router.refresh()
        })
    }

    /**
     * Setujui atau jadikan anggota: akun yang belum punya anggota membuka form kelengkapan (data karyawan dan simpanan awal, bisa diubah);
     * yang sudah punya anggota (atau NIK-nya sudah terdaftar) hanya dikonfirmasi seperti biasa.
     */
    const lengkapi = (setuju: boolean) => mulai(async () => {
        const d = await dataLengkapiAnggotaAction(id)
        if (!d.ok) { alert(d.error); return }
        if (d.sudahAnggota) {
            if (!confirm(setuju ? `Setujui pendaftaran ${nama}? Akun aktif dan tertaut ke anggota ${d.kode}.` : `Tautkan ${nama} ke anggota ${d.kode}?`)) return
            const h = setuju ? await putuskanPendaftaranAction(id, true) : await jadikanAnggotaAction(id)
            setPesan(h); alert(h.ok ? h.pesan : h.error); router.refresh()
            return
        }
        setBahan({ setuju, data: { username: d.username, nik: d.nik, form: d.form, dariPengaturan: d.dariPengaturan, daftarGrade: d.daftarGrade, gradeKaryawan: d.gradeKaryawan } })
    })

    const jalankan = (konfirmasi: string, fn: () => Promise<HasilPendaftaran>) => {
        if (!confirm(konfirmasi)) return
        mulai(async () => {
            const h = await fn()
            setPesan(h)
            alert(h.ok ? h.pesan : h.error)
            router.refresh()
        })
    }

    if (sibuk) return <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" aria-label="Memproses" />
    return (
        <>
            {menunggu && (
                <>
                    <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-green-600 hover:bg-green-50 hover:text-green-700" title="Setujui pendaftaran" disabled={!verif}
                        onClick={() => lengkapi(true)}>
                        <Check className="h-4 w-4" />
                    </Button>
                    <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-amber-600 hover:bg-amber-50 hover:text-amber-700" title="Tolak pendaftaran"
                        onClick={() => jalankan(`Tolak pendaftaran ${nama}? Akun tetap nonaktif.`, () => putuskanPendaftaranAction(id, false))}>
                        <X className="h-4 w-4" />
                    </Button>
                </>
            )}
            {!menunggu && item.status === true && item.punya_anggota === false && (
                <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-blue-600 hover:bg-blue-50 hover:text-blue-700" title="Jadikan anggota"
                    onClick={() => lengkapi(false)}>
                    <UserPlus className="h-4 w-4" />
                </Button>
            )}
            <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-red-600 hover:bg-red-50 hover:text-red-700" title="Hapus akun"
                onClick={hapus}>
                <Trash2 className="h-4 w-4" />
            </Button>
            {pesan?.ok && <span className="sr-only" role="status">{pesan.pesan}</span>}
            <FormLengkapiAnggota bahan={bahan?.data ?? null} tombol={bahan?.setuju ? "Setujui dan jadikan anggota" : "Jadikan anggota"} onTutup={() => setBahan(null)}
                onSimpan={async (lengkap) => {
                    const h = bahan?.setuju ? await putuskanPendaftaranAction(id, true, lengkap) : await jadikanAnggotaAction(id, lengkap)
                    if (h.ok) { setPesan(h); alert(h.pesan); router.refresh() }
                    return h
                }} />
        </>
    )
}
