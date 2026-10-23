"use client"

import type { PendaftaranBaru } from "@kopkar/backend/src/anggota/akun.ts"
import { FormCard } from "@/components/transaksi/common"
import { AksiUserMobile } from "@/components/master/AksiUserMobile"

/** Pendaftaran akun baru dari aplikasi anggota yang menunggu persetujuan admin (setujui, tolak, hapus). */
export function DaftarPendaftaran({ data }: { data: PendaftaranBaru[] }) {
    return (
        <FormCard title="Pendaftaran Baru" description="Akun baru dari aplikasi anggota aktif setelah Anda menyetujuinya. Email pendaftar harus sudah terverifikasi (kode email atau Google).">
            {data.length === 0 ? (
                <p className="rounded-md border p-6 text-center text-sm text-muted-foreground">Tidak ada pendaftaran yang menunggu.</p>
            ) : (
                <div className="overflow-x-auto rounded-md border">
                    <table className="w-full text-sm">
                        <thead className="bg-muted text-muted-foreground text-xs">
                            <tr>
                                <th className="px-3 py-2 text-left">Waktu</th>
                                <th className="px-3 py-2 text-left">Nama</th>
                                <th className="px-3 py-2 text-left">NIK</th>
                                <th className="px-3 py-2 text-left">Username</th>
                                <th className="px-3 py-2 text-left">Email</th>
                                <th className="px-3 py-2 text-center">Keanggotaan</th>
                                <th className="px-3 py-2 text-right">Aksi</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.map((p) => (
                                <tr key={p.id} className="border-t">
                                    <td className="whitespace-nowrap px-3 py-2">{p.dibuat}</td>
                                    <td className="px-3 py-2 font-medium">{p.nama ?? "-"}</td>
                                    <td className="px-3 py-2 font-mono">{p.nik ?? "-"}</td>
                                    <td className="px-3 py-2">{p.username}</td>
                                    <td className="px-3 py-2">
                                        {p.email ?? "-"}
                                        <span className={`ml-2 rounded px-1.5 py-0.5 text-[11px] ${p.email_terverifikasi
                                            ? "bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-400"
                                            : "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400"}`}>
                                            {p.email_terverifikasi ? (p.google ? "Google" : "Terverifikasi") : "Belum diverifikasi"}
                                        </span>
                                    </td>
                                    <td className="px-3 py-2 text-center">{p.anggota ? "Anggota" : "Karyawan Mattel"}</td>
                                    <td className="whitespace-nowrap px-3 py-2">
                                        <div className="flex justify-end">
                                            <AksiUserMobile item={{ id: p.id, nama: p.nama, username: p.username, email: p.email_terverifikasi ? p.email : null, menunggu_admin: true, punya_anggota: p.anggota }} />
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </FormCard>
    )
}
