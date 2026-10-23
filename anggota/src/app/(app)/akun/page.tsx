import type { Metadata } from "next"
import { BadgeCheck, Bell, BookOpen, Coins, FilePen, KeyRound, Mail, MessageSquare, ReceiptText, Wallet } from "lucide-react"
import { hitungBelumDibaca } from "@kopkar/backend/src/anggota/pesan.ts"
import { FotoProfil } from "@/components/FotoProfil"
import { PilihTema } from "@/components/PilihTema"
import { TombolKeluar } from "@/components/TombolKeluar"
import { BarisTautan, Kartu } from "@/components/ui"
import { wajibMasuk } from "@/lib/anggota"
import { pool } from "@/lib/db"
import { infoFoto } from "@/lib/foto"

export const metadata: Metadata = { title: "Akun" }

// Foto, nama, username, pintasan layanan, keamanan akun, tampilan, dan keluar. Data diri, perusahaan, pekerjaan, rekening,
// dan saldo sengaja tidak ditampilkan di sini (privasi, mis. HP yang dipinjam); dikelola pengurus di admin.
export default async function AkunPage() {
    const a = await wajibMasuk()
    const [foto, balasanBaru] = await Promise.all([
        infoFoto(a.userId),
        a.anggotaId !== null ? hitungBelumDibaca(pool, "anggota", a.anggotaId) : 0,
    ])
    const inisial = a.nama.split(/\s+/).filter(Boolean).slice(0, 2).map((s) => s[0]).join("").toUpperCase()
    const anggota = a.anggotaId !== null
    const judul = "mb-1 mt-8 text-xs font-semibold uppercase tracking-[0.1em] text-redup"

    return (
        <main>
            <div className="px-5 pt-2">
                <section className="hero flex items-center gap-4 rounded-[var(--radius-kartu)] p-5">
                    <FotoProfil inisial={inisial} versi={foto.versi} bisaUnggah={foto.terpasang} />
                    <div className="min-w-0 flex-1">
                        <p className="truncate text-lg font-bold leading-tight">{a.nama}</p>
                        <p className="truncate text-sm opacity-80">@{a.username}</p>
                        {anggota && (
                            <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-1 text-[0.6875rem] font-semibold">
                                <BadgeCheck size={13} />Anggota · No. {a.kodeAgt}
                            </span>
                        )}
                    </div>
                </section>

                {anggota && (
                    <>
                        <h2 className={judul}>Keanggotaan dan finansial</h2>
                        <Kartu className="divide-y divide-garis">
                            <BarisTautan href="/riwayat" ikon={ReceiptText} judul="Riwayat transaksi" sub="Setoran, angsuran, dan pengajuan" />
                            <BarisTautan href="/potongan" ikon={Wallet} judul="Potongan gaji" sub="Perkiraan potongan bulan ini" />
                            <BarisTautan href="/shu" ikon={Coins} judul="Sisa Hasil Usaha" sub="SHU per tahun buku" />
                        </Kartu>

                        <h2 className={judul}>Layanan</h2>
                        <Kartu className="divide-y divide-garis">
                            <BarisTautan href="/ajukan" ikon={FilePen} judul="Ajukan pinjaman" sub="Hitung perkiraan dan kirim pengajuan" />
                            <BarisTautan href="/pesan" ikon={MessageSquare} judul="Pesan ke koperasi" sub="Tanya atau sampaikan sesuatu ke pengurus"
                                lencana={balasanBaru > 0 ? `${balasanBaru} baru` : undefined} />
                            <BarisTautan href="/notifikasi" ikon={Bell} judul="Notifikasi" sub="Keputusan pengajuan dan pengumuman" />
                        </Kartu>
                    </>
                )}

                <h2 className={judul}>Keamanan dan bantuan</h2>
                <Kartu className="divide-y divide-garis">
                    <BarisTautan href="/akun/email" ikon={Mail} judul="Email" sub={a.email ?? "Belum diisi"} />
                    <BarisTautan href="/akun/password" ikon={KeyRound} judul="Ganti password" sub="Perangkat lain akan keluar dari akun ini" />
                    <BarisTautan href="/selamat-datang" ikon={BookOpen} judul="Panduan penggunaan" sub="Kenali isi dan fitur aplikasi" />
                </Kartu>

                <h2 className={judul}>Tampilan</h2>
                <PilihTema />

                <p className="mt-6 px-1 text-xs leading-relaxed text-redup">
                    Data diri, keanggotaan, dan rekening Anda tidak ditampilkan di aplikasi ini demi privasi. Hubungi pengurus koperasi bila perlu melihat atau memperbaikinya.
                </p>

                <TombolKeluar />
                <p className="mt-6 pb-2 text-center text-xs text-redup">Kopkar MJS · Aplikasi Anggota</p>
            </div>
        </main>
    )
}
