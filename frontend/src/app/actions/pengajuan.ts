"use server"

import { revalidatePath } from "next/cache"
import { kirimNotifikasi } from "@kopkar/backend/src/anggota/push.ts"
import { modeUji, pool, tx } from "@/lib/db"
import { GalatSesi, operatorAktif, wajibAksi } from "@/lib/operator"
import { MENU } from "@/config/akses"
import { batasPlafon, type BatasPlafon } from "@kopkar/backend/src/posting/plafon.ts"
import { estimasiAngsuran, type Estimasi } from "@kopkar/backend/src/anggota/pengajuan-hitung.ts"
import { pengajuanUntukDitinjau, potonganBulanan, riwayatAnggota, type PotonganBulanan, type RiwayatAnggota } from "@/lib/queries/pinjaman-riwayat"

export type HasilPengajuan = { ok: true; pesan: string } | { ok: false; error: string }

/**
 * Setujui (Y) atau tolak (N) pengajuan yang masih menunggu (P). Pencairan dilakukan terpisah di form pencairan.
 * Lewat tx() supaya ikut di-rollback di mode uji.
 */
export async function putuskanPengajuanAction(id: number, setuju: boolean): Promise<HasilPengajuan> {
    try {
        wajibAksi(await operatorAktif([MENU.pengajuan]), [MENU.pengajuan], "ubah")
        const r = await tx(async (db) => (await db.query<{ kd_anggota: string; anggota_id: number | null; rp_pinjaman_pokok: string; lama_angsuran: number; jenis_kredit_id: string | null }>(
            // Tolak juga membatalkan persetujuan yang belum dicairkan, supaya kunci "belum lunas" anggota terbuka lagi.
            "UPDATE pengajuan_pinjaman SET status = $1, menunggu_cair = $3 WHERE id = $2 AND (status = 'P' OR (status = 'Y' AND menunggu_cair AND NOT $3)) RETURNING kd_anggota, anggota_id, rp_pinjaman_pokok, lama_angsuran, jenis_kredit_id", [setuju ? "Y" : "N", id, setuju])).rows)
        if (r.length === 0) return { ok: false, error: "Pengajuan tidak ada atau sudah diputuskan" }
        const pesan = `Pengajuan ${r[0].kd_anggota} ${setuju ? "disetujui" : "ditolak"}`
        if (await modeUji()) return { ok: true, pesan: `MODE UJI, tidak tersimpan: ${pesan}` }
        revalidatePath("/dashboard/loans/apply")
        // Kabari anggota di PWA (riwayat + Web Push). Gagal kirim tidak membatalkan keputusan yang sudah tersimpan.
        if (r[0].anggota_id) {
            const rp = Number(r[0].rp_pinjaman_pokok).toLocaleString("id-ID")
            const { rows: [jk] } = await pool.query("SELECT nama_kredit FROM jenis_kredit WHERE id = $1", [r[0].jenis_kredit_id])
            const nama = jk?.nama_kredit ?? "pinjaman"
            await kirimNotifikasi(pool, Number(r[0].anggota_id), {
                judul: setuju ? "Pengajuan kredit disetujui" : "Pengajuan kredit ditolak",
                isi: `Pengajuan ${nama} Rp ${rp} (${r[0].lama_angsuran} bulan) ${setuju ? "disetujui. Pencairan diproses oleh koperasi." : "tidak disetujui. Hubungi pengurus koperasi untuk keterangan."}`,
                url: "/ajukan",
                jenisEmail: "status_pengajuan",
            }).catch((e) => console.error("kirim notifikasi pengajuan gagal:", e))
        }
        return { ok: true, pesan }
    } catch (e) {
        if (!(e instanceof GalatSesi)) console.error("putuskan pengajuan gagal:", e)
        return { ok: false, error: e instanceof Error ? e.message : "Gagal" }
    }
}

export type TinjauanPengajuan = {
    ok: true; pengajuan: NonNullable<Awaited<ReturnType<typeof pengajuanUntukDitinjau>>>; riwayat: RiwayatAnggota; batas: BatasPlafon | null
    potongan: PotonganBulanan; estimasi: Estimasi | null
} | { ok: false; error: string }

/** Identitas dan riwayat pinjaman anggota sebuah pengajuan, untuk ditinjau pengurus sebelum menyetujui. Hanya membaca. */
export async function tinjauPengajuanAction(id: number): Promise<TinjauanPengajuan> {
    try {
        await operatorAktif([MENU.pengajuan])
        const pengajuan = await pengajuanUntukDitinjau(id)
        if (!pengajuan) return { ok: false, error: "Pengajuan tidak ada" }
        const riwayat = await riwayatAnggota(pengajuan.kode_agt)
        if (!riwayat) return { ok: false, error: "Anggota pengajuan tidak ditemukan" }
        const batas = batasPlafon({ kunciGrade: pengajuan.kunci_grade, maksPlafond: pengajuan.maks_plafond }, riwayat.anggota.rp_grade)
        const estimasi = estimasiAngsuran({ persenBunga: String(pengajuan.persen_bunga), perAngsuran: pengajuan.per_angsuran, persenAdm: String(pengajuan.persen_adm), persenProvisi: String(pengajuan.persen_provisi) },
            Math.round(pengajuan.rp_pinjaman_pokok), pengajuan.lama_angsuran)
        return { ok: true, pengajuan, riwayat, batas, potongan: await potonganBulanan(pengajuan.anggota_id), estimasi }
    } catch (e) {
        if (!(e instanceof GalatSesi)) console.error("tinjau pengajuan gagal:", e)
        return { ok: false, error: e instanceof Error ? e.message : "Gagal" }
    }
}
