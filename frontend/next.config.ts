import type { NextConfig } from "next"

const nextConfig: NextConfig = {
    // Mesin posting di workspace backend ditulis dalam TypeScript tanpa build terpisah.
    transpilePackages: ["@kopkar/backend"],
    // Pustaka email dimuat langsung oleh Node, tidak di-bundle.
    serverExternalPackages: ["nodemailer"],
    // Server uji (scripts/dev-uji.mjs) memakai folder build sendiri karena .next dikunci dev server utama,
    // dan tsconfig sendiri supaya Next tidak menambahkan .next-uji ke tsconfig.json.
    distDir: process.env.KOPKAR_DIST_DIR || ".next",
    typescript: { tsconfigPath: process.env.KOPKAR_DIST_DIR ? "tsconfig.uji.json" : "tsconfig.json" },
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
