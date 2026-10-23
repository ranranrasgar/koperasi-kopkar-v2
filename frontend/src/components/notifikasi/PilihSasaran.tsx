"use client"

import { useState } from "react"
import type { Sasaran } from "@kopkar/backend/src/anggota/sasaran.ts"

export interface OpsiStatus { nama: string; jumlah: number }
export interface OpsiGrup { id: number; nama: string; jumlah: number }

export const SASARAN_AWAL: Sasaran = { anggota: true, statusStaff: null, internal: false, grupIds: null }

/** Ringkasan sasaran untuk label di daftar, mis. "Anggota (Staff) · Internal (Pengurus, Kasir)". */
export function ringkasSasaran(s: Sasaran, grup: OpsiGrup[]) {
    const bagian: string[] = []
    if (s.anggota) bagian.push(s.statusStaff ? `Anggota (${s.statusStaff.join(", ")})` : "Semua anggota")
    if (s.internal) bagian.push(s.grupIds ? `Internal (${s.grupIds.map((id) => grup.find((g) => g.id === id)?.nama ?? `#${id}`).join(", ")})` : "Semua internal kantor")
    return bagian.join(" · ")
}

/**
 * Untuk siapa pengumuman ini: anggota (semua, atau status staff tertentu) dan/atau internal kantor (pengguna aplikasi
 * admin; semua grup, atau grup tertentu). Isian: untukAnggota, staffMode, statusStaff[], untukInternal, grupMode, grupId[].
 */
export function PilihSasaran({ awal, opsiStatus, opsiGrup }: { awal: Sasaran; opsiStatus: OpsiStatus[]; opsiGrup: OpsiGrup[] }) {
    const [anggota, setAnggota] = useState(awal.anggota)
    const [staffPilih, setStaffPilih] = useState(awal.statusStaff !== null)
    const [internal, setInternal] = useState(awal.internal)
    const [grupPilih, setGrupPilih] = useState(awal.grupIds !== null)

    const sub = "ml-6 mt-1.5 space-y-1.5 text-sm"
    return (
        <fieldset className="space-y-3 rounded-md border bg-background p-3">
            <legend className="px-1 text-xs font-semibold text-muted-foreground">Untuk siapa</legend>

            <div>
                <label className="flex items-center gap-2 text-sm font-medium">
                    <input type="checkbox" name="untukAnggota" checked={anggota} onChange={(e) => setAnggota(e.target.checked)} /> Anggota (aplikasi anggota)
                </label>
                {anggota && (
                    <div className={sub}>
                        <label className="flex items-center gap-2"><input type="radio" name="staffMode" value="semua" checked={!staffPilih} onChange={() => setStaffPilih(false)} /> Semua anggota</label>
                        <label className="flex items-center gap-2"><input type="radio" name="staffMode" value="pilih" checked={staffPilih} onChange={() => setStaffPilih(true)} /> Hanya status tertentu</label>
                        {staffPilih && (
                            <div className="ml-6 flex flex-wrap gap-x-4 gap-y-1">
                                {opsiStatus.map((o) => (
                                    <label key={o.nama} className="flex items-center gap-2">
                                        <input type="checkbox" name="statusStaff" value={o.nama} defaultChecked={awal.statusStaff?.includes(o.nama) ?? false} /> {o.nama} <span className="text-xs text-muted-foreground">({o.jumlah})</span>
                                    </label>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>

            <div>
                <label className="flex items-center gap-2 text-sm font-medium">
                    <input type="checkbox" name="untukInternal" checked={internal} onChange={(e) => setInternal(e.target.checked)} /> Internal kantor (pengguna aplikasi admin)
                </label>
                {internal && (
                    <div className={sub}>
                        <label className="flex items-center gap-2"><input type="radio" name="grupMode" value="semua" checked={!grupPilih} onChange={() => setGrupPilih(false)} /> Semua grup</label>
                        <label className="flex items-center gap-2"><input type="radio" name="grupMode" value="pilih" checked={grupPilih} onChange={() => setGrupPilih(true)} /> Hanya grup tertentu</label>
                        {grupPilih && (
                            <div className="ml-6 flex flex-wrap gap-x-4 gap-y-1">
                                {opsiGrup.map((g) => (
                                    <label key={g.id} className="flex items-center gap-2">
                                        <input type="checkbox" name="grupId" value={g.id} defaultChecked={awal.grupIds?.includes(g.id) ?? false} /> {g.nama} <span className="text-xs text-muted-foreground">({g.jumlah})</span>
                                    </label>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </fieldset>
    )
}
