import type { NextConfig } from "next"

const nextConfig: NextConfig = {
    // Aturan anggota di workspace backend ditulis dalam TypeScript tanpa build terpisah.
    transpilePackages: ["@kopkar/backend"],
    // Server uji (scripts/dev-uji.mjs) memakai folder build dan tsconfig sendiri, sama seperti frontend/.
    distDir: process.env.KOPKAR_DIST_DIR || ".next",
    typescript: { tsconfigPath: process.env.KOPKAR_DIST_DIR ? "tsconfig.uji.json" : "tsconfig.json" },
    poweredByHeader: false,
    // Unggah foto profil lewat server action: maks. 5 MB foto + amplop form (bawaan Next 1 MB).
    experimental: { serverActions: { bodySizeLimit: "6mb" } },
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
