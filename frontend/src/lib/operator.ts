import "server-only"

/**
 * Operator yang mencatat transaksi (kolom opr). Sementara diambil dari KOPKAR_OPR_SEMENTARA
 * di .env.local sampai login operator (tabel opr) dibuat; tanpa nilai itu transaksi ditolak.
 */
export async function operatorAktif(): Promise<{ nama: string }> {
    const nama = process.env.KOPKAR_OPR_SEMENTARA?.trim()
    if (!nama) throw new Error("Login operator belum tersedia: transaksi belum bisa dicatat")
    return { nama }
}
