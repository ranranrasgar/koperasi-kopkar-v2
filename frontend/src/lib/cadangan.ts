import "server-only"
import fs from "node:fs"
import path from "node:path"
import { spawn } from "node:child_process"

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
function jalankanSkrip(skrip: "backup.mjs" | "restore.mjs", args: string[], label: string): Promise<{ ok: boolean; keluaran: string }> {
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

export const buatCadangan = (tanpaMedia: boolean) =>
    jalankanSkrip("backup.mjs", ["--ke", folderCadangan(), ...(tanpaMedia ? ["--tanpa-media"] : [])], "membuat cadangan")

export const periksaCadangan = (nama: string) => jalankanSkrip("restore.mjs", [jalurCadangan(nama), "--periksa"], `memeriksa ${nama}`)

/**
 * Pulihkan cadangan ke database server ini (PG_URL), lewat database sementara lalu ditukar (bawaan restore.mjs), jadi bila
 * gagal database lama utuh. Opsi --langsung (hapus dulu) sengaja tidak disediakan di web.
 */
export const pulihkanCadangan = (nama: string, yakin: string) =>
    jalankanSkrip("restore.mjs", [jalurCadangan(nama), "--timpa", "--yakin", yakin], `memulihkan ${nama}`)

export function hapusCadangan(nama: string) {
    const f = jalurCadangan(nama)
    if (!fs.existsSync(path.join(f, "manifest.json"))) throw new Error("cadangan tidak ditemukan")
    fs.rmSync(f, { recursive: true, force: true })
}

export const namaDatabaseServer = () => {
    const u = process.env.PG_URL
    return u ? decodeURIComponent(new URL(u).pathname.replace(/^\//, "")) : ""
}
