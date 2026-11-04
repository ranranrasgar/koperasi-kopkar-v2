import "server-only"
import fs from "node:fs"
import path from "node:path"
import { spawn } from "node:child_process"
import { Readable } from "node:stream"

// Backup & Restore dari web: daftar cadangan di folder server, dan menjalankan skrip database/postgres/backup.mjs dan
// restore.mjs (aturan dan pemeriksaannya satu tempat dengan perintah npm run backup / restore). Berkas cadangan tidak
// diunggah lewat browser: untuk memulihkan cadangan dari komputer lain, salin foldernya ke folder cadangan server.

/** Akar repo: folder yang punya database/postgres/backup.mjs (frontend dijalankan dari frontend/ atau dari akar). */
function akarRepo() {
    for (const d of [process.cwd(), path.resolve(process.cwd(), "..")]) {
        if (fs.existsSync(path.join(d, "database/postgres/backup.mjs"))) return d
    }
    throw new Error("skrip database/postgres/backup.mjs tidak ditemukan")
}

/** Folder cadangan: KOPKAR_BACKUP_DIR, atau backup/ di akar repo (sama dengan npm run backup). */
export const folderCadangan = () => path.resolve(process.env.KOPKAR_BACKUP_DIR ?? path.join(akarRepo(), "backup"))

const NAMA_SAH = /^kopkar-[A-Za-z0-9_-]+$/

/** Path folder satu cadangan; menolak nama yang bukan folder cadangan (mis. ../) supaya tidak keluar dari folder cadangan. */
export function jalurCadangan(nama: string) {
    if (!NAMA_SAH.test(nama)) throw new Error("nama cadangan tidak sah")
    return path.join(folderCadangan(), nama)
}

export interface Cadangan {
    nama: string; dibuat: string; database: string; versiPg: string; commit: string | null
    ukuran: number; jumlahBerkas: number; tanpaMedia: boolean; ukuranDatabase: number; jumlahTabel: number
    berkas: { nama: string; ukuran: number }[]
}

interface Manifest {
    format: string; dibuat: string; database: string; postgres: { versi: string }; commitAplikasi: string | null
    ukuranDatabase: number; tanpaMedia: boolean; baris: Record<string, number>
    berkas: { nama: string; ukuran: number; potongan: { nama: string; ukuran: number }[] }[]
}

/** Cadangan yang ada di folder (yang punya manifest.json), terbaru dulu. Folder tanpa manifest (setengah jadi) dilewati. */
export function daftarCadangan(): Cadangan[] {
    const folder = folderCadangan()
    if (!fs.existsSync(folder)) return []
    const hasil: Cadangan[] = []
    for (const d of fs.readdirSync(folder, { withFileTypes: true })) {
        if (!d.isDirectory() || !NAMA_SAH.test(d.name)) continue
        try {
            const m = JSON.parse(fs.readFileSync(path.join(folder, d.name, "manifest.json"), "utf8")) as Manifest
            if (m.format !== "kopkar-backup-1") continue
            const berkas = [...m.berkas.flatMap((b) => b.potongan.map((p) => ({ nama: p.nama, ukuran: p.ukuran }))), { nama: "manifest.json", ukuran: 0 }]
            hasil.push({
                nama: d.name, dibuat: m.dibuat, database: m.database, versiPg: m.postgres.versi, commit: m.commitAplikasi,
                ukuran: m.berkas.reduce((t, b) => t + b.ukuran, 0), jumlahBerkas: berkas.length, tanpaMedia: m.tanpaMedia,
                ukuranDatabase: m.ukuranDatabase, jumlahTabel: Object.keys(m.baris).length, berkas,
            })
        } catch { /* bukan cadangan yang utuh */ }
    }
    return hasil.sort((a, b) => b.dibuat.localeCompare(a.dibuat))
}

/** Ruang kosong disk folder cadangan (byte), atau null. */
export function ruangKosongCadangan() {
    try {
        const f = folderCadangan()
        fs.mkdirSync(f, { recursive: true })
        const s = fs.statfsSync(f)
        return Number(s.bavail) * Number(s.bsize)
    } catch {
        return null
    }
}

// Satu proses backup/restore pada satu waktu (per proses server); keduanya berat dan restore menimpa database.
let sibuk: string | null = null
export const prosesBerjalan = () => sibuk

/** Jalankan skrip database dengan PG_URL server ini; mengembalikan keluaran (tanpa baris rincian pg_restore). */
function jalankanSkrip(skrip: string, args: string[], label: string): Promise<{ ok: boolean; keluaran: string }> {
    if (sibuk) return Promise.resolve({ ok: false, keluaran: `Sedang berjalan: ${sibuk}. Tunggu sampai selesai.` })
    sibuk = label
    const akar = akarRepo()
    return new Promise((selesai) => {
        const anak = spawn(process.execPath, [path.join(akar, "database/postgres", skrip), ...args], {
            cwd: akar, env: { ...process.env, KOPKAR_BACKUP_DIR: folderCadangan() }, windowsHide: true,
        })
        let teks = ""
        const tampung = (b: Buffer) => { teks += b.toString(); if (teks.length > 200_000) teks = teks.slice(-100_000) }
        anak.stdout.on("data", tampung)
        anak.stderr.on("data", tampung)
        anak.on("error", (e) => { sibuk = null; selesai({ ok: false, keluaran: e.message }) })
        anak.on("close", (kode) => {
            sibuk = null
            const ringkas = teks.split(/\r?\n/).filter((b) => b.trim() && !/^pg_(restore|dump): (creating|processing|executing|launching|finished|dumping|reading|identifying|saving|last built|connecting|implied|entering|dropping)/.test(b))
            selesai({ ok: kode === 0, keluaran: ringkas.slice(-40).join("\n") })
        })
    })
}

const PASANG_SESUDAH_PULIH = ["anggota-pasang.mjs", "indeks-pasang.mjs", "pengaturan-pasang.mjs", "shu-pasang.mjs", "apply-sequences.mjs", "panduan-pasang.mjs"]

export const buatCadangan = (tanpaMedia: boolean) =>
    jalankanSkrip("backup.mjs", ["--ke", folderCadangan(), ...(tanpaMedia ? ["--tanpa-media"] : [])], "membuat cadangan")

export const periksaCadangan = (nama: string) => jalankanSkrip("restore.mjs", [jalurCadangan(nama), "--periksa"], `memeriksa ${nama}`)

/**
 * Pulihkan cadangan ke database server ini (PG_URL), lewat database sementara lalu ditukar (bawaan restore.mjs), jadi bila
 * gagal database lama utuh. Opsi --langsung (hapus dulu) sengaja tidak disediakan di web.
 */
export async function pulihkanCadangan(nama: string, yakin: string) {
    const r = await jalankanSkrip("restore.mjs", [jalurCadangan(nama), "--timpa", "--yakin", yakin], `memulihkan ${nama}`)
    if (!r.ok) return r
    // Cadangan bisa lebih tua dari kode aplikasi: langkah yang sama dengan update-vps.sh, aman diulang. Gagal di sini tidak membatalkan pemulihan.
    const catatan: string[] = []
    for (const skrip of PASANG_SESUDAH_PULIH) {
        const p = await jalankanSkrip(skrip, [], `menyesuaikan database (${skrip})`)
        if (!p.ok) catatan.push(`Penyesuaian ${skrip} gagal, jalankan ulang perintah pasang:\n${p.keluaran}`)
    }
    const keluaran = r.keluaran.split("\n").filter((b) => !b.includes("Berikutnya:")).join("\n") // saran untuk perintah npm; di web sudah dikerjakan otomatis
    return { ok: true, keluaran: [keluaran, catatan.length ? catatan.join("\n") : "Tabel, indeks, sequence, dan panduan disesuaikan otomatis."].join("\n") }
}

export function hapusCadangan(nama: string) {
    const f = jalurCadangan(nama)
    if (!fs.existsSync(path.join(f, "manifest.json"))) throw new Error("cadangan tidak ditemukan")
    fs.rmSync(f, { recursive: true, force: true })
}

// ---------- Unduh satu berkas ZIP ----------

/** Batas ukuran zip tanpa Zip64 (4 GB); cadangan yang lebih besar tetap bisa diunduh per berkas. */
export const BATAS_ZIP = 4_000_000_000

const TABEL_CRC = (() => {
    const t = new Uint32Array(256)
    for (let n = 0; n < 256; n++) {
        let c = n
        for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
        t[n] = c >>> 0
    }
    return t
})()

async function crcBerkas(f: string) {
    let c = 0xffffffff
    for await (const b of fs.createReadStream(f) as AsyncIterable<Buffer>) for (let i = 0; i < b.length; i++) c = TABEL_CRC[(c ^ b[i]) & 0xff] ^ (c >>> 8)
    return (c ^ 0xffffffff) >>> 0
}

/**
 * Satu cadangan sebagai zip tanpa kompresi: dump sudah terkompres, jadi metode STORE cukup dan cepat. Dialirkan dari disk supaya tidak dimuat ke
 * memori. Ukuran dan CRC dihitung dulu sehingga berkasnya bisa dibuka semua aplikasi zip, termasuk Windows Explorer.
 */
export async function zipCadangan(nama: string) {
    const folder = jalurCadangan(nama)
    if (!fs.existsSync(path.join(folder, "manifest.json"))) throw new Error("cadangan tidak ditemukan")
    const daftar = fs.readdirSync(folder).filter((n) => n === "manifest.json" || BERKAS_UNGGAH.test(n)).sort()
    const berkas = await Promise.all(daftar.map(async (n) => {
        const f = path.join(folder, n)
        return { n, f, ukuran: fs.statSync(f).size, crc: await crcBerkas(f) }
    }))
    if (berkas.reduce((t, b) => t + b.ukuran, 0) >= BATAS_ZIP) throw new Error("Cadangan lebih dari 4 GB; unduh per berkas")
    const kini = new Date()
    const jam = (kini.getHours() << 11) | (kini.getMinutes() << 5), tanggal = ((kini.getFullYear() - 1980) << 9) | ((kini.getMonth() + 1) << 5) | kini.getDate()
    let posisi = 0
    const entri = berkas.map((b) => {
        const namaBuf = Buffer.from(b.n, "ascii")
        const lokal = Buffer.alloc(30)
        lokal.writeUInt32LE(0x04034b50, 0); lokal.writeUInt16LE(20, 4); lokal.writeUInt16LE(jam, 10); lokal.writeUInt16LE(tanggal, 12)
        lokal.writeUInt32LE(b.crc, 14); lokal.writeUInt32LE(b.ukuran, 18); lokal.writeUInt32LE(b.ukuran, 22); lokal.writeUInt16LE(namaBuf.length, 26)
        const pusat = Buffer.alloc(46)
        pusat.writeUInt32LE(0x02014b50, 0); pusat.writeUInt16LE(20, 4); pusat.writeUInt16LE(20, 6); pusat.writeUInt16LE(jam, 12); pusat.writeUInt16LE(tanggal, 14)
        pusat.writeUInt32LE(b.crc, 16); pusat.writeUInt32LE(b.ukuran, 20); pusat.writeUInt32LE(b.ukuran, 24); pusat.writeUInt16LE(namaBuf.length, 28); pusat.writeUInt32LE(posisi, 42)
        posisi += 30 + namaBuf.length + b.ukuran
        return { ...b, kepala: Buffer.concat([lokal, namaBuf]), pusat: Buffer.concat([pusat, namaBuf]) }
    })
    const direktori = Buffer.concat(entri.map((e) => e.pusat))
    const akhir = Buffer.alloc(22)
    akhir.writeUInt32LE(0x06054b50, 0); akhir.writeUInt16LE(entri.length, 8); akhir.writeUInt16LE(entri.length, 10); akhir.writeUInt32LE(direktori.length, 12); akhir.writeUInt32LE(posisi, 16)
    async function* aliran() {
        for (const e of entri) {
            yield e.kepala
            yield* fs.createReadStream(e.f) as AsyncIterable<Buffer>
        }
        yield direktori
        yield akhir
    }
    return { ukuran: posisi + direktori.length + akhir.length, aliran: Readable.toWeb(Readable.from(aliran(), { objectMode: false })) as ReadableStream }
}

export const namaDatabaseServer = () => {
    const u = process.env.PG_URL
    return u ? decodeURIComponent(new URL(u).pathname.replace(/^\//, "")) : ""
}

// ---------- Unggah cadangan dari komputer (untuk dipulihkan di server ini) ----------
//
// Berkas dikirim per potongan maks. POTONGAN_UNGGAH: proxy Next.js menyalin isi permintaan ke memori dan MEMOTONG diam-diam
// di atas 10 MB (proxyClientMaxBodySize), jadi berkas besar tidak bisa dikirim sekaligus. Potongan ditulis berurutan ke
// folder sementara .unggah-<id> (tidak tampil di daftar karena tidak berawalan kopkar-), lalu saat selesai manifest
// disimpan, folder diberi nama cadangan, dan SHA-256 semua berkas diperiksa dengan restore.mjs --periksa.

export const POTONGAN_UNGGAH = 8 * 1024 * 1024
const ID_UNGGAH = /^[a-f0-9]{24}$/
export const BERKAS_UNGGAH = /^(data|media)\.dump(\.\d{3})?$/

function folderUnggah(id: string) {
    if (!ID_UNGGAH.test(id)) throw new Error("id unggahan tidak sah")
    return path.join(folderCadangan(), `.unggah-${id}`)
}

/** Ringkasan manifest dari komputer pengguna; melempar galat bila bukan cadangan aplikasi ini. */
export function bacaManifest(teks: string) {
    let m: Manifest
    try { m = JSON.parse(teks) } catch { throw new Error("manifest.json tidak bisa dibaca") }
    if (m?.format !== "kopkar-backup-1" || !Array.isArray(m.berkas) || !m.berkas.some((b) => b.nama === "data.dump")) {
        throw new Error("manifest.json bukan cadangan aplikasi ini")
    }
    const potongan = m.berkas.flatMap((b) => b.potongan.map((p) => ({ nama: p.nama, ukuran: p.ukuran })))
    if (potongan.some((p) => !BERKAS_UNGGAH.test(p.nama) || !Number.isSafeInteger(p.ukuran) || p.ukuran < 0)) throw new Error("daftar berkas di manifest tidak sah")
    return { manifest: m, potongan, total: potongan.reduce((t, p) => t + p.ukuran, 0) }
}

/**
 * Tulis satu potongan pada posisi `posisi`. Potongan harus berurutan; potongan yang sama dikirim ulang (mis. koneksi putus)
 * diterima tanpa ditulis dua kali. Mengembalikan ukuran berkas sekarang.
 */
export function tulisPotonganUnggah(id: string, berkas: string, posisi: number, isi: Uint8Array) {
    if (!BERKAS_UNGGAH.test(berkas)) throw new Error("nama berkas tidak sah")
    if (isi.length === 0 || isi.length > POTONGAN_UNGGAH) throw new Error(`potongan harus 1 byte sampai ${POTONGAN_UNGGAH} byte`)
    const folder = folderUnggah(id)
    fs.mkdirSync(folder, { recursive: true })
    const f = path.join(folder, berkas)
    const sekarang = fs.existsSync(f) ? fs.statSync(f).size : 0
    if (posisi + isi.length <= sekarang) return sekarang // kiriman ulang potongan yang sudah ada
    if (posisi !== sekarang) throw new Error(`potongan tidak berurutan (posisi ${posisi}, berkas baru ${sekarang} byte)`)
    fs.appendFileSync(f, isi)
    return sekarang + isi.length
}

/** Selesaikan unggahan: semua berkas di manifest harus lengkap; folder diberi nama cadangan lalu diperiksa SHA-256-nya. */
export async function selesaiUnggah(id: string, teksManifest: string) {
    const folder = folderUnggah(id)
    const { manifest, potongan } = bacaManifest(teksManifest)
    for (const p of potongan) {
        const f = path.join(folder, p.nama)
        const uk = fs.existsSync(f) ? fs.statSync(f).size : -1
        if (uk !== p.ukuran) throw new Error(`${p.nama} belum lengkap (${Math.max(uk, 0)} dari ${p.ukuran} byte)`)
    }
    fs.writeFileSync(path.join(folder, "manifest.json"), teksManifest)
    const cap = new Date(manifest.dibuat)
    const pad = (n: number) => String(n).padStart(2, "0")
    const dasar = `kopkar-${String(manifest.database).replace(/[^A-Za-z0-9_]/g, "_")}-${cap.getFullYear()}${pad(cap.getMonth() + 1)}${pad(cap.getDate())}-${pad(cap.getHours())}${pad(cap.getMinutes())}-unggah`
    let nama = dasar
    for (let i = 2; fs.existsSync(path.join(folderCadangan(), nama)); i++) nama = `${dasar}${i}`
    fs.renameSync(folder, path.join(folderCadangan(), nama))
    const cek = await periksaCadangan(nama)
    if (!cek.ok) {
        fs.rmSync(path.join(folderCadangan(), nama), { recursive: true, force: true })
        return { ok: false as const, nama, keluaran: cek.keluaran }
    }
    return { ok: true as const, nama, keluaran: cek.keluaran }
}

export function batalUnggah(id: string) {
    fs.rmSync(folderUnggah(id), { recursive: true, force: true })
}

/** Hapus unggahan setengah jadi yang ditinggal lebih dari sehari (dipanggil saat halaman dibuka). */
export function bersihkanUnggahLama() {
    const folder = folderCadangan()
    if (!fs.existsSync(folder)) return
    for (const d of fs.readdirSync(folder, { withFileTypes: true })) {
        if (!d.isDirectory() || !d.name.startsWith(".unggah-")) continue
        const f = path.join(folder, d.name)
        if (Date.now() - fs.statSync(f).mtimeMs > 24 * 3600 * 1000) fs.rmSync(f, { recursive: true, force: true })
    }
}
