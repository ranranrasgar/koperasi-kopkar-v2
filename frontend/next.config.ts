import type { NextConfig } from "next"

const nextConfig: NextConfig = {
    // Mesin posting di workspace backend ditulis dalam TypeScript tanpa build terpisah.
    transpilePackages: ["@kopkar/backend"],
    // Pustaka email dimuat langsung oleh Node, tidak di-bundle.
    serverExternalPackages: ["nodemailer", "pdfkit"],
    // Server uji (scripts/dev-uji.mjs) memakai folder build sendiri karena .next dikunci dev server utama,
    // dan tsconfig sendiri supaya Next tidak menambahkan .next-uji ke tsconfig.json.
    distDir: process.env.KOPKAR_DIST_DIR || ".next",
    // Build di VPS 2 GB tanpa swap: pemeriksaan tipe (tsc) dilewati (sudah dijalankan di komputer pengembang sebelum commit) dan hanya satu proses pekerja,
    // supaya build tidak dimatikan kernel (Killed). KOPKAR_HEMAT_RAM=1 diset di Dockerfile.
    typescript: { tsconfigPath: process.env.KOPKAR_DIST_DIR ? "tsconfig.uji.json" : "tsconfig.json", ignoreBuildErrors: process.env.KOPKAR_HEMAT_RAM === "1" },
    experimental: process.env.KOPKAR_HEMAT_RAM === "1" ? { cpus: 1, webpackMemoryOptimizations: true } : undefined,
    async headers() {
        // Service worker admin (hanya Web Push pesan anggota) selalu diperiksa ulang ke server.
        return [{
            source: "/sw.js",
            headers: [
                { key: "Content-Type", value: "application/javascript; charset=utf-8" },
                { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
                { key: "Content-Security-Policy", value: "default-src 'self'; script-src 'self'" },
            ],
        }]
    },
}

export default nextConfig
