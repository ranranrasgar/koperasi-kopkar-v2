"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Check, Loader2, Trash2, UserPlus, X } from "lucide-react"
import { hapusUserMobileAction, jadikanAnggotaAction, putuskanPendaftaranAction, type HasilPendaftaran } from "@/app/actions/pendaftaran"
import { Button } from "@/components/ui/button"

/** Aksi per baris User Mobile: setujui/tolak pendaftaran baru, dan hapus akun (aturan hak di server). */
export function AksiUserMobile({ item }: { item: Record<string, unknown> }) {
    const router = useRouter()
    const [pesan, setPesan] = useState<HasilPendaftaran | null>(null)
    const [sibuk, mulai] = useTransition()
    const id = Number(item.id)
    const nama = String(item.nama ?? item.username ?? "")
    const menunggu = item.menunggu_admin === true
    const verif = Boolean(item.email) // keputusan akhir ada di server (email harus terverifikasi)

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
                        onClick={() => jalankan(`Setujui pendaftaran ${nama}? Akun aktif dan, bila belum anggota, otomatis dijadikan anggota dengan kode anggota baru.`, () => putuskanPendaftaranAction(id, true))}>
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
                    onClick={() => jalankan(`Jadikan ${nama} anggota koperasi? Dibuatkan data anggota dan kode anggota baru.`, () => jadikanAnggotaAction(id))}>
                    <UserPlus className="h-4 w-4" />
                </Button>
            )}
            <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-red-600 hover:bg-red-50 hover:text-red-700" title="Hapus akun"
                onClick={() => jalankan(
                    item.punya_anggota === true
                        ? `Hapus akun ${nama} beserta semua data aplikasinya (foto, notifikasi, pesan)? Akun ini terhubung ke anggota, hanya superadmin/admin yang boleh. Tidak bisa dibatalkan.`
                        : `Hapus akun ${nama}? Tidak bisa dibatalkan.`,
                    () => hapusUserMobileAction(id))}>
                <Trash2 className="h-4 w-4" />
            </Button>
            {pesan?.ok && <span className="sr-only" role="status">{pesan.pesan}</span>}
        </>
    )
}
