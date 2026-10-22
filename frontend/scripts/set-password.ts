// Set password sementara operator (tabel opr). Operator wajib menggantinya saat login pertama.
//   npm run set-password -w frontend -- --daftar          daftar operator
//   npm run set-password -w frontend -- <nama>            ketik password (tidak ditampilkan), atau kirim lewat stdin
//   npm run set-password -w frontend -- <nama> --acak     buat password acak dan tampilkan sekali
//   npm run set-password -w frontend -- <nama> --buat-superadmin
//       buat grup superadmin (bila belum ada) dan operator <nama> di grup itu, tanpa password; lalu set password seperti biasa
import { readFileSync } from "node:fs"
import { createInterface } from "node:readline"
import pg from "pg"
import { cekPasswordBaru, hashPassword, passwordAcak } from "../src/lib/password.ts"

function pgUrl() {
    if (process.env.PG_URL) return process.env.PG_URL
    try {
        const env = readFileSync(new URL("../.env.local", import.meta.url), "utf8")
        return env.match(/^PG_URL=(.*)$/m)?.[1]?.trim()
    } catch {
        return undefined
    }
}

/** Baca satu baris tanpa menampilkan ketikan (TTY), atau baris pertama stdin bila dipipa. */
function bacaRahasia(tanya: string): Promise<string> {
    return new Promise((resolve) => {
        const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: process.stdin.isTTY })
        if (process.stdin.isTTY) {
            process.stdout.write(tanya)
            const tulis = (rl as unknown as { _writeToOutput: (s: string) => void })
            tulis._writeToOutput = () => {}
        }
        rl.once("line", (v) => { rl.close(); if (process.stdin.isTTY) process.stdout.write("\n"); resolve(v) })
    })
}

const args = process.argv.slice(2)
const url = pgUrl()
if (!url) { console.error("PG_URL belum diset (env atau frontend/.env.local)"); process.exit(1) }
const db = new pg.Client({ connectionString: url })
await db.connect()
try {
    if (args.includes("--buat-superadmin")) {
        const nama = args.find((a) => !a.startsWith("--"))
        if (!nama || !/^[a-z0-9._-]{3,30}$/.test(nama)) throw new Error("Nama operator: 3-30 huruf kecil, angka, titik, garis bawah, atau strip")
        await db.query("BEGIN")
        let g = (await db.query("SELECT id FROM opr_grup WHERE nama_grup = 'superadmin'")).rows[0]
        if (!g) g = (await db.query("INSERT INTO opr_grup (urut, nama_grup) VALUES (nextval('seq_opr_grup_urut'), 'superadmin') RETURNING id")).rows[0]
        const ada = (await db.query("SELECT id, grup_id FROM opr WHERE lower(nama) = lower($1)", [nama])).rows[0]
        if (ada && String(ada.grup_id) !== String(g.id)) throw new Error(`Operator ${nama} sudah ada di grup lain; pindahkan lewat halaman Operator`)
        if (!ada) await db.query("INSERT INTO opr (nama, nama_lengkap, status, status_aktif, grup_id) VALUES ($1, 'Super Admin', 'superadmin', '', $2)", [nama, g.id])
        await db.query("COMMIT")
        console.log(`Operator ${nama} ada di grup superadmin. Set password: npm run set-password -w frontend -- ${nama}`)
    } else if (args.includes("--daftar") || args.length === 0) {
        const r = await db.query(`SELECT o.nama, o.nama_lengkap, g.nama_grup, o.status_aktif, o.password_hash IS NOT NULL AS punya_password,
            o.wajib_ganti_password FROM opr o LEFT JOIN opr_grup g ON g.id = o.grup_id ORDER BY o.nama`)
        console.table(r.rows)
        if (args.length === 0) console.log("Pakai: npm run set-password -w frontend -- <nama> [--acak]")
    } else {
        const nama = args.find((a) => !a.startsWith("--"))!
        const o = (await db.query("SELECT id, nama, status_aktif FROM opr WHERE lower(nama) = lower($1)", [nama])).rows[0]
        if (!o) throw new Error(`Operator ${nama} tidak ada`)
        if (String(o.status_aktif).trim().toUpperCase() === "NON AKTIF") console.warn(`Peringatan: ${o.nama} berstatus NON AKTIF dan tetap tidak bisa login.`)

        let password: string
        if (args.includes("--acak")) {
            password = passwordAcak()
        } else {
            password = await bacaRahasia(`Password sementara untuk ${o.nama}: `)
            if (process.stdin.isTTY && (await bacaRahasia("Ulangi: ")) !== password) throw new Error("Password tidak sama")
        }
        const salah = cekPasswordBaru(password)
        if (salah) throw new Error(salah)
        await db.query("UPDATE opr SET password_hash = $1, wajib_ganti_password = true WHERE id = $2", [await hashPassword(password), o.id])
        console.log(`Password sementara ${o.nama} diset; wajib diganti saat login pertama.`)
        if (args.includes("--acak")) console.log(`Password sementara: ${password}  (sampaikan langsung ke operator, jangan disimpan)`)
    }
} catch (e) {
    await db.query("ROLLBACK").catch(() => {})
    console.error(e instanceof Error ? e.message : e)
    process.exitCode = 1
} finally {
    await db.end()
}
