// Kecilkan gambar di browser sebelum diunggah: sisi terpanjang maks. 1000 px, WEBP (JPEG bila WEBP tidak didukung),
// kualitas diturunkan bertahap sampai di bawah batas. Server tetap memeriksa ulang jenis dan ukuran.

const SISI_MAKS = 1000
export const BATAS_BYTE = 300 * 1024

const keBlob = (c: HTMLCanvasElement, jenis: string, mutu: number) =>
    new Promise<Blob | null>((ok) => c.toBlob(ok, jenis, mutu))

export async function kompresGambar(file: File): Promise<File> {
    if (!file.type.startsWith("image/")) throw new Error("Pilih file gambar (JPG, PNG, atau WEBP)")
    const bmp = await createImageBitmap(file).catch(() => null)
    if (!bmp) throw new Error("Gambar tidak bisa dibaca")
    const skala = Math.min(1, SISI_MAKS / Math.max(bmp.width, bmp.height))
    const c = document.createElement("canvas")
    c.width = Math.round(bmp.width * skala)
    c.height = Math.round(bmp.height * skala)
    const g = c.getContext("2d")!
    g.fillStyle = "#fff" // PNG transparan jadi latar putih (JPEG tidak punya transparansi)
    g.fillRect(0, 0, c.width, c.height)
    g.drawImage(bmp, 0, 0, c.width, c.height)
    bmp.close()

    for (const [jenis, ekstensi] of [["image/webp", "webp"], ["image/jpeg", "jpg"]] as const) {
        for (let mutu = 0.82; mutu >= 0.4; mutu -= 0.14) {
            const b = await keBlob(c, jenis, mutu)
            if (!b || b.type !== jenis) break // browser tidak mendukung jenis ini
            if (b.size <= BATAS_BYTE) return new File([b], `gambar.${ekstensi}`, { type: jenis })
        }
    }
    throw new Error("Gambar terlalu rumit untuk dikecilkan; pilih gambar lain")
}
