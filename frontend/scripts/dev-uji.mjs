// Server uji: next dev di port 3101 memakai database uji (salinan dari npm run uji:reset), transaksi benar-benar
// disimpan (tanpa rollback) supaya alur antar halaman bisa ditelusuri. Server utama (port 3100) tidak terpengaruh.
//
//   npm run dev:uji            (dari folder utama atau frontend)
import fs from "node:fs"
import { spawn } from "node:child_process"
import { createRequire } from "node:module"
import pg from "pg"

const PORT = "3101"
const envLokal = fs.readFileSync(new URL("../.env.local", import.meta.url), "utf8")
const sumber = process.env.PG_URL ?? envLokal.match(/^PG_URL=(.*)$/m)?.[1]?.trim()
if (!sumber) {
    console.error("PG_URL tidak ada di frontend/.env.local")
    process.exit(1)
}
const u = new URL(process.env.PG_URL_UJI ?? sumber)
if (!process.env.PG_URL_UJI) u.pathname = `${u.pathname.replace(/^\//, "")}_uji`
const dbUji = decodeURIComponent(u.pathname.replace(/^\//, ""))
if (!dbUji.endsWith("_uji")) {
    console.error(`Database uji harus berakhiran _uji (dapat: ${dbUji})`)
    process.exit(1)
}

try {
    const c = new pg.Client({ connectionString: u.toString() })
    await c.connect()
    await c.end()
} catch {
    console.error(`Database uji ${dbUji} belum ada atau tidak bisa dibuka. Jalankan dulu: npm run uji:reset`)
    process.exit(1)
}

console.log(`Server uji: http://localhost:${PORT} -> database ${dbUji} (transaksi DISIMPAN di database uji)`)
const next = createRequire(import.meta.url).resolve("next/dist/bin/next")
const anak = spawn(process.execPath, [next, "dev", "--port", PORT], {
    stdio: "inherit",
    env: {
        ...process.env,
        PG_URL: u.toString(),           // process.env mengalahkan .env.local
        KOPKAR_UJI_ROLLBACK: "0",
        KOPKAR_SERVER_UJI: dbUji,       // banner, judul tab, dan cookie sesi terpisah
        KOPKAR_DIST_DIR: ".next-uji",   // folder build sendiri; .next dikunci server utama
    },
})
anak.on("exit", (kode) => process.exit(kode ?? 0))
for (const s of ["SIGINT", "SIGTERM"]) process.on(s, () => anak.kill(s))
