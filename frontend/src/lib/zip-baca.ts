// Buka berkas .zip di browser tanpa pustaka luar. Berkas besar tidak dimuat ke memori: yang disimpan (metode 0, hasil Unduh di aplikasi ini) cukup
// diiris dari File aslinya; yang dikompres (metode 8, mis. dibuat ulang lewat "Compress to ZIP" di Windows) dibuka dengan DecompressionStream.

const u16 = (d: DataView, i: number) => d.getUint16(i, true)
const u32 = (d: DataView, i: number) => d.getUint32(i, true)
const baca = async (b: Blob, mulai: number, akhir: number) => new DataView(await b.slice(mulai, akhir).arrayBuffer())

/** Semua berkas di dalam zip sebagai File, memakai nama dasarnya (folder di dalam zip diabaikan). */
export async function isiZip(zip: File): Promise<File[]> {
    const ekor = await baca(zip, Math.max(0, zip.size - 65558), zip.size)
    let eocd = -1
    for (let i = ekor.byteLength - 22; i >= 0; i--) if (u32(ekor, i) === 0x06054b50) { eocd = i; break }
    if (eocd < 0) throw new Error("Berkas ini bukan ZIP yang utuh")
    const jumlah = u16(ekor, eocd + 10), ukuranPusat = u32(ekor, eocd + 12), awalPusat = u32(ekor, eocd + 16)
    if (jumlah === 0xffff || awalPusat === 0xffffffff) throw new Error("ZIP lebih dari 4 GB belum didukung; unggah berkasnya satu per satu")
    const pusat = await baca(zip, awalPusat, awalPusat + ukuranPusat)
    const dekode = new TextDecoder()
    const hasil: File[] = []
    for (let i = 0, ke = 0; ke < jumlah; ke++) {
        if (u32(pusat, i) !== 0x02014b50) throw new Error("Isi ZIP rusak")
        const metode = u16(pusat, i + 10), terkompres = u32(pusat, i + 20), panjangNama = u16(pusat, i + 28), panjangEkstra = u16(pusat, i + 30), panjangKomentar = u16(pusat, i + 32)
        const posisiLokal = u32(pusat, i + 42)
        const nama = dekode.decode(new Uint8Array(pusat.buffer, pusat.byteOffset + i + 46, panjangNama))
        i += 46 + panjangNama + panjangEkstra + panjangKomentar
        if (nama.endsWith("/")) continue
        const lokal = await baca(zip, posisiLokal, posisiLokal + 30)
        const awal = posisiLokal + 30 + u16(lokal, 26) + u16(lokal, 28)
        const potongan = zip.slice(awal, awal + terkompres)
        const dasar = nama.split("/").pop()!
        if (metode === 0) hasil.push(new File([potongan], dasar))
        else if (metode === 8) hasil.push(new File([await new Response(potongan.stream().pipeThrough(new DecompressionStream("deflate-raw"))).blob()], dasar))
        else throw new Error(`Metode kompresi ZIP tidak didukung untuk ${dasar}`)
    }
    return hasil
}
