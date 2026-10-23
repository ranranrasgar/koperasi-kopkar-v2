import type { Metadata } from "next"
import { KeyRound, LogOut, Mail, MessageSquare } from "lucide-react"
import { hitungBelumDibaca } from "@kopkar/backend/src/anggota/pesan.ts"
import { keluarAction } from "@/app/actions/auth"
import { FotoProfil } from "@/components/FotoProfil"
import { Baris, BarisTautan, Kartu, Kepala } from "@/components/ui"
import { wajibMasuk } from "@/lib/anggota"
import { pool } from "@/lib/db"
import { profil } from "@/lib/data"
import { infoFoto } from "@/lib/foto"
import { rupiah, tanggal } from "@/lib/format"

export const metadata: Metadata = { title: "Akun" }

export default async function AkunPage() {
    const a = await wajibMasuk()
    const [p, foto, balasanBaru] = await Promise.all([
        a.anggotaId !== null ? profil(a.anggotaId) : null, infoFoto(a.userId),
        a.anggotaId !== null ? hitungBelumDibaca(pool, "anggota", a.anggotaId) : 0,
    ])
    const inisial = a.nama.split(/\s+/).filter(Boolean).slice(0, 2).map((s) => s[0]).join("").toUpperCase()
    // Kolom lama berupa teks; "0" atau kosong berarti tidak diisi.
    const thn = Number(p?.lama_bekerja_tahun) || 0, bln = Number(p?.lama_bekerja_bulan) || 0
    const lamaKerja = thn || bln ? [thn ? `${thn} tahun` : "", bln ? `${bln} bulan` : ""].filter(Boolean).join(" ") : null
    const isi = (v: string | number | null | undefined) => (v === null || v === undefined || String(v).trim() === "" ? "-" : String(v).trim())

    return (
        <main>
            <Kepala judul="Akun" />
            <div className="px-5">
                <Kartu className="flex items-center gap-4 p-5">
                    <FotoProfil inisial={inisial} versi={foto.versi} bisaUnggah={foto.terpasang} />
                    <div className="min-w-0">
                        <p className="truncate text-lg font-bold">{a.nama}</p>
                        <p className="truncate text-sm text-redup">{a.anggotaId ? `No. anggota ${a.kodeAgt}` : `NIK ${a.kodeAgt}`} · {a.username}</p>
                    </div>
                </Kartu>

                {a.anggotaId !== null && (
                    <Kartu className="mt-5 overflow-hidden">
                        <BarisTautan href="/pesan" judul={<span className="flex items-center gap-2"><MessageSquare size={18} strokeWidth={1.75} className="text-utama" /> Pesan ke koperasi</span>}
                            sub="Tanya atau sampaikan sesuatu ke pengurus" nilai={balasanBaru > 0 ? `${balasanBaru} baru` : undefined} />
                    </Kartu>
                )}

                {p && (
                    <>
                        <h2 className="mb-2.5 mt-7 px-1 text-[0.9375rem] font-semibold">Keanggotaan</h2>
                        <Kartu className="px-4">
                            <dl className="divide-y divide-garis">
                                <Baris label="NIK karyawan" nilai={isi(p.nik)} />
                                <Baris label="Anggota sejak" nilai={tanggal(p.tglpencatatan)} />
                                <Baris label="Status" nilai={isi(p.status_staff)} />
                                <Baris label="Grade" nilai={isi(p.grade)} />
                                <Baris label="Plafon kredit" nilai={rupiah(p.rp_grade)} />
                                <Baris label="Simpanan wajib / bulan" nilai={rupiah(p.simpanan_wajib)} />
                                <Baris label="Simpanan sukarela / bulan" nilai={rupiah(p.simpanan_sukarela)} />
                            </dl>
                        </Kartu>

                        <h2 className="mb-2.5 mt-7 px-1 text-[0.9375rem] font-semibold">Data diri</h2>
                        <Kartu className="px-4">
                            <dl className="divide-y divide-garis">
                                <Baris label="Jenis kelamin" nilai={({ L: "Laki-laki", P: "Perempuan" } as Record<string, string>)[p.jns_kelamin?.trim().toUpperCase() ?? ""] ?? isi(p.jns_kelamin)} />
                                <Baris label="Alamat" nilai={[p.alamat, p.kota, p.kode_pos].map((v) => String(v ?? "").trim()).filter(Boolean).join(", ") || "-"} />
                                <Baris label="No. HP" nilai={isi(p.hp)} />
                                <Baris label="Telepon rumah" nilai={isi(p.tlp_rumah)} />
                                <Baris label="Status perkawinan" nilai={isi(p.status)} />
                                {p.nama_istri_suami && <Baris label="Suami / istri" nilai={p.nama_istri_suami} />}
                                <Baris label="Email" nilai={isi(a.email)} />
                            </dl>
                        </Kartu>

                        {(p.pekerjaan || p.nama_perusahaan || p.jabatan) && (
                            <>
                                <h2 className="mb-2.5 mt-7 px-1 text-[0.9375rem] font-semibold">Pekerjaan</h2>
                                <Kartu className="px-4">
                                    <dl className="divide-y divide-garis">
                                        <Baris label="Perusahaan" nilai={isi(p.nama_perusahaan)} />
                                        <Baris label="Jabatan" nilai={isi(p.jabatan)} />
                                        <Baris label="Pekerjaan" nilai={isi(p.pekerjaan)} />
                                        {lamaKerja && <Baris label="Lama bekerja" nilai={lamaKerja} />}
                                    </dl>
                                </Kartu>
                            </>
                        )}

                        <h2 className="mb-2.5 mt-7 px-1 text-[0.9375rem] font-semibold">Rekening</h2>
                        <Kartu className="px-4">
                            <dl className="divide-y divide-garis">
                                <Baris label="Bank" nilai={isi(p.bank_nama)} />
                                <Baris label="Nomor rekening" nilai={isi(p.bank_no_rek)} />
                                <Baris label="Atas nama" nilai={isi(p.bank_atas_nama)} />
                            </dl>
                        </Kartu>
                        <p className="mt-3 px-1 text-xs leading-relaxed text-redup">Data salah? Hubungi pengurus koperasi untuk memperbaikinya.</p>
                    </>
                )}

                <h2 className="mb-2.5 mt-7 px-1 text-[0.9375rem] font-semibold">Keamanan</h2>
                <Kartu className="divide-y divide-garis overflow-hidden">
                    <BarisTautan href="/akun/password" judul={<span className="flex items-center gap-3"><KeyRound size={19} strokeWidth={1.75} className="text-redup" />Ganti password</span>} />
                    <BarisTautan href="/akun/email" judul={<span className="flex items-center gap-3"><Mail size={19} strokeWidth={1.75} className="text-redup" />Email</span>}
                        nilaiSub={a.email ?? "Belum diisi"} />
                </Kartu>

                <form action={keluarAction} className="mt-7">
                    <button className="flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-garis bg-permukaan font-semibold text-keluar hover:bg-keluar-lembut">
                        <LogOut size={19} strokeWidth={1.75} />
                        Keluar
                    </button>
                </form>
            </div>
        </main>
    )
}
