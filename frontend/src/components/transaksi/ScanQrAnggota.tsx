"use client"

import { useState } from "react"
import Link from "next/link"
import { ChevronRight, Loader2, QrCode } from "lucide-react"
import { infoAnggotaAction, type InfoAnggota } from "@/app/actions/transaksi"
import { useBolehAksi } from "@/components/layout/SidebarContext"
import { MENU } from "@/config/akses"
import { ModalForm } from "@/components/ui/Modal"
import type { AnggotaRingkas } from "@/lib/queries/anggota"
import { PindaiQr } from "./PindaiQr"

function Pilihan({ href, judul, sub, onPilih }: { href: string; judul: string; sub?: string; onPilih: () => void }) {
    return (
        <Link href={href} onClick={onPilih} className="flex items-center justify-between gap-3 rounded-md border px-3 py-2.5 text-sm hover:bg-muted">
            <span className="min-w-0">
                <span className="block font-medium">{judul}</span>
                {sub && <span className="block truncate text-xs text-muted-foreground">{sub}</span>}
            </span>
            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
        </Link>
    )
}

/** Tombol di navbar: pindai QR anggota sekali, lalu pilih transaksi yang boleh dilakukan operator. Form tujuan terbuka dengan anggota sudah terisi. */
export function ScanQrAnggota() {
    const boleh = useBolehAksi()
    const [pindai, setPindai] = useState(false)
    const [anggota, setAnggota] = useState<AnggotaRingkas | null>(null)
    const [info, setInfo] = useState<InfoAnggota | null>(null)

    const tutup = () => { setAnggota(null); setInfo(null) }
    const terbaca = (a: AnggotaRingkas) => {
        setAnggota(a); setInfo(null)
        infoAnggotaAction(a.kode_agt).then(setInfo)
    }
    const kode = anggota ? encodeURIComponent(anggota.kode_agt) : ""
    const bayar = (no: string, jenis: "tunai" | "kpr") => `/dashboard/loans/payment?kode=${kode}&pinjaman=${encodeURIComponent(no)}&jenis=${jenis}`
    const angsurTunai = boleh([MENU.angsurKoperasi, MENU.angsurBank], "tambah"), angsurKpr = boleh([MENU.angsurKpr], "tambah")

    return (
        <>
            <button type="button" onClick={() => setPindai(true)} title="Scan QR anggota" aria-label="Scan QR anggota"
                className="grid h-9 w-9 place-items-center rounded-full text-on-surface hover:bg-surface-variant"><QrCode className="h-5 w-5" /></button>
            <PindaiQr buka={pindai} onTutup={() => setPindai(false)} onHasil={terbaca} />
            <ModalForm open={!!anggota} onOpenChange={(b) => { if (!b) tutup() }} kunci={false} judul={anggota?.nama ?? "Anggota"}
                keterangan={anggota ? `${anggota.kode_agt} | KPK ${anggota.nik ?? "-"}. Cocokkan dengan anggota, lalu pilih transaksi.` : undefined}>
                {!info ? <p className="flex items-center gap-2 py-6 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Memuat…</p> : (
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <p className="text-xs font-semibold text-muted-foreground">Simpanan</p>
                            {boleh([MENU.setoranSimpanan], "tambah") && <Pilihan href={`/dashboard/savings/deposit?kode=${kode}`} judul="Setoran Simpanan" onPilih={tutup} />}
                            {boleh([MENU.pencairanSimpanan], "tambah") && <Pilihan href={`/dashboard/savings/withdraw?kode=${kode}`} judul="Pengambilan Simpanan" onPilih={tutup} />}
                        </div>
                        <div className="space-y-2">
                            <p className="text-xs font-semibold text-muted-foreground">Pinjaman</p>
                            {angsurTunai && info.pinjaman.map((p) => (
                                <Pilihan key={p.no_pinjaman} href={bayar(p.no_pinjaman, "tunai")} judul={`Bayar angsuran ${p.no_pinjaman}`}
                                    sub={`${p.nama_kredit ?? "Pinjaman"}, ke-${p.jml_cicilan + 1} dari ${p.lama_angsuran}`} onPilih={tutup} />
                            ))}
                            {angsurKpr && info.kpr.map((k) => (
                                <Pilihan key={k.no_pinjaman} href={bayar(k.no_pinjaman, "kpr")} judul={`Bayar angsuran ${k.no_pinjaman}`}
                                    sub={`${k.nama_kredit ?? "KPR"}, ke-${k.jml_cicilan + 1} dari ${k.lama_angsuran}`} onPilih={tutup} />
                            ))}
                            {boleh([MENU.titipan], "tambah") && info.pinjaman.length > 0 && <Pilihan href={`/dashboard/loans/titipan?kode=${kode}`} judul="Titipan Angsuran" onPilih={tutup} />}
                            {info.pinjaman.length === 0 && info.kpr.length === 0 && <p className="text-sm text-muted-foreground">Tidak ada pinjaman berjalan.</p>}
                        </div>
                    </div>
                )}
            </ModalForm>
        </>
    )
}
