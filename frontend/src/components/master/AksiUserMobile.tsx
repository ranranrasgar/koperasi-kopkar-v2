"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Check, KeyRound, Loader2, LockKeyhole, Mail, Trash2, UserPlus, X } from "lucide-react"
import { dataLengkapiAnggotaAction, hapusPinAkunAction, hapusUserMobileAction, jadikanAnggotaAction, passwordSementaraAkunAction, putuskanPendaftaranAction, ubahEmailAkunAction, ubahStatusAkunAction, type HasilPendaftaran } from "@/app/actions/pendaftaran"
import { Button } from "@/components/ui/button"
import { FormLengkapiAnggota, type BahanLengkapi } from "@/components/master/FormLengkapiAnggota"
import { beriTahu, tanyaIsian, tanyaYa } from "@/components/ui/Tanya"

/** Aksi per baris User Mobile: setujui/tolak pendaftaran baru, aktifkan/nonaktifkan akun lain kapan saja, dan hapus akun (aturan hak di server). */
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
    const hapus = async () => {
        const punya = item.punya_anggota === true
        if (!(await tanyaYa(punya
            ? `Hapus akun ${nama} beserta semua data aplikasinya (foto, notifikasi, pesan)? Akun ini terhubung ke anggota, hanya superadmin/admin yang boleh. Tidak bisa dibatalkan.`
            : `Hapus akun ${nama}? Tidak bisa dibatalkan.`))) return
        let kode: string | undefined
        if (punya) {
            const kodeAgt = String(item.kode_agt ?? "")
            const k = await tanyaIsian(`Hapus juga KEANGGOTAAN ${nama} (${kodeAgt}) beserta pengajuan dan notifikasinya, sehingga data karyawan kembali bukan anggota?\n\nKetik kode anggota ${kodeAgt} untuk menghapusnya juga. Kosongkan bila anggota harus tetap ada. Ditolak otomatis bila anggota sudah punya transaksi (simpanan, pinjaman, dll).`,
                { judul: "Hapus keanggotaan juga?", tombol: "Lanjut hapus akun", bahaya: true, wajib: false, label: `Kode anggota ${kodeAgt} (opsional)` })
            if (k === null) return
            kode = k.trim() || undefined
        }
        mulai(async () => {
            const h = await hapusUserMobileAction(id, kode)
            setPesan(h); void beriTahu(h.ok ? h.pesan : h.error, { ok: !!h.ok }); router.refresh()
        })
    }

    /**
     * Setujui atau jadikan anggota: akun yang belum punya anggota membuka form kelengkapan (data karyawan dan simpanan awal, bisa diubah);
     * yang sudah punya anggota (atau NIK-nya sudah terdaftar) hanya dikonfirmasi seperti biasa.
     */
    const lengkapi = (setuju: boolean) => mulai(async () => {
        const d = await dataLengkapiAnggotaAction(id)
        if (!d.ok) { void beriTahu(d.error, { ok: false }); return }
        if (d.sudahAnggota) {
            if (!(await tanyaYa(setuju ? `Setujui pendaftaran ${nama}? Akun aktif dan tertaut ke anggota ${d.kode}.` : `Tautkan ${nama} ke anggota ${d.kode}?`))) return
            const h = setuju ? await putuskanPendaftaranAction(id, true) : await jadikanAnggotaAction(id)
            setPesan(h); void beriTahu(h.ok ? h.pesan : h.error, { ok: !!h.ok }); router.refresh()
            return
        }
        setBahan({ setuju, data: { username: d.username, nik: d.nik, form: d.form, dariPengaturan: d.dariPengaturan, daftarGrade: d.daftarGrade, gradeKaryawan: d.gradeKaryawan } })
    })

    /** Ubah email akun atas permintaan anggota; email baru perlu diverifikasi anggota di aplikasi. */
    const ubahEmail = async () => {
        const baru = await tanyaIsian(`Email baru untuk ${nama}${item.email ? ` (sekarang ${String(item.email)})` : ""}.

Kode verifikasi langsung dikirim ke email baru ini; anggota tinggal membuka emailnya lalu memverifikasi.`, { judul: "Ubah email", tombol: "Simpan email", awal: String(item.email ?? ""), label: "email@contoh.com" })
        if (baru === null || !baru.trim()) return
        mulai(async () => {
            const h = await ubahEmailAkunAction(id, baru)
            setPesan(h); void beriTahu(h.ok ? h.pesan : h.error, { ok: !!h.ok }); router.refresh()
        })
    }

    /** Password sementara untuk anggota yang lupa password; tampil sekali di kotak yang bisa disalin. */
    const passwordSementara = async () => {
        if (!(await tanyaYa(`Buat password sementara baru untuk ${nama}? Password lama tidak berlaku lagi dan perangkat yang sedang masuk akan keluar. Di aplikasi web anggota, ${nama} wajib mengganti password setelah masuk.`))) return
        mulai(async () => {
            const h = await passwordSementaraAkunAction(id)
            setPesan(h)
            if (!h.ok) void beriTahu(h.error, { ok: false })
            else void beriTahu(`${h.pesan}. Password ini hanya tampil sekali: salin lalu sampaikan langsung ke ${nama}.

${h.passwordSementara}`, { judul: "Password sementara", ok: true })
            router.refresh()
        })
    }

    const jalankan = async (konfirmasi: string, fn: () => Promise<HasilPendaftaran>) => {
        if (!(await tanyaYa(konfirmasi))) return
        mulai(async () => {
            const h = await fn()
            setPesan(h)
            void beriTahu(h.ok ? h.pesan : h.error, { ok: !!h.ok })
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
            {!menunggu && (item.status === true ? (
                <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-amber-600 hover:bg-amber-50 hover:text-amber-700" title="Nonaktifkan akun"
                    onClick={() => jalankan(`Nonaktifkan akun ${nama}? Pemilik akun langsung keluar dari aplikasi dan tidak bisa masuk sampai diaktifkan lagi.`, () => ubahStatusAkunAction(id, false))}>
                    <X className="h-4 w-4" />
                </Button>
            ) : (
                <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-green-600 hover:bg-green-50 hover:text-green-700" title="Aktifkan akun"
                    onClick={() => jalankan(`Aktifkan kembali akun ${nama}?`, () => ubahStatusAkunAction(id, true))}>
                    <Check className="h-4 w-4" />
                </Button>
            ))}
            {!menunggu && item.status === true && item.punya_anggota === false && (
                <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-blue-600 hover:bg-blue-50 hover:text-blue-700" title="Jadikan anggota"
                    onClick={() => lengkapi(false)}>
                    <UserPlus className="h-4 w-4" />
                </Button>
            )}
            {!menunggu && item.status === true && (
                <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-primary hover:bg-muted" title="Buat password sementara" onClick={passwordSementara}>
                    <KeyRound className="h-4 w-4" />
                </Button>
            )}
            {!menunggu && item.status === true && (
                <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-primary hover:bg-muted" title="Hapus PIN transaksi (anggota lupa PIN)"
                    onClick={() => jalankan(`Hapus PIN transaksi ${nama}? ${nama} harus membuat PIN baru di aplikasi (Akun → PIN transaksi, dengan password akun) sebelum bisa membayar dari Simpanan Sukarela lewat HP.`, () => hapusPinAkunAction(id))}>
                    <LockKeyhole className="h-4 w-4" />
                </Button>
            )}
            <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-gray-600 hover:bg-muted" title="Ubah email akun" onClick={ubahEmail}>
                <Mail className="h-4 w-4" />
            </Button>
            <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-red-600 hover:bg-red-50 hover:text-red-700" title="Hapus akun"
                onClick={hapus}>
                <Trash2 className="h-4 w-4" />
            </Button>
            {pesan?.ok && <span className="sr-only" role="status">{pesan.pesan}</span>}
            <FormLengkapiAnggota bahan={bahan?.data ?? null} tombol={bahan?.setuju ? "Setujui dan jadikan anggota" : "Jadikan anggota"} onTutup={() => setBahan(null)}
                onSimpan={async (lengkap) => {
                    const h = bahan?.setuju ? await putuskanPendaftaranAction(id, true, lengkap) : await jadikanAnggotaAction(id, lengkap)
                    if (h.ok) { setPesan(h); void beriTahu(h.pesan); router.refresh() }
                    return h
                }} />
        </>
    )
}
