import type { NextConfig } from "next"

const nextConfig: NextConfig = {
    // Aturan anggota di workspace backend ditulis dalam TypeScript tanpa build terpisah.
    transpilePackages: ["@kopkar/backend"],
    // Pustaka email dimuat langsung oleh Node, tidak di-bundle.
    serverExternalPackages: ["nodemailer", "pdfkit"],
    // Server uji (scripts/dev-uji.mjs) memakai folder build dan tsconfig sendiri, sama seperti frontend/.
    distDir: process.env.KOPKAR_DIST_DIR || ".next",
    // Build di VPS 2 GB tanpa swap: pemeriksaan tipe (tsc) dilewati (sudah dijalankan di komputer pengembang sebelum commit) dan hanya satu proses pekerja,
    // supaya build tidak dimatikan kernel (Killed). KOPKAR_HEMAT_RAM=1 diset di Dockerfile.
    typescript: { tsconfigPath: process.env.KOPKAR_DIST_DIR ? "tsconfig.uji.json" : "tsconfig.json", ignoreBuildErrors: process.env.KOPKAR_HEMAT_RAM === "1" },
    poweredByHeader: false,
    // Unggah foto profil lewat server action: maks. 5 MB foto + amplop form (bawaan Next 1 MB).
    experimental: { serverActions: { bodySizeLimit: "6mb" }, ...(process.env.KOPKAR_HEMAT_RAM === "1" ? { cpus: 1, webpackMemoryOptimizations: true } : {}) },
    async headers() {
        return [{
            source: "/:path*",
            headers: [
                { key: "X-Content-Type-Options", value: "nosniff" },
                { key: "X-Frame-Options", value: "DENY" },
                { key: "Referrer-Policy", value: "same-origin" },
                { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
            ],
        }, {
            // Service worker selalu diperiksa ulang ke server supaya pembaruan langsung berlaku.
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
