import type { Metadata } from "next"
import Link from "next/link"
import { MessageSquarePlus } from "lucide-react"
import { percakapanAnggota } from "@kopkar/backend/src/anggota/pesan.ts"
import { BarisTautan, Kartu, Kepala, Kosong } from "@/components/ui"
import { wajibAnggota } from "@/lib/anggota"
import { pool } from "@/lib/db"

export const metadata: Metadata = { title: "Pesan ke Koperasi" }

export default async function PesanPage() {
    const a = await wajibAnggota()
    const daftar = await percakapanAnggota(pool, a.anggotaId).catch((e) => {
        if ((e as { code?: string }).code === "42P01") return null // tabel belum dipasang
        throw e
    })
    if (daftar === null) {
        return <main><Kepala judul="Pesan ke Koperasi" kembali="/akun" /><div className="px-5"><Kartu><Kosong judul="Fitur belum tersedia" isi="Fitur pesan belum dipasang di server." /></Kartu></div></main>
    }

    return (
        <main>
            <Kepala judul="Pesan ke Koperasi" kembali="/akun" />
            <div className="px-5">
                <Link href="/pesan/baru" className="flex h-12 items-center justify-center gap-2 rounded-xl bg-utama font-semibold text-pada-utama hover:bg-utama-tekan">
                    <MessageSquarePlus size={20} strokeWidth={1.75} /> Tulis pesan baru
                </Link>
                <h2 className="mb-1 mt-8 text-[0.9375rem] font-semibold">Percakapan</h2>
                {daftar.length === 0 ? (
                    <Kartu><Kosong judul="Belum ada pesan" isi="Tanyakan apa pun ke pengurus koperasi. Balasan muncul di sini dan sebagai notifikasi." /></Kartu>
                ) : (
                    <Kartu className="divide-y divide-garis overflow-hidden">
                        {daftar.map((p) => (
                            <BarisTautan key={p.id} href={`/pesan/${p.id}`}
                                judul={<span className={p.belum_dibaca ? "font-bold" : undefined}>{p.belum_dibaca && <span aria-label="Balasan baru" className="mr-2 inline-block size-2 rounded-full bg-utama align-middle" />}{p.subjek}</span>}
                                sub={`${p.pengirim_terakhir === "admin" ? "Koperasi: " : "Anda: "}${p.cuplikan}`}
                                nilaiSub={p.pesan_terakhir_pada.slice(5, 10).split("-").reverse().join("/")} />
                        ))}
                    </Kartu>
                )}
            </div>
        </main>
    )
}
